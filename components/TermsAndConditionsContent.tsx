import React from "react";
import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

const TermsAndConditionsContent: React.FC = () => {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-emerald-950">
      <View className="max-w-3xl mx-auto px-6 py-24">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-12 opacity-60 hover:opacity-100 transition-opacity"
        >
          <Text className="text-emerald-400 mr-3">←</Text>
          <Text className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">
            Back
          </Text>
        </TouchableOpacity>

        <Text className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">
          Terms of Service
        </Text>
        <Text className="text-emerald-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">
          Effective Date: December 20, 2024
        </Text>

        <View className="gap-y-12">
          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">
              1. Agreement to Terms
            </Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              By accessing our website and services, you agree to be bound by
              these Terms and Conditions. If you do not agree, please do not use
              our services.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">
              2. Services
            </Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              Dawn Naglich Wellness provides Muscle Activation, Functional
              Realignment, and related wellness services. All sessions are
              subject to availability and professional assessment.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">
              3. Booking and Cancellations
            </Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              Appointments must be booked through our online system. We require
              24 hours&apos; notice for cancellations or rescheduling. Failure to
              provide notice may result in a cancellation fee.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">
              4. Liability
            </Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              While our techniques are designed for recovery and performance,
              clients acknowledge that any physical therapy or massage involves
              inherent risks. Clients agree to disclose all medical conditions
              prior to treatment.
            </Text>
          </View>

          <View>
            <Text className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-4">
              5. Modifications
            </Text>
            <Text className="text-emerald-50/80 leading-relaxed font-light">
              We reserve the right to modify these terms at any time. Changes
              will be effective immediately upon posting to the website.
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

export default TermsAndConditionsContent;
