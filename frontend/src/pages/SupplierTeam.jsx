import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Eye, Settings2, CheckCircle, XCircle, Trash2, Clock, Plus, KeyRound, X, DollarSign } from 'lucide-react';
import { getTeamMembers, getPendingInvitations, inviteTeamMember, createTeamMember, updateTeamMember, resetTeamMemberPassword, removeTeamMember, cancelInvitation } from '../api';
import { useAuth } from '../AuthContext';

export default function SupplierTeam() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', account_type: 'manager', name: '' });
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', account_type: 'manager', role: '' });
  const [resetTarget, setResetTarget] = useState(null); // { id, full_name }
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const isSupplier = user?.role === 'foreign_bond_user';
  const isOwner = (user?.account_type || 'owner') === 'owner';
  const companyTypeLabel = isSupplier ? 'Supplier' : 'Dealership';
  const teamSubtitle = isSupplier
    ? 'All users share: Same inventory • Same subscription • Same billing'
    : 'All users share: Same inventory • Same orders • Same billing';
  const defaultEmailPlaceholder = isSupplier ? 'john@tokyoauto.jp' : 'staff@kpmmotors.ug';
  const companyAccountLabel = user?.full_name ? `${companyTypeLabel} Company Account` : `${companyTypeLabel} Account`;

  useEffect(() => {
    loadData();
  }, [isOwner]);

  const loadData = async () => {
    setLoading(true);
    try {
      const requests = [getTeamMembers()];
      if (isOwner) {
        requests.push(getPendingInvitations());
      }

      const [membersRes, invitesRes] = await Promise.all(requests);
      setMembers(membersRes.data.data || []);
      setInvitations(invitesRes?.data?.data || []);
    } catch (error) {
      console.error('Failed to load team data:', error);
      setMembers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await inviteTeamMember(inviteForm);
      alert('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteForm({ email: '', account_type: 'manager', name: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createTeamMember(createForm);
      alert('User created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', account_type: 'manager', role: '' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const DEALERSHIP_ROLE_OPTIONS = [
    { value: 'dealership_manager', label: 'Manager', desc: 'Full access' },
    { value: 'dealership_sales', label: 'Sales', desc: 'Inventory, orders, customers, sales' },
    { value: 'dealership_accountant', label: 'Accountant', desc: 'Financials & reports only' },
  ];

  const handleUpdateRole = async (memberId, newRole) => {
    if (!confirm('Are you sure you want to change this member\'s role?')) return;
    try {
      // For dealerships, update the actual role field; for suppliers just account_type
      const payload = isSupplier
        ? { account_type: newRole }
        : { role: newRole, account_type: newRole === 'dealership_manager' ? 'manager' : 'viewer' };
      await updateTeamMember(memberId, payload);
      alert('Role updated successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleToggleActive = async (memberId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this member?`)) return;
    
    try {
      await updateTeamMember(memberId, { is_active: !currentStatus });
      alert(`Member ${action}d successfully!`);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || `Failed to ${action} member`);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member? They will lose access immediately.')) return;
    
    try {
      await removeTeamMember(memberId);
      alert('Team member removed successfully!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!confirm('Cancel this invitation?')) return;
    try {
      await cancelInvitation(inviteId);
      alert('Invitation canceled!');
      loadData();
    } catch (error) {
      alert('Failed to cancel invitation');
    }
  };

  const openResetPassword = (member) => {
    setResetTarget(member);
    setResetPassword('');
    setResetConfirm('');
    setResetError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    if (resetPassword.length < 8) { setResetError('Password must be at least 8 characters'); return; }
    if (resetPassword !== resetConfirm) { setResetError('Passwords do not match'); return; }
    setResetSaving(true);
    try {
      await resetTeamMemberPassword(resetTarget.id, resetPassword);
      setResetTarget(null);
      alert(`Password for ${resetTarget.full_name || resetTarget.email} has been updated.`);
    } catch (err) {
      setResetError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setResetSaving(false);
    }
  };

  const getRoleDisplay = (member) => {
    // For dealerships use the actual role field; for suppliers/owner use account_type
    if (member.account_type === 'owner') return { label: 'Owner', color: 'bg-purple-100 text-purple-800', icon: <Shield className="w-5 h-5 text-purple-600" /> };
    if (!isSupplier) {
      switch (member.role) {
        case 'dealership_manager': return { label: 'Manager', color: 'bg-blue-100 text-blue-800', icon: <Settings2 className="w-5 h-5 text-blue-600" /> };
        case 'dealership_sales': return { label: 'Sales', color: 'bg-green-100 text-green-800', icon: <Users className="w-5 h-5 text-green-600" /> };
        case 'dealership_accountant': return { label: 'Accountant', color: 'bg-orange-100 text-orange-800', icon: <DollarSign className="w-5 h-5 text-orange-600" /> };
      }
    }
    return { label: member.account_type === 'manager' ? 'Manager' : 'Viewer', color: 'bg-gray-100 text-gray-800', icon: <Eye className="w-5 h-5 text-gray-600" /> };
  };

  const getRoleIcon = (member) => getRoleDisplay(member).icon;
  const getRoleBadge = (member) => {
    const { label, color } = getRoleDisplay(member);
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading team...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Account Info Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900">{companyAccountLabel}</h2>
            <p className="text-blue-700 mt-1">ONE Company Account → {members.length} User{members.length !== 1 ? 's' : ''}</p>
            <p className="text-sm text-blue-600 mt-2">{teamSubtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-900">{members.length}</div>
            <div className="text-sm text-blue-600">Total Users</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage users under your company account</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create User
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Send Invite
            </button>
          </div>
        )}
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              {isOwner && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id} className={member.is_active ? '' : 'bg-gray-50 opacity-60'}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {getRoleIcon(member)}
                    </div>
                    <div>
                      <div className="font-semibold">{member.full_name || member.email}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isOwner && member.account_type !== 'owner' ? (
                    <select
                      value={isSupplier ? member.account_type : (member.role || 'dealership_manager')}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      {isSupplier ? (
                        <option value="manager">Manager</option>
                      ) : (
                        DEALERSHIP_ROLE_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                        ))
                      )}
                    </select>
                  ) : (
                    getRoleBadge(member)
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {member.last_login_at ? new Date(member.last_login_at).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(member.created_at).toLocaleDateString()}
                </td>
                {isOwner && (
                  <td className="px-6 py-4 text-right">
                    {member.account_type !== 'owner' && (
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => openResetPassword(member)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 border border-purple-200"
                          title="Reset password"
                        >
                          <KeyRound className="w-3 h-3" /> Reset PW
                        </button>
                        <button
                          onClick={() => handleToggleActive(member.id, member.is_active)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {isOwner && invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Invitations
          </h3>
          <div className="space-y-3">
            {invitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-semibold">{invite.email}</div>
                    <div className="text-sm text-gray-600">
                      Invited as {invite.account_type} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Permissions Guide */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4">Role Permissions</h3>
        {isSupplier ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-purple-600" /><h4 className="font-semibold">Owner</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Full access — subscription, billing, team</li>
                <li>• Manage vehicles & orders</li>
                <li>• All reports & analytics</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Settings2 className="w-5 h-5 text-blue-600" /><h4 className="font-semibold">Manager</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Add/edit vehicles</li>
                <li>• Manage orders & shipping</li>
                <li>• View analytics</li>
                <li>• Cannot manage billing or team</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-purple-600" /><h4 className="font-semibold">Owner</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Full system access</li>
                <li>• Subscription & billing</li>
                <li>• Add/remove team members</li>
                <li>• All pages</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Settings2 className="w-5 h-5 text-blue-600" /><h4 className="font-semibold">Manager</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Inventory, orders, shipping</li>
                <li>• Border clearance</li>
                <li>• Sales, customers, loans</li>
                <li>• Reports, financials, analytics</li>
                <li>• Team & company profile</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-green-600" /><h4 className="font-semibold">Sales</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Inventory (view & edit)</li>
                <li>• Orders & shipping</li>
                <li>• Sales & customers</li>
                <li>• Inspections & analytics</li>
                <li>• No financials/reports</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2"><DollarSign className="w-5 h-5 text-orange-600" /><h4 className="font-semibold">Accountant</h4></div>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Sales & customers</li>
                <li>• Reports & financials</li>
                <li>• Loan management</li>
                <li>• Analytics</li>
                <li>• No inventory editing</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reset Password</h3>
                <p className="mt-0.5 text-sm text-gray-500">{resetTarget.full_name || resetTarget.email}</p>
              </div>
              <button onClick={() => setResetTarget(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {resetError && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resetError}</div>}
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setResetTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={resetSaving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">
                  {resetSaving ? 'Saving…' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Create User Directly</h3>
            <p className="text-sm text-gray-600 mb-4">Add a new user to your company account immediately</p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={defaultEmailPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength="8"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Minimum 8 characters"
                />
              </div>
              
              {isSupplier ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={createForm.account_type}
                    onChange={(e) => setCreateForm({...createForm, account_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="manager">Manager — Manage vehicles & orders</option>
                    <option value="viewer">Viewer — Read-only access</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value, account_type: e.target.value === 'dealership_manager' ? 'manager' : 'viewer'})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="dealership_manager">Manager — Full access (inventory, orders, reports, team)</option>
                    <option value="dealership_sales">Sales — Inventory, orders, sales & customers</option>
                    <option value="dealership_accountant">Accountant — Financials, reports & loans only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Controls which pages this user can access</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border rounded-lg px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="member@example.com"
                />
              </div>
              
              {isSupplier ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={inviteForm.account_type}
                    onChange={(e) => setInviteForm({...inviteForm, account_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="manager">Manager — Manage vehicles & orders</option>
                    <option value="viewer">Viewer — Read-only access</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={inviteForm.account_type}
                    onChange={(e) => setInviteForm({...inviteForm, account_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="dealership_manager">Manager — Full access</option>
                    <option value="dealership_sales">Sales — Inventory, orders, sales & customers</option>
                    <option value="dealership_accountant">Accountant — Financials & reports only</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 border rounded-lg px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
