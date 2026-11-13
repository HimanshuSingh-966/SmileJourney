import React, { type ReactNode } from 'react';
import { BottomTabBar } from './BottomTabBar';

/**
 * Main Application Layout Container.
 * Clean, production-grade Progressive Web App layout.
 * Runs edge-to-edge on mobile devices without any fake phone frames or simulated status bars.
 */
export const PhoneShell: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="w-full flex-1 flex flex-col relative pb-28 md:pb-12 max-w-4xl mx-auto px-3 sm:px-6">
      {/* Real Application Content */}
      <div className="w-full flex-1 flex flex-col">
        {children}
      </div>

      {/* Native Mobile Bottom Navigation Bar */}
      <BottomTabBar />
    </div>
  );
};
