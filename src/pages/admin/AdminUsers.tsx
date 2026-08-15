import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, Edit3, Trash2, ShieldAlert, CheckCircle2, User, Phone, Mail, X, Wallet, ShieldCheck, Database, Calendar } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { cn } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';

interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  provider: string;
  createdAt: any;
  lastLogin: any;
  role?: string;
}

export default function AdminUsers() {
  const { transactions, userProfile } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setUsers([]);
          setIsLoading(false);
          return;
        }

        const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'info');
        const profileSnap = await getDoc(profileDocRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : null;

        const userRecord: AppUser = {
          uid: currentUser.uid,
          displayName: profileData?.fullName || userProfile?.fullName || currentUser.displayName || 'Primary Account',
          email: currentUser.email || 'user@smartledger.local',
          photoURL: profileData?.photoURL || userProfile?.profilePhoto || currentUser.photoURL || '',
          provider: currentUser.providerData[0]?.providerId || 'password',
          createdAt: currentUser.metadata.creationTime || new Date().toISOString(),
          lastLogin: currentUser.metadata.lastSignInTime || new Date().toISOString(),
          role: 'admin'
        };

        setUsers([userRecord]);
      } catch (err: any) {
        console.error("Error fetching user info:", err);
        setError("Unable to load user records.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [userProfile]);

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.uid || '').includes(searchTerm)
  );

  const toggleAdminRole = async (user: AppUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateDoc(userRef, { role: newRole });
      setUsers(users.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Registered Users</h2>
          <p className="text-slate-400">Manage all registered accounts across the platform</p>
        </div>
      </div>

      <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, email, or UID..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-medium">
              <Users size={16} className="inline mr-2" />
              {users.length} Users
            </div>
          </div>

          {error && (
             <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
             </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-4 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">User Info</th>
                    <th className="py-4 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">UID</th>
                    <th className="py-4 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Provider</th>
                    <th className="py-4 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dates</th>
                    <th className="py-4 px-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status/Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length > 0 ? filteredUsers.map((user, idx) => (
                    <motion.tr 
                      key={user.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <User size={18} className="text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{user.displayName || 'Unknown User'}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={12} />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-mono text-slate-400 bg-black/40 px-2 py-1 rounded inline-block border border-white/5">
                          {user.uid.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs font-medium px-2 py-1 bg-white/10 rounded border border-white/10 capitalize">
                          {user.provider?.replace('.com', '') || 'Email'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} /> Created: {formatDate(user.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Database size={12} /> Login: {formatDate(user.lastLogin)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleAdminRole(user)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                            user.role === 'admin' 
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          )}
                        >
                          {user.role === 'admin' ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                          {user.role === 'admin' ? 'Admin' : 'Active'}
                        </button>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-neutral-500">
                        No registered users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
