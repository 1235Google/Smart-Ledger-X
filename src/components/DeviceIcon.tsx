import React from 'react';
import {
  MacBookSilhouette,
  WindowsLaptopSilhouette,
  DesktopSilhouette,
  IPhoneSilhouette,
  AndroidPhoneSilhouette,
  IPadSilhouette,
  SmartwatchSilhouette,
  UnknownDeviceSilhouette,
  WindowsLogo,
  AppleLogo,
  AndroidLogo,
  ChromeOSLogo,
  LinuxLogo,
  ChromeBrandIcon,
  SafariBrandIcon,
  FirefoxBrandIcon,
  EdgeBrandIcon,
  BraveBrandIcon,
} from './DeviceLogos';
import { DeviceCategory, OSBrand, BrowserBrand } from '../lib/deviceDetection';

export interface DeviceIconProps {
  deviceType: DeviceCategory | string;
  os?: OSBrand | string;
  browser?: BrowserBrand | string;
  isCurrentDevice?: boolean;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DeviceIcon({
  deviceType,
  os = 'unknown',
  browser = 'generic',
  isCurrentDevice = false,
  isActive = true,
  size = 'md',
  className = '',
}: DeviceIconProps) {
  // Normalize string inputs
  const normType = (deviceType || 'unknown').toLowerCase();
  const normOs = (os || 'unknown').toLowerCase();
  const normBrowser = (browser || 'generic').toLowerCase();

  // Primary Silhouette Selector
  const renderSilhouette = () => {
    const iconSize = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';
    
    if (normType === 'macbook' || (normType.includes('mac') && normType.includes('book'))) {
      return <MacBookSilhouette className={iconSize} />;
    }
    if (normType === 'laptop' || normType.includes('laptop')) {
      return <WindowsLaptopSilhouette className={iconSize} />;
    }
    if (normType === 'desktop' || normType.includes('desktop') || normType.includes('imac') || normType.includes('pc')) {
      return <DesktopSilhouette className={iconSize} />;
    }
    if (normType === 'iphone' || (normType.includes('phone') && normOs.includes('apple'))) {
      return <IPhoneSilhouette className={iconSize} />;
    }
    if (normType === 'android-phone' || (normType.includes('phone') && normOs.includes('android')) || normType === 'mobile') {
      return <AndroidPhoneSilhouette className={iconSize} />;
    }
    if (normType === 'ipad' || normType === 'tablet' || normType.includes('tablet')) {
      return <IPadSilhouette className={iconSize} />;
    }
    if (normType === 'wearable' || normType.includes('watch')) {
      return <SmartwatchSilhouette className={iconSize} />;
    }
    return <UnknownDeviceSilhouette className={iconSize} />;
  };

  // OS Badge Selector (Bottom-Right)
  const renderOsBadge = () => {
    const badgeSize = size === 'lg' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

    if (normOs.includes('win') || normOs === 'windows') {
      return <WindowsLogo className={badgeSize} />;
    }
    if (normOs.includes('apple') || normOs.includes('mac') || normOs.includes('ios')) {
      return <AppleLogo className={`${badgeSize} text-neutral-200`} />;
    }
    if (normOs.includes('android')) {
      return <AndroidLogo className={badgeSize} />;
    }
    if (normOs.includes('chrome') || normOs.includes('cros')) {
      return <ChromeOSLogo className={badgeSize} />;
    }
    if (normOs.includes('linux') || normOs.includes('ubuntu')) {
      return <LinuxLogo className={badgeSize} />;
    }
    return null;
  };

  // Browser Micro-Badge Selector (Top-Right)
  const renderBrowserBadge = () => {
    const bSize = size === 'lg' ? 'w-3 h-3' : size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

    if (normBrowser.includes('chrome')) return <ChromeBrandIcon className={bSize} />;
    if (normBrowser.includes('safari')) return <SafariBrandIcon className={bSize} />;
    if (normBrowser.includes('firefox')) return <FirefoxBrandIcon className={bSize} />;
    if (normBrowser.includes('edge')) return <EdgeBrandIcon className={bSize} />;
    if (normBrowser.includes('brave')) return <BraveBrandIcon className={bSize} />;
    return null;
  };

  const containerSizes = {
    sm: 'w-10 h-10',
    md: 'w-13 h-13',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={`
        relative flex items-center justify-center rounded-2xl transition-all duration-200 select-none
        ${containerSizes[size]}
        ${isCurrentDevice 
          ? 'bg-gradient-to-b from-emerald-500/15 to-emerald-950/40 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.22)]' 
          : isActive 
            ? 'bg-neutral-800/80 text-neutral-200 border border-neutral-700/70 hover:border-neutral-600 shadow-md' 
            : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800/60 opacity-70'}
        ${className}
      `}
    >
      {/* Primary Device Silhouette */}
      <div className={`transition-transform duration-200 ${isCurrentDevice ? 'scale-105' : ''}`}>
        {renderSilhouette()}
      </div>

      {/* Top-Right Browser Badge */}
      {renderBrowserBadge() && (
        <div 
          title={`Browser: ${browser}`}
          className="absolute -top-1 -right-1 flex items-center justify-center p-0.5 rounded-full bg-neutral-950 border border-neutral-700/80 shadow-sm"
        >
          {renderBrowserBadge()}
        </div>
      )}

      {/* Bottom-Right OS Badge */}
      {renderOsBadge() && (
        <div 
          title={`Operating System: ${os}`}
          className="absolute -bottom-1 -right-1 flex items-center justify-center p-1 rounded-full bg-neutral-950 border border-neutral-700/80 shadow-md ring-1 ring-black/40"
        >
          {renderOsBadge()}
        </div>
      )}

      {/* Current Device Live Indicator (Micro emerald dot) */}
      {isCurrentDevice && (
        <span className="absolute -top-0.5 -left-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-neutral-950"></span>
        </span>
      )}
    </div>
  );
}
