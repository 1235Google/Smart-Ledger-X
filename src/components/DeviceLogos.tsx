import React from 'react';

// ==========================================
// 1. DEVICE SILHOUETTES (Primary Large Icons)
// ==========================================

export function MacBookSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* MacBook Screen Lid */}
      <rect x="5" y="6" width="22" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" className="opacity-90" />
      {/* Screen Glare / Display Bezel */}
      <rect x="7" y="8" width="18" height="10" rx="0.5" fill="currentColor" fillOpacity="0.12" />
      {/* Subtle Camera Notch */}
      <path d="M14.5 6H17.5V7C17.5 7.27614 17.2761 7.5 17 7.5H15C14.7239 7.5 14.5 7.27614 14.5 7V6Z" fill="currentColor" className="opacity-70" />
      {/* Unibody Aluminum Base */}
      <path d="M2.5 21C2.5 20.4477 2.94772 20 3.5 20H28.5C29.0523 20 29.5 20.4477 29.5 21V22C29.5 23.1046 28.6046 24 27.5 24H4.5C3.39543 24 2.5 23.1046 2.5 22V21Z" stroke="currentColor" strokeWidth="1.6" />
      {/* Center Thumb Groove / Notch for opening */}
      <path d="M13.5 20.5H18.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="opacity-80" />
      {/* Base Rubber Feet */}
      <circle cx="6" cy="24" r="0.8" fill="currentColor" className="opacity-60" />
      <circle cx="26" cy="24" r="0.8" fill="currentColor" className="opacity-60" />
    </svg>
  );
}

export function WindowsLaptopSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* PC Laptop Screen with sharper corners */}
      <rect x="5.5" y="7" width="21" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.6" className="opacity-90" />
      <rect x="7.5" y="9" width="17" height="9" fill="currentColor" fillOpacity="0.1" />
      {/* PC Centered Webcam */}
      <circle cx="16" cy="8" r="0.6" fill="currentColor" className="opacity-80" />
      {/* PC Chassis Base */}
      <path d="M2 21H30L27.5 24H4.5L2 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Trackpad outline */}
      <rect x="13" y="21.5" width="6" height="1.5" rx="0.3" stroke="currentColor" strokeWidth="0.8" className="opacity-60" />
    </svg>
  );
}

export function DesktopSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Monitor Display */}
      <rect x="3" y="5" width="26" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="7" width="22" height="12" rx="0.5" fill="currentColor" fillOpacity="0.12" />
      <circle cx="16" cy="6" r="0.6" fill="currentColor" className="opacity-70" />
      {/* Monitor Stand neck */}
      <path d="M14 21V25H18V21" stroke="currentColor" strokeWidth="1.6" />
      {/* Stand Base */}
      <path d="M10 25H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IPhoneSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* iPhone Curved Outer Frame */}
      <rect x="9" y="4" width="14" height="24" rx="4.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.5" y="5.5" width="11" height="21" rx="3.5" fill="currentColor" fillOpacity="0.1" />
      {/* Dynamic Island pill */}
      <rect x="13.5" y="6.5" width="5" height="1.6" rx="0.8" fill="currentColor" className="opacity-90" />
      {/* iOS Home Indicator Bar */}
      <rect x="13" y="24.5" width="6" height="1" rx="0.5" fill="currentColor" className="opacity-70" />
      {/* Subtle Volume Buttons */}
      <path d="M8 9.5V11.5M8 13V15.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="opacity-60" />
      {/* Side Power Button */}
      <path d="M24 11V13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="opacity-60" />
    </svg>
  );
}

export function AndroidPhoneSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Modern Android tall body */}
      <rect x="9.5" y="4" width="13" height="24" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="5.5" width="10" height="21" rx="2.2" fill="currentColor" fillOpacity="0.1" />
      {/* Punch-hole camera dot */}
      <circle cx="16" cy="7" r="0.8" fill="currentColor" className="opacity-90" />
      {/* Bottom gesture pill */}
      <rect x="14" y="24.5" width="4" height="0.9" rx="0.45" fill="currentColor" className="opacity-60" />
    </svg>
  );
}

export function IPadSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* iPad Uniform Bezel Chassis */}
      <rect x="6" y="4.5" width="20" height="23" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8" y="6.5" width="16" height="19" rx="1.5" fill="currentColor" fillOpacity="0.1" />
      {/* Top Camera dot */}
      <circle cx="16" cy="5.5" r="0.5" fill="currentColor" className="opacity-70" />
      {/* Bottom Home Indicator */}
      <rect x="13" y="23.5" width="6" height="0.8" rx="0.4" fill="currentColor" className="opacity-60" />
    </svg>
  );
}

export function SmartwatchSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Watch Top Strap */}
      <path d="M12 4H20V9H12V4Z" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      {/* Watch Bottom Strap */}
      <path d="M12 23H20V28H12V23Z" stroke="currentColor" strokeWidth="1.4" fill="currentColor" fillOpacity="0.1" />
      {/* Watch Case */}
      <rect x="8.5" y="8.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.5" y="10.5" width="11" height="11" rx="2.5" fill="currentColor" fillOpacity="0.15" />
      {/* Digital Crown */}
      <rect x="23.5" y="12" width="1.8" height="3" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function UnknownDeviceSilhouette({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Clean minimal server/workstation node */}
      <rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <line x1="6" y1="13" x2="26" y2="13" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="19" x2="26" y2="19" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="9.5" r="1" fill="currentColor" className="text-teal-400" />
      <circle cx="13" cy="9.5" r="1" fill="currentColor" className="opacity-50" />
      <circle cx="10" cy="16" r="1" fill="currentColor" className="opacity-50" />
      <circle cx="10" cy="22.5" r="1" fill="currentColor" className="opacity-50" />
    </svg>
  );
}

