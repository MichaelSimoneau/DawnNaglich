import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const PrivacyPolicyContent: React.FC = () => {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-emerald-950">
      <View className="max-w-3xl mx-auto px-6 py-24">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center mb-12 opacity-60 hover:opacity-100 transition-opacity"
        >
          <Text className="text-emerald-400 mr-3">←</Text>
          <Text className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Back</Text>
        </TouchableOpacity>

        <Text className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">
          Privacy Policy
        </Text>
        <Text className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">
          Last Updated: December 20, 2024
        </Text>

        <View className="gap-y-12">
          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Introduction</Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              Welcome to Dawn Naglich Wellness. Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Information We Collect</Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              We collect information you provide directly to us when you book an appointment, such as your name, email address, and any session notes. We also collect data through Google Calendar integration if you choose to link your account.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">How We Use Information</Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light mb-4">
              We use the collected information to:
            </Text>
            <View className="ml-5 gap-y-2">
              <Text className="text-emerald-50/80 font-light">• Schedule and manage your appointments.</Text>
              <Text className="text-emerald-50/80 font-light">• Communicate with you regarding your sessions.</Text>
              <Text className="text-emerald-50/80 font-light">• Improve our services and user experience.</Text>
              <Text className="text-emerald-50/80 font-light">• Maintain the security of our website.</Text>
            </View>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Data Protection</Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              We implement industry-standard security measures to protect your data. Your information is stored securely via Firebase and Google Cloud services.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Your Rights</Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              You have the right to access, update, or delete your personal information at any time. Please contact us at dawn.naglich@gmail.com for any privacy-related requests.
            </Text>
          </View>
        </View>

        <View className="mt-24 pt-12 border-t border-emerald-900">
          <Text className="text-emerald-100/30 text-[10px] font-bold uppercase tracking-widest">
            Dawn Naglich Wellness | Solon, Ohio
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyContent;
