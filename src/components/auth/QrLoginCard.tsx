import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Shield,
  Laptop,
  Check,
  Copy,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { saveDeviceSession } from '../../lib/deviceAuthSession';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

interface QrLoginCardProps {
  onSuccess?: (user: any) => void;
  className?: string;
}

export default function QrLoginCard({ onSuccess, className }: QrLoginCardProps) {
  const navigate = useNavigate();
  const { updateUserProfile } = useStore();

  const [sessionId, setSessionId] = useState<string>('');
  const [secureToken, setSecureToken] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('https://smartledgerx.vercel.app');
  const [expiresIn, setExpiresIn] = useState<number>(120);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState<
    'WAITING' | 'SCANNED' | 'AUTHENTICATED' | 'COMPLETED' | 'EXPIRED' | 'ERROR'
  >('WAITING');
  const [statusMessage, setStatusMessage] = useState<string>('Scan with your phone to continue');
  const [mobileInfo, setMobileInfo] = useState<any>(null);
  const [approvedUser, setApprovedUser] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const isCompletingRef = useRef<boolean>(false);

  // Initialize or regenerate QR login session
  const initSession = async () => {
    try {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      isCompletingRef.current = false;
      setLoading(true);
      setStatus('WAITING');
      setStatusMessage('Scan with your phone to continue');
      setMobileInfo(null);
      setApprovedUser(null);
      setExpiresIn(120);
      setQrUrl('https://smartledgerx.vercel.app');

      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch('/api/auth/qr-login/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: clientOrigin })
      });
      const data = await res.json();

      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        setSecureToken(data.secureToken);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setQrUrl(data.qrUrl || 'https://smartledgerx.vercel.app');
        setExpiresIn(data.expiresInSeconds || 120);
        setLoading(false);

        // 1. Join Socket.IO real-time channel
        if (socketRef.current) {
          socketRef.current.emit('join_qr_login', data.sessionId);
        }

        // 2. Attach real-time Firestore document listener
        try {
          const sessionDocRef = doc(db, 'qr_login_sessions', data.sessionId);
          firestoreUnsubRef.current = onSnapshot(sessionDocRef, (snapshot) => {
            if (snapshot.exists()) {
              const docData = snapshot.data();
              handleStatusUpdate(docData, data.secureToken, data.sessionId);
            }
          }, (err) => {
            console.warn('[QRLogin] Firestore listener fallback:', err);
          });
        } catch (e) {}
      } else {
        setStatus('ERROR');
        setStatusMessage(data.error || 'Failed to initialize QR session.');
        setLoading(false);
      }
    } catch (err: any) {
      setStatus('ERROR');
      setStatusMessage('Connection failed. Click to refresh.');
      setLoading(false);
    }
  };

  // Socket.IO real-time setup
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
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
  }, [sessionId, secureToken]);

  // Central handler for status updates across Firestore and Socket.IO
  const handleStatusUpdate = async (docData: any, token: string, sid: string) => {
    if (!docData || !docData.status) return;

    if (docData.status === 'SCANNED') {
      setStatus('SCANNED');
      setStatusMessage('Phone detected! Waiting for authentication...');
      if (docData.mobileMetadata) {
        setMobileInfo(docData.mobileMetadata);
      }
    } else if (docData.status === 'AUTHENTICATED' && !isCompletingRef.current) {
      isCompletingRef.current = true;
      setStatus('AUTHENTICATED');
      setStatusMessage('Login successful! Redirecting...');

      const grant = docData.authGrant;
      try {
        const exchangeRes = await fetch('/api/auth/qr-login/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sid,
            secureToken: token,
            authGrant: grant
          })
        });
        const exchangeData = await exchangeRes.json();

        if (exchangeData.success && exchangeData.user) {
          const authenticatedUser = exchangeData.user;
          setApprovedUser(authenticatedUser);
          setStatus('COMPLETED');
          setStatusMessage('Login confirmed! Welcome back.');

          // Synchronize application session
          saveDeviceSession(authenticatedUser, true);
          try {
            sessionStorage.setItem('isUnlocked', 'true');
            window.dispatchEvent(new CustomEvent('smartledger:auth_state_changed', { detail: authenticatedUser }));
          } catch (e) {}

          if (onSuccess) {
            onSuccess(authenticatedUser);
          } else {
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 800);
          }
        }
      } catch (err) {
        console.error('[QRLogin] Session exchange error:', err);
      }
    } else if (docData.status === 'EXPIRED') {
      setStatus('EXPIRED');
      setStatusMessage('QR Code expired. Tap to regenerate.');
    }
  };

  // Lifecycle timer countdown
  useEffect(() => {
    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (firestoreUnsubRef.current) firestoreUnsubRef.current();
    };
  }, []);

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

        {/* Card Header: 🔐 SmartLedgerX */}
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
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>

        {/* Dynamic QR Code Canvas Container */}
        <div className="relative my-5 flex flex-col items-center justify-center">
          <div className="relative p-3.5 bg-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/20 transition-transform duration-300">
            {loading ? (
              <div className="w-[190px] h-[190px] flex flex-col items-center justify-center gap-2 text-slate-700 bg-slate-100 rounded-xl">
                <Loader2 size={28} className="animate-spin text-blue-600" />
                <span className="text-[11px] font-semibold text-slate-500">Generating Secure QR...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="relative">
                <img 
                  src={qrCodeDataUrl} 
                  alt="Scan with phone to login" 
                  className={`w-[190px] h-[190px] object-contain rounded-lg transition-all duration-300 ${
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
                    className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center p-3 text-center"
                  >
                    <Clock size={26} className="text-amber-400 mb-1" />
                    <p className="text-xs font-bold text-white mb-0.5">QR Expired</p>
                    <p className="text-[10px] text-slate-300 mb-2.5">For security, QR codes expire after 2 minutes.</p>
                    <button
                      type="button"
                      onClick={initSession}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={12} />
                      <span>Regenerate</span>
                    </button>
                  </motion.div>
                )}

                {/* QR Scanned Overlay */}
                {status === 'SCANNED' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-blue-950/80 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center p-3 text-center border border-blue-500/50"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-blue-400 flex items-center justify-center text-blue-300 mb-1.5 animate-pulse">
                      <Smartphone size={22} />
                    </div>
                    <p className="text-xs font-bold text-white">Phone Detected!</p>
                    <p className="text-[10px] text-blue-200 mt-0.5">Please confirm on your phone...</p>
                  </motion.div>
                )}

                {/* QR Authenticated / Approved Overlay */}
                {(status === 'AUTHENTICATED' || status === 'COMPLETED') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center p-3 text-center border border-emerald-500/50"
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 mb-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 size={26} />
                    </div>
                    <p className="text-xs font-bold text-white">Authenticated!</p>
                    <p className="text-[10px] text-emerald-200 mt-0.5">Signing you in...</p>
                  </motion.div>
                )}
              </div>
            ) : null}
          </div>

          {/* Interactive Status Indicator Bar */}
          <div className="mt-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              status === 'COMPLETED' || status === 'AUTHENTICATED' 
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' 
                : status === 'SCANNED' 
                ? 'bg-blue-400 animate-pulse' 
                : status === 'EXPIRED' 
                ? 'bg-amber-400' 
                : 'bg-emerald-400 animate-pulse'
            }`} />
            <span className="text-xs font-medium text-slate-300">
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
