import React, { useState } from 'react';
import { DeviceIcon } from './DeviceIcon';
import { 
  MapPin, 
  Globe, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  Wifi, 
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export interface SessionData {
  id: string;
  deviceName: string;
  deviceType: 'macbook' | 'laptop' | 'desktop' | 'iphone' | 'android-phone' | 'ipad' | 'android-tablet' | 'wearable' | 'unknown' | string;
  os: 'windows' | 'apple' | 'android' | 'chromeos' | 'linux' | 'unknown' | string;
  osVersion?: string;
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'brave' | 'opera' | 'generic' | string;
  browserVersion?: string;
  ipAddress: string;
  isLocalIp?: boolean;
  isVpnDetected?: boolean;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  isCurrentDevice: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface DeviceSessionCardProps {
  session: SessionData;
  onRevoke?: (sessionId: string) => Promise<void> | void;
}

export function DeviceSessionCard({ session, onRevoke }: DeviceSessionCardProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleRevoke = async () => {
    if (!onRevoke) return;
    setIsRevoking(true);
    try {
      await onRevoke(session.id);
    } finally {
      setIsRevoking(false);
      setConfirmRevoke(false);
    }
  };

  // Human-readable relative time (e.g. "Active now", "2 hours ago", "3 days ago")
  const getRelativeTime = (isoString: string) => {
    if (session.isCurrentDevice) return 'Active now';
    try {
      const date = parseISO(isoString);
      return `Active ${formatDistanceToNow(date, { addSuffix: true })}`;
    } catch {
      return 'Recently active';
    }
  };

  // Format Geolocation display
  const getLocationString = () => {
    if (session.isLocalIp) {
      return 'Local / Dev Environment';
    }
    const parts = [session.city, session.region, session.country].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    return 'Location unavailable';
  };

  return (
    <div
      className={`
        group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border
        ${session.isCurrentDevice
          ? 'bg-gradient-to-r from-emerald-950/20 via-neutral-900/90 to-neutral-900 border-emerald-500/35 shadow-[0_4px_24px_rgba(16,185,129,0.08)]'
          : 'bg-neutral-900/70 hover:bg-neutral-900 border-neutral-800/80 hover:border-neutral-700/90'}
      `}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left Section: Device Icon + Details */}
        <div className="flex items-start gap-4">
          <DeviceIcon
            deviceType={session.deviceType}
            os={session.os}
            browser={session.browser}
            isCurrentDevice={session.isCurrentDevice}
            isActive={true}
            size="md"
            className="shrink-0 mt-0.5"
          />

          <div className="space-y-1">
            {/* Title Row with Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-sm sm:text-base text-neutral-100 flex items-center gap-2">
                {session.deviceName}
              </h4>

              {session.isCurrentDevice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  This Device
                </span>
              )}

              {session.isVpnDetected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  VPN / Proxy
                </span>
              )}
            </div>

            {/* Sub-label: Browser & OS Breakdown */}
            <p className="text-xs text-neutral-400">
              {session.browser} {session.browserVersion ? `v${session.browserVersion}` : ''} • {session.os} {session.osVersion || ''}
            </p>

            {/* Metadata Chips: Location, IP, Last Active */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-neutral-400">
              {/* Location */}
              <span className="inline-flex items-center gap-1.5">
                {session.isLocalIp ? (
                  <Wifi className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                )}
                <span className={session.isLocalIp ? 'text-amber-400 font-medium' : 'text-neutral-300'}>
                  {getLocationString()}
                </span>
              </span>

              {/* IP Address */}
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                <Globe className="w-3 h-3 text-neutral-500 shrink-0" />
                {session.ipAddress}
              </span>

              {/* Activity Timestamp */}
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className={session.isCurrentDevice ? 'text-emerald-400 font-medium' : ''}>
                  {getRelativeTime(session.lastActiveAt)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Action Controls */}
        <div className="self-end sm:self-center shrink-0">
          {!session.isCurrentDevice && onRevoke && (
            confirmRevoke ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRevoke}
                  disabled={isRevoking}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold transition-all"
                >
                  {isRevoking ? 'Signing out...' : 'Confirm Sign Out'}
                </button>
                <button
                  onClick={() => setConfirmRevoke(false)}
                  className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmRevoke(true)}
                title="Revoke session and sign out remote device"
                className="opacity-80 group-hover:opacity-100 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            )
          )}

          {session.isCurrentDevice && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400/90 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Secured Session
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
