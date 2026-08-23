import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Crown, 
  Key, 
  Sparkles,
  Info,
  Check
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { 
  subscribeToAllAdmins, 
  addAdminUser, 
  updateAdminUserRole, 
  toggleAdminUserStatus, 
  removeAdminUser 
} from '../../lib/adminAuthService';
import { AdminUser, AdminRole, AdminStatus } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { M3DataTable, Column } from '../../components/admin/material3/M3DataTable';
import { M3Card } from '../../components/admin/material3/M3Card';
import { M3Button } from '../../components/admin/material3/M3Button';
import { M3TextField } from '../../components/admin/material3/M3TextField';
import { M3Dialog } from '../../components/admin/material3/M3Dialog';
import { M3Chip } from '../../components/admin/material3/M3Chip';
import { useM3Theme } from '../../components/admin/material3/M3ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function AdminUsers() {
  const { adminUser: currentAdmin } = useStore();
  const { showSuccess, showError, showInfo } = useToast();
  const { resolvedTheme } = useM3Theme();
  const isDark = resolvedTheme === 'dark';

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add Admin Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('Admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Delete Confirmation State
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllAdmins((adminList) => {
      setAdmins(adminList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    if (!currentAdmin) {
      setActionError('You must be logged in as an active administrator.');
      return;
    }

    if (!newEmail.trim() || !newEmail.includes('@')) {
      setActionError('Please enter a valid Google Account email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addAdminUser(newEmail, newName, newRole, currentAdmin);
      if (res.success) {
        showSuccess('Admin Added', `${newEmail} can now sign in with Google.`);
        setNewEmail('');
        setNewName('');
        setNewRole('Admin');
        setShowAddModal(false);
      } else {
        setActionError(res.error || 'Failed to add administrator.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error occurred while saving admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (targetAdmin: AdminUser, newRoleValue: AdminRole) => {
    if (!currentAdmin) return;
    try {
      const res = await updateAdminUserRole(targetAdmin.uid, newRoleValue, currentAdmin);
      if (res.success) {
        showSuccess('Role Updated', `${targetAdmin.email} is now assigned as ${newRoleValue}.`);
      } else {
        showError('Role Update Error', res.error || 'Failed to update role.');
      }
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to update role.');
    }
  };

  const handleStatusToggle = async (targetAdmin: AdminUser) => {
    if (!currentAdmin) return;
    try {
      const nextStatus = targetAdmin.status === 'Active' ? 'Disabled' : 'Active';
      const res = await toggleAdminUserStatus(targetAdmin.uid, nextStatus, currentAdmin);
      if (res.success) {
        showSuccess('Status Changed', `${targetAdmin.email} account has been ${nextStatus.toLowerCase()}.`);
      } else {
        showError('Status Error', res.error || 'Failed to toggle status.');
      }
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to toggle status.');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete || !currentAdmin) return;
    setIsDeleting(true);
    try {
      const res = await removeAdminUser(adminToDelete.uid, currentAdmin);
      if (res.success) {
        showSuccess('Administrator Removed', `${adminToDelete.email} removed from console privileges.`);
        setAdminToDelete(null);
      } else {
        showError('Delete Error', res.error || 'Failed to remove admin user.');
      }
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to remove admin.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    if (roleFilter !== 'all' && a.role !== roleFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'Owner':
        return isDark ? 'bg-[#5c3e00] text-[#ffe082]' : 'bg-[#ffe082] text-[#3e2700]';
      case 'Super Admin':
        return isDark ? 'bg-[#492532] text-[#ffd8e4]' : 'bg-[#ffd8e4] text-[#31111d]';
      case 'Admin':
        return isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]';
      case 'Manager':
        return isDark ? 'bg-[#0f5223] text-[#b4f3b8]' : 'bg-[#c4eed0] text-[#073814]';
    }
  };

  const isOwnerOrSuper = currentAdmin?.role === 'Owner' || currentAdmin?.role === 'Super Admin';

  const columns: Column<AdminUser>[] = [
    {
      key: 'displayName',
      header: 'Admin Account',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#004a77] text-[#c2e7ff] flex items-center justify-center font-bold text-xs shrink-0">
            {item.photoURL ? (
              <img src={item.photoURL} alt={item.displayName} className="w-full h-full object-cover" />
            ) : item.displayName ? (
              item.displayName.substring(0, 2).toUpperCase()
            ) : (
              'AD'
            )}
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>{item.displayName || 'Google Account'}</span>
              {item.uid === currentAdmin?.uid && (
                <span className="text-[10px] text-[#a8c7fa] bg-[#004a77]/50 px-1.5 py-0.2 rounded-full font-bold">
                  You
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">{item.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      render: (item) => {
        const canEditRole = isOwnerOrSuper && item.uid !== currentAdmin?.uid && item.role !== 'Owner';
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {canEditRole ? (
              <select
                value={item.role}
                onChange={(e) => handleRoleChange(item, e.target.value as AdminRole)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider outline-none cursor-pointer border',
                  getRoleBadge(item.role),
                  isDark ? 'border-white/10' : 'border-black/10'
                )}
              >
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            ) : (
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider', getRoleBadge(item.role))}>
                {item.role}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5',
          item.status === 'Active'
            ? isDark ? 'bg-[#0f5223]/50 text-[#85e197]' : 'bg-[#e6f4ea] text-[#137333]'
            : isDark ? 'bg-[#601410]/50 text-[#f2b8b5]' : 'bg-[#fce8e6] text-[#c5221f]'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', item.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400')} />
          <span>{item.status}</span>
        </span>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Active',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-400">
          {item.lastLogin && item.lastLogin !== 'Never' ? formatDate(item.lastLogin) : 'Invited (Pending Sign-in)'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => {
        const canManage = isOwnerOrSuper && item.uid !== currentAdmin?.uid && item.role !== 'Owner';
        if (!canManage) return null;

        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleStatusToggle(item)}
              title={item.status === 'Active' ? 'Disable Admin Account' : 'Reactivate Admin Account'}
              className="p-2 rounded-xl text-slate-400 hover:text-[#a8c7fa] hover:bg-[#a8c7fa]/10 transition-colors"
            >
              {item.status === 'Active' ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
            <button
              onClick={() => setAdminToDelete(item)}
              title="Remove Admin"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight', isDark ? 'text-white' : 'text-[#1f1f1f]')}>
            Admin Accounts & RBAC
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-[#8e918f]' : 'text-[#5f6368]')}>
            Manage privileged Google Auth accounts, assign roles (Owner, Super Admin, Admin, Manager), and audit login activity.
          </p>
        </div>

        {isOwnerOrSuper && (
          <M3Button
            variant="filled"
            icon={UserPlus}
            onClick={() => setShowAddModal(true)}
          >
            Invite Administrator
          </M3Button>
        )}
      </div>

      {/* Role and Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Role:</span>
          {['all', 'Owner', 'Super Admin', 'Admin', 'Manager'].map((r) => (
            <M3Chip
              key={r}
              label={r === 'all' ? 'All Roles' : r}
              selected={roleFilter === r}
              onClick={() => setRoleFilter(r)}
            />
          ))}
        </div>

        <div className="h-4 w-[1px] bg-slate-700 hidden sm:block mx-1" />

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {['all', 'Active', 'Disabled'].map((s) => (
            <M3Chip
              key={s}
              label={s === 'all' ? 'All Status' : s}
              selected={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Main Table */}
      <M3DataTable
        title="Privileged Administrators"
        subtitle={`${filteredAdmins.length} authenticated administrators`}
        data={filteredAdmins}
        columns={columns}
        keyExtractor={(item) => item.uid}
        isLoading={isLoading}
        searchPlaceholder="Search admin email, name, role..."
        searchFields={['email', 'displayName', 'role']}
        emptyMessage="No administrators found"
        emptySubtitle="Invite a team member using their Google email to grant admin console access."
        emptyAction={
          isOwnerOrSuper
            ? {
                label: 'Invite Administrator',
                onClick: () => setShowAddModal(true),
              }
            : undefined
        }
      />

      {/* Add Admin Dialog */}
      <M3Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Invite Google Administrator"
        subtitle="Grant console access to an authorized Google Account"
        icon={UserPlus}
        iconTone="primary"
        actions={
          <>
            <M3Button variant="text" onClick={() => setShowAddModal(false)}>
              Cancel
            </M3Button>
            <M3Button variant="filled" loading={isSubmitting} onClick={handleAddAdmin}>
              Save Privilege
            </M3Button>
          </>
        }
      >
        <form onSubmit={handleAddAdmin} className="space-y-4 pt-2">
          <M3TextField
            label="Google Account Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="admin@gmail.com or workspace email"
            required
          />

          <M3TextField
            label="Full Display Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Priya Sharma"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Privilege Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AdminRole)}
              className={cn(
                'w-full h-14 px-3.5 rounded-2xl border text-sm outline-none transition-all cursor-pointer',
                isDark ? 'bg-[#1e1f20] text-white border-[#3c4043]' : 'bg-[#f0f4f9] text-black border-[#c4c7c5]'
              )}
            >
              <option value="Manager">Manager (Read & Ledger Operations)</option>
              <option value="Admin">Admin (Full Ledger & Export Privileges)</option>
              <option value="Super Admin">Super Admin (Snapshots, Logs & User Management)</option>
            </select>
          </div>

          {actionError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{actionError}</span>
            </div>
          )}
        </form>
      </M3Dialog>

      {/* Delete Admin Dialog */}
      <M3Dialog
        isOpen={Boolean(adminToDelete)}
        onClose={() => setAdminToDelete(null)}
        title="Revoke Admin Access"
        subtitle="Remove administrator privileges"
        icon={Trash2}
        iconTone="rose"
        actions={
          <>
            <M3Button variant="text" onClick={() => setAdminToDelete(null)}>
              Cancel
            </M3Button>
            <M3Button variant="danger" loading={isDeleting} onClick={handleDeleteAdmin}>
              Revoke Privileges
            </M3Button>
          </>
        }
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to revoke admin console privileges for <strong className="text-white">{adminToDelete?.email}</strong>?
        </p>
      </M3Dialog>
    </div>
  );
}
