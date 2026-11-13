import React from 'react';
import { View, Text, TouchableOpacity } from './native';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setActiveScreen } = useApp();

  return (
    <footer className="hidden md:block w-full bg-[#fbf2ed] dark:bg-[#161311] py-8 border-t border-[#dac2b4]/30 dark:border-[#2d2925] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <Text className="text-xs text-[#544339] dark:text-[#b5a499]">
          © 2024 SmileJourneyAI. Mindful holistic cosmetic wellness companionship.
        </Text>
        <View className="flex flex-row items-center gap-6">
          <TouchableOpacity
            onPress={() => setActiveScreen('account')}
            className="text-xs text-[#544339] dark:text-[#b5a499] hover:text-[#934b08] dark:hover:text-[#ffb785] transition-colors"
            accessibilityLabel="Privacy Sanctuary"
          >
            <Text className="text-xs text-[#544339] dark:text-[#b5a499]">Privacy Sanctuary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveScreen('specialists')}
            className="text-xs text-[#544339] dark:text-[#b5a499] hover:text-[#934b08] dark:hover:text-[#ffb785] transition-colors"
            accessibilityLabel="Support"
          >
            <Text className="text-xs text-[#544339] dark:text-[#b5a499]">Support</Text>
          </TouchableOpacity>
        </View>
      </div>
    </footer>
  );
};
