import AuthenticationServices
import AVFoundation
import CryptoKit
import Foundation
import Security
import Speech
import UIKit

enum DaymarkServices {
  struct Answer {
    let status: Int
    let body: Data
  }

  static func prepare() {
    MarkBridge.importBundledKey()
  }

  static func response(for method: String, path: String, body: Data) -> Answer? {
    MarkBridge.importBundledKey()
    let route = String(path.split(separator: "?").first ?? Substring(path))
    switch (method, route) {
    case ("GET", "/account"):
      return Answer(status: 200, body: AccountCloud.status())
    case ("POST", "/account/apple"):
      return Answer(status: 200, body: AccountCloud.signInWithApple())
    case ("POST", "/account/google"):
      return Answer(status: 200, body: AccountCloud.signInWithGoogle())
    case ("POST", "/account/signout"):
      return Answer(status: 200, body: AccountCloud.signOut())
    case ("GET", "/mark/status"):
      return Answer(status: 200, body: MarkBridge.status())
    case ("POST", "/mark/key"):
      return Answer(status: 200, body: MarkBridge.saveKey(body))
    case ("POST", "/mark/listen"):
      return Answer(status: 200, body: MarkBridge.listen())
    case ("POST", "/mark/chat"):
      return Answer(status: 200, body: MarkBridge.chat(body))
    case ("POST", "/mark/plate"):
      return Answer(status: 200, body: MarkBridge.plate(body))
    default:
      return nil
    }
  }
}

private func serviceJSON(_ object: [String: Any]) -> Data {
  (try? JSONSerialization.data(withJSONObject: object)) ?? Data("{}".utf8)
}

