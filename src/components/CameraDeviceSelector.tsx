import React from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { MediaDeviceInfoItem } from '../hooks/useCameraStream';

interface CameraDeviceSelectorProps {
  devices: MediaDeviceInfoItem[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  disabled?: boolean;
}

export default function CameraDeviceSelector({
  devices,
  selectedDeviceId,
  onSelectDevice,
  disabled = false,
}: CameraDeviceSelectorProps) {
  if (!devices || devices.length <= 1) {
    return null; // Don't show selector if 0 or 1 device
  }

  return (
    <div className="w-full max-w-sm mb-4 bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-xs text-slate-300 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Camera size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Camera</span>
          <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-[220px]">
            {devices.find((d) => d.deviceId === selectedDeviceId)?.label || 'Select Camera'}
          </span>
        </div>
      </div>

      <div className="relative shrink-0">
        <select
          value={selectedDeviceId}
          onChange={(e) => onSelectDevice(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-slate-800 hover:bg-slate-750 text-white text-xs font-medium py-2 pl-3 pr-8 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer disabled:opacity-50 transition-colors"
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label} {device.isVirtual ? '(Virtual)' : ''}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
