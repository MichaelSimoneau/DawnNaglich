import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Link } from 'expo-router';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const openInstagram = () => {
    Linking.openURL('https://instagram.com/dawn_naglich');
  };

  return (
    <View className="w-full bg-emerald-950 px-10 py-20 border-t border-emerald-900">
      <View className="max-w-6xl mx-auto flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <View>
          <Text className="text-emerald-400 font-black text-xl tracking-tighter italic uppercase">
            Dawn Naglich
          </Text>
          <Text className="text-emerald-100/40 text-xs font-medium mt-2 uppercase tracking-widest">
            Elite Muscle Activation & Realignment
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-8">
          <Link href="/privacy" asChild>
            <TouchableOpacity>
              <Text className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors">
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </Link>
          <Link href="/terms" asChild>
            <TouchableOpacity>
              <Text className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors">
                Terms of Service
              </Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity onPress={openInstagram}>
            <Text className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors">
              Instagram
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="max-w-6xl mx-auto mt-20 pt-10 border-t border-emerald-900/50 flex-row justify-between items-center">
        <Text className="text-emerald-100/20 text-[9px] font-bold uppercase tracking-widest">
          &copy; {currentYear} Dawn Naglich Wellness. All rights reserved.
        </Text>
        <Text className="text-emerald-100/20 text-[9px] font-bold uppercase tracking-widest">
          Solon, OH
        </Text>
      </View>
    </View>
  );
};

export default Footer;

