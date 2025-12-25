package expo.audiostreaming

import android.Manifest
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import expo.modules.core.interfaces.ExpoProp
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive
import java.nio.ByteBuffer
import java.nio.ByteOrder

class AudioStreamingModule : Module() {
  private var audioRecord: AudioRecord? = null
  private var isRecording = false
  private var recordingJob: Job? = null
  private val recordingScope = CoroutineScope(Dispatchers.IO)
  
  private val sampleRate = 16000
  private val channelConfig = AudioFormat.CHANNEL_IN_MONO
  private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
  private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat) * 2

  override fun definition() = ModuleDefinition {
    Name("AudioStreamingModule")

    AsyncFunction("startRecording") { promise: Promise ->
      try {
        if (isRecording) {
          promise.resolve(null)
          return@AsyncFunction
        }

        // Check permission
        val permissionManager = appContext.permissions
        val hasPermission = permissionManager?.hasGrantedPermissions(Manifest.permission.RECORD_AUDIO) ?: false

        if (!hasPermission) {
          promise.reject("PERMISSION_DENIED", "Microphone permission not granted", null)
          return@AsyncFunction
        }

        // Create AudioRecord
        audioRecord = AudioRecord(
          MediaRecorder.AudioSource.MIC,
          sampleRate,
          channelConfig,
          audioFormat,
          bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
          promise.reject("INIT_FAILED", "Failed to initialize AudioRecord", null)
          return@AsyncFunction
        }

        audioRecord?.startRecording()
        isRecording = true

        // Start streaming audio chunks
        recordingJob = recordingScope.launch {
          streamAudioChunks()
        }

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("START_FAILED", "Failed to start recording: ${e.message}", e)
      }
    }

    AsyncFunction("stopRecording") { promise: Promise ->
      try {
        isRecording = false
        recordingJob?.cancel()
        recordingJob = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("STOP_FAILED", "Failed to stop recording: ${e.message}", e)
      }
    }

    AsyncFunction("isRecording") { promise: Promise ->
      promise.resolve(isRecording)
    }
  }

  private suspend fun streamAudioChunks() {
    val buffer = ShortArray(bufferSize / 2) // 16-bit = 2 bytes per sample
    
    while (isActive && isRecording) {
      val audioRecord = this@AudioStreamingModule.audioRecord
      if (audioRecord == null || audioRecord.state != AudioRecord.STATE_INITIALIZED) {
        break
      }

      val samplesRead = audioRecord.read(buffer, 0, buffer.size)

      if (samplesRead > 0) {
        // Convert ShortArray to ByteArray
        val byteBuffer = ByteBuffer.allocate(samplesRead * 2)
        byteBuffer.order(ByteOrder.LITTLE_ENDIAN)
        for (sample in buffer.take(samplesRead)) {
          byteBuffer.putShort(sample)
        }
        val audioData = byteBuffer.array()

        // Convert to base64
        val base64Data = Base64.encodeToString(audioData, Base64.NO_WRAP)

        // Send event to JavaScript
        sendEvent("onAudioChunk", mapOf(
          "data" to base64Data,
          "mimeType" to "audio/pcm;rate=16000"
        ))
      }

      // Small delay to prevent overwhelming the event system
      kotlinx.coroutines.delay(50)
    }
  }
}

