import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from './native';
import { useApp } from '../context/AppContext';

export const WelcomeScreen: React.FC = () => {
  const {
    setActiveScreen,
    openAuthModal,
    signInWithGoogle,
    currentUser,
    authLoading,
    installPWA,
    isInstalled,
    isInstallable,
  } = useApp();

  const logoUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDyCgZG30HFfJ0W9AP2EE2urHyTqg4rj3lf8nsUJBW70QFrnI9mFUTSeC26eB1PpUD5Wrl6M4aiCyBSE_VmD-zMGfhPWzquJBsb-h3Kn9-UsdEM2vkNg3LUrl56tLuVmGhII_OI0HfG0XGQUMYeDyik_qS-pgBLjb_5D7vSXml1TMkdyNnkNp9BIGmf_kP_qQSvRfKQcxqLBQkgVJasHnoDM6HvlT1G2BbJU0DdZ3tjlyn6NaXVd9Z69Q';

  const features = [
    {
      icon: 'photo_camera',
      title: 'Gentle 90-Second Photo Scans',
      description:
        'Capture your natural smile facing window light. No stressful clinical machinery or invasive measurements.',
      tag: 'Cloud-Synced AI',
    },
    {
      icon: 'auto_awesome',
      title: 'Prototype Summary Scoring',
      description:
        'Receive an experimental evaluation across teeth alignment, spacing, shade luminance, and gum symmetry. Prototype model score; not clinically validated.',
      tag: 'Experimental AI',
    },
    {
      icon: 'clinical_notes',
      title: 'Specialist Match & Question Checklist',
      description:
        'Know whether an Orthodontist or Cosmetic Dentist fits your goals, plus get prepared questions for your next appointment.',
      tag: 'Empowered Visits',
    },
    {
      icon: 'lock',
      title: 'Private Encrypted Cloud Sanctuary',
      description:
        'Your photos, scans, and notes sync securely with Firebase Authentication and Cloud Firestore rules protecting your UID.',
      tag: 'Strict Privacy',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Snap or Upload',
      desc: 'Take a relaxed front smile photo in natural daylight.',
    },
    {
      step: '02',
      title: 'AI Analysis',
      desc: 'Our holistic model checks alignment, shade & gum margins.',
    },
    {
      step: '03',
      title: 'Track & Consult',
      desc: 'Monitor weekly changes and bring your tailored questions to a specialist.',
    },
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 max-w-2xl mx-auto w-full">
        {/* HERO HEADER CARD */}
        <View className="bg-gradient-to-b from-white via-white to-[#fbf2ed] dark:from-[#24201d] dark:via-[#24201d] dark:to-[#1f1b18] rounded-3xl p-4 sm:p-8 shadow-xs border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col items-center text-center gap-3.5 sm:gap-4 relative overflow-hidden">
          {/* Subtle Ambient Decorative Circles */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#ffdcc6]/40 dark:bg-[#4a2614]/30 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-[#a9f2d0]/30 dark:bg-[#1b4a38]/20 blur-2xl pointer-events-none"></div>

          {/* Calming Pill Badge */}
          <View className="inline-flex flex-row items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a9f2d0]/60 dark:bg-[#1b4a38]/60 border border-[#206a50]/20">
            <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[16px]">
              spa
            </span>
            <Text className="text-[11px] font-bold uppercase tracking-wider text-[#206a50] dark:text-[#8dd5b5]">
              Mindful Cosmetic Wellness Companion
            </Text>
          </View>

          {/* Logo & Headline */}
          <View className="flex flex-col items-center gap-2 mt-1">
            <Image
              source={{ uri: logoUrl }}
              alt="SmileJourneyAI Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
            />
            <Text className="font-editorial text-2xl sm:text-4xl font-semibold text-[#1f1b18] dark:text-[#f7eee9] tracking-tight leading-tight">
              Understand &amp; Nurture Your Smile With{' '}
              <span className="text-[#934b08] dark:text-[#ffb785] italic font-editorial">
                Gentle Clarity
              </span>
            </Text>
          </View>

          {/* Explanatory Subhead */}
          <Text className="text-xs sm:text-sm text-[#544339] dark:text-[#b5a499] leading-relaxed max-w-lg">
            SmileJourneyAI is a judgment-free personal companion for tracking smile harmony over time, receiving objective photo assessments, and preparing intelligent questions for your dental visits.
          </Text>

          {/* AUTHENTICATION ACTION BUTTONS */}
          <View className="w-full flex flex-col gap-2.5 mt-2 pt-2 border-t border-[#dac2b4]/30 dark:border-[#38332e]">
            {currentUser ? (
              <View className="flex flex-col items-center gap-2.5">
                <div className="px-3 py-1 rounded-full bg-[#a9f2d0]/40 dark:bg-[#1b4a38]/40 border border-[#206a50]/20 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#206a50] dark:text-[#8dd5b5]">verified</span>
                  <span className="text-xs text-[#206a50] dark:text-[#8dd5b5] font-semibold truncate max-w-[260px]">
                    Signed in: {currentUser.displayName || currentUser.email}
                  </span>
                </div>
                <TouchableOpacity
                  onPress={() => setActiveScreen('home')}
                  className="w-full py-3.5 px-6 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white font-semibold text-xs shadow-md flex flex-row items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
                >
                  <Text className="text-xs font-semibold text-white">Go to My Sanctuary Dashboard</Text>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex flex-col gap-2.5 w-full">
                {/* Primary Sign Up */}
                <TouchableOpacity
                  onPress={() => openAuthModal('signup')}
                  className="w-full py-3.5 px-6 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white shadow-md flex flex-row items-center justify-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
                  accessibilityLabel="Create Free Account"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  <Text className="text-xs font-semibold text-white">
                    Create Free Account (Sign Up)
                  </Text>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </TouchableOpacity>

                {/* Secondary Sign In */}
                <TouchableOpacity
                  onPress={() => openAuthModal('signin')}
                  className="w-full py-3 px-6 rounded-full bg-white dark:bg-[#282420] hover:bg-[#fbf2ed] dark:hover:bg-[#322d28] border border-[#dac2b4]/50 dark:border-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] flex flex-row items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  accessibilityLabel="Sign In to Existing Account"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#934b08] dark:text-[#ffb785]">
                    login
                  </span>
                  <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Already have an account? Sign In
                  </Text>
                </TouchableOpacity>

                {/* Instant Google Button */}
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] dark:hover:bg-[#322d28] border border-[#dac2b4]/40 dark:border-[#38332e] flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.32 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Continue with Google
                  </span>
                </button>

                {/* Install App Button Callout */}
                <button
                  type="button"
                  onClick={installPWA}
                  className="w-full py-2.5 px-4 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] hover:bg-[#ebdcd3] dark:hover:bg-[#38332e] border border-[#dac2b4]/40 dark:border-[#38332e] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-[#934b08] dark:text-[#ffb785]"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {isInstalled ? 'verified' : 'install_mobile'}
                  </span>
                  <span className="text-xs font-semibold">
                    {isInstalled ? 'App Installed on Device ✓' : 'Install SmileJourney App (PWA)'}
                  </span>
                </button>

                {/* Guest Explorer Soft Link */}
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveScreen('home')}
                    className="text-[11px] font-medium text-[#877367] dark:text-[#a89f97] hover:text-[#1f1b18] dark:hover:text-[#f7eee9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Or preview sanctuary dashboard as Guest</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </View>
            )}
          </View>
        </View>

        {/* HOW IT WORKS (3 SIMPLE STEPS) */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 sm:p-6 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-4">
          <View className="flex flex-col gap-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-[#934b08] dark:text-[#ffb785]">
              Simple Three-Step Flow
            </Text>
            <Text className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              How SmileJourney Works
            </Text>
          </View>

          <View className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((st) => (
              <View
                key={st.step}
                className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-2 border border-[#dac2b4]/20 dark:border-[#38332e]"
              >
                <View className="w-7 h-7 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center font-bold text-xs">
                  {st.step}
                </View>
                <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  {st.title}
                </Text>
                <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
                  {st.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* INTERACTIVE VALUE CARDS */}
        <View className="flex flex-col gap-3">
          <Text className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9] px-1">
            Core Sanctuary Capabilities
          </Text>

          <View className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {features.map((feat) => (
              <View
                key={feat.title}
                className="bg-white dark:bg-[#24201d] rounded-2xl p-4 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-2"
              >
                <View className="flex flex-row items-center justify-between">
                  <View className="w-8 h-8 rounded-xl bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">{feat.icon}</span>
                  </View>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#a9f2d0]/50 text-[#206a50] dark:bg-[#1b4a38]/50 dark:text-[#8dd5b5]">
                    {feat.tag}
                  </span>
                </View>
                <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9] mt-1">
                  {feat.title}
                </Text>
                <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
                  {feat.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* HARMONY SCORE PREVIEW TEASER */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col sm:flex-row items-center gap-4">
          <View className="w-20 h-20 rounded-full bg-[#fbf2ed] dark:bg-[#2a2622] border-4 border-[#e08744] flex flex-col items-center justify-center shrink-0 shadow-xs">
            <span className="font-editorial text-2xl font-bold text-[#934b08] dark:text-[#ffb785]">
              78
            </span>
            <span className="text-[9px] uppercase font-semibold text-[#544339] dark:text-[#b5a499]">
              Score / 100
            </span>
          </View>
          <View className="flex flex-col flex-1 text-center sm:text-left">
            <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              Gentle, Holistic Foundation
            </Text>
            <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] mt-1 leading-relaxed">
              No shaming numbers or scary diagnostic codes. Get an empathetic progress dial tracking your smile's natural harmony week by week.
            </Text>
          </View>
        </View>

        {/* PWA CALLOUT CARD */}
        <View className="bg-[#fbf2ed] dark:bg-[#282420] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col sm:flex-row items-center justify-between gap-4">
          <View className="flex flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-2xl bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">devices</span>
            </View>
            <View className="flex flex-col">
              <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Install as Standalone App
              </Text>
              <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] mt-0.5">
                Works seamlessly on iPhone, Android, Mac &amp; Windows with secure cloud sync.
              </Text>
            </View>
          </View>
          <button
            type="button"
            onClick={installPWA}
            className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#206a50] hover:bg-[#18533e] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>{isInstalled ? 'Installed' : 'Install App'}</span>
          </button>
        </View>

        {/* BOTTOM CALL TO ACTION CARD */}
        <View className="bg-gradient-to-r from-[#ffdcc6]/60 to-[#fbf2ed] dark:from-[#32231b] dark:to-[#24201d] rounded-3xl p-6 shadow-xs border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col items-center text-center gap-3">
          <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-3xl">
            sentiment_satisfied
          </span>
          <Text className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
            Begin Your Mindful Smile Journey
          </Text>
          <Text className="text-xs text-[#544339] dark:text-[#b5a499] max-w-md leading-relaxed">
            Create your account in 30 seconds to lock in your baseline scan and sync your milestones safely across all your devices.
          </Text>

          <View className="flex flex-row items-center gap-2.5 mt-2 w-full max-w-xs">
            <TouchableOpacity
              onPress={() => openAuthModal('signup')}
              className="flex-1 py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center cursor-pointer transition-colors"
            >
              <Text className="text-xs font-semibold text-white">Sign Up Free</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openAuthModal('signin')}
              className="flex-1 py-3 rounded-full bg-white dark:bg-[#282420] hover:bg-[#fbf2ed] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold border border-[#dac2b4]/50 dark:border-[#38332e] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
            >
              <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
