import { useState, useEffect } from 'react';
import { Plus, X, DollarSign, User, Car, Calendar, CheckCircle, AlertCircle, CreditCard, AlertTriangle } from 'lucide-react';
import api from '../api';

function formatUGX(v) {
  return `UGX ${Number(v || 0).toLocaleString()}`;
}

const EMPTY_LOAN = {
  customer_id: '',
  vehicle_id: '',
  loan_amount: '',
  down_payment: '',
  monthly_payment: '',
  loan_term_months: '',
  interest_rate: '',
  lender_name: '',
  loan_reference: '',
  start_date: '',
  notes: '',
};

const STATUS_STYLES = {
  active: 'bg-blue-100 text-blue-800',
  settled: 'bg-green-100 text-green-800',
  defaulted: 'bg-red-100 text-red-800',
  restructured: 'bg-yellow-100 text-yellow-800',
};

export default function LoanManagement() {
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LOAN);
  const [saving, setSaving] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    load();
    api.get('/customers').then(r => setCustomers(r.data?.data || [])).catch(() => {});
    // Load ALL available vehicles (both imported and locally acquired) for this dealership
    api.get('/inventory/dealership/vehicles').then(r => {
      const local = (r.data?.data || []).filter(v => v.status === 'Available' || v.status === 'Reserved');
      setVehicles(local);
    }).catch(() => {});
    // Also try to get imported vehicles in stock at the dealership
    api.get('/inventory?status=In+Stock').then(r => {
      const imported = (r.data?.data || []).filter(v => v.dealership_id);
      setVehicles(prev => {
        const ids = new Set(prev.map(v => v.id));
        return [...prev, ...imported.filter(v => !ids.has(v.id))];
      });
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans');
      setLoans(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openLoan = async (loan) => {
    setSelectedLoan(loan);
    const res = await api.get(`/loans/${loan.id}/payments`).catch(() => ({ data: { data: [] } }));
    setPayments(res.data?.data || []);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/loans', form);
      setShowForm(false);
      setForm(EMPTY_LOAN);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaySaving(true);
    try {
      const res = await api.post(`/loans/${selectedLoan.id}/payments`, payForm);
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      setSelectedLoan(prev => ({ ...prev, remaining_balance: res.data.remaining_balance, status: res.data.remaining_balance <= 0 ? 'settled' : prev.status }));
      const paymentsRes = await api.get(`/loans/${selectedLoan.id}/payments`);
      setPayments(paymentsRes.data?.data || []);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaySaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    const label = newStatus === 'defaulted' ? 'mark as DEFAULTED (customer stopped paying)' : 'mark as settled';
    if (!confirm(`Are you sure you want to ${label}? The vehicle will be marked as Sold.`)) return;
    try {
      await api.patch(`/loans/${selectedLoan.id}`, { status: newStatus, notes: selectedLoan.notes });
      setSelectedLoan(prev => ({ ...prev, status: newStatus }));
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update loan');
    }
  };

  const filtered = filterStatus === 'all' ? loans : loans.filter(l => l.status === filterStatus);

  const totalOutstanding = loans.filter(l => l.status === 'active').reduce((s, l) => s + (l.remaining_balance || 0), 0);
  const totalLoans = loans.filter(l => l.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Loan Management</h1>
          <p className="text-gray-500">Track customer vehicle financing and loan repayments</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Loan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3"><CreditCard className="w-6 h-6 text-blue-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Active Loans</p>
            <p className="text-2xl font-bold">{totalLoans}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="rounded-lg bg-orange-50 p-3"><DollarSign className="w-6 h-6 text-orange-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-xl font-bold">{formatUGX(totalOutstanding)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-500">Settled Loans</p>
            <p className="text-2xl font-bold">{loans.filter(l => l.status === 'settled').length}</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b">
        {['all', 'active', 'settled', 'defaulted'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 text-sm font-medium capitalize ${filterStatus === s ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Loans table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No loans found</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Customer', 'Vehicle', 'Loan Amount', 'Down Payment', 'Remaining', 'Monthly', 'Lender', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(loan => (
                <tr key={loan.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openLoan(loan)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{loan.customer_name}</div>
                    <div className="text-xs text-gray-400">{loan.customer_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{loan.make ? `${loan.make} ${loan.model} ${loan.year}` : '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium">{formatUGX(loan.loan_amount)}</td>
                  <td className="px-4 py-3 text-sm">{formatUGX(loan.down_payment)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatUGX(loan.remaining_balance)}</td>
                  <td className="px-4 py-3 text-sm">{loan.monthly_payment ? formatUGX(loan.monthly_payment) : '-'}</td>
                  <td className="px-4 py-3 text-sm">{loan.lender_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[loan.status] || 'bg-gray-100 text-gray-700'}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-600 text-xs">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create loan modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between mb-5">
              <h2 className="text-lg font-semibold">New Customer Loan</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select required value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vehicle (optional)</label>
                  <select value={form.vehicle_id} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year} — {v.chassis_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Amount (UGX) *</label>
                  <input required type="number" min="0" value={form.loan_amount} onChange={e => setForm(f => ({ ...f, loan_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 15000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Down Payment (UGX)</label>
                  <input type="number" min="0" value={form.down_payment} onChange={e => setForm(f => ({ ...f, down_payment: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Payment (UGX)</label>
                  <input type="number" min="0" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Term (months)</label>
                  <input type="number" min="1" max="120" value={form.loan_term_months} onChange={e => setForm(f => ({ ...f, loan_term_months: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 36" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                  <input type="number" min="0" step="0.01" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 18" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lender Name</label>
                  <input value={form.lender_name} onChange={e => setForm(f => ({ ...f, lender_name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="DFCU Bank, Stanbic..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Loan Reference No.</label>
                  <input value={form.loan_reference} onChange={e => setForm(f => ({ ...f, loan_reference: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan detail modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">{selectedLoan.customer_name}</h2>
                <p className="text-sm text-gray-500">{selectedLoan.lender_name ? `Lender: ${selectedLoan.lender_name}` : 'In-house financing'}</p>
              </div>
              <button onClick={() => setSelectedLoan(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* Loan summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">Loan Amount</p>
                <p className="font-bold text-sm">{formatUGX(selectedLoan.loan_amount)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600">Remaining</p>
                <p className="font-bold text-sm">{formatUGX(selectedLoan.remaining_balance)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600">Status</p>
                <p className={`font-bold text-sm capitalize ${selectedLoan.status === 'settled' ? 'text-green-700' : 'text-orange-700'}`}>{selectedLoan.status}</p>
              </div>
            </div>

            {/* Record payment */}
            {selectedLoan.status !== 'settled' && selectedLoan.status !== 'defaulted' && (
              <form onSubmit={handleRecordPayment} className="mb-5 p-4 border rounded-lg bg-gray-50 space-y-3">
                <h3 className="font-semibold text-sm">Record Payment</h3>
                <div className="grid grid-cols-3 gap-2">
                  <input required type="number" min="1" placeholder="Amount (UGX)" value={payForm.amount}
                    onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm" />
                  <input required type="date" value={payForm.payment_date}
                    onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm" />
                  <input placeholder="Notes" value={payForm.notes}
                    onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={paySaving}
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                    {paySaving ? 'Saving...' : 'Record Payment'}
                  </button>
                  <button type="button" onClick={() => handleUpdateStatus('settled')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Fully Settled
                  </button>
                  <button type="button" onClick={() => handleUpdateStatus('defaulted')}
                    className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> Mark as Defaulted
                  </button>
                </div>
              </form>
            )}

            {/* Payment history */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Payment History ({payments.length})</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400">No payments recorded yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Date</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Amount</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500">Notes</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="px-3 py-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-medium">{formatUGX(p.amount)}</td>
                        <td className="px-3 py-2 text-gray-500">{p.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
