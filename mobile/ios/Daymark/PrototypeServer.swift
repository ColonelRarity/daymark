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

  private struct Request {
    let method: String
    let path: String
    let body: Data
  }

  private static let headerTerminator = Data("\r\n\r\n".utf8)
  private static let maxBody = 64 * 1024 * 1024

  private static func readRequest(_ client: Int32) -> Request? {
    var timeout = timeval(tv_sec: 5, tv_usec: 0)
    setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
    var nosig: Int32 = 1
    setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &nosig, socklen_t(MemoryLayout<Int32>.size))
    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 65536)
    var headerEnd: Range<Data.Index>? = nil
    while headerEnd == nil && data.count < 65536 {
      let count = read(client, &buffer, buffer.count)
      if count > 0 {
        data.append(buffer, count: count)
        headerEnd = data.range(of: headerTerminator)
      } else if count < 0 && errno == EINTR {
        continue
      } else {
        break
      }
    }
    guard let end = headerEnd, let head = String(data: data[data.startIndex..<end.lowerBound], encoding: .isoLatin1) else { return nil }
    let lines = head.components(separatedBy: "\r\n")
    guard let first = lines.first else { return nil }
    let parts = first.split(separator: " ")
    guard parts.count >= 2 else { return nil }
    var contentLength = 0
    for line in lines.dropFirst() {
      let pair = line.split(separator: ":", maxSplits: 1)
      if pair.count == 2, pair[0].trimmingCharacters(in: .whitespaces).lowercased() == "content-length" {
        contentLength = Int(pair[1].trimmingCharacters(in: .whitespaces)) ?? 0
      }
    }
    guard contentLength >= 0, contentLength <= maxBody else { return nil }
    var body = Data(data[end.upperBound..<data.endIndex])
    while body.count < contentLength {
      let count = read(client, &buffer, min(buffer.count, contentLength - body.count))
      if count > 0 {
        body.append(buffer, count: count)
      } else if count < 0 && errno == EINTR {
        continue
      } else {
        break
      }
    }
    guard body.count >= contentLength else { return nil }
    return Request(method: String(parts[0]), path: String(parts[1]), body: body.prefix(contentLength))
  }

  private static func respond(_ client: Int32) {
    guard let request = readRequest(client) else { return }
    let requestPath = request.path
    if requestPath == "/store" || requestPath.hasPrefix("/store?") {
      switch request.method {
      case "GET":
        send(client, status: 200, body: LocalStore.readResponse(), type: "application/json; charset=utf-8")
      case "PUT", "POST":
        switch LocalStore.write(request.body) {
        case .saved(let revision):
          send(client, status: 200, body: Data("{\"ok\":true,\"revision\":\(revision)}".utf8), type: "application/json; charset=utf-8")
        case .stale(let revision):
          send(client, status: 409, body: Data("{\"ok\":false,\"reason\":\"stale\",\"revision\":\(revision)}".utf8), type: "application/json; charset=utf-8")
        case .invalid:
          send(client, status: 422, body: Data("{\"ok\":false,\"reason\":\"invalid\"}".utf8), type: "application/json; charset=utf-8")
        }
      default:
        send(client, status: 405, body: Data(), type: "text/plain")
      }
      return
    }
    if let handled = DaymarkServices.response(for: request.method, path: requestPath, body: request.body) {
      send(client, status: handled.status, body: handled.body, type: "application/json; charset=utf-8")
      return
    }
    guard request.method == "GET" else {
      send(client, status: 405, body: Data(), type: "text/plain")
      return
    }
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
    let reason = status == 200 ? "OK" : (status == 404 ? "Not Found" : status == 422 ? "Unprocessable" : "Error")
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

/// The person's data as one JSON file in Application Support, not in WebView storage.
/// Every write goes to a temp file and is renamed over the previous one; the previous
/// valid copy is kept as `store.bak`. A damaged main file is quarantined, never deleted.
enum LocalStore {
  private static let lock = NSLock()

  private static var directory: URL? {
    guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
    let dir = base.appendingPathComponent("Daymark", isDirectory: true)
    if !FileManager.default.fileExists(atPath: dir.path) {
      try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
  }

  private static var mainURL: URL? { directory?.appendingPathComponent("store.json") }
  private static var backupURL: URL? { directory?.appendingPathComponent("store.bak") }
  private static var tempURL: URL? { directory?.appendingPathComponent("store.tmp") }

  /// Accepts only an envelope `{ "format": "daymark-store", "keys": { ... } }`.
  private static func envelope(_ data: Data) -> [String: Any]? {
    guard !data.isEmpty, let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    guard object["format"] as? String == "daymark-store", object["keys"] is [String: Any] else { return nil }
    return object
  }

  private static func validData(at url: URL?) -> Data? {
    guard let url = url, let data = try? Data(contentsOf: url) else { return nil }
    return envelope(data) == nil ? nil : data
  }

  static func readResponse() -> Data {
    lock.lock()
    defer { lock.unlock() }
    var source = "empty"
    var store: Data? = nil
    var damaged = false
    let mainExists = mainURL.map { FileManager.default.fileExists(atPath: $0.path) } ?? false
    if let data = validData(at: mainURL) {
      source = "main"
      store = data
    } else {
      if mainExists {
        damaged = true
        quarantineMain()
      }
      if let data = validData(at: backupURL) {
        source = "backup"
        store = data
      }
    }
    var body = Data("{\"ok\":true,\"source\":\"\(source)\",\"damaged\":\(damaged ? "true" : "false"),\"store\":".utf8)
    body.append(store ?? Data("null".utf8))
    body.append(Data("}".utf8))
    return body
  }

  /// One copy per calendar day, the first state seen that day, kept for a week.
  /// Protects against a copy that is valid JSON but semantically broken replacing `.bak`.
  private static func keepDailySnapshot(_ previous: Data) {
    guard let dir = directory else { return }
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    let stamp = formatter.string(from: Date())
    let target = dir.appendingPathComponent("store.day-\(stamp).json")
    if !FileManager.default.fileExists(atPath: target.path) {
      try? previous.write(to: target, options: [.atomic])
    }
    guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir.path) else { return }
    let daily = names.filter { $0.hasPrefix("store.day-") }.sorted()
    if daily.count > 7 {
      for name in daily.prefix(daily.count - 7) {
        try? FileManager.default.removeItem(at: dir.appendingPathComponent(name))
      }
    }
  }

  private static func quarantineMain() {
    guard let main = mainURL, let dir = directory else { return }
    let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
    let target = dir.appendingPathComponent("store.damaged-\(stamp).json")
    try? FileManager.default.moveItem(at: main, to: target)
  }

  enum WriteResult {
    case saved(Int)
    case stale(Int)
    case invalid
  }

  private static func revision(of data: Data) -> Int {
    guard let object = envelope(data), let number = object["revision"] as? NSNumber else { return 0 }
    return number.intValue
  }

  static func write(_ data: Data) -> WriteResult {
    guard envelope(data) != nil else { return .invalid }
    lock.lock()
    defer { lock.unlock() }
    guard let main = mainURL, let backup = backupURL, let temp = tempURL else { return .invalid }
    let incoming = revision(of: data)
    let current = validData(at: main).map(revision(of:)) ?? validData(at: backupURL).map(revision(of:)) ?? 0
    if current > 0 && incoming <= current { return .stale(current) }
    do {
      try data.write(to: temp, options: [.atomic])
      if let previous = validData(at: main) {
        try previous.write(to: backup, options: [.atomic])
        keepDailySnapshot(previous)
      }
      if rename(temp.path, main.path) != 0 {
        _ = try? FileManager.default.replaceItemAt(main, withItemAt: temp)
      }
      guard FileManager.default.fileExists(atPath: main.path) else { return .invalid }
      AccountCloud.mirror(data)
      return .saved(incoming)
    } catch {
      return .invalid
    }
  }
}

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
