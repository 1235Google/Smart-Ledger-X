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
  Laptop, 
  Fingerprint, 
  Sparkles, 
  Scan,
  Shield,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { saveDeviceSession } from '../../lib/deviceAuthSession';
import { useNavigate } from 'react-router-dom';

interface SecureQrCardProps {
  onSuccess?: (user: any) => void;
  className?: string;
  onOpenMobileScanner?: (sessionId: string) => void;
}

export default function SecureQrCard({ onSuccess, className, onOpenMobileScanner }: SecureQrCardProps) {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(120);
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<
    'waiting' | 'scanned' | 'authenticating' | 'approved' | 'rejected' | 'expired' | 'error'
  >('waiting');
  const [statusMessage, setStatusMessage] = useState<string>('Waiting for trusted device...');
  const [desktopMeta, setDesktopMeta] = useState<any>(null);
  const [mobileInfo, setMobileInfo] = useState<any>(null);
  const [approvedUser, setApprovedUser] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  // Initialize or regenerate a pairing session
  const initSession = async () => {
    try {
      setLoading(true);
      setStatus('waiting');
      setStatusMessage('Waiting for trusted device...');
      setMobileInfo(null);
      setApprovedUser(null);

      const res = await fetch('/api/auth/qr-pair/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setExpiresIn(data.expiresInSeconds || 120);
        setDesktopMeta(data.desktopMetadata);
        setLoading(false);

        // Join real-time WebSocket room
        if (socketRef.current) {
          socketRef.current.emit('join_qr_session', data.sessionId);
        }
      } else {
        setStatus('error');
        setStatusMessage(data.error || 'Failed to initialize session');
        setLoading(false);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage('Network connection error. Tap to retry.');
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
        socket.emit('join_qr_session', sessionId);
      }
    });

    socket.on('qr_scanned', (payload) => {
      setStatus('scanned');
      setStatusMessage('Device detected! Authenticating with biometrics...');
      if (payload?.mobileInfo) {
        setMobileInfo(payload.mobileInfo);
      }
    });

    socket.on('qr_approved', (payload) => {
      setStatus('approved');
      setStatusMessage('Approved! Securely signing in to SmartLedgerX...');
      if (payload?.user) {
        setApprovedUser(payload.user);
        saveDeviceSession(payload.user, true);
        try {
          sessionStorage.setItem('isUnlocked', 'true');
        } catch (e) {}

        setTimeout(() => {
          if (onSuccess) {
            onSuccess(payload.user);
          } else {
            navigate('/', { replace: true });
          }
        }, 800);
      }
    });

    socket.on('qr_rejected', (payload) => {
      setStatus('rejected');
      setStatusMessage(payload?.reason || 'Login request was rejected by your mobile device.');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, navigate, onSuccess]);

  // Initial load
  useEffect(() => {
    initSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // 120s Countdown timer
  useEffect(() => {
    if (loading || status === 'approved' || status === 'rejected' || status === 'error') return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setStatus('expired');
          setStatusMessage('QR code expired. Tap refresh to generate a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, status]);

  // Polling fallback to guarantee instant updates even if WebSocket is blocked by corporate firewall
  useEffect(() => {
    if (!sessionId || status === 'approved' || status === 'rejected' || status === 'expired') return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr-pair/session/${sessionId}`);
        const data = await res.json();
        if (data.success) {
          if (data.status === 'scanned' && status === 'waiting') {
            setStatus('scanned');
            setStatusMessage('Device detected! Authenticating with biometrics...');
          } else if (data.status === 'approved') {
            setStatus('approved');
            setStatusMessage('Approved! Signing in to SmartLedgerX...');
            if (data.approvedUser) {
              setApprovedUser(data.approvedUser);
              saveDeviceSession(data.approvedUser, true);
              try {
                sessionStorage.setItem('isUnlocked', 'true');
              } catch (e) {}
              setTimeout(() => {
                if (onSuccess) {
                  onSuccess(data.approvedUser);
                } else {
                  navigate('/', { replace: true });
                }
              }, 800);
            }
          } else if (data.status === 'rejected') {
            setStatus('rejected');
            setStatusMessage(data.rejectionReason || 'Request rejected by device.');
          } else if (data.status === 'expired') {
            setStatus('expired');
            setStatusMessage('QR code expired.');
          }
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(pollingRef.current);
  }, [sessionId, status, navigate, onSuccess]);

  // Formatter for MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`relative ${className || ''}`}>
      {/* Liquid Glass Outer Glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 via-cyan-500/30 to-indigo-600/30 rounded-[32px] blur-xl opacity-75 pointer-events-none transition-all duration-700 group-hover:opacity-100" />

      {/* Main Glassmorphic QR Card */}
      <div className="relative rounded-[28px] border border-white/15 bg-[#0b0f19]/90 backdrop-blur-2xl p-7 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col items-center text-center overflow-hidden">
        {/* Subtle Liquid Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-32 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Shield & Header */}
        <div className="relative z-10 flex flex-col items-center mb-5">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-3 shadow-inner">
            <ShieldCheck size={14} className="text-cyan-400" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
              SmartLedgerX &bull; End-to-End Pairing
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5 font-sans">
            Sign in securely with your mobile device
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
            Open SmartLedgerX on your phone, go to <span className="text-cyan-300 font-semibold">Settings &rarr; Linked Devices</span>, and scan this code.
          </p>
        </div>

        {/* QR Code Container with Rotating Security Ring */}
        <div className="relative my-2 flex items-center justify-center">
          {/* Animated Outer Rotating Security Ring */}
          <div className="absolute -inset-3.5 rounded-[26px] pointer-events-none overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="w-full h-full rounded-[26px] bg-gradient-to-tr from-cyan-500 via-transparent to-blue-500 opacity-60 blur-[3px]"
            />
          </div>

          {/* QR Glass Framing */}
          <div className="relative p-3.5 rounded-[22px] bg-white border border-white/40 shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            {loading ? (
              <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] flex flex-col items-center justify-center gap-3 bg-slate-900 rounded-xl text-slate-400">
                <Loader2 size={32} className="animate-spin text-cyan-400" />
                <span className="text-xs font-semibold">Generating Cryptographic Session...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="relative w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-xl overflow-hidden bg-white flex items-center justify-center select-none">
                <img
                  src={qrCodeDataUrl}
                  alt="Secure Device Pairing QR Code"
                  className="w-full h-full object-contain p-1"
                />

                {/* Laser Scanning Beam Animation */}
                {status === 'waiting' && (
                  <motion.div
                    animate={{ y: [-90, 90, -90] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f0ff] pointer-events-none opacity-80"
                  />
                )}

                {/* Central Brand Emblem */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-slate-950/95 border-2 border-cyan-400 flex items-center justify-center shadow-lg">
                  <Shield size={20} className="text-cyan-400 fill-cyan-400/20" />
                </div>

                {/* Status Overlays */}
                <AnimatePresence>
                  {status === 'scanned' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center"
                    >
                      <Fingerprint size={36} className="text-cyan-400 animate-pulse mb-2" />
                      <span className="text-xs font-bold text-white">Device Connected</span>
                      <span className="text-[11px] text-slate-300 mt-1">Verifying biometrics on phone...</span>
                    </motion.div>
                  )}

                  {status === 'approved' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center"
                    >
                      <CheckCircle2 size={40} className="text-emerald-400 mb-2 animate-bounce" />
                      <span className="text-xs font-bold text-white">Login Approved!</span>
                      <span className="text-[11px] text-emerald-200 mt-0.5">Entering Dashboard...</span>
                    </motion.div>
                  )}

                  {status === 'rejected' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center"
                    >
                      <XCircle size={36} className="text-rose-400 mb-2" />
                      <span className="text-xs font-bold text-white">Request Rejected</span>
                      <button
                        onClick={initSession}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/30 transition-colors"
                      >
                        Try Again
                      </button>
                    </motion.div>
                  )}

                  {status === 'expired' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center"
                    >
                      <Clock size={36} className="text-amber-400 mb-2" />
                      <span className="text-xs font-bold text-white">Session Expired</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Codes expire every 120s</span>
                      <button
                        onClick={initSession}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} />
                        <span>Refresh Code</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </div>
        </div>

        {/* Real-Time Countdown & Status */}
        <div className="relative z-10 w-full mt-4 flex items-center justify-between text-xs px-2 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-1.5">
            <Clock size={13} className={expiresIn <= 30 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'} />
            <span className="text-slate-400">Expires in:</span>
            <span className={`font-mono font-bold ${expiresIn <= 30 ? 'text-rose-400' : 'text-slate-200'}`}>
              {formatTimer(expiresIn)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={initSession}
              disabled={loading}
              title="Regenerate QR session code"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dynamic Status Text */}
        <div className="mt-3 text-xs font-medium text-slate-300 flex items-center gap-1.5">
          {status === 'waiting' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
          {status === 'scanned' && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
          {status === 'approved' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          {status === 'rejected' && <span className="w-2 h-2 rounded-full bg-rose-400" />}
          {status === 'expired' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          <span>{statusMessage}</span>
        </div>

        {/* Instant Mobile Scanner Action / Simulator Tester */}
        <div className="w-full mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => onOpenMobileScanner && onOpenMobileScanner(sessionId)}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 text-xs font-semibold transition-all shadow-sm group"
          >
            <Smartphone size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Launch Phone Scanner / Tester</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy Pairing Session ID"
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Session ID'}</span>
          </button>
        </div>

        {/* Security Specs Badge */}
        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest">
          <span>HMAC-SHA256 &bull; Single-Use &bull; Replay-Protected</span>
        </div>
      </div>
    </div>
  );
}
