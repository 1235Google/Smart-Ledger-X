import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ScanFace, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Fingerprint, 
  Smartphone, 
  Laptop, 
  Key, 
  Trash2, 
  AlertTriangle, 
  Lock, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Sliders, 
  Activity, 
  Server, 
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { 
  checkBiometricSupport, 
  registerBiometricCredential, 
  authenticateWithBiometrics, 
  getDeviceBiometricName, 
  getCleanRpId, 
  verifyWebAuthnEnvironment 
} from '../lib/webauthnService';
import { RegisteredDevice } from '../types';

export default function FaceUnlockPage() {
  const { currentUser, securitySettings, updateSecuritySettings } = useStore();
  const { showSuccess, showInfo, showError } = useToast();

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [supportReason, setSupportReason] = useState<string | null>(null);
  const [deviceSensorName, setDeviceSensorName] = useState<string>('Biometric Authenticator');
  const [isIframe, setIsIframe] = useState<boolean>(false);

  // Setup Flow States
  const [setupState, setSetupState] = useState<'idle' | 'checking' | 'prompting' | 'verifying' | 'success' | 'error'>('idle');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Test Verification States
  const [testState, setTestState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Diagnostics
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [serverPingState, setServerPingState] = useState<'idle' | 'pinging' | 'success' | 'failed'>('idle');
  const [serverPingLatency, setServerPingLatency] = useState<number | null>(null);
  const [serverPingDetails, setServerPingDetails] = useState<string | null>(null);

  const cleanUserId = currentUser?.uid || localStorage.getItem('lastAuthUserId') || 'authenticated_user';
  const cleanEmail = currentUser?.email || localStorage.getItem('lastAuthUserEmail') || 'user@smartledgerx.io';
  const cleanDisplayName = currentUser?.displayName || cleanEmail.split('@')[0] || 'SmartLedger User';

  const isConfigured = Boolean(
    securitySettings?.faceUnlockEnabled || 
    securitySettings?.biometricEnabled || 
    (securitySettings?.registeredDevices && securitySettings.registeredDevices.length > 0)
  );

  // Initial Hardware & Environment Detection
  useEffect(() => {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsIframe(inIframe);
    setDeviceSensorName(getDeviceBiometricName());

    checkBiometricSupport()
      .then((status) => {
        setIsSupported(status.supported);
        if (!status.supported) {
          setSupportReason(status.reason || 'Biometric hardware is not available on this device.');
        }
      })
      .catch(() => {
        setIsSupported(false);
        setSupportReason('Unable to detect biometric hardware.');
      });
  }, []);

  // Trigger brief haptic buzz if supported
  const triggerHaptic = (success = true) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(success ? [30, 40, 30] : [60, 50, 60]);
      }
    } catch {}
  };

  /**
   * 1-Click Face Unlock Setup
   */
  const handleSetupFaceUnlock = async () => {
    setSetupState('checking');
    setSetupError(null);

    try {
      // Step 1: Check environment
      const env = verifyWebAuthnEnvironment();
      if (!env.valid) {
        throw new Error(env.error || 'Face Unlock is not supported in this environment.');
      }

      setSetupState('prompting');

      // Step 2: Register biometric credential
      const result = await registerBiometricCredential(
        cleanUserId,
        cleanEmail,
        cleanDisplayName
      );

      if (result.isUserCancelled) {
        setSetupState('idle');
        showInfo('Face Unlock Setup', 'Setup was dismissed. You can try again anytime.');
        return;
      }

      if (result.success && result.device) {
        setSetupState('verifying');

        // Update application security settings
        const existing = securitySettings?.registeredDevices || [];
        const filtered = existing.filter(d => d.id !== result.device!.id);
        const updatedDevices: RegisteredDevice[] = [...filtered, result.device];

        updateSecuritySettings({
          registeredDevices: updatedDevices,
          biometricEnabled: true,
          faceUnlockEnabled: true
        });

        // Save local flags
        try {
          localStorage.setItem('faceUnlockEnabled', 'true');
          localStorage.setItem(`faceUnlockEnabled_${cleanUserId}`, 'true');
          localStorage.setItem('biometricCredentialId', result.device.id);
        } catch {}

        setSetupState('success');
        triggerHaptic(true);

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch {}

        showSuccess('Face Unlock Activated', 'Face Unlock successfully configured and active!');
      } else {
        throw new Error(result.error || 'Could not complete biometric registration with device.');
      }
    } catch (err: any) {
      console.error('[FaceUnlockPage] Setup error:', err);
      setSetupError(err?.message || 'Biometric setup could not be completed.');
      setSetupState('error');
      triggerHaptic(false);
    }
  };

  /**
   * Test Face Unlock Live
   */
  const handleTestFaceUnlock = async () => {
    setTestState('scanning');
    setTestMessage(null);
    const startTime = performance.now();

    try {
      const devices = securitySettings?.registeredDevices || [];
      const result = await authenticateWithBiometrics(cleanUserId, devices);
      const duration = Math.round(performance.now() - startTime);

      if (result.isUserCancelled) {
        setTestState('idle');
        showInfo('Test Cancelled', 'Test scan was cancelled.');
        return;
      }

      if (result.success) {
        setTestLatency(duration);
        setTestState('success');
        setTestMessage(`Biometric match verified in ${duration}ms! Authentic platform assertion confirmed.`);
        triggerHaptic(true);
        showSuccess('Biometric Match Confirmed', `Hardware assertion confirmed in ${duration}ms`);
      } else {
        setTestState('failed');
        setTestMessage(result.error || 'Biometric authentication failed. Please try again.');
        triggerHaptic(false);
      }
    } catch (err: any) {
      setTestState('failed');
      setTestMessage(err?.message || 'Biometric test scan failed.');
      triggerHaptic(false);
    }
  };

  /**
   * Disable Face Unlock
   */
  const handleRemoveFaceUnlock = () => {
    if (!window.confirm('Are you sure you want to turn off Face Unlock on this device?')) {
      return;
    }

    updateSecuritySettings({
      faceUnlockEnabled: false,
      biometricEnabled: false,
      registeredDevices: []
    });

    try {
      localStorage.removeItem('faceUnlockEnabled');
      localStorage.removeItem(`faceUnlockEnabled_${cleanUserId}`);
      localStorage.removeItem('biometricCredentialId');
      localStorage.removeItem(`biometricCredentialId_${cleanUserId}`);
    } catch {}

    setSetupState('idle');
    setTestState('idle');
    showInfo('Face Unlock Turned Off', 'Face Unlock has been turned off on this device.');
  };

  /**
   * Server API Health Check Ping
   */
  const handlePingServer = async () => {
    setServerPingState('pinging');
    setServerPingDetails(null);
    const start = performance.now();

    try {
      const resp = await fetch('/api/auth/face-unlock/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cleanUserId,
          userName: cleanEmail,
          userDisplayName: cleanDisplayName,
          rpId: getCleanRpId()
        })
      });

      const latency = Math.round(performance.now() - start);
      setServerPingLatency(latency);

      if (resp.ok) {
        const data = await resp.json();
        setServerPingState('success');
        setServerPingDetails(`200 OK — Challenge issued (${data.challenge?.substring(0, 12)}...) in ${latency}ms.`);
      } else {
        setServerPingState('failed');
        setServerPingDetails(`HTTP status ${resp.status} (${resp.statusText})`);
      }
    } catch (err: any) {
      setServerPingState('failed');
      setServerPingDetails(err.message || 'Network request failed');
    }
  };

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Page Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--md-sys-color-on-surface)] flex items-center gap-2.5">
              <ScanFace className="w-7 h-7 text-[var(--md-sys-color-primary)]" />
              Face Unlock & Biometrics
            </h1>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active & Protected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Not Configured Yet
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
            Hardware-backed biometric authentication (FIDO2 / WebAuthn) for your SmartLedgerX account.
          </p>
        </div>

        {/* Quick Diagnostics Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/50 transition-colors flex items-center gap-2"
          >
            <Activity className="w-3.5 h-3.5 text-[var(--md-sys-color-primary)]" />
            Diagnostics {diagnosticsOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Diagnostics Panel (Collapsible) */}
      <AnimatePresence>
        {diagnosticsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--md-sys-color-outline-variant)]/30">
                <span className="font-semibold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
                  WebAuthn System Diagnostics
                </span>
                <button
                  onClick={handlePingServer}
                  disabled={serverPingState === 'pinging'}
                  className="px-2.5 py-1 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[11px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${serverPingState === 'pinging' ? 'animate-spin' : ''}`} />
                  Ping Backend API
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30">
                  <div className="text-[10px] text-[var(--md-sys-color-outline)] uppercase font-semibold">RP ID (Origin)</div>
                  <div className="font-mono text-xs text-[var(--md-sys-color-on-surface)] truncate mt-0.5">{getCleanRpId()}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30">
                  <div className="text-[10px] text-[var(--md-sys-color-outline)] uppercase font-semibold">Hardware Sensor</div>
                  <div className="text-xs text-[var(--md-sys-color-on-surface)] truncate mt-0.5">{deviceSensorName}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30">
                  <div className="text-[10px] text-[var(--md-sys-color-outline)] uppercase font-semibold">Secure Context</div>
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    HTTPS / Localhost OK
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30">
                  <div className="text-[10px] text-[var(--md-sys-color-outline)] uppercase font-semibold">Backend Status</div>
                  <div className="text-xs mt-0.5">
                    {serverPingState === 'success' && (
                      <span className="text-emerald-400 font-semibold">{serverPingDetails}</span>
                    )}
                    {serverPingState === 'failed' && (
                      <span className="text-rose-400 font-semibold">{serverPingDetails}</span>
                    )}
                    {serverPingState === 'pinging' && (
                      <span className="text-[var(--md-sys-color-outline)]">Checking endpoint...</span>
                    )}
                    {serverPingState === 'idle' && (
                      <span className="text-[var(--md-sys-color-outline)]">Click Ping to test</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Interactive Setup Card & Information Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Scanner & Primary Action (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40 relative overflow-hidden shadow-sm">
            
            {/* Ambient Background Gradient Accent */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--md-sys-color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              
              {/* Visual Biometric Viewfinder */}
              <div className="relative w-full aspect-video sm:aspect-[21/9] max-h-56 rounded-2xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/50 flex flex-col items-center justify-center overflow-hidden">
                
                {/* Cyber Grid Pattern Background */}
                <div 
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: `linear-gradient(to right, var(--md-sys-color-outline) 1px, transparent 1px), linear-gradient(to bottom, var(--md-sys-color-outline) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px'
                  }}
                />

                {/* Animated Scanning Beam when Active */}
                {(setupState === 'prompting' || setupState === 'verifying' || testState === 'scanning') && (
                  <motion.div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--md-sys-color-primary)] to-transparent shadow-[0_0_15px_var(--md-sys-color-primary)] z-20"
                    animate={{ y: [-70, 70, -70] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  />
                )}

                {/* Centered Facial Reticle */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-[var(--md-sys-color-primary)]/50 flex items-center justify-center">
                    
                    {/* Corner Target Markers */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[var(--md-sys-color-primary)]" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[var(--md-sys-color-primary)]" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[var(--md-sys-color-primary)]" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[var(--md-sys-color-primary)]" />

                    {/* Central Icon */}
                    {isConfigured ? (
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center">
                        <ScanFace className="w-9 h-9" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
                      {setupState === 'prompting' && 'Touch or look at your biometric sensor...'}
                      {setupState === 'verifying' && 'Verifying credential with secure enclave...'}
                      {setupState === 'success' && '✓ Biometric enrollment confirmed!'}
                      {setupState === 'idle' && (isConfigured ? 'Face Unlock is active on this device' : 'Ready for biometric enrollment')}
                      {setupState === 'error' && 'Setup was interrupted'}
                    </p>
                    <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                      {deviceSensorName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Callout Banner if setup failed */}
              <AnimatePresence>
                {setupError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs"
                  >
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold">Setup could not be completed</span>
                      <p className="text-rose-400/90 mt-0.5">{setupError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {!isConfigured ? (
                  <button
                    onClick={handleSetupFaceUnlock}
                    disabled={setupState === 'prompting' || setupState === 'verifying'}
                    className="w-full sm:flex-1 py-3 px-5 rounded-2xl font-semibold text-sm bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    {setupState === 'prompting' || setupState === 'verifying' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Setting Up Face Unlock...
                      </>
                    ) : (
                      <>
                        <ScanFace className="w-4 h-4" />
                        Set Up Face Unlock Now
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleTestFaceUnlock}
                      disabled={testState === 'scanning'}
                      className="w-full sm:flex-1 py-3 px-5 rounded-2xl font-semibold text-sm bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md hover:shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                    >
                      {testState === 'scanning' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Testing Sensor...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Test Face Unlock Now
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSetupFaceUnlock}
                      disabled={setupState === 'prompting' || setupState === 'verifying'}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl font-semibold text-xs bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/50 transition-colors flex items-center justify-center gap-2"
                      title="Re-enroll or add new biometric sensor on this machine"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Re-register Face
                    </button>

                    <button
                      onClick={handleRemoveFaceUnlock}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl font-semibold text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Turn Off
                    </button>
                  </>
                )}
              </div>

              {/* Test Result Message */}
              <AnimatePresence>
                {testMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
                      testState === 'success' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    {testState === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* Registered Authenticators List */}
          <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
                <Key className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
                Registered Biometric Authenticators
              </h3>
              <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                {securitySettings?.registeredDevices?.length || 0} device(s)
              </span>
            </div>

            {(!securitySettings?.registeredDevices || securitySettings.registeredDevices.length === 0) ? (
              <div className="p-5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 text-center space-y-2">
                <Laptop className="w-8 h-8 mx-auto text-[var(--md-sys-color-outline)]" />
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                  No biometric passkeys registered yet. Click "Set Up Face Unlock" above to register this device.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {securitySettings.registeredDevices.map((device, idx) => (
                  <div
                    key={device.id || idx}
                    className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center shrink-0">
                        <ScanFace className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                            {device.name || deviceSensorName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[var(--md-sys-color-outline)] truncate mt-0.5">
                          ID: {device.id.substring(0, 16)}... • Added {new Date(device.addedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleRemoveFaceUnlock}
                      className="p-2 text-[var(--md-sys-color-outline)] hover:text-rose-400 transition-colors"
                      title="Remove this credential"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Policies & Explainer Bento (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Security Features Bento */}
          <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
              Security Architecture
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 space-y-1">
                <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Hardware-Backed Secure Enclave
                </span>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                  Your biometric scan never leaves your physical phone or computer. The operating system signs a cryptographic challenge using an isolated security chip (TPM / Apple Secure Enclave).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 space-y-1">
                <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Phishing-Resistant FIDO2 Protocol
                </span>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                  Credentials are bound to the exact origin domain ({getCleanRpId()}). Rogue websites cannot intercept or replay your biometric session.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 space-y-1">
                <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Zero Biometric Storage on Server
                </span>
                <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
                  SmartLedgerX never stores your face or fingerprint data. Only the public encryption key is registered on the server.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Security Policies Settings */}
          <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]/40 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
              Face Unlock Policies
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] block">
                    Use on Login Screen
                  </span>
                  <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block">
                    Show 1-click biometric unlock on the sign-in page
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(securitySettings?.faceUnlockEnabled)}
                  onChange={(e) => {
                    updateSecuritySettings({
                      faceUnlockEnabled: e.target.checked
                    });
                    showInfo('Face Unlock Policy', `Login Face Unlock ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 rounded text-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 cursor-pointer">
                <div>
                  <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] block">
                    Protect Secret Vault
                  </span>
                  <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] block">
                    Require face scan before revealing stored vault documents
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(securitySettings?.biometricEnabled)}
                  onChange={(e) => {
                    updateSecuritySettings({
                      biometricEnabled: e.target.checked
                    });
                    showInfo('Face Unlock Policy', `Vault Face Unlock ${e.target.checked ? 'enabled' : 'disabled'}`);
                  }}
                  className="w-4 h-4 rounded text-[var(--md-sys-color-primary)] accent-[var(--md-sys-color-primary)]"
                />
              </label>
            </div>
          </div>

          {/* Iframe Hint Banner if in preview iframe */}
          {isIframe && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                <Info className="w-4 h-4 shrink-0" />
                Browser Preview Notice
              </div>
              <p className="text-[11px] text-blue-300/90 leading-relaxed">
                If your browser blocks biometric popups inside an embedded frame, open SmartLedgerX in a separate tab or full window to access your native hardware biometric prompt.
              </p>
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="mt-1 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                Open in Full Window <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
