import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types';

export const BottomTabBar: React.FC = () => {
  const { activeScreen, setActiveScreen, currentUser } = useApp();

  const tabs: { label: string; screen: ScreenType; icon: string }[] = currentUser
    ? [
        { label: 'Sanctuary', screen: 'home', icon: 'home' },
        { label: 'AI Scan', screen: 'scan', icon: 'photo_camera' },
        { label: 'Progress', screen: 'progress', icon: 'auto_graph' },
        { label: 'Account', screen: 'account', icon: 'person' },
      ]
    : [
        { label: 'Overview', screen: 'welcome', icon: 'spa' },
        { label: 'Scan Demo', screen: 'scan', icon: 'photo_camera' },
        { label: 'Specialists', screen: 'specialists', icon: 'medical_services' },
        { label: 'Sign In', screen: 'account', icon: 'login' },
      ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-2.5 pb-2.5 sm:pb-3 sm:px-3 pt-1 pointer-events-none md:hidden"
      role="tablist"
      aria-label="Bottom Navigation"
    >
      <nav
        aria-label="Mobile Navigation Bar"
        className="pointer-events-auto max-w-sm mx-auto bg-[#fff8f5]/95 dark:bg-[#24201d]/95 backdrop-blur-xl rounded-full px-1.5 py-1 sm:px-2 sm:py-1.5 shadow-[0_-4px_25px_rgba(36,32,29,0.12),0_2px_10px_rgba(224,135,68,0.16)] border border-[#dac2b4]/50 dark:border-[#3d3732] flex items-center justify-around"
      >
        {tabs.map((tab) => {
          const isActive =
            activeScreen === tab.screen ||
            (tab.screen === 'scan' && activeScreen === 'report') ||
            (tab.screen === 'home' && activeScreen === 'specialists' && currentUser !== null);

          return (
            <button
              key={tab.screen}
              type="button"
              onClick={() => setActiveScreen(tab.screen)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 sm:px-3 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#e08744] text-white shadow-xs scale-102'
                  : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18] dark:hover:text-[#f7eee9]'
              }`}
              aria-label={`${tab.label} tab`}
              aria-selected={isActive}
              role="tab"
            >
              <span
                className="material-symbols-outlined text-[19px] sm:text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-semibold tracking-tight mt-0.5 leading-none ${
                  isActive ? 'text-white' : 'text-[#544339] dark:text-[#b5a499]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