private func serviceObject(_ data: Data) -> [String: Any] {
  (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
}

private enum SecretStore {
  private static let service = "app.daymark.bezruk"

  static func set(_ account: String, _ value: String) {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
    SecItemDelete(query as CFDictionary)
    var insert = query
    insert[kSecValueData as String] = Data(value.utf8)
    SecItemAdd(insert as CFDictionary, nil)
  }

  static func get(_ account: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static func remove(_ account: String) {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
    SecItemDelete(query as CFDictionary)
  }
}

private func topViewController() -> UIViewController? {
  let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
    ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
  let window = scene?.windows.first { $0.isKeyWindow } ?? scene?.windows.first
  var controller = window?.rootViewController
  while let presented = controller?.presentedViewController { controller = presented }
  return controller
}

enum AccountCloud {
  private static let identityKey = "account-identity"

  static func mirror(_ data: Data) {
    guard let identity = current() else { return }
    if identity["provider"] as? String == "apple" { writeCloud(data, name: "daymark-store.json") }
    if identity["provider"] as? String == "google" { GoogleDrive.upload(data) }
  }

  static func status() -> Data {
    let identity = current() ?? [:]
    let provider = identity["provider"] as? String ?? ""
    return serviceJSON([
      "ok": true,
      "signedIn": !provider.isEmpty,
      "provider": provider,
      "name": identity["name"] as? String ?? "",
      "cloud": provider == "apple" ? "icloud" : provider == "google" ? "drive" : "device"
    ])
  }

  static func signOut() -> Data {
    SecretStore.remove(identityKey)
    SecretStore.remove("google-token")
    return serviceJSON(["ok": true])
  }

  static func signInWithApple() -> Data {
    let gate = DispatchSemaphore(value: 0)
    let holder = AppleSignIn()
    holder.gate = gate
    DispatchQueue.main.async { holder.start() }
    _ = gate.wait(timeout: .now() + 180)
    return serviceJSON(holder.result)
  }

  static func signInWithGoogle() -> Data {
    guard let client = Bundle.main.object(forInfoDictionaryKey: "DaymarkGoogleClientID") as? String, !client.isEmpty else {
      return serviceJSON(["ok": false, "reason": "google-client"])
    }
    let gate = DispatchSemaphore(value: 0)
    let holder = GoogleSignIn(clientID: client)
    holder.gate = gate
    DispatchQueue.main.async { holder.start() }
    _ = gate.wait(timeout: .now() + 180)
    return serviceJSON(holder.result)
  }

  fileprivate static func remember(provider: String, subject: String, name: String) {
    let payload: [String: String] = ["provider": provider, "subject": subject, "name": name]
    if let data = try? JSONSerialization.data(withJSONObject: payload), let text = String(data: data, encoding: .utf8) {
      SecretStore.set(identityKey, text)
    }
  }

  private static func current() -> [String: Any]? {
    guard let text = SecretStore.get(identityKey), let data = text.data(using: .utf8) else { return nil }
    return serviceObject(data)
  }

  private static func writeCloud(_ data: Data, name: String) {
    guard let root = FileManager.default.url(forUbiquityContainerIdentifier: nil) else { return }
    let folder = root.appendingPathComponent("Documents", isDirectory: true)
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    try? data.write(to: folder.appendingPathComponent(name), options: .atomic)
  }
}

private final class AppleSignIn: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  var gate: DispatchSemaphore?
  var result: [String: Any] = ["ok": false, "reason": "cancelled"]
  private var controller: ASAuthorizationController?

  func start() {
    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = []
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    controller.performRequests()
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    topViewController()?.view.window ?? ASPresentationAnchor()
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else { finish(["ok": false, "reason": "cancelled"]); return }
    let given = [credential.fullName?.givenName, credential.fullName?.familyName].compactMap { $0 }.joined(separator: " ")
    AccountCloud.remember(provider: "apple", subject: credential.user, name: given)
    finish(["ok": true, "provider": "apple", "name": given])
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    finish(["ok": false, "reason": "cancelled"])
  }

  private func finish(_ value: [String: Any]) {
    result = value
    gate?.signal()
  }
}

private final class GoogleSignIn: NSObject, ASWebAuthenticationPresentationContextProviding {
  let clientID: String
  var gate: DispatchSemaphore?
  var result: [String: Any] = ["ok": false, "reason": "cancelled"]
  private var session: ASWebAuthenticationSession?
  private let verifier = pkceVerifier()

  init(clientID: String) { self.clientID = clientID }

  func start() {
    var parts = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
    parts.queryItems = [
      URLQueryItem(name: "client_id", value: clientID),
      URLQueryItem(name: "redirect_uri", value: "daymark://oauth"),
      URLQueryItem(name: "response_type", value: "code"),
      URLQueryItem(name: "scope", value: "openid profile https://www.googleapis.com/auth/drive.appdata"),
      URLQueryItem(name: "code_challenge", value: pkceChallenge(verifier)),
      URLQueryItem(name: "code_challenge_method", value: "S256")
    ]
    guard let url = parts.url else { finish(["ok": false, "reason": "cancelled"]); return }
    let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "daymark") { [weak self] callback, _ in
      guard let self = self, let code = URLComponents(url: callback ?? URL(string: "daymark://oauth")!, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
        self?.finish(["ok": false, "reason": "cancelled"]); return
      }
      self.exchange(code)
    }
    session.presentationContextProvider = self
    session.prefersEphemeralWebBrowserSession = false
    self.session = session
    if !session.start() { finish(["ok": false, "reason": "cancelled"]) }
  }

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    topViewController()?.view.window ?? ASPresentationAnchor()
  }

  private func exchange(_ code: String) {
    var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    let form = [
      "code": code, "client_id": clientID, "code_verifier": verifier,
      "redirect_uri": "daymark://oauth", "grant_type": "authorization_code"
    ].map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" }.joined(separator: "&")
    request.httpBody = Data(form.utf8)
    URLSession.shared.dataTask(with: request) { data, _, _ in
      let object = serviceObject(data ?? Data())
      guard let token = object["access_token"] as? String else { self.finish(["ok": false, "reason": "cancelled"]); return }
      SecretStore.set("google-token", token)
      let subject = (object["id_token"] as? String) ?? "google"
      AccountCloud.remember(provider: "google", subject: subject, name: "Google")
      self.finish(["ok": true, "provider": "google", "name": "Google"])
    }.resume()
  }

  private func finish(_ value: [String: Any]) {
    result = value
    gate?.signal()
  }
}

private func pkceVerifier() -> String {
  var bytes = [UInt8](repeating: 0, count: 32)
  _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
  return Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}

