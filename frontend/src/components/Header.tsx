import React from 'react';
import { View, Text, TouchableOpacity, Image } from './native';
import { useApp } from '../context/AppContext';
import type { ScreenType } from '../types';

export const Header: React.FC = () => {
  const {
    activeScreen,
    setActiveScreen,
    isDarkMode,
    toggleDarkMode,
    userName,
    milestones,
    currentUser,
    openAuthModal,
    installPWA,
    isInstalled,
    isInstallable,
  } = useApp();

  const navItems: { label: string; screen: ScreenType }[] = currentUser
    ? [
        { label: 'Sanctuary', screen: 'home' },
        { label: 'Scan', screen: 'scan' },
        { label: 'Report', screen: 'report' },
        { label: 'Specialists', screen: 'specialists' },
        { label: 'Progress', screen: 'progress' },
        { label: 'Account', screen: 'account' },
        { label: 'About', screen: 'welcome' },
      ]
    : [
        { label: 'Overview', screen: 'welcome' },
        { label: 'Sanctuary Preview', screen: 'home' },
        { label: 'AI Scan Demo', screen: 'scan' },
        { label: 'Specialists', screen: 'specialists' },
        { label: 'Account', screen: 'account' },
      ];

  const logoUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDyCgZG30HFfJ0W9AP2EE2urHyTqg4rj3lf8nsUJBW70QFrnI9mFUTSeC26eB1PpUD5Wrl6M4aiCyBSE_VmD-zMGfhPWzquJBsb-h3Kn9-UsdEM2vkNg3LUrl56tLuVmGhII_OI0HfG0XGQUMYeDyik_qS-pgBLjb_5D7vSXml1TMkdyNnkNp9BIGmf_kP_qQSvRfKQcxqLBQkgVJasHnoDM6HvlT1G2BbJU0DdZ3tjlyn6NaXVd9Z69Q';

  const userPhoto = currentUser?.photoURL || (milestones.length > 0 ? milestones[0].photoUrl : null);
  const userInitial = (currentUser?.displayName || userName).trim().charAt(0).toUpperCase() || 'G';

  return (
    <header className="sticky top-0 z-50 w-full bg-[#fff8f5]/95 dark:bg-[#1f1b18]/95 backdrop-blur-xl border-b border-[#dac2b4]/40 dark:border-[#38332e] transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Name */}
        <TouchableOpacity
          onPress={() => setActiveScreen(currentUser ? 'home' : 'welcome')}
          className="flex flex-row items-center gap-1.5 sm:gap-2.5 group cursor-pointer shrink-0"
          accessibilityLabel="SmileJourneyAI Home"
        >
          <Image
            source={{ uri: logoUrl }}
            alt="SmileJourneyAI Logo"
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col text-left">
            <Text className="font-editorial text-base sm:text-lg font-bold tracking-tight text-[#934b08] dark:text-[#ffb785] leading-tight">
              <span className="inline sm:hidden">SmileJourney</span>
              <span className="hidden sm:inline">SmileJourneyAI</span>
            </Text>
            <span className="hidden sm:inline text-[10px] text-[#544339] dark:text-[#b5a499] font-medium tracking-wide leading-none">
              Cosmetic Wellness
            </span>
          </div>
        </TouchableOpacity>

        {/* Desktop Navigation Links (Visible on screens >= 768px) */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-5 mx-auto" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeScreen === item.screen;
            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => setActiveScreen(item.screen)}
                className={`text-sm font-medium transition-colors px-2 py-1 rounded-md cursor-pointer ${
                  isActive
                    ? 'text-[#934b08] dark:text-[#ffb785] font-semibold underline underline-offset-4 decoration-2'
                    : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18] dark:hover:text-[#f7eee9]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button */}
          <button
            type="button"
            onClick={installPWA}
            title={isInstalled ? 'App Running in Standalone Mode' : 'Install SmileJourney App to Device'}
            aria-label={isInstalled ? 'App Installed' : 'Install SmileJourney App'}
            className={`h-8 w-8 sm:h-auto sm:w-auto p-1.5 sm:px-2.5 sm:py-1.5 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs ${
              isInstalled
                ? 'bg-[#a9f2d0]/60 dark:bg-[#1b4a38]/60 text-[#206a50] dark:text-[#8dd5b5]'
                : isInstallable
                ? 'bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] hover:bg-[#e08744] hover:text-white ring-1 ring-[#e08744]/40'
                : 'bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] hover:text-[#934b08] dark:hover:text-[#ffb785]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isInstalled ? 'verified' : 'install_mobile'}
            </span>
            <span className="hidden sm:inline">
              {isInstalled ? 'Installed' : 'Install App'}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to Warm Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDarkMode ? 'Switch to Warm Light Mode' : 'Switch to Dark Mode'}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] hover:text-[#934b08] dark:hover:text-[#ffb785] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Auth Button or Profile Avatar */}
          {currentUser ? (
            <TouchableOpacity
              onPress={() => setActiveScreen('account')}
              className="relative p-0.5 rounded-full ring-2 ring-[#e08744]/40 hover:ring-[#e08744] transition-all cursor-pointer"
              accessibilityLabel="View Account Settings"
            >
              {userPhoto ? (
                <Image
                  source={{ uri: userPhoto }}
                  alt="Your Profile"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center font-bold text-xs">
                  {userInitial}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#206a50] rounded-full ring-2 ring-[#fff8f5] dark:ring-[#1f1b18]"></span>
            </TouchableOpacity>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                aria-label="Sign In"
              >
                <span className="material-symbols-outlined text-[15px]">login</span>
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('signup')}
                className="hidden sm:flex px-3 py-1.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] hover:bg-[#eae1dc] dark:hover:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold shadow-xs items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                aria-label="Create Free Account"
              >
                <span className="material-symbols-outlined text-[15px] text-[#934b08] dark:text-[#ffb785]">person_add</span>
                <span>Sign Up Free</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
