import React from 'react';
import { View, Text } from './native';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-300 pointer-events-none">
      <View className="bg-[#24201d] dark:bg-[#f7eee9] text-[#f7eee9] dark:text-[#1f1b18] px-4 py-2.5 rounded-full shadow-2xl flex flex-row items-center gap-2 border border-white/10 dark:border-black/10">
        <span className="material-symbols-outlined text-[#a9f2d0] dark:text-[#206a50] text-[18px]">
          check_circle
        </span>
        <Text className="text-xs font-semibold text-white dark:text-[#1f1b18]">
          {toastMessage}
        </Text>
      </View>
    </div>
  );
};
