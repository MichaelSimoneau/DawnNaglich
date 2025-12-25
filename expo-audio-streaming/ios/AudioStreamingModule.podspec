Pod::Spec.new do |s|
  s.name           = 'AudioStreamingModule'
  s.version        = '1.0.0'
  s.summary        = 'Expo module for real-time audio streaming'
  s.description    = 'Expo module for real-time audio streaming on iOS and Android'
  s.author         = ''
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '13.0' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end

