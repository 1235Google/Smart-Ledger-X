import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Globe, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Lock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, loginWithGoogle } from '../lib/firebase';
import { formatDateTime } from '../lib/utils';

export default function MobileQrLogin() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sid') || '';

  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [approvedAccount, setApprovedAccount] = useState<any>(null);

  // 1. On mount: Verify token & advance state to SCANNED
  useEffect(() => {
    let isMounted = true;

    async function verifyToken() {
      if (!token) {
        setError('Missing security token in QR login link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch('/api/auth/qr-login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            sessionId
          })
        });

        const data = await res.json();
        if (!isMounted) return;

        if (data.success && data.session) {
          setSessionData(data.session);

          // Update Firestore status to SCANNED if available
          if (sessionId) {
            try {
              const sessionRef = doc(db, 'qr_login_sessions', sessionId);
              await updateDoc(sessionRef, {
                status: 'SCANNED',
                'mobileMetadata.scannedAt': Date.now()
              });
            } catch (e) {}
          }
          setLoading(false);

          // Check if already logged in and auto-trigger flow if not
          if (!auth.currentUser) {
             handleGoogleAuth();
          }
        } else {
          setError(data.error || 'This QR session is invalid or has expired.');
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError('Network error validating QR session. Please check your connection.');
        setLoading(false);
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, sessionId]);

  // 2. User clicks "Continue with Google"
  const handleGoogleAuth = async () => {
    if (authenticating || !token || !sessionId) return;
    setAuthenticating(true);
    setError(null);

    try {
      // Step A: Trigger Google OAuth
      const authResult = await loginWithGoogle();
      const user = authResult?.user;
      if (!user) {
        throw new Error('Google authentication cancelled or failed.');
      }

      const idToken = await user.getIdToken(true);
      const userPayload = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || undefined
      };

      // Step B: Authorize session with backend Identity Toolkit verification
      const authRes = await fetch('/api/auth/qr-login/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          secureToken: token,
          idToken,
          user: userPayload
        })
      });

      const authData = await authRes.json();

      if (authData.success) {
        // Step C: Update Firestore to PENDING_APPROVAL (wait for user to click approve)
        try {
          const sessionRef = doc(db, 'qr_login_sessions', sessionId);
          await updateDoc(sessionRef, {
            status: 'PENDING_APPROVAL',
            userId: user.uid,
            email: user.email,
            mobileAuthenticatedUser: {
              ...userPayload,
              authenticatedAt: Date.now()
            },
            authGrant: authData.authGrant
          });
        } catch (e) {}

        setApprovedAccount(userPayload);
        // Show approval screen, not "Approved!" screen
        setIsApproved(false); 
        setPendingApproval(true);
      } else {
        setError(authData.error || 'Failed to authorize desktop session.');
      }
    } catch (err: any) {
      console.error('[MobileQrLogin] Auth error:', err);
      setError(err?.message || 'Authentication could not be completed.');
    } finally {
      setAuthenticating(false);
    }
  };

  const desktopMeta = sessionData?.desktopMetadata;

  return (
    <div className="min-h-screen bg-[#090b10] text-white flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden font-sans">
      {/* Background Lighting Gradients */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-md mx-auto pt-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>SmartLedgerX</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Authoritative Mobile Authenticator</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium">
          <Lock size={12} className="text-emerald-400" />
          <span>Encrypted</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto my-auto py-8 z-10">
        <AnimatePresence mode="wait">
          {/* State 1: Loading State */}
          {loading && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 text-center flex flex-col items-center justify-center space-y-3 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <h2 className="text-base font-bold text-white">Verifying Login Token</h2>
              <p className="text-xs text-slate-400 max-w-xs">Connecting securely to SmartLedgerX session pipeline...</p>
            </motion.div>
          )}

          {/* State 2: Error or Expired State */}
          {!loading && error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-7 rounded-3xl bg-rose-950/40 backdrop-blur-2xl border border-rose-500/30 text-center flex flex-col items-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle size={30} />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Session Unavailable</h2>
                <p className="text-xs text-rose-200/80 leading-relaxed max-w-xs">{error}</p>
              </div>

              <div className="w-full pt-2">
                <p className="text-[11px] text-slate-400">
                  Please return to your desktop and click <strong className="text-white">Refresh QR Code</strong> to generate a fresh 2-minute token.
                </p>
              </div>
            </motion.div>
          )}

          {/* State 3: Approved Success Screen */}
          {!loading && !error && isApproved && (
            <motion.div 
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-7 sm:p-8 rounded-3xl bg-emerald-950/30 backdrop-blur-2xl border border-emerald-500/30 text-center flex flex-col items-center space-y-5 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 size={36} />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-white">Login Approved!</h2>
                <p className="text-xs text-emerald-200/90 leading-relaxed max-w-xs">
                  Your desktop browser has authenticated successfully. You are now logged into SmartLedgerX.
                </p>
              </div>

              {/* Account Pill */}
              {approvedAccount && (
                <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-left">
                  {approvedAccount.photoURL ? (
                    <img src={approvedAccount.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                      {approvedAccount.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{approvedAccount.displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{approvedAccount.email}</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 pt-2">
                You may safely close this browser tab now.
              </p>
            </motion.div>
          )}

          {/* State 4: Approval Screen (PENDING_APPROVAL) */}
          {!loading && !error && pendingApproval && (
            <motion.div 
              key="approval"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-7 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 text-center flex flex-col items-center space-y-4 shadow-2xl"
            >
              <h2 className="text-lg font-bold text-white">Secure Login Request</h2>
              <div className="text-left w-full space-y-2 text-xs text-slate-400 p-4 bg-white/5 rounded-xl border border-white/10">
                <p><strong>Device:</strong> {sessionData?.desktopMetadata?.os} / {sessionData?.desktopMetadata?.browser}</p>
                <p><strong>Location:</strong> {sessionData?.desktopMetadata?.location}</p>
                <p><strong>Account:</strong> {approvedAccount?.email}</p>
              </div>
              <button onClick={async () => {
                const sessionRef = doc(db, 'qr_login_sessions', sessionId);
                await updateDoc(sessionRef, { status: 'AUTHENTICATED' });
                setPendingApproval(false);
                setIsApproved(true);
              }} className="w-full py-3 bg-blue-600 rounded-2xl font-bold text-white">Approve Login</button>
              <button onClick={() => window.location.reload()} className="w-full py-3 bg-white/10 rounded-2xl font-bold text-white">Cancel</button>
            </motion.div>
          )}

          {/* State 5: Default Active Login Request Screen */}
          {!loading && !error && !isApproved && !pendingApproval && (
            <motion.div 
              key="request"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-6 sm:p-7 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 flex flex-col space-y-6 shadow-2xl"
            >
              {/* Header Badge & Title */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-wide">
                  <ShieldCheck size={14} />
                  <span>🔐 Login Request</span>
                </div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Sign in to SmartLedgerX
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  A desktop device wants to sign into your SmartLedgerX account.
                </p>
              </div>

              {/* Target Device Information Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                    <Laptop size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">
                      {desktopMeta?.browser || 'Web Browser'} on {desktopMeta?.os || 'Desktop OS'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {desktopMeta?.deviceType ? `${desktopMeta.deviceType.toUpperCase()} Device` : 'Workstation'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Globe size={11} className="text-slate-500" />
                    <span>IP: {desktopMeta?.ip || 'Detecting...'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-slate-500" />
                    <span>Requested just now</span>
                  </span>
                </div>
              </div>

              {/* Action Button: Continue with Google */}
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authenticating}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {authenticating ? (
                    <>
                      <Loader2 size={18} className="animate-spin text-slate-900" />
                      <span>Authenticating with Google...</span>
                    </>
                  ) : (
                    <>
                      {/* Official Google 'G' SVG Logo */}
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  Only continue if this request came from your desktop screen.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-slate-500 pb-4 z-10">
        <p>© 2026 SmartLedgerX. End-to-end encrypted session grant.</p>
      </footer>
    </div>
  );
}
