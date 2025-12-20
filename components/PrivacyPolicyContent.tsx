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
          <i className="fa-solid fa-arrow-left text-emerald-400 mr-3"></i>
          <Text className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Back</Text>
        </TouchableOpacity>

        <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">
          Privacy Policy
        </h1>
        <Text className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">
          Last Updated: December 20, 2024
        </Text>

        <div className="space-y-12 text-emerald-50/80 leading-relaxed font-light">
          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Introduction</h2>
            <p>
              Welcome to Dawn Naglich Wellness. Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you book an appointment, such as your name, email address, and any session notes. We also collect data through Google Calendar integration if you choose to link your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">How We Use Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc ml-5 mt-4 space-y-2">
              <li>Schedule and manage your appointments.</li>
              <li>Communicate with you regarding your sessions.</li>
              <li>Improve our services and user experience.</li>
              <li>Maintain the security of our website.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Data Protection</h2>
            <p>
              We implement industry-standard security measures to protect your data. Your information is stored securely via Firebase and Google Cloud services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time. Please contact us at dawn.naglich@gmail.com for any privacy-related requests.
            </p>
          </section>
        </div>

        <View className="mt-24 pt-12 border-t border-emerald-900">
          <Text className="text-emerald-100/30 text-[10px] font-bold uppercase tracking-widest">
            Dawn Naglich Wellness | Chesterland, Ohio
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default PrivacyPolicyContent;

