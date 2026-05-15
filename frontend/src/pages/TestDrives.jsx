import { useState, useEffect } from 'react';
import { getTestDrives, createTestDrive, updateTestDrive, deleteTestDrive } from '../api';
import { getCustomers } from '../api';
import { getVehicles } from '../api';
import { Car, User, Plus, X, Trash2, Edit, CheckCircle, Clock, ThumbsUp, ThumbsDown, Calendar } from 'lucide-react';
import { exportToExcel } from '../utils/exportData';

const OUTCOMES = ['Undecided', 'Interested', 'Not Interested', 'Bought'];

const outcomeStyle = {
  'Bought': 'bg-green-100 text-green-800',
  'Interested': 'bg-blue-100 text-blue-800',
  'Not Interested': 'bg-red-100 text-red-800',
  'Undecided': 'bg-yellow-100 text-yellow-800',
};

export default function TestDrives() {
  const [drives, setDrives] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [filterOutcome, setFilterOutcome] = useState('');
  const [formData, setFormData] = useState({
    vehicle_id: '',
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_id_number: '',
    sales_person: '',
    drive_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    outcome: 'Undecided',
    notes: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dRes, cRes, vRes] = await Promise.all([
        getTestDrives(),
        getCustomers(),
        getVehicles(),
      ]);
      setDrives(dRes.data.data || []);
      setCustomers(cRes.data.data || cRes.data || []);
      const allVehicles = vRes.data.data || [];
      setVehicles(allVehicles.filter(v => v.status === 'In Stock' || v.status === 'Available'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (e) => {
    const cid = e.target.value;
    const c = customers.find(c => String(c.id) === String(cid));
    setFormData(f => ({
      ...f,
      customer_id: cid,
      customer_name: c ? c.full_name : f.customer_name,
      customer_phone: c ? c.phone : f.customer_phone,
    }));
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: '', customer_id: '', customer_name: '', customer_phone: '',
      customer_id_number: '', sales_person: '',
      drive_date: new Date().toISOString().split('T')[0],
      start_time: '', end_time: '', outcome: 'Undecided', notes: '',
    });
    setEditingDrive(null);
  };

  const handleCreate = () => { resetForm(); setShowForm(true); };

  const handleEdit = (d) => {
    setEditingDrive(d);
    setFormData({
      vehicle_id: d.vehicle_id, customer_id: d.customer_id || '',
      customer_name: d.customer_name || '', customer_phone: d.customer_phone || '',
      customer_id_number: d.customer_id_number || '', sales_person: d.sales_person || '',
      drive_date: d.drive_date, start_time: d.start_time || '', end_time: d.end_time || '',
      outcome: d.outcome, notes: d.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDrive) {
        await updateTestDrive(editingDrive.id, { outcome: formData.outcome, notes: formData.notes });
      } else {
        await createTestDrive(formData);
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this test drive record?')) return;
    await deleteTestDrive(id);
    fetchAll();
  };

  const handleExport = () => {
    exportToExcel(drives.map(d => ({
      Date: d.drive_date,
      Vehicle: `${d.make} ${d.model} (${d.year})`,
      Customer: d.customer_name,
      Phone: d.customer_phone,
      'Customer ID': d.customer_id_number,
      Salesperson: d.sales_person,
      'Start Time': d.start_time,
      'End Time': d.end_time,
      Outcome: d.outcome,
      Notes: d.notes,
    })), 'Test_Drives');
  };

  const filtered = filterOutcome ? drives.filter(d => d.outcome === filterOutcome) : drives;

  const stats = {
    total: drives.length,
    bought: drives.filter(d => d.outcome === 'Bought').length,
    interested: drives.filter(d => d.outcome === 'Interested').length,
    conversionRate: drives.length ? Math.round((drives.filter(d => d.outcome === 'Bought').length / drives.length) * 100) : 0,
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Drive Log</h1>
          <p className="text-gray-500 text-sm mt-1">Record and track customer test drives</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-secondary flex items-center gap-2">
            <Calendar size={16} /> Export Excel
          </button>
          <button onClick={handleCreate} className="btn btn-primary flex items-center gap-2">
            <Plus size={16} /> Log Test Drive
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Drives', value: stats.total, icon: Car, color: 'blue' },
          { label: 'Vehicles Sold', value: stats.bought, icon: CheckCircle, color: 'green' },
          { label: 'Interested', value: stats.interested, icon: ThumbsUp, color: 'indigo' },
          { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: ThumbsUp, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                <Icon size={20} className={`text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', ...OUTCOMES].map(o => (
          <button
            key={o}
            onClick={() => setFilterOutcome(o)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${filterOutcome === o ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
          >
            {o || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Date', 'Vehicle', 'Customer', 'Salesperson', 'Time', 'Outcome', 'Actions'].map(h => (
                <th key={h} className="text-left p-4 text-sm font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">No test drives recorded</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm">{d.drive_date}</td>
                <td className="p-4">
                  <p className="font-medium text-sm">{d.make} {d.model} ({d.year})</p>
                  <p className="text-xs text-gray-500">{d.chassis_number}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm">{d.customer_name || '—'}</p>
                  <p className="text-xs text-gray-500">{d.customer_phone}</p>
                </td>
                <td className="p-4 text-sm">{d.sales_person || '—'}</td>
                <td className="p-4 text-xs text-gray-600">{d.start_time || '—'} {d.end_time ? `→ ${d.end_time}` : ''}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${outcomeStyle[d.outcome] || 'bg-gray-100 text-gray-700'}`}>
                    {d.outcome}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(d)} className="p-1 text-blue-500 hover:text-blue-700 rounded">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="p-1 text-red-500 hover:text-red-700 rounded">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingDrive ? 'Update Outcome' : 'Log Test Drive'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingDrive ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Vehicle *</label>
                      <select required value={formData.vehicle_id}
                        onChange={(e) => setFormData(f => ({ ...f, vehicle_id: e.target.value }))}
                        className="input">
                        <option value="">Select Vehicle</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            [{v.source_type === 'local_purchase' || v.source_type === 'local' ? 'Local' : 'Imported'}] {v.make} {v.model} ({v.year}) - {v.chassis_number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Drive Date *</label>
                      <input type="date" required value={formData.drive_date}
                        onChange={(e) => setFormData(f => ({ ...f, drive_date: e.target.value }))}
                        className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Customer (from CRM)</label>
                    <select value={formData.customer_id} onChange={handleCustomerSelect} className="input">
                      <option value="">— Walk-in / Enter manually —</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Customer Name</label>
                      <input type="text" value={formData.customer_name}
                        onChange={(e) => setFormData(f => ({ ...f, customer_name: e.target.value }))}
                        className="input" placeholder="Full name" />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input type="text" value={formData.customer_phone}
                        onChange={(e) => setFormData(f => ({ ...f, customer_phone: e.target.value }))}
                        className="input" placeholder="Phone number" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Customer ID / Passport</label>
                      <input type="text" value={formData.customer_id_number}
                        onChange={(e) => setFormData(f => ({ ...f, customer_id_number: e.target.value }))}
                        className="input" placeholder="ID number" />
                    </div>
                    <div>
                      <label className="label">Salesperson</label>
                      <input type="text" value={formData.sales_person}
                        onChange={(e) => setFormData(f => ({ ...f, sales_person: e.target.value }))}
                        className="input" placeholder="Staff name" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Time</label>
                      <input type="time" value={formData.start_time}
                        onChange={(e) => setFormData(f => ({ ...f, start_time: e.target.value }))}
                        className="input" />
                    </div>
                    <div>
                      <label className="label">End Time</label>
                      <input type="time" value={formData.end_time}
                        onChange={(e) => setFormData(f => ({ ...f, end_time: e.target.value }))}
                        className="input" />
                    </div>
                  </div>
                </>
              ) : null}

              <div>
                <label className="label">Outcome</label>
                <select value={formData.outcome}
                  onChange={(e) => setFormData(f => ({ ...f, outcome: e.target.value }))}
                  className="input">
                  {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea value={formData.notes}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="input" rows={2} placeholder="Customer feedback, observations..." />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDrive ? 'Update' : 'Save Test Drive'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
