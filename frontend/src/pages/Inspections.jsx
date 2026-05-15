import { useState, useEffect } from 'react';
import { Plus, X, ClipboardList, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import api from '../api';

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

const CONDITION_COLOR = {
  Excellent: 'bg-green-100 text-green-800',
  Good: 'bg-blue-100 text-blue-800',
  Fair: 'bg-yellow-100 text-yellow-800',
  Poor: 'bg-orange-100 text-orange-800',
  Damaged: 'bg-red-100 text-red-800',
};

const EMPTY = {
  vehicle_id: '',
  inspection_date: new Date().toISOString().split('T')[0],
  inspector_name: '',
  overall_condition: 'Good',
  engine_condition: 'Good',
  exterior_condition: 'Good',
  interior_condition: 'Good',
  tyre_condition: 'Good',
  mileage_at_inspection: '',
  issues_found: '',
  repair_cost_estimate: '',
  notes: '',
};

export default function Inspections({ vehicleId, vehicleLabel, onClose }) {
  const isModal = !!onClose;
  const [inspections, setInspections] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, vehicle_id: vehicleId || '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    if (!vehicleId) {
      // Try the general inventory endpoint (works for all roles - bond-filtered)
      api.get('/inventory').then(r => setVehicles(r.data?.data || [])).catch(() => {
        // Fallback to dealership-specific endpoint
        api.get('/inventory/dealership/vehicles').then(r => setVehicles(r.data?.data || [])).catch(() => {});
      });
    }
  }, [vehicleId]);

  const load = async () => {
    setLoading(true);
    try {
      const params = vehicleId ? `?vehicle_id=${vehicleId}` : '';
      const res = await api.get(`/inspections${params}`);
      setInspections(res.data?.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inspections', form);
      setShowForm(false);
      setForm({ ...EMPTY, vehicle_id: vehicleId || '' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save inspection');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this inspection report?')) return;
    try {
      await api.delete(`/inspections/${id}`);
      load();
    } catch (err) { alert('Failed to delete'); }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`${isModal ? 'text-lg' : 'text-2xl'} font-bold text-gray-800`}>
            {vehicleLabel ? `Inspections — ${vehicleLabel}` : 'Vehicle Inspections'}
          </h2>
          {!isModal && <p className="text-gray-500 text-sm">Condition reports and maintenance records</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Inspection
          </button>
          {onClose && <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading...</div>
      ) : inspections.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No inspection records yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map(ins => (
            <div key={ins.id} className="bg-white border rounded-xl p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {!vehicleId && ins.make && (
                      <span className="font-semibold text-sm">{ins.make} {ins.model} {ins.year}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDITION_COLOR[ins.overall_condition] || 'bg-gray-100 text-gray-700'}`}>
                      {ins.overall_condition}
                    </span>
                    <span className="text-xs text-gray-400">{ins.inspection_date ? new Date(ins.inspection_date).toLocaleDateString() : ''}</span>
                    {ins.inspector_name && <span className="text-xs text-gray-500">by {ins.inspector_name}</span>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[['Engine', ins.engine_condition], ['Exterior', ins.exterior_condition], ['Interior', ins.interior_condition], ['Tyres', ins.tyre_condition]].map(([label, val]) => (
                      val && <div key={label}>
                        <span className="text-gray-400">{label}: </span>
                        <span className={`font-medium ${val === 'Excellent' || val === 'Good' ? 'text-green-700' : val === 'Poor' || val === 'Damaged' ? 'text-red-700' : 'text-yellow-700'}`}>{val}</span>
                      </div>
                    ))}
                    {ins.mileage_at_inspection && <div><span className="text-gray-400">Mileage: </span><span className="font-medium">{Number(ins.mileage_at_inspection).toLocaleString()} km</span></div>}
                    {ins.repair_cost_estimate && <div><span className="text-gray-400">Est. repair: </span><span className="font-medium text-orange-700">UGX {Number(ins.repair_cost_estimate).toLocaleString()}</span></div>}
                  </div>
                  {ins.issues_found && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 rounded-lg p-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{ins.issues_found}</span>
                    </div>
                  )}
                  {ins.notes && <p className="mt-2 text-xs text-gray-500">{ins.notes}</p>}
                </div>
                <button onClick={() => handleDelete(ins.id)} className="text-red-400 hover:text-red-600 text-xs ml-3">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create inspection form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">New Inspection Report</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {!vehicleId && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Vehicle *</label>
                    <select required value={form.vehicle_id} onChange={e => setForm(f => ({...f, vehicle_id: e.target.value}))}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="">Select vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year} — {v.chassis_number}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Inspection Date *</label>
                  <input required type="date" value={form.inspection_date}
                    onChange={e => setForm(f => ({...f, inspection_date: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inspector Name</label>
                  <input value={form.inspector_name} onChange={e => setForm(f => ({...f, inspector_name: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="John Doe" />
                </div>
                {[
                  ['Overall Condition', 'overall_condition'],
                  ['Engine', 'engine_condition'],
                  ['Exterior', 'exterior_condition'],
                  ['Interior', 'interior_condition'],
                  ['Tyres', 'tyre_condition'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <select value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1">Mileage (km)</label>
                  <input type="number" min="0" value={form.mileage_at_inspection}
                    onChange={e => setForm(f => ({...f, mileage_at_inspection: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Repair Cost Estimate (UGX)</label>
                  <input type="number" min="0" value={form.repair_cost_estimate}
                    onChange={e => setForm(f => ({...f, repair_cost_estimate: e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Issues Found</label>
                <textarea value={form.issues_found} onChange={e => setForm(f => ({...f, issues_found: e.target.value}))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Describe any issues..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Additional Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) return content;

  return <div className="space-y-6">{content}</div>;
}
