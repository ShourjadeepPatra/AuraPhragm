import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/90 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-xl">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Offline Mode — All tests saved locally (ASHA safe)</span>
    </div>
  );
};