private func pkceChallenge(_ verifier: String) -> String {
  let digest = SHA256.hash(data: Data(verifier.utf8))
  return Data(digest).base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}

private enum GoogleDrive {
  static func upload(_ data: Data) {
    guard let token = SecretStore.get("google-token") else { return }
    var request = URLRequest(url: URL(string: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart")!)
    request.httpMethod = "POST"
    let boundary = "daymark-\(UUID().uuidString)"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.setValue("multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    let meta = "{\"name\":\"daymark-store.json\",\"parents\":[\"appDataFolder\"]}"
    var body = Data()
    body.append(Data("--\(boundary)\r\nContent-Type: application/json; charset=utf-8\r\n\r\n\(meta)\r\n".utf8))
    body.append(Data("--\(boundary)\r\nContent-Type: application/json\r\n\r\n".utf8))
    body.append(data)
    body.append(Data("\r\n--\(boundary)--\r\n".utf8))
    request.httpBody = body
    URLSession.shared.dataTask(with: request).resume()
  }
}

private enum MarkBridge {
  static func importBundledKey() {
    guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
    let local = documents.appendingPathComponent("MarkKey.local")
    if let text = try? String(contentsOf: local, encoding: .utf8) {
      let key = text.split(whereSeparator: \.isNewline).map { $0.trimmingCharacters(in: .whitespaces) }.first { $0.hasPrefix("sk-") } ?? ""
      if key.count >= 20 {
        SecretStore.set("mark-key", key)
        try? FileManager.default.removeItem(at: local)
      }
    }
    if !FileManager.default.fileExists(atPath: local.path) {
      try? "# Один рядок, що починається на sk-.\n".write(to: local, atomically: true, encoding: .utf8)
    }
  }

  static func status() -> Data {
    serviceJSON(["ok": true, "hasKey": !(SecretStore.get("mark-key") ?? "").isEmpty, "speech": true])
  }

  static func saveKey(_ body: Data) -> Data {
    let key = (serviceObject(body)["key"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if key.isEmpty { SecretStore.remove("mark-key") } else { SecretStore.set("mark-key", key) }
    return serviceJSON(["ok": true])
  }

  static func listen() -> Data {
    let gate = DispatchSemaphore(value: 0)
    let holder = SpeechListen()
    holder.gate = gate
    DispatchQueue.main.async { holder.start() }
    _ = gate.wait(timeout: .now() + 20)
    return serviceJSON(holder.result)
  }

  static func chat(_ body: Data) -> Data {
    guard let key = SecretStore.get("mark-key"), !key.isEmpty else { return serviceJSON(["ok": false, "reason": "no-key"]) }
    let incoming = serviceObject(body)
    let text = incoming["text"] as? String ?? ""
    let context = incoming["context"] as? [String: Any] ?? [:]
    let system = "Ти Марк, помічник застосунку Daymark. Відповідай українською, коротко, на ти. Ти записуєш їжу, підказуєш страву в межах калорій, враховуєш кроки й тренування, хвалиш, підтримуєш, м’яко повертаєш до цілі без сорому і можеш запропонувати медитацію або тип тренування. Якщо розмова про моду, погоду, політику, новини чи будь-що поза днем людини в Daymark — одразу поверни її до їжі, руху, сну або самопочуття. Не вигадуй медичних призначень. Не проси дані акаунта."
    let payload: [String: Any] = [
      "model": "gpt-4o-mini",
      "messages": [
        ["role": "system", "content": system],
        ["role": "user", "content": "Контекст дня: \(context). Фраза: \(text)"]
      ]
    ]
    return openai(key: key, path: "/v1/chat/completions", payload: payload) { object in
      let choices = object["choices"] as? [[String: Any]] ?? []
      let message = choices.first?["message"] as? [String: Any]
      let reply = message?["content"] as? String ?? ""
      return ["ok": !reply.isEmpty, "reply": reply]
    }
  }

  static func plate(_ body: Data) -> Data {
    guard let key = SecretStore.get("mark-key"), !key.isEmpty else { return serviceJSON(["ok": false, "reason": "no-key"]) }
    let image = serviceObject(body)["image"] as? String ?? ""
    guard image.hasPrefix("data:image/") else { return serviceJSON(["ok": false, "reason": "image"]) }
    let prompt = "Подивись на тарілку. Поверни лише JSON {\"foods\":[{\"name\":\"українською\",\"fraction\":0.5,\"grams\":180,\"kcal\":240,\"p\":10,\"f\":8,\"c\":20,\"meal\":\"dinner\"}]}. fraction — частка тарілки від 0 до 1. Калорії — приблизна оцінка порції, не точний лабораторний вимір. Якщо їжі не видно, foods — порожній масив."
    let payload: [String: Any] = [
      "model": "gpt-4o-mini",
      "messages": [[
        "role": "user",
        "content": [
          ["type": "text", "text": prompt],
          ["type": "image_url", "image_url": ["url": image]]
        ]
      ]]
    ]
    return openai(key: key, path: "/v1/chat/completions", payload: payload) { object in
      let choices = object["choices"] as? [[String: Any]] ?? []
      let message = choices.first?["message"] as? [String: Any]
      var text = message?["content"] as? String ?? ""
      if let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}") { text = String(text[start...end]) }
      let parsed = serviceObject(text.data(using: .utf8) ?? Data())
      let foods = parsed["foods"] as? [[String: Any]] ?? []
      return ["ok": true, "foods": foods]
    }
  }

  private static func openai(key: String, path: String, payload: [String: Any], map: @escaping ([String: Any]) -> [String: Any]) -> Data {
    var request = URLRequest(url: URL(string: "https://api.openai.com" + path)!)
    request.httpMethod = "POST"
    request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 30
    request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
    let gate = DispatchSemaphore(value: 0)
    var result: [String: Any] = ["ok": false, "reason": "network"]
    URLSession.shared.dataTask(with: request) { data, _, _ in
      result = map(serviceObject(data ?? Data()))
      gate.signal()
    }.resume()
    _ = gate.wait(timeout: .now() + 35)
    return serviceJSON(result)
  }
}

private final class SpeechListen: NSObject, SFSpeechRecognizerDelegate {
  var gate: DispatchSemaphore?
  var result: [String: Any] = ["ok": false, "reason": "empty"]
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "uk-UA"))
  private let audio = AVAudioEngine()
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var finished = false
  private var tapped = false

  func start() {
    SFSpeechRecognizer.requestAuthorization { status in
      DispatchQueue.main.async {
        guard status == .authorized else { self.finish(["ok": false, "reason": "denied"]); return }
        AVAudioSession.sharedInstance().requestRecordPermission { allowed in
          DispatchQueue.main.async {
            guard allowed else { self.finish(["ok": false, "reason": "denied"]); return }
            self.record()
          }
        }
      }
    }
  }

  private func record() {
    guard let recognizer = recognizer, recognizer.isAvailable else { finish(["ok": false, "reason": "unavailable"]); return }
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.record, mode: .measurement, options: .duckOthers)
    try? session.setActive(true, options: .notifyOthersOnDeactivation)
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = false
    self.request = request
    let input = audio.inputNode
    let format = input.outputFormat(forBus: 0)
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in request.append(buffer) }
    tapped = true
    audio.prepare()
    do { try audio.start() } catch { finish(["ok": false, "reason": "unavailable"]); return }
    task = recognizer.recognitionTask(with: request) { [weak self] speech, error in
      guard let self = self else { return }
      let text = speech?.bestTranscription.formattedString ?? ""
      let done = speech?.isFinal == true || error != nil
      if done { self.finish(text.isEmpty ? ["ok": false, "reason": "empty"] : ["ok": true, "text": text]) }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
      guard let self = self, self.gate != nil else { return }
      self.finish(["ok": false, "reason": "empty"])
    }
  }

  private func finish(_ value: [String: Any]) {
    if finished { return }
    finished = true
    audio.stop()
    if tapped { audio.inputNode.removeTap(onBus: 0); tapped = false }
    request?.endAudio()
    task?.cancel()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    result = value
    gate?.signal()
    gate = nil
  }
}
