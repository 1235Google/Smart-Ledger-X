import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, Smartphone, Fingerprint, ScanFace, XCircle, CheckCircle2, Trash2, Plus, Laptop, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDateTime } from '../lib/utils';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function BiometricSettings() {
  const { securitySettings, updateSecuritySettings, generalSettings } = useStore();
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Clear error/success messages after 4 seconds
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  useEffect(() => {
    // Check if WebAuthn is supported
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          setIsSupported(available);
        })
        .catch(() => setIsSupported(false));
    } else {
      setIsSupported(false);
    }
  }, []);

  const handleRegister = async () => {
    if (!window.isSecureContext) {
      setErrorMsg("Passkeys require HTTPS or localhost.");
      return;
    }
    
    setIsRegistering(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const userId = "user123"; // For local demo purposes
      
      const resp = await fetch('/api/webauthn/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, userName: "User" }),
      });
      
      if (!resp.ok) throw new Error("Failed to generate registration options");
      
      const options = await resp.json();
      
      let attResp;
      try {
        attResp = await startRegistration(options);
      } catch (error: any) {
        console.error("StartRegistration error:", error);
        if (error.name === 'NotAllowedError') {
          // User cancelled, just exit gracefully
          setIsRegistering(false);
          return;
        }
        throw error;
      }

      const verificationResp = await fetch('/api/webauthn/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          response: attResp,
        }),
      });

      const verificationResult = await verificationResp.json();
      if (verificationResult.verified && verificationResult.credential) {
        const newDevice = {
          id: verificationResult.credential.id,
          name: getDeviceFriendlyName(),
          publicKey: verificationResult.credential.publicKey,
          addedAt: new Date().toISOString(),
          lastUsedAt: null,
          transports: attResp.response.transports,
        };
        
        updateSecuritySettings({
          registeredDevices: [...securitySettings.registeredDevices, newDevice],
          biometricEnabled: true // auto-enable
        });
        setSuccessMsg("Device successfully registered!");
      } else {
        throw new Error('Verification failed on server');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setErrorMsg(null);
    try {
      const userId = "user123"; // local demo
      
      const resp = await fetch('/api/webauthn/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          allowCredentials: securitySettings.registeredDevices.map(d => ({
            id: d.id,
            transports: d.transports
          }))
        }),
      });
      
      if (!resp.ok) throw new Error("Failed to generate auth options");
      
      const options = await resp.json();
      
      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (error: any) {
        throw new Error('Authentication cancelled or failed');
      }
      
      // Find the matched authenticator
      const matchedDevice = securitySettings.registeredDevices.find(d => d.id === asseResp.id);
      if (!matchedDevice) throw new Error("Unregistered device used");

      const verificationResp = await fetch('/api/webauthn/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          response: asseResp,
          authenticator: matchedDevice
        }),
      });

      const verificationResult = await verificationResp.json();
      if (verificationResult.verified) {
        setTestStatus('success');
        
        // Update last used time
        const updatedDevices = securitySettings.registeredDevices.map(d => 
          d.id === matchedDevice.id ? { ...d, lastUsedAt: new Date().toISOString() } : d
        );
        updateSecuritySettings({ registeredDevices: updatedDevices });
        
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error(error);
      setTestStatus('failed');
      setErrorMsg(error.message || 'Authentication failed');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  const removeDevice = (id: string) => {
    const updated = securitySettings.registeredDevices.filter(d => d.id !== id);
    updateSecuritySettings({ 
      registeredDevices: updated,
      biometricEnabled: updated.length > 0 ? securitySettings.biometricEnabled : false
    });
  };

  const getDeviceFriendlyName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Macintosh')) return 'MacBook (Touch ID)';
    if (ua.includes('Windows')) return 'Windows (Windows Hello)';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device (Face/Touch ID)';
    if (ua.includes('Android')) return 'Android Device (Biometrics)';
    return 'WebAuthn Device';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <Key size={18} className="text-blue-400" />
          <div>
            <p className="font-semibold text-white text-sm">Biometric & Passkeys</p>
            <p className="text-xs text-slate-400">
              {isSupported === false 
                ? 'Not supported on this device/browser' 
                : 'Unlock securely with your device'}
            </p>
          </div>
        </div>
        
        {isSupported && (
          <button
            onClick={() => updateSecuritySettings({ biometricEnabled: !securitySettings.biometricEnabled })}
            disabled={securitySettings.registeredDevices.length === 0}
            className={cn(
              "px-4 min-h-[48px] md:min-h-0 md:py-1.5 rounded-lg text-sm font-semibold transition-colors border",
              securitySettings.biometricEnabled 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                : "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
              securitySettings.registeredDevices.length === 0 && "opacity-50 cursor-not-allowed"
            )}
          >
            {securitySettings.biometricEnabled ? 'Enabled' : 'Disabled'}
          </button>
        )}
      </div>

      {isSupported && (
        <div className="p-4 rounded-xl border border-white/5 bg-black/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Registered Devices</h3>
            <button
              onClick={handleRegister}
              disabled={isRegistering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-semibold"
            >
              {isRegistering ? (
                <span className="animate-pulse">Registering...</span>
              ) : (
                <>
                  <Plus size={14} /> Register Current Device
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <XCircle size={16} />
              <p>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle2 size={16} />
              <p>{successMsg}</p>
            </div>
          )}

          {securitySettings.registeredDevices.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-white/5 rounded-lg">
              No devices registered yet.<br/>
              Register this device to use WebAuthn / Passkeys.
            </div>
          ) : (
            <div className="space-y-2">
              {securitySettings.registeredDevices.map(device => (
                <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <Laptop size={16} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{device.name}</p>
                      <p className="text-xs text-slate-500">
                        {device.lastUsedAt ? `Last used: ${formatDateTime(device.lastUsedAt, generalSettings?.timezone)}` : `Added: ${formatDateTime(device.addedAt, generalSettings?.timezone)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDevice(device.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {securitySettings.registeredDevices.length > 0 && (
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button
                onClick={handleTest}
                disabled={testStatus === 'testing'}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2",
                  testStatus === 'idle' && "bg-white/10 text-white hover:bg-white/20",
                  testStatus === 'testing' && "bg-white/5 text-slate-400 cursor-not-allowed",
                  testStatus === 'success' && "bg-emerald-500/20 text-emerald-400",
                  testStatus === 'failed' && "bg-red-500/20 text-red-400"
                )}
              >
                {testStatus === 'idle' && 'Test Authentication'}
                {testStatus === 'testing' && <span className="animate-pulse">Waiting for biometric...</span>}
                {testStatus === 'success' && <><CheckCircle2 size={16} /> Success</>}
                {testStatus === 'failed' && <><XCircle size={16} /> Failed</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
