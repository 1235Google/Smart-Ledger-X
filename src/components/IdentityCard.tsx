import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { User, Shield, RefreshCw, LogOut, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function IdentityCard() {
  const { userProfile, updateUserProfile, currentUser, logout } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["-6deg", "6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["6deg", "-6deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Auto flip every 8 seconds
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => setIsFlipped(prev => !prev), 8000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        try {
          await updateProfile(currentUser, { photoURL: base64Data });
          await setDoc(doc(db, 'users', currentUser.uid), { photoURL: base64Data }, { merge: true });
          updateUserProfile({ profilePhoto: base64Data });
        } catch (err) {
          console.error("Failed to upload photo", err);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 items-start justify-center">
      <motion.div
        className="relative w-full max-w-[800px] aspect-[2.3/1] perspective-1000 cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <motion.div
          className="w-full h-full relative preserve-3d shadow-2xl"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 1, ease: [0.2, 0, 0.1, 1] }}
        >
          {/* Front Side */}
          <div className="absolute inset-0 backface-hidden rounded-[32px] bg-neutral-950 border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,50,250,0.2),transparent_70%)]" />
            <div className="absolute inset-0 animate-aurora opacity-30" />
            
            <div className="relative h-full p-8 flex justify-between items-center">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <span className="text-black font-bold">S</span>
                    </div>
                    <span className="text-xl font-bold tracking-[0.2em] text-white">SMARTLEDGER</span>
                  </div>
                  <span className="text-sm text-neutral-400 tracking-[0.2em] uppercase">Diamond Member</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full border-2 border-purple-500/30 p-1 relative" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center">
                          {uploading ? <RefreshCw className="animate-spin text-white" /> : userProfile?.profilePhoto ? <img src={userProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : <User size={40} className="text-neutral-500" />}
                      </div>
                      <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-4 border-black animate-pulse" />
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{userProfile?.fullName || 'Member'}</h3>
                    <p className="text-neutral-400">{userProfile?.email || 'No email'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-full justify-between items-end">
                <div className="px-4 py-2 bg-gradient-to-r from-amber-400/20 to-purple-500/20 border border-amber-500/30 rounded-2xl flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400 animate-pulse" />
                    <span className="font-bold text-amber-400">DIAMOND</span>
                </div>
                
                <div className="w-64">
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                        <span>Level 8</span>
                        <span>8,450 / 10,000 XP</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" initial={{ width: 0 }} animate={{ width: "84.5%" }} transition={{ duration: 1.5 }} />
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 backface-hidden rounded-[32px] bg-neutral-950 border border-white/10 overflow-hidden flex flex-col items-center justify-center p-8" style={{ transform: 'rotateY(180deg)' }}>
              <div className="text-neutral-500 tracking-[0.3em] uppercase text-xs mb-8">Identity Verification</div>
              <div className="w-40 h-40 bg-white rounded-xl p-2 mb-6">
                <div className="w-full h-full bg-black" />
              </div>
              <div className="text-xl font-mono text-white tracking-widest">SLX-8942-8819</div>
          </div>
        </motion.div>
      </motion.div>

      <div className="flex-1 flex flex-col gap-5 w-full">
        <div className="grid grid-cols-2 gap-4 w-full">
            <StatCard label="Status" value="Connected" icon="pulse" />
            <StatCard label="Provider" value={currentUser?.providerData[0]?.providerId.split('.')[0] || 'Email'} />
            <StatCard label="Created" value={currentUser?.metadata.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'} />
            <StatCard label="Last Login" value={currentUser?.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'N/A'} />
        </div>
        <div className="grid grid-cols-2 gap-4 w-full mt-2">
          <Button variant="secondary" onClick={() => {}} icon={SettingsIcon}>Manage</Button>
          <Button variant="secondary" onClick={() => currentUser?.reload()} icon={RefreshCw}>Refresh</Button>
          <Button variant="danger" onClick={logout} className="col-span-2" icon={LogOut}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon?: string }) {
    return (
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col gap-1 hover:border-white/10 transition-colors">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
            <span className="text-sm text-white font-semibold flex items-center gap-2">
                {icon === 'pulse' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {value}
            </span>
        </div>
    )
}

function Button({ variant = 'secondary', onClick, icon: Icon, children, className = '' }: any) {
    const base = "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg";
    const variants = {
        secondary: "bg-neutral-900/50 hover:bg-neutral-800 border border-white/5 text-white hover:shadow-white/5",
        danger: "bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 text-red-400 hover:shadow-red-900/10"
    };
    return <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>{Icon && <Icon size={16} />} {children}</button>
}

