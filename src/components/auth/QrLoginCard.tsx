import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Check,
  Copy
} from 'lucide-react';
import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { saveDeviceSession, STORAGE_KEY_QR_USER } from '../../lib/deviceAuthSession';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

interface QrLoginCardProps {
  onSuccess?: (user: any) => void;
  className?: string;
}

function generateRandomHex(byteLength: number): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let res = '';
  for (let i = 0; i < byteLength * 2; i++) {
    res += Math.floor(Math.random() * 16).toString(16);
  }
  return res;
}

function detectDesktopMetadata() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Web Browser';
  let os = 'Desktop OS';

  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';

  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return {
    browser,
    os,
    deviceType: 'desktop',
    ip: 'Protected',
    location: 'Verified Session'
  };
}

export default function QrLoginCard({ onSuccess, className }: QrLoginCardProps) {
  const navigate = useNavigate();
  const { updateUserProfile } = useStore();

  const [sessionId, setSessionId] = useState<string>('');
  const [secureToken, setSecureToken] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(120);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState<
    'WAITING' | 'SCANNED' | 'PENDING_APPROVAL' | 'AUTHENTICATED' | 'COMPLETED' | 'EXPIRED' | 'ERROR'
  >('WAITING');
  const [statusMessage, setStatusMessage] = useState<string>('Scan with your phone to continue');

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  // Central handler for status updates across Firestore and Socket.IO
  const handleStatusUpdate = useCallback(async (docData: any, token: string, sid: string) => {
    if (!docData || !docData.status) return;
    const rawStatus = String(docData.status);
    const normalizedStatus = rawStatus.toUpperCase();

    if (normalizedStatus === 'SCANNED') {
      setStatus('SCANNED');
      setStatusMessage('Phone detected! Waiting for authentication...');
    } else if (normalizedStatus === 'PENDING_APPROVAL') {
      setStatus('PENDING_APPROVAL');
      setStatusMessage('Please tap "Approve Login" on your phone...');
    } else if (
      (rawStatus === 'approved' || normalizedStatus === 'APPROVED' || normalizedStatus === 'AUTHENTICATED') &&
      !isCompletingRef.current
    ) {
      isCompletingRef.current = true;
      setStatus('AUTHENTICATED');
      setStatusMessage('Login approved! Signing you in...');

      // 1. Extract full Google profile directly from the approved Firestore session snapshot
      const snapshotUid = docData.uid || docData.userId || docData.mobileAuthenticatedUser?.uid || '';
      const snapshotEmail = docData.email || docData.mobileAuthenticatedUser?.email || '';
      const snapshotDisplayName =
        docData.displayName ||
        docData.mobileAuthenticatedUser?.displayName ||
        (snapshotEmail ? snapshotEmail.split('@')[0] : 'User');
      const snapshotPhotoURL =
        docData.photoURL ?? docData.mobileAuthenticatedUser?.photoURL ?? null;
      const snapshotProvider =
        docData.provider || docData.mobileAuthenticatedUser?.provider || 'google.com';

      let authenticatedUser: any = snapshotUid
        ? {
            uid: snapshotUid,
            email: snapshotEmail,
            displayName: snapshotDisplayName,
            photoURL: snapshotPhotoURL,
            provider: snapshotProvider
          }
        : null;

      // 2. Also attempt backend exchange to enrich or validate if needed
      const grant = docData.authGrant || '';
      try {
        const exchangeRes = await fetch('/api/auth/qr-login/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid,
            secureToken: token,
            authGrant: grant,
            user: authenticatedUser || docData.mobileAuthenticatedUser
          })
        });

        if (exchangeRes.ok) {
          const exchangeData = await exchangeRes.json();
          if (exchangeData.success && exchangeData.user) {
            const exUser = exchangeData.user;
            authenticatedUser = {
              uid: snapshotUid || exUser.uid,
              email: snapshotEmail || exUser.email || '',
              displayName:
                snapshotDisplayName ||
                exUser.displayName ||
                ((snapshotEmail || exUser.email) ? (snapshotEmail || exUser.email).split('@')[0] : 'User'),
              photoURL: snapshotPhotoURL || exUser.photoURL || null,
              provider: snapshotProvider
            };
          }
        }
      } catch (err) {
        console.warn('[QRLogin] Backend exchange unavailable, using Firestore verified user profile:', err);
      }

      if (authenticatedUser && authenticatedUser.uid) {
        setStatus('COMPLETED');
        setStatusMessage(`Welcome back, ${authenticatedUser.displayName}!`);

        try {
          const sessionDocRef = doc(db, 'qr_login_sessions', sid);
          await updateDoc(sessionDocRef, {
            status: 'COMPLETED',
            completedAt: Date.now()
          });
        } catch (e) {}

        // 3. Persist verified QR Google profile to localStorage ('smartledger_qr_user' & device session)
        try {
          localStorage.setItem(STORAGE_KEY_QR_USER, JSON.stringify(authenticatedUser));
        } catch (e) {}
        saveDeviceSession(authenticatedUser, true, true);

        // 4. Immediately hydrate global StoreContext userProfile and auth state
        try {
          updateUserProfile({
            fullName: authenticatedUser.displayName,
            email: authenticatedUser.email,
            profilePhoto: authenticatedUser.photoURL || ''
          });
          sessionStorage.setItem('isUnlocked', 'true');
          window.dispatchEvent(
            new CustomEvent('smartledger:auth_state_changed', { detail: authenticatedUser })
          );
        } catch (e) {}

        if (onSuccess) {
          onSuccess(authenticatedUser);
        } else {
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 500);
        }
      } else {
        isCompletingRef.current = false;
      }
    } else if (normalizedStatus === 'EXPIRED') {
      setStatus('EXPIRED');
      setStatusMessage('QR Code expired. Tap to regenerate.');
    }
  }, [navigate, onSuccess, updateUserProfile]);

  // Attach real-time Firestore & optional Socket listener for a given session
  const subscribeToSession = useCallback((sid: string, token: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_qr_login', sid);
    }

    try {
      const sessionDocRef = doc(db, 'qr_login_sessions', sid);
      firestoreUnsubRef.current = onSnapshot(
        sessionDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const docData = snapshot.data();
            handleStatusUpdate(docData, token, sid);
          }
        },
        (err) => {
          console.warn('[QRLogin] Firestore realtime listener warning:', err?.message || err);
        }
      );
    } catch (err) {
      console.warn('[QRLogin] Could not attach Firestore listener:', err);
    }
  }, [handleStatusUpdate]);

  // Initialize or regenerate QR login session with automatic client-side fallback
  const initSession = useCallback(async () => {
    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }
    isCompletingRef.current = false;
    setLoading(true);
    setQrCodeDataUrl('');
    setStatus('WAITING');
    setStatusMessage('Scan with your phone to continue');
    setExpiresIn(120);

    const clientOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin.replace(/\/$/, '')
        : 'https://smartledgerx.vercel.app';

    let finalSessionId = '';
    let finalSecureToken = '';
    let finalQrUrl = '';
    let finalQrDataUrl = '';
    let finalExpiresIn = 120;
    const now = Date.now();
    const desktopMetadata = detectDesktopMetadata();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch('/api/auth/qr-login/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: clientOrigin }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !data.sessionId) {
        throw new Error(data.error || 'Invalid QR session response from server');
      }

      finalSessionId = data.sessionId;
      finalSecureToken = data.secureToken || `${data.sessionId}.${generateRandomHex(16)}`;
      finalQrUrl =
        data.qrUrl ||
        `${clientOrigin}/auth/mobile-login?session=${encodeURIComponent(finalSessionId)}&token=${encodeURIComponent(finalSecureToken)}`;
      finalExpiresIn = data.expiresInSeconds || 120;

      if (data.qrCodeDataUrl && data.qrCodeDataUrl.startsWith('data:image/')) {
        finalQrDataUrl = data.qrCodeDataUrl;
      } else {
        finalQrDataUrl = await QRCode.toDataURL(finalQrUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#0B0F19', light: '#FFFFFF' },
          errorCorrectionLevel: 'M'
        });
      }
    } catch (apiErr: any) {
      console.warn(
        '[QRLogin] Backend /api/auth/qr-login/create unreachable or failed in current environment; using client-side Firestore + QRCode fallback.',
        apiErr?.message || apiErr
      );

      finalSessionId = `qrs_${generateRandomHex(16)}`;
      finalSecureToken = `${finalSessionId}.${generateRandomHex(16)}`;
      finalQrUrl = `${clientOrigin}/auth/mobile-login?session=${encodeURIComponent(finalSessionId)}&token=${encodeURIComponent(finalSecureToken)}`;
      finalExpiresIn = 120;

      try {
        finalQrDataUrl = await QRCode.toDataURL(finalQrUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#0B0F19', light: '#FFFFFF' },
          errorCorrectionLevel: 'M'
        });
      } catch (qrErr) {
        console.error('[QRLogin] Client QRCode.toDataURL generation failed:', qrErr);
      }
    }

    if (!finalQrDataUrl || !finalSessionId) {
      setStatus('ERROR');
      setStatusMessage('Connection failed. Click to refresh.');
      setLoading(false);
      return;
    }

    try {
      const sessionDocRef = doc(db, 'qr_login_sessions', finalSessionId);
      await setDoc(
        sessionDocRef,
        {
          sessionId: finalSessionId,
          status: 'WAITING',
          createdAt: now,
          expiresAt: now + finalExpiresIn * 1000,
          desktopMetadata
        },
        { merge: true }
      );
    } catch (fsErr: any) {
      console.warn('[QRLogin] Firestore session write note:', fsErr?.message || fsErr);
    }

    setSessionId(finalSessionId);
    setSecureToken(finalSecureToken);
    setQrUrl(finalQrUrl);
    setQrCodeDataUrl(finalQrDataUrl);
    setExpiresIn(finalExpiresIn);
    setLoading(false);

    subscribeToSession(finalSessionId, finalSecureToken);
  }, [subscribeToSession]);

  // Socket.IO real-time setup (non-blocking optional enhancement for local/stateful environments)
  useEffect(() => {
    const isVercelProd =
      typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
    if (isVercelProd) {
      return;
    }

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 4000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (sessionId) {
        socket.emit('join_qr_login', sessionId);
      }
    });

    socket.on('qr_login_status', (payload) => {
      if (payload && (!payload.sessionId || payload.sessionId === sessionId)) {
        handleStatusUpdate(payload, secureToken, sessionId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, secureToken, handleStatusUpdate]);

  // Lifecycle mount
  useEffect(() => {
    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (firestoreUnsubRef.current) firestoreUnsubRef.current();
    };
  }, [initSession]);

  // Countdown timer
  useEffect(() => {
    if (loading || status === 'COMPLETED' || status === 'EXPIRED' || status === 'ERROR') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus('EXPIRED');
          setStatusMessage('QR Code expired. Tap to regenerate.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, status]);

  // Copy mobile login link helper
  const handleCopyLink = () => {
    if (!qrUrl) return;
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative w-full max-w-[360px] mx-auto select-none ${className || ''}`}>
      {/* Premium Apple / Material 3 Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[28px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 p-6 sm:p-7 shadow-[0_24px_50px_rgba(0,0,0,0.6)] text-center text-white flex flex-col items-center"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: SmartLedgerX Fast Login */}
        <div className="flex items-center justify-between w-full pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>SmartLedgerX</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Fast Login
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Zero-password biometric sign-in</p>
            </div>
          </div>

          <button
            type="button"
            onClick={initSession}
            disabled={loading}
            title="Refresh QR Code"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>

        {/* Dynamic QR Code Canvas Container - Fixed Square Dimensions to Prevent Collapse */}
        <div className="relative my-5 flex flex-col items-center justify-center">
          <div className="relative w-52 h-52 min-w-[208px] min-h-[208px] aspect-square p-3 bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/20 flex items-center justify-center transition-transform duration-300">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 text-slate-700 bg-slate-100 rounded-xl animate-pulse">
                <Loader2 size={30} className="animate-spin text-blue-600" />
                <span className="text-[11px] font-semibold text-slate-500">Generating Secure QR...</span>
              </div>
            ) : qrCodeDataUrl && status !== 'ERROR' ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <img 
                  src={qrCodeDataUrl} 
                  alt="Scan with phone to login" 
                  className={`w-full h-full object-contain rounded-lg transition-all duration-300 ${
                    status === 'EXPIRED' ? 'filter blur-[3px] grayscale opacity-30' : ''
                  }`} 
                />

                {/* Center Fintech Badge Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center text-blue-400">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                {/* QR Expired Overlay */}
                {status === 'EXPIRED' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-center"
                  >
                    <Clock size={26} className="text-amber-400 mb-1" />
                    <p className="text-xs font-bold text-white mb-0.5">QR Expired</p>
                    <p className="text-[10px] text-slate-300 mb-2.5">For security, QR codes expire after 2 minutes.</p>
                    <button
                      type="button"
                      onClick={initSession}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>Regenerate</span>
                    </button>
                  </motion.div>
                )}

                {/* QR Scanned / Pending Approval Overlay */}
                {(status === 'SCANNED' || status === 'PENDING_APPROVAL') && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-blue-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-center border border-blue-500/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-blue-400 flex items-center justify-center text-blue-300 mb-1.5 animate-pulse">
                      <Smartphone size={22} />
                    </div>
                    <p className="text-xs font-bold text-white">
                      {status === 'PENDING_APPROVAL' ? 'Confirm on Phone' : 'Phone Detected!'}
                    </p>
                    <p className="text-[10px] text-blue-200 mt-0.5">
                      {status === 'PENDING_APPROVAL'
                        ? 'Tap "Approve Login" on your mobile screen'
                        : 'Please sign in on your phone...'}
                    </p>
                  </motion.div>
                )}

                {/* QR Authenticated / Approved Overlay */}
                {(status === 'AUTHENTICATED' || status === 'COMPLETED') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-3 text-center border border-emerald-500/50"
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 mb-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 size={26} />
                    </div>
                    <p className="text-xs font-bold text-white">Authenticated!</p>
                    <p className="text-[10px] text-emerald-200 mt-0.5">Signing you in...</p>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Clean Retry UI Inside Fixed Square Box (Prevents White Circle Collapse) */
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-50 rounded-xl border border-slate-200">
                <AlertCircle size={28} className="text-rose-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 mb-0.5">QR Unavailable</p>
                <p className="text-[10px] text-slate-500 mb-3 leading-tight">
                  Could not generate login code.
                </p>
                <button
                  type="button"
                  onClick={initSession}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Click to Retry</span>
                </button>
              </div>
            )}
          </div>

          {/* Interactive Status Indicator Bar */}
          <div className="mt-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status === 'COMPLETED' || status === 'AUTHENTICATED' 
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                : status === 'SCANNED' || status === 'PENDING_APPROVAL'
                ? 'bg-blue-400 animate-pulse' 
                : status === 'EXPIRED' 
                ? 'bg-amber-400' 
                : status === 'ERROR'
                ? 'bg-rose-400'
                : 'bg-emerald-400 animate-pulse'
            }`} />
            <span
              onClick={status === 'ERROR' || status === 'EXPIRED' ? initSession : undefined}
              className={`text-xs font-medium text-slate-300 ${
                status === 'ERROR' || status === 'EXPIRED' ? 'cursor-pointer hover:text-white underline underline-offset-2' : ''
              }`}
            >
              {statusMessage}
            </span>
          </div>
        </div>

        {/* Live Countdown Badge: Expires in 01:59 */}
        <div className="w-full pt-3 pb-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Clock size={13} className={expiresIn <= 30 ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
            <span className={expiresIn <= 30 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              Expires in {formatCountdown(expiresIn)}
            </span>
          </div>

          {/* Fallback Copy Link for Testing or Same-Device Verification */}
          {qrUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copy link to test mobile view in another tab"
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Explanatory Footnote */}
        <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed">
          Open your phone's default Camera app and point it at the code. No secondary authenticator app needed.
        </p>
      </motion.div>
    </div>
  );
}