// ==========================================
// 2. OS LOGOS (Overlay Badges - Bottom-Right)
// ==========================================

export function WindowsLogo({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Modern 4-pane Windows logo */}
      <rect x="3" y="3" width="8.2" height="8.2" rx="0.8" fill="#00adef" />
      <rect x="12.8" y="3" width="8.2" height="8.2" rx="0.8" fill="#00adef" />
      <rect x="3" y="12.8" width="8.2" height="8.2" rx="0.8" fill="#00adef" />
      <rect x="12.8" y="12.8" width="8.2" height="8.2" rx="0.8" fill="#00adef" />
    </svg>
  );
}

export function AppleLogo({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 170" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Apple leaf */}
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.64-10.12-11.75-21.73-15.34-34.82-3.59-13.1-5.39-25.26-5.39-36.49 0-14.58 3.8-26.68 11.41-36.31 7.61-9.63 17.15-14.54 28.62-14.74 4.58 0 9.87 1.25 15.86 3.75 5.99 2.5 9.77 3.75 11.33 3.75 1.34 0 5.34-1.37 12-4.1 6.66-2.73 12.35-3.95 17.07-3.67 12.52.88 22.42 5.62 29.7 14.22-10.98 6.64-16.35 15.8-16.1 27.48.24 9.17 3.84 16.92 10.79 23.24 6.95 6.33 15.15 9.94 24.6 10.85-2.23 6.84-5.07 14.4-8.52 22.68zM119.22 31.84c0-7.25 2.67-14.07 8.01-20.47 5.34-6.4 11.89-10.45 19.65-12.16.5 1.54.75 3.09.75 4.65 0 7.2-2.8 14.15-8.4 20.85-5.6 6.7-12.13 10.63-19.6 11.8-.13-1.57-.41-3.13-.41-4.67z" />
    </svg>
  );
}

export function AndroidLogo({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Android robot head */}
      <path d="M7 9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9H7Z" fill="#3DDC84" />
      {/* Left antenna */}
      <line x1="9" y1="4.5" x2="6.8" y2="2" stroke="#3DDC84" strokeWidth="1.4" strokeLinecap="round" />
      {/* Right antenna */}
      <line x1="15" y1="4.5" x2="17.2" y2="2" stroke="#3DDC84" strokeWidth="1.4" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="10" cy="7" r="0.9" fill="#1e293b" />
      <circle cx="14" cy="7" r="0.9" fill="#1e293b" />
    </svg>
  );
}

export function ChromeOSLogo({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* ChromeOS ring */}
      <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3.5" fill="#4285F4" />
      <circle cx="12" cy="12" r="6" stroke="#FBBC05" strokeWidth="1.5" />
    </svg>
  );
}

export function LinuxLogo({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Tux penguin silhouette */}
      <path d="M12 2C9.5 2 8 3.5 8 6.5C8 7.8 7.2 9.5 6 11C5 12.3 4.5 14 5 16C5.5 18 7 19.5 8.5 20C9.2 20.2 10 20.8 10 21.5C10 21.8 9.8 22 9.5 22H14.5C14.2 22 14 21.8 14 21.5C14 20.8 14.8 20.2 15.5 20C17 19.5 18.5 18 19 16C19.5 14 19 12.3 18 11C16.8 9.5 16 7.8 16 6.5C16 3.5 14.5 2 12 2Z" fill="#FACC15" />
      <circle cx="10.5" cy="5.5" r="0.8" fill="#1e293b" />
      <circle cx="13.5" cy="5.5" r="0.8" fill="#1e293b" />
      <ellipse cx="12" cy="7.2" rx="1.5" ry="0.6" fill="#EA580C" />
    </svg>
  );
}

// ==========================================
// 3. BROWSER LOGOS (Top-Right Micro Badges)
// ==========================================

export function ChromeBrandIcon({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#4285F4" strokeWidth="2" fill="#EA4335" />
      <circle cx="12" cy="12" r="4" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="2.5" fill="#4285F4" />
      <path d="M12 2C15.5 2 18.5 4 20.2 7L12 12" stroke="#FBBC05" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20.2 7C21.3 9 22 11.4 22 14L12 12" stroke="#34A853" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function SafariBrandIcon({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#0071E3" strokeWidth="1.8" fill="#0071E3" fillOpacity="0.1" />
      {/* Compass Needle */}
      <polygon points="12,5 15,12 12,19 9,12" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="0.8" />
      <polygon points="12,19 15,12 12,5" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function FirefoxBrandIcon({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="10" fill="#FF7139" />
      <circle cx="13" cy="12" r="6" fill="#0060DF" />
      <path d="M5 14C5 8 10 4 15 4C17 7 17 11 14 13C12 14.5 9 15 7 18C6 17 5 15.5 5 14Z" fill="#FFD43B" />
    </svg>
  );
}

export function EdgeBrandIcon({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12" stroke="#0078D7" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 6C9 6 6 8.5 6 12C6 15.5 9 17.5 13 17.5C17 17.5 19 14.5 19 12C19 9.5 16 8 13.5 8" stroke="#00BCF2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BraveBrandIcon({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Brave Lion Shield */}
      <path d="M12 2L4 6V12C4 17 7.5 21.5 12 22C16.5 21.5 20 17 20 12V6L12 2Z" fill="#FB542B" />
      <polygon points="12,6 9,11 15,11" fill="#FFFFFF" />
      <polygon points="12,17 8,13 16,13" fill="#FFFFFF" />
    </svg>
  );
}
