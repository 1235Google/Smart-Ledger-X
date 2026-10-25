import React, { useState, useEffect } from 'react';
import { DeviceSessionCard, SessionData } from './DeviceSessionCard';
import { detectDeviceEnvironment } from '../lib/deviceDetection';
import { Shield, Sparkles, Smartphone, Laptop, RefreshCw } from 'lucide-react';

export function ActiveSessionsSection() {
  const [sessions, setSessions] = useState<SessionData[]>([
    {
      id: 'sess-current-local',
      deviceName: 'MacBook Pro 16"',
      deviceType: 'macbook',
      os: 'apple',
      osVersion: 'Sequoia 15.1',
      browser: 'chrome',
      browserVersion: '126',
      ipAddress: '198.51.100.42',
      isLocalIp: false,
      isVpnDetected: false,
      city: 'San Francisco',
      region: 'California',
      country: 'United States',
      isCurrentDevice: true,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'sess-remote-win',
      deviceName: 'Dell XPS 15 (Windows Workstation)',
      deviceType: 'laptop',
      os: 'windows',
      osVersion: '11 Pro',
      browser: 'edge',
      browserVersion: '125',
      ipAddress: '203.0.113.19',
      isLocalIp: false,
      isVpnDetected: true,
      city: 'London',
      region: 'Greater London',
      country: 'United Kingdom',
      isCurrentDevice: false,
      lastActiveAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString(),
    },
    {
      id: 'sess-remote-iphone',
      deviceName: 'Apple iPhone 15 Pro',
      deviceType: 'iphone',
      os: 'apple',
      osVersion: 'iOS 17.5',
      browser: 'safari',
      browserVersion: '17.5',
      ipAddress: '192.0.2.88',
      isLocalIp: false,
      isVpnDetected: false,
      city: 'New York',
      region: 'New York',
      country: 'United States',
      isCurrentDevice: false,
      lastActiveAt: new Date(Date.now() - 3600000 * 28).toISOString(), // yesterday
      createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    },
    {
      id: 'sess-remote-dev',
      deviceName: 'Local Development Server',
      deviceType: 'desktop',
      os: 'linux',
      osVersion: 'Ubuntu 24.04',
      browser: 'firefox',
      browserVersion: '128',
      ipAddress: '127.0.0.1',
      isLocalIp: true,
      isVpnDetected: false,
      city: null,
      region: null,
      country: null,
      isCurrentDevice: false,
      lastActiveAt: new Date(Date.now() - 3600000 * 96).toISOString(), // 4 days ago
      createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    }
  ]);

  const [isDetecting, setIsDetecting] = useState(false);

  // Dynamically calibrate the "This Device" session card with real browser client hints
  useEffect(() => {
    let mounted = true;
    async function calibrateCurrentDevice() {
      setIsDetecting(true);
      try {
        const detected = await detectDeviceEnvironment();
        if (!mounted) return;

        setSessions(prev => prev.map(s => {
          if (s.isCurrentDevice) {
            return {
              ...s,
              deviceName: `${detected.deviceLabel}`,
              deviceType: detected.deviceCategory,
              os: detected.osBrand,
              osVersion: detected.osFriendlyTitle,
              browser: detected.browserBrand,
              browserVersion: detected.browserVersion,
            };
          }
          return s;
        }));
      } catch (e) {
        console.warn('Could not auto-calibrate current device:', e);
      } finally {
        if (mounted) setIsDetecting(false);
      }
    }
    calibrateCurrentDevice();
    return () => { mounted = false; };
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    // Optimistically remove or mark revoked
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const handleRevokeAllOther = async () => {
    setSessions(prev => prev.filter(s => s.isCurrentDevice));
  };

  return (
    <div className="bg-[#0b0f17] border border-neutral-800/80 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-2xl text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">Active Sessions & Devices</h2>
            {isDetecting && (
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
            )}
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Devices currently authenticated with your financial ledger account. Sign out of any unrecognized sessions.
          </p>
        </div>

        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAllOther}
            className="px-4 py-2 bg-neutral-800/90 hover:bg-rose-500/15 text-neutral-300 hover:text-rose-300 border border-neutral-700 hover:border-rose-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            Sign out all other sessions
          </button>
        )}
      </div>

      {/* Stacked Session Cards */}
      <div className="space-y-3">
        {sessions.map(session => (
          <DeviceSessionCard
            key={session.id}
            session={session}
            onRevoke={handleRevokeSession}
          />
        ))}
      </div>

      {/* Bottom Security Note */}
      <div className="p-4 rounded-2xl bg-black/40 border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Hardware & form-factor detection powered by High-Entropy Client Hints & battery telemetry.
        </span>
        <span className="text-[11px] text-neutral-400">
          {sessions.length} {sessions.length === 1 ? 'device' : 'devices'} active
        </span>
      </div>
    </div>
  );
}
