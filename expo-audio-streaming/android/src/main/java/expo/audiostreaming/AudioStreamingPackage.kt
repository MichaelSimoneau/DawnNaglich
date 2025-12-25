package expo.audiostreaming

import expo.modules.kotlin.Package

class AudioStreamingPackage : Package {
  override fun definition() = expo.modules.kotlin.modules.ModuleDefinition {
    Module(AudioStreamingModule::class)
  }
}

