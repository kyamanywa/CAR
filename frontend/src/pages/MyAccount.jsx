import { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile, changeMyPassword } from '../api';
import { User, Mail, Phone, Briefcase, Building2, Shield, Key, Save, Edit, X, CheckCircle } from 'lucide-react';

const ROLE_LABELS = {
  dealership_manager: { label: 'Dealership Manager', color: 'bg-purple-100 text-purple-800' },
  dealership_sales: { label: 'Sales Person', color: 'bg-blue-100 text-blue-800' },
  dealership_accountant: { label: 'Accountant', color: 'bg-green-100 text-green-800' },
  foreign_bond_user: { label: 'Supplier', color: 'bg-orange-100 text-orange-800' },
  admin: { label: 'System Admin', color: 'bg-red-100 text-red-800' },
};

export default function MyAccount() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({ full_name: '', phone: '', position: '', profile_notes: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [showPwSection, setShowPwSection] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getMyProfile();
      const p = res.data.data;
      setProfile(p);
      setForm({ full_name: p.full_name || '', phone: p.phone || '', position: p.position || '', profile_notes: p.profile_notes || '' });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateMyProfile(form);
      setMsg({ type: 'success', text: 'Profile updated successfully' });
      setEditMode(false);
      fetchProfile();
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.error || 'Failed to update' });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.new_password !== pwForm.confirm_password)
      return setPwMsg({ type: 'error', text: 'New passwords do not match' });
    try {
      await changeMyPassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwMsg({ type: 'success', text: 'Password changed successfully' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPwSection(false);
    } catch (e) {
      setPwMsg({ type: 'error', text: e.response?.data?.error || 'Failed to change password' });
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!profile) return <div className="p-6 text-red-500">Could not load profile.</div>;

  const roleInfo = ROLE_LABELS[profile.role] || { label: profile.role, color: 'bg-gray-100 text-gray-700' };
  const initials = (profile.full_name || profile.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="text-gray-500 text-sm mt-1">Your personal profile and account settings</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{profile.full_name || '—'}</h2>
              <p className="text-gray-500 text-sm">{profile.email}</p>
              <span className={`mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn btn-secondary flex items-center gap-2">
              <Edit size={15} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { setEditMode(false); setMsg(null); }} className="btn btn-secondary flex items-center gap-2">
                <X size={15} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex items-center gap-2">
                <Save size={15} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <CheckCircle size={15} /> {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="label flex items-center gap-1"><User size={13} /> Full Name</label>
            {editMode ? (
              <input type="text" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="input" placeholder="Your full name" />
            ) : (
              <p className="text-gray-900 font-medium mt-1">{profile.full_name || <span className="text-gray-400">Not set</span>}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="label flex items-center gap-1"><Mail size={13} /> Email Address</label>
            <p className="text-gray-900 font-medium mt-1">{profile.email}</p>
            <p className="text-xs text-gray-400">Contact your manager to change email</p>
          </div>

          {/* Phone */}
          <div>
            <label className="label flex items-center gap-1"><Phone size={13} /> Phone Number</label>
            {editMode ? (
              <input type="text" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="input" placeholder="+256 7XX XXX XXX" />
            ) : (
              <p className="text-gray-900 font-medium mt-1">{profile.phone || <span className="text-gray-400">Not set</span>}</p>
            )}
          </div>

          {/* Position */}
          <div>
            <label className="label flex items-center gap-1"><Briefcase size={13} /> Job Title / Position</label>
            {editMode ? (
              <input type="text" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                className="input" placeholder="e.g. Senior Sales Executive" />
            ) : (
              <p className="text-gray-900 font-medium mt-1">{profile.position || <span className="text-gray-400">Not set</span>}</p>
            )}
          </div>

          {/* Notes / Bio */}
          <div className="md:col-span-2">
            <label className="label">Notes / Bio</label>
            {editMode ? (
              <textarea value={form.profile_notes}
                onChange={e => setForm(f => ({ ...f, profile_notes: e.target.value }))}
                className="input" rows={2} placeholder="Optional short bio or notes" />
            ) : (
              <p className="text-gray-900 mt-1">{profile.profile_notes || <span className="text-gray-400">Not set</span>}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dealership info */}
      {profile.dealership_name && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Building2 size={16} /> Dealership Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Dealership</p>
              <p className="font-medium text-gray-900">{profile.dealership_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Address</p>
              <p className="font-medium text-gray-900">{profile.dealership_address || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Dealership Phone</p>
              <p className="font-medium text-gray-900">{profile.dealership_phone || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Account details */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Shield size={16} /> Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">System Role</p>
            <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>{roleInfo.label}</span>
          </div>
          <div>
            <p className="text-gray-500">Account Type</p>
            <p className="font-medium text-gray-900 capitalize mt-1">{profile.account_type || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Member Since</p>
            <p className="font-medium text-gray-900 mt-1">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Key size={16} /> Change Password</h3>
          {!showPwSection && (
            <button onClick={() => setShowPwSection(true)} className="btn btn-secondary text-sm">Change Password</button>
          )}
        </div>

        {showPwSection && (
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
            {pwMsg && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <CheckCircle size={15} /> {pwMsg.text}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Current Password</label>
                <input type="password" required value={pwForm.current_password}
                  onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                  className="input" placeholder="Current password" />
              </div>
              <div>
                <label className="label">New Password</label>
                <input type="password" required value={pwForm.new_password}
                  onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                  className="input" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" required value={pwForm.confirm_password}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="input" placeholder="Repeat new password" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Update Password</button>
              <button type="button" onClick={() => { setShowPwSection(false); setPwMsg(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        )}
        {!showPwSection && <p className="text-sm text-gray-400">Use a strong password to keep your account secure.</p>}
      </div>
    </div>
  );
}
