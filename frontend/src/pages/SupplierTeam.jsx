import { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Eye, Settings2, CheckCircle, XCircle, Trash2, Clock, Plus } from 'lucide-react';
import { getTeamMembers, getPendingInvitations, inviteTeamMember, createTeamMember, updateTeamMember, removeTeamMember, cancelInvitation } from '../api';

export default function SupplierTeam() {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', account_type: 'manager', name: '' });
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', account_type: 'manager' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        getTeamMembers(),
        getPendingInvitations()
      ]);
      setMembers(membersRes.data.data || []);
      setInvitations(invitesRes.data.data || []);
    } catch (error) {
      console.error('Failed to load team data:', error);
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
      setCreateForm({ name: '', email: '', password: '', account_type: 'manager' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    if (!confirm('Are you sure you want to change this member\'s role?')) return;
    
    try {
      await updateTeamMember(memberId, { account_type: newRole });
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

  const getRoleIcon = (accountType) => {
    switch (accountType) {
      case 'owner': return <Shield className="w-5 h-5 text-purple-600" />;
      case 'manager': return <Settings2 className="w-5 h-5 text-blue-600" />;
      case 'viewer': return <Eye className="w-5 h-5 text-gray-600" />;
      default: return <Users className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRoleBadge = (accountType) => {
    const styles = {
      owner: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[accountType] || styles.viewer}`}>
        {accountType === 'owner' ? 'Owner' : accountType === 'manager' ? 'Manager' : 'Viewer'}
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading team...</div>;
  }

  const isOwner = true; // TODO: Get from AuthContext

  return (
    <div className="space-y-6">
      {/* Account Info Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900">Tokyo Auto Exports Account</h2>
            <p className="text-blue-700 mt-1">ONE Company Account → {members.length} User{members.length !== 1 ? 's' : ''}</p>
            <p className="text-sm text-blue-600 mt-2">All users share: Same inventory • Same subscription • Same billing</p>
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
                      {getRoleIcon(member.account_type)}
                    </div>
                    <div>
                      <div className="font-semibold">{member.name}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {isOwner && member.account_type !== 'owner' ? (
                    <select
                      value={member.account_type}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="manager">Manager</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    getRoleBadge(member.account_type)
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
                      <div className="flex justify-end gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold">Owner</h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Full system access</li>
              <li>• Manage subscription</li>
              <li>• Invite/remove team members</li>
              <li>• Manage vehicles & orders</li>
              <li>• View all reports</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Manager</h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Add/edit vehicles</li>
              <li>• Manage orders</li>
              <li>• View customers</li>
              <li>• View analytics</li>
              <li>• Cannot manage billing or team</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold">Viewer</h4>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• View inventory</li>
              <li>• View orders</li>
              <li>• View dashboard</li>
              <li>• Cannot add or edit</li>
              <li>• Read-only access</li>
            </ul>
          </div>
        </div>
      </div>

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
                  placeholder="john@tokyoauto.jp"
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
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={createForm.account_type}
                  onChange={(e) => setCreateForm({...createForm, account_type: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="manager">Manager - Can add/edit vehicles and manage orders</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>

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
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={inviteForm.account_type}
                  onChange={(e) => setInviteForm({...inviteForm, account_type: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="manager">Manager - Can add/edit vehicles and manage orders</option>
                  <option value="viewer">Viewer - Read-only access</option>
                </select>
              </div>

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
