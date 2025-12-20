import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const TermsAndConditionsContent: React.FC = () => {
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
          Terms of Service
        </h1>
        <Text className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">
          Effective Date: December 20, 2024
        </Text>

        <div className="space-y-12 text-emerald-50/80 leading-relaxed font-light">
          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing our website and services, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">2. Services</h2>
            <p>
              Dawn Naglich Wellness provides Muscle Activation, Functional Realignment, and related wellness services. All sessions are subject to availability and professional assessment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">3. Booking and Cancellations</h2>
            <p>
              Appointments must be booked through our online system. We require 24 hours' notice for cancellations or rescheduling. Failure to provide notice may result in a cancellation fee.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">4. Liability</h2>
            <p>
              While our techniques are designed for recovery and performance, clients acknowledge that any physical therapy or massage involves inherent risks. Clients agree to disclose all medical conditions prior to treatment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">5. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to the website.
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

export default TermsAndConditionsContent;

