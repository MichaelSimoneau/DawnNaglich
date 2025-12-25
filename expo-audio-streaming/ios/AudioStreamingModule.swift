import AVFoundation
import ExpoModulesCore

public class AudioStreamingModule: Module {
  private var audioEngine: AVAudioEngine?
  private var inputNode: AVAudioInputNode?
  private var isRecording = false
  private let sampleRate: Double = 16000

  public func definition() -> ModuleDefinition {
    Name("AudioStreamingModule")

    AsyncFunction("startRecording") { (promise: Promise) in
      do {
        if self.isRecording {
          promise.resolve(nil)
          return
        }

        // Request microphone permission
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .default)
        try audioSession.setActive(true)

        // Check permission
        let permissionStatus = audioSession.recordPermission
        if permissionStatus == .denied {
          promise.reject("PERMISSION_DENIED", "Microphone permission not granted", nil)
          return
        }

        if permissionStatus == .undetermined {
          audioSession.requestRecordPermission { granted in
            if granted {
              DispatchQueue.main.async {
                self.startAudioEngine(promise: promise)
              }
            } else {
              promise.reject("PERMISSION_DENIED", "Microphone permission denied", nil)
            }
          }
          return
        }

        // Permission already granted
        startAudioEngine(promise: promise)
      } catch {
        promise.reject("START_FAILED", "Failed to start recording: \(error.localizedDescription)", error)
      }
    }

    AsyncFunction("stopRecording") { (promise: Promise) in
      do {
        self.isRecording = false
        
        if let audioEngine = self.audioEngine {
          audioEngine.stop()
          self.inputNode?.removeTap(onBus: 0)
        }
        
        self.audioEngine = nil
        self.inputNode = nil
        
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setActive(false)
        
        promise.resolve(nil)
      } catch {
        promise.reject("STOP_FAILED", "Failed to stop recording: \(error.localizedDescription)", error)
      }
    }

    AsyncFunction("isRecording") { (promise: Promise) in
      promise.resolve(self.isRecording)
    }
  }

  private func startAudioEngine(promise: Promise) {
    do {
      let audioEngine = AVAudioEngine()
      let inputNode = audioEngine.inputNode
      
      // Configure audio format
      let format = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: sampleRate,
        channels: 1,
        interleaved: false
      )
      
      guard let audioFormat = format else {
        promise.reject("INIT_FAILED", "Failed to create audio format", nil)
        return
      }

      // Install tap on input node
      let bufferSize: AVAudioFrameCount = 4096
      inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: audioFormat) { [weak self] buffer, _ in
        guard let self = self, self.isRecording else { return }
        
        // Convert buffer to PCM data
        guard let channelData = buffer.int16ChannelData else { return }
        let channelDataValue = channelData.pointee
        let frameLength = Int(buffer.frameLength)
        
        // Convert Int16 array to Data (little-endian)
        var audioData = Data(capacity: frameLength * 2)
        for i in 0..<frameLength {
          let sample = channelDataValue[i]
          audioData.append(contentsOf: withUnsafeBytes(of: sample.littleEndian) { Array($0) })
        }
        
        // Convert to base64
        let base64Data = audioData.base64EncodedString()
        
        // Send event to JavaScript
        self.sendEvent("onAudioChunk", [
          "data": base64Data,
          "mimeType": "audio/pcm;rate=16000"
        ])
      }

      // Start audio engine
      try audioEngine.start()
      
      self.audioEngine = audioEngine
      self.inputNode = inputNode
      self.isRecording = true
      
      promise.resolve(nil)
    } catch {
      promise.reject("START_FAILED", "Failed to start audio engine: \(error.localizedDescription)", error)
    }
  }
}

