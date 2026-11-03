import CoreMotion
import Darwin
import Foundation

/// Serves the copied prototype over loopback so the WebView can load pages,
/// scripts, images, and the food pack without a computer.
enum PrototypeServer {
  static let port: UInt16 = 14711

  static func start() {
    signal(SIGPIPE, ignoreSignal)
    let ready = DispatchSemaphore(value: 0)
    DispatchQueue.global(qos: .userInitiated).async {
      serve(ready)
    }
    _ = ready.wait(timeout: .now() + 2)
  }

  private static func serve(_ ready: DispatchSemaphore) {
    let fd = socket(AF_INET, SOCK_STREAM, 0)
    guard fd >= 0 else {
      ready.signal()
      return
    }
    var yes: Int32 = 1
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))
    var addr = sockaddr_in()
    addr.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = port.bigEndian
    addr.sin_addr.s_addr = UInt32(0x7F000001).bigEndian
    let bound = withUnsafePointer(to: &addr) {
      $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
      }
    }
    guard bound == 0, listen(fd, 128) == 0 else {
      close(fd)
      ready.signal()
      return
    }
    ready.signal()
    while true {
      let client = accept(fd, nil, nil)
      if client < 0 { continue }
      DispatchQueue.global(qos: .userInitiated).async {
        respond(client)
        close(client)
      }
    }
  }

  private static func readRequest(_ client: Int32) -> String? {
    var timeout = timeval(tv_sec: 2, tv_usec: 0)
    setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    var nosig: Int32 = 1
    setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &nosig, socklen_t(MemoryLayout<Int32>.size))
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 2048)
    while data.count < 16384 {
      if let text = String(data: data, encoding: .isoLatin1), text.contains("\r\n\r\n") {
        return text
      }
      let count = read(client, &buffer, buffer.count)
      if count > 0 {
        data.append(buffer, count: count)
      } else if count < 0 && errno == EINTR {
        continue
      } else {
        break
      }
    }
    guard let text = String(data: data, encoding: .isoLatin1), text.contains("\r\n\r\n") else { return nil }
    return text
  }

  private static func respond(_ client: Int32) {
    guard let text = readRequest(client) else { return }
    guard let line = text.split(separator: "\r\n", maxSplits: 1, omittingEmptySubsequences: false).first else { return }
    let parts = line.split(separator: " ")
    guard parts.count >= 2, parts[0] == "GET" else {
      send(client, status: 405, body: Data(), type: "text/plain")
      return
    }
    let requestPath = String(parts[1])
    if requestPath == "/health/steps" || requestPath.hasPrefix("/health/steps?") {
      send(client, status: 200, body: PhoneSteps.json(), type: "application/json; charset=utf-8")
      return
    }
    guard let file = file(for: requestPath) else {
      send(client, status: 404, body: Data("not found".utf8), type: "text/plain; charset=utf-8")
      return
    }
    guard let body = try? Data(contentsOf: file, options: [.mappedIfSafe]) else {
      send(client, status: 404, body: Data("not found".utf8), type: "text/plain; charset=utf-8")
      return
    }
    send(client, status: 200, body: body, type: mime(file))
  }

  private static func file(for requestPath: String) -> URL? {
    guard let root = Bundle.main.resourceURL?.appendingPathComponent("prototype", isDirectory: true) else { return nil }
    var relative = requestPath
    if let query = relative.firstIndex(of: "?") {
      relative = String(relative[..<query])
    }
    relative = relative.removingPercentEncoding ?? relative
    if relative.contains("..") { return nil }
    if relative.hasPrefix("/") { relative.removeFirst() }
    if relative.isEmpty || relative.hasSuffix("/") { relative += "index.html" }
    let url = root.appendingPathComponent(relative).standardizedFileURL
    let rootPath = root.standardizedFileURL.path
    let filePath = url.path
    guard filePath == rootPath || filePath.hasPrefix(rootPath + "/") else { return nil }
    var isDir: ObjCBool = false
    guard FileManager.default.fileExists(atPath: filePath, isDirectory: &isDir) else { return nil }
    if isDir.boolValue {
      let index = url.appendingPathComponent("index.html")
      guard FileManager.default.fileExists(atPath: index.path) else { return nil }
      return index
    }
    return url
  }

  private static func mime(_ url: URL) -> String {
    switch url.pathExtension.lowercased() {
    case "html": return "text/html; charset=utf-8"
    case "js": return "text/javascript; charset=utf-8"
    case "css": return "text/css; charset=utf-8"
    case "json": return "application/json; charset=utf-8"
    case "webp": return "image/webp"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "svg": return "image/svg+xml"
    case "gif": return "image/gif"
    case "ico": return "image/x-icon"
    case "woff2": return "font/woff2"
    case "woff": return "font/woff"
    default: return "application/octet-stream"
    }
  }

  private static func send(_ client: Int32, status: Int, body: Data, type: String) {
    let reason = status == 200 ? "OK" : (status == 404 ? "Not Found" : "Error")
    let cache = (type.hasPrefix("image/") || type.hasPrefix("font/")) ? "public, max-age=31536000" : "no-cache"
    let header = "HTTP/1.1 \(status) \(reason)\r\nContent-Type: \(type)\r\nContent-Length: \(body.count)\r\nConnection: close\r\nCache-Control: \(cache)\r\n\r\n"
    writeAll(client, Data(header.utf8))
    writeAll(client, body)
  }

  private static func writeAll(_ fd: Int32, _ data: Data) {
    data.withUnsafeBytes { raw in
      guard let base = raw.baseAddress else { return }
      var sent = 0
      while sent < raw.count {
        let chunk = write(fd, base.advanced(by: sent), raw.count - sent)
        if chunk > 0 {
          sent += chunk
        } else if chunk < 0 && errno == EINTR {
          continue
        } else {
          break
        }
      }
    }
  }
}

private func ignoreSignal(_ signal: Int32) {}

private enum PhoneSteps {
  static let pedometer = CMPedometer()
  static let lock = NSLock()
  static var cached = ""
  static var cachedAt = Date.distantPast

  static func json() -> Data {
    lock.lock()
    if !cached.isEmpty, Date().timeIntervalSince(cachedAt) < 20 {
      let data = Data(cached.utf8)
      lock.unlock()
      return data
    }
    lock.unlock()
    guard CMPedometer.isStepCountingAvailable() else {
      return Data("{\"ok\":false,\"reason\":\"unavailable\"}".utf8)
    }
    let semaphore = DispatchSemaphore(value: 0)
    var payload = "{\"ok\":false,\"reason\":\"timeout\"}"
    let start = Calendar.current.startOfDay(for: Date())
    pedometer.queryPedometerData(from: start, to: Date()) { data, _ in
      if let steps = data?.numberOfSteps.intValue {
        payload = "{\"ok\":true,\"steps\":\(steps)}"
      } else {
        payload = "{\"ok\":false,\"reason\":\"denied\"}"
      }
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 2)
    if payload.contains("\"ok\":true") {
      lock.lock()
      cached = payload
      cachedAt = Date()
      lock.unlock()
    }
    return Data(payload.utf8)
  }
}
