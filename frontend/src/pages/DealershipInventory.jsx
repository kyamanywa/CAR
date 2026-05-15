import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { Camera, Plus, Pencil, Trash2, X, Search, Car, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';
import api, {
  getDealershipVehicles, addDealershipVehicle, updateDealershipVehicle,
  deleteDealershipVehicle, uploadVehicleImage
} from '../api';
import Inspections from './Inspections';

const SOURCE_TYPES = [
  { value: 'local_purchase', label: 'Local Purchase' },
  { value: 'trade_in', label: 'Trade-In' },
  { value: 'auction', label: 'Auction' },
  { value: 'fleet', label: 'Fleet Disposal' },
];

const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'];
const TRANSMISSIONS = ['Automatic', 'Manual'];
const STATUSES = ['Available', 'Reserved', 'Sold'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const BODY_TYPES = ['Sedan', 'SUV', 'Pickup / Double Cab', 'Hatchback', 'Station Wagon', 'Coupe', 'Van / Minivan', 'Bus / Minibus', 'Truck', 'Other'];

const EMPTY_FORM = {
  chassis_number: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  engine_cc: '',
  fuel_type: 'Petrol',
  transmission: 'Automatic',
  body_type: '',
  mileage: '',
  acquisition_cost_ugx: '',
  sale_price_ugx: '',
  acquisition_source: '',
  source_type: 'local_purchase',
  condition: 'Good',
  quantity: 1,
  notes: '',
  status: 'Available',
  image_url: '',
};

function formatUGX(val) {
  const n = Number(val);
  if (!n) return '-';
  return 'UGX ' + n.toLocaleString();
}

function StatusBadge({ status }) {
  const colours = {
    Available: 'bg-green-100 text-green-800',
    Reserved: 'bg-yellow-100 text-yellow-800',
    Sold: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colours[status] || 'bg-blue-100 text-blue-800'}`}>
      {status}
    </span>
  );
}

function SourceBadge({ type }) {
  const colours = {
    local_purchase: 'bg-blue-100 text-blue-800',
    trade_in: 'bg-purple-100 text-purple-800',
    auction: 'bg-orange-100 text-orange-800',
    fleet: 'bg-teal-100 text-teal-800',
  };
  const label = SOURCE_TYPES.find(s => s.value === type)?.label || type;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colours[type] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

const FALLBACK_COLORS = ['Black','White','Silver','Grey','Blue','Red','Green','Brown','Beige','Gold','Orange','Yellow','Maroon','Navy Blue','Pearl White','Champagne'];

export default function DealershipInventory() {
  const { user } = useAuth();
  const isManager = user?.role === 'dealership_manager';
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [inspectVehicle, setInspectVehicle] = useState(null);
  const fileRef = useRef();
  const [makes, setMakes] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [colors, setColors] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(3800);
  const [viewMode, setViewMode] = useState('grouped');
  const [expandedMakes, setExpandedMakes] = useState({});
  const [expandedModels, setExpandedModels] = useState({});

  const toggleMake = (make) => setExpandedMakes(p => ({ ...p, [make]: !p[make] }));
  const toggleModel = (make, model) => {
    const key = `${make}-${model}`;
    setExpandedModels(p => ({ ...p, [key]: !p[key] }));
  };

  useEffect(() => {
    load();
    api.get('/reference-data/makes').then(r => setMakes(r.data?.data || [])).catch(() => {});
    api.get('/reference-data/models').then(r => setAllModels(r.data?.data || [])).catch(() => {});
    api.get('/reference-data/colors').then(r => {
      const fetched = r.data?.data || [];
      setColors(fetched.length > 0 ? fetched : FALLBACK_COLORS.map(n => ({ id: n, name: n })));
    }).catch(() => setColors(FALLBACK_COLORS.map(n => ({ id: n, name: n }))));
    api.get('/exchange-rates/current').then(r => setExchangeRate(r.data?.data?.rate || 3800)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDealershipVehicles();
      setVehicles(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setImagePreview('');
    setError('');
    setShowAdd(true);
    setEditVehicle(null);
  };

  const openEdit = (v) => {
    setForm({
      chassis_number: v.chassis_number || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year || new Date().getFullYear(),
      color: v.color || '',
      engine_cc: v.engine_cc || '',
      fuel_type: v.fuel_type || 'Petrol',
      transmission: v.transmission || 'Automatic',
      body_type: v.body_type || '',
      mileage: v.mileage || '',
      acquisition_cost_ugx: v.acquisition_cost_ugx || '',
      sale_price_ugx: v.sale_price_usd ? Math.round(v.sale_price_usd * exchangeRate) : '',
      acquisition_source: v.acquisition_source || '',
      source_type: v.source_type || 'local_purchase',
      condition: v.condition || 'Good',
      quantity: v.quantity || 1,
      notes: v.notes || '',
      status: v.status || 'Available',
      image_url: v.image_url || '',
    });
    setImagePreview(v.image_url ? v.image_url : '');
    setError('');
    setEditVehicle(v);
    setShowAdd(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const res = await uploadVehicleImage(file);
      const url = res.data?.data?.image_url;
      setForm(f => ({ ...f, image_url: url }));
      setImagePreview(url);
    } catch (err) {
      setError('Image upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm(f => ({ ...f, image_url: '' }));
    setImagePreview('');
  };

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.chassis_number || !form.make || !form.model) {
      setError('Chassis number, make, and model are required.');
      return;
    }
    setSaving(true);
    try {
      if (editVehicle) {
        await updateDealershipVehicle(editVehicle.id, form);
      } else {
        await addDealershipVehicle(form);
      }
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDealershipVehicle(id);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const filtered = vehicles.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.chassis_number?.toLowerCase().includes(q) ||
      v.make?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.color?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Local Inventory</h1>
          <p className="text-gray-500">Vehicles acquired locally — trade-ins, auctions, and local purchases</p>
        </div>
        {isManager && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Local Vehicle
          </button>
        )}
      </div>

      {/* Stock summary cards */}
      {vehicles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Total Stock</p>
            <p className="text-3xl font-bold text-blue-800">{vehicles.length}</p>
            <p className="text-sm text-blue-600 mt-1">vehicles</p>
          </div>
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Available</p>
            <p className="text-3xl font-bold text-green-800">{vehicles.filter(v => v.status === 'Available').length}</p>
            <p className="text-sm text-green-600 mt-1">ready to sell</p>
          </div>
          <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200">
            <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mb-1">Reserved</p>
            <p className="text-3xl font-bold text-yellow-800">{vehicles.filter(v => v.status === 'Reserved').length}</p>
            <p className="text-sm text-yellow-600 mt-1">on hold</p>
          </div>
          <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">Sold</p>
            <p className="text-3xl font-bold text-gray-800">{vehicles.filter(v => v.status === 'Sold').length}</p>
            <p className="text-sm text-gray-500 mt-1">completed</p>
          </div>
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by chassis, make, model, color…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        <div className="flex gap-1 border rounded-lg p-1">
          <button onClick={() => setViewMode('grouped')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            Grouped
          </button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          <Car className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          {search ? 'No vehicles match your search.' : 'No local vehicles added yet. Click "Add Local Vehicle" to get started.'}
        </div>
      ) : viewMode === 'grouped' ? (
        /* ── GROUPED VIEW ── */
        <div className="space-y-3">
          {(() => {
            const grouped = filtered.reduce((acc, v) => {
              const make = v.make ? v.make.charAt(0).toUpperCase() + v.make.slice(1).toLowerCase() : 'Unknown';
              const model = v.model ? v.model.toUpperCase() : 'Unknown';
              if (!acc[make]) acc[make] = {};
              if (!acc[make][model]) acc[make][model] = [];
              acc[make][model].push(v);
              return acc;
            }, {});
            return Object.keys(grouped).sort().map(make => {
              const makeVehicles = Object.values(grouped[make]).flat();
              const totalValue = makeVehicles.reduce((s, v) => s + (v.acquisition_cost_ugx || 0), 0);
              const totalQty = makeVehicles.reduce((s, v) => s + (v.quantity || 1), 0);
              const availCount = makeVehicles.filter(v => v.status === 'Available').reduce((s, v) => s + (v.quantity || 1), 0);
              return (
                <div key={make} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div onClick={() => toggleMake(make)}
                    className="flex items-center justify-between p-4 bg-blue-50 border-b cursor-pointer hover:bg-blue-100">
                    <div className="flex items-center gap-3">
                      {expandedMakes[make] ? <ChevronDown className="h-5 w-5 text-blue-600" /> : <ChevronRight className="h-5 w-5 text-blue-600" />}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{make}</h3>
                        <p className="text-sm text-gray-600">{totalQty} units • {availCount} available • {formatUGX(totalValue)} cost value</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{Object.keys(grouped[make]).length}</p>
                      <p className="text-xs text-gray-500">Models</p>
                    </div>
                  </div>
                  {expandedMakes[make] && (
                    <div className="divide-y">
                      {Object.keys(grouped[make]).sort().map(model => {
                        const modelVehicles = grouped[make][model];
                        const modelKey = `${make}-${model}`;
                                const modelQty = modelVehicles.reduce((s, v) => s + (v.quantity || 1), 0);
                                const modelAvail = modelVehicles.filter(v => v.status === 'Available').reduce((s, v) => s + (v.quantity || 1), 0);
                                return (
                          <div key={modelKey}>
                            <div onClick={() => toggleModel(make, model)}
                              className="flex items-center justify-between px-6 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
                              <div className="flex items-center gap-2">
                                {expandedModels[modelKey] ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                <span className="font-semibold text-gray-800">{model}</span>
                                <span className="text-sm text-gray-500">— {modelQty} unit{modelQty !== 1 ? 's' : ''}</span>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {modelAvail} available
                              </span>
                            </div>
                            {expandedModels[modelKey] && (
                              <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                  <tr>
                                    <th className="px-6 py-2 text-left">Vehicle</th>
                                    <th className="px-6 py-2 text-center">Qty</th>
                                    <th className="px-6 py-2 text-left">Source</th>
                                    <th className="px-6 py-2 text-right">Acq. Cost</th>
                                    <th className="px-6 py-2 text-right">Sale Price</th>
                                    <th className="px-6 py-2 text-left">Status</th>
                                    <th className="px-6 py-2 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {modelVehicles.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                          {v.image_url
                                            ? <img src={v.image_url} alt="" className="h-9 w-12 rounded object-cover" />
                                            : <div className="flex h-9 w-12 items-center justify-center rounded bg-gray-100"><Car className="h-4 w-4 text-gray-400" /></div>}
                                          <div>
                                            <div className="font-medium text-gray-900">{v.make} {v.model} {v.year}</div>
                                            <div className="text-xs text-gray-400">{v.chassis_number} • {v.color}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 text-center">
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                          v.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                        }`}>{v.quantity || 1}</span>
                                      </td>
                                      <td className="px-6 py-3"><SourceBadge type={v.source_type} /></td>
                                      <td className="px-6 py-3 text-right font-medium">{formatUGX(v.acquisition_cost_ugx)}</td>
                                      <td className="px-6 py-3 text-right">{v.sale_price_usd ? formatUGX(Math.round(v.sale_price_usd * exchangeRate)) : '-'}</td>
                                      <td className="px-6 py-3"><StatusBadge status={v.status} /></td>
                                      <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                          <button onClick={() => setInspectVehicle(v)} title="Inspections" className="rounded p-1 text-green-600 hover:bg-green-50"><ClipboardList className="h-4 w-4" /></button>
                                          {isManager && (<>
                                            <button onClick={() => openEdit(v)} className="rounded p-1 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                                            <button onClick={() => setDeleteId(v.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                                          </>)}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-right">Acq. Cost</th>
                <th className="px-4 py-3 text-right">Sale Price</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {v.image_url ? <img src={v.image_url} alt="" className="h-10 w-14 rounded object-cover" />
                        : <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100"><Car className="h-5 w-5 text-gray-400" /></div>}
                      <div>
                        <div className="font-medium text-gray-900">{v.make} {v.model} {v.year}</div>
                        <div className="text-xs text-gray-400">{v.chassis_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><SourceBadge type={v.source_type} /></td>
                  <td className="px-4 py-3 text-gray-600">{v.acquisition_source || '-'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatUGX(v.acquisition_cost_ugx)}</td>
                  <td className="px-4 py-3 text-right">{v.sale_price_usd ? formatUGX(Math.round(v.sale_price_usd * exchangeRate)) : '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setInspectVehicle(v)} title="Inspections" className="rounded p-1 text-green-600 hover:bg-green-50"><ClipboardList className="h-4 w-4" /></button>
                      {isManager && (<>
                        <button onClick={() => openEdit(v)} className="rounded p-1 text-blue-600 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteId(v.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editVehicle ? 'Edit Vehicle' : 'Add Local Vehicle'}
              </h2>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Photo</label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-32 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={imageUploading}
                    className="flex h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500"
                  >
                    <Camera className="h-5 w-5" />
                    {imageUploading ? 'Uploading…' : 'Click to upload photo'}
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleImageChange} />
              </div>

              {/* Source type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Source Type *</label>
                  <select value={form.source_type} onChange={e => handleChange('source_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {SOURCE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Source / Seller</label>
                  <input value={form.acquisition_source} onChange={e => handleChange('acquisition_source', e.target.value)}
                    placeholder="e.g. John Motors, Auction Uganda"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Vehicle details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Chassis No. *</label>
                  <input value={form.chassis_number} onChange={e => handleChange('chassis_number', e.target.value)}
                    placeholder="VIN / Chassis"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Make *</label>
                  <select value={form.make} onChange={e => { handleChange('make', e.target.value); handleChange('model', ''); }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select Make</option>
                    {makes.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Model *</label>
                  <select value={form.model} onChange={e => handleChange('model', e.target.value)}
                    disabled={!form.make}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                    <option value="">Select Model</option>
                    {allModels
                      .filter(m => {
                        const mk = makes.find(mk => mk.name === form.make);
                        return mk ? m.make_id === mk.id : true;
                      })
                      .map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                  <input type="number" min="1980" max={new Date().getFullYear() + 1}
                    value={form.year} onChange={e => handleChange('year', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                  <select value={form.color} onChange={e => handleChange('color', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select Color</option>
                    {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Mileage (km)</label>
                  <input type="number" value={form.mileage} onChange={e => handleChange('mileage', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fuel Type</label>
                  <select value={form.fuel_type} onChange={e => handleChange('fuel_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {FUEL_TYPES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Transmission</label>
                  <select value={form.transmission} onChange={e => handleChange('transmission', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {TRANSMISSIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Engine (cc)</label>
                  <input type="number" value={form.engine_cc} onChange={e => handleChange('engine_cc', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Acquisition Cost (UGX)</label>
                  <input type="number" value={form.acquisition_cost_ugx} onChange={e => handleChange('acquisition_cost_ugx', e.target.value)}
                    placeholder="How much you paid"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Asking Price (UGX)</label>
                  <input type="number" value={form.sale_price_ugx} onChange={e => handleChange('sale_price_ugx', e.target.value)}
                    placeholder="What you will sell for"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Status + Condition + Body Type + Quantity */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => handleChange('status', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Condition</label>
                  <select value={form.condition} onChange={e => handleChange('condition', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Body Type</label>
                  <select value={form.body_type} onChange={e => handleChange('body_type', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Select body type</option>
                    {BODY_TYPES.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Qty in Stock <span className="text-red-500">*</span></label>
                  <input type="number" min="1" value={form.quantity} onChange={e => handleChange('quantity', parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <p className="mt-0.5 text-xs text-gray-400">How many units</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)}
                  rows={2} placeholder="Condition notes, history, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? 'Saving…' : editVehicle ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Delete Vehicle?</h3>
            <p className="mt-2 text-sm text-gray-500">This cannot be undone. Sold vehicles cannot be deleted.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection modal */}
      {inspectVehicle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <Inspections
              vehicleId={inspectVehicle.id}
              vehicleLabel={`${inspectVehicle.make} ${inspectVehicle.model} ${inspectVehicle.year}`}
              onClose={() => setInspectVehicle(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
