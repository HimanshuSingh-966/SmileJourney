/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { PhoneShell } from './components/PhoneShell';
import { HomeScreen } from './components/HomeScreen';
import { ScanScreen } from './components/ScanScreen';
import { ReportScreen } from './components/ReportScreen';
import { SpecialistScreen } from './components/SpecialistScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AccountScreen } from './components/AccountScreen';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';

const MainContent: React.FC = () => {
  const {
    activeScreen,
    isDarkMode,
    showInstallGuide,
    setShowInstallGuide,
    isIOS,
    isAndroid,
    isOPPO,
    installPWA,
    isInstallable,
  } = useApp();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'home':
        return <HomeScreen />;
      case 'scan':
        return <ScanScreen />;
      case 'report':
        return <ReportScreen />;
      case 'specialists':
        return <SpecialistScreen />;
      case 'progress':
        return <ProgressScreen />;
      case 'account':
        return <AccountScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDarkMode ? 'dark bg-[#161311] text-[#f7eee9]' : 'bg-[#fff8f5] text-[#1f1b18]'
      }`}
    >
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <PhoneShell>{renderScreen()}</PhoneShell>
      </main>
      <Footer />
      <Toast />
      <AuthModal />
      <OfflineIndicator />
      <PWAInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isOPPO={isOPPO}
        onNativeInstallClick={installPWA}
        isInstallable={isInstallable}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
