import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-[#934b08] px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg border border-[#e08744]/40 animate-pulse"
    >
      <span className="h-2 w-2 rounded-full bg-amber-300" />
      <span>Offline Sanctuary — Local cache active</span>
    </div>
  );
};
