import { useState, useEffect } from 'react';
import { getExpenses, createExpense, deleteExpense, getPaymentAging } from '../api';
import { DollarSign, Plus, X, Trash2, AlertCircle, BarChart2, Calendar, Download, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportToExcel } from '../utils/exportData';
import { formatCurrency, getCurrencyConfig } from '../utils/currencyUtils';

const CATEGORIES = [
  'Rent/Lease', 'Staff Salaries', 'Utilities', 'Marketing',
  'Repairs & Maintenance', 'Transport & Fuel', 'Insurance',
  'Licences & Fees', 'Office Supplies', 'Other'
];

const fmt = (n) => (parseFloat(n) || 0).toLocaleString();

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expenses'); // expenses | aging | loans
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    category: '', description: '', amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_ref: '', notes: '',
  });
  const currCode = getCurrencyConfig('local_sales').code;

  useEffect(() => { fetchAll(); }, [filterCategory, dateFrom, dateTo]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const [expRes, agingRes] = await Promise.all([
        getExpenses(params),
        getPaymentAging(),
      ]);
      setExpenses(expRes.data.data || []);
      setSummary(expRes.data.summary || []);
      setAging(agingRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createExpense(formData);
      setShowForm(false);
      setFormData({ category: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], receipt_ref: '', notes: '' });
      fetchAll();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(id);
    fetchAll();
  };

  const handleExportExpenses = () => {
    exportToExcel(expenses.map(e => ({
      Date: e.expense_date, Category: e.category, Description: e.description,
      [`Amount (${currCode})`]: e.amount, Receipt: e.receipt_ref, Notes: e.notes,
    })), 'Expenses');
  };

  const handleExportAging = () => {
    if (!aging?.data) return;
    exportToExcel(aging.data.map(r => ({
      Type: r._type === 'loan' ? 'Loan' : 'Sale',
      Reference: r.invoice_number,
      Customer: r.customer_name,
      Phone: r.customer_phone,
      Vehicle: `${r.make || ''} ${r.model || ''} ${r.year || ''}`.trim(),
      'Date': r.sale_date,
      'Days Aged': r.days_aged,
      'Days Remaining (Loans)': r.days_remaining ?? '',
      [`Balance (${currCode})`]: r.balance,
      Status: r.payment_status,
    })), 'Payment_Aging');
  };

  const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const AgingBucket = ({ title, rows, color }) => (
    <div className={`border-l-4 ${color} rounded-lg p-4 bg-white shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <span className="text-sm font-medium text-gray-500">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-xl font-bold text-gray-900 mb-3">
        {fmt(rows.reduce((s, r) => s + (parseFloat(r.balance) || 0), 0))} {currCode}
      </p>
      {rows.length > 0 && (
        <table className="w-full text-xs">
          <thead><tr className="text-gray-500">
            <th className="text-left pb-1">Customer</th>
            <th className="text-left pb-1">Vehicle</th>
            <th className="text-left pb-1">Type</th>
            <th className="text-right pb-1">Balance</th>
            <th className="text-right pb-1">Days</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-1">{r.customer_name}</td>
                <td className="py-1">{r.make} {r.model}</td>
                <td className="py-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r._type === 'loan' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {r._type === 'loan' ? 'Loan' : 'Sale'}
                  </span>
                </td>
                <td className="py-1 text-right font-medium">{fmt(r.balance)}</td>
                <td className="py-1 text-right">
                  {r._type === 'loan' && r.days_remaining !== null ? (
                    <span className={r.days_remaining < 0 ? 'text-red-600 font-bold' : r.days_remaining <= 30 ? 'text-yellow-600 font-bold' : 'text-gray-600'}>
                      {r.days_remaining < 0 ? `${Math.abs(r.days_remaining)}d OD` : `${r.days_remaining}d left`}
                    </span>
                  ) : (
                    <span className="text-red-600">{r.days_aged}d</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses & Aging</h1>
          <p className="text-gray-500 text-sm mt-1">Track operational costs and overdue payments</p>
        </div>
        <div className="flex gap-2">
          {tab === 'expenses' && (
            <>
              <button onClick={handleExportExpenses} className="btn btn-secondary flex items-center gap-2">
                <Download size={16} /> Export
              </button>
              <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Expense
              </button>
            </>
          )}
          {tab === 'aging' && (
            <button onClick={handleExportAging} className="btn btn-secondary flex items-center gap-2">
              <Download size={16} /> Export Aging
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[['expenses','Expenses'], ['aging','Payment Aging'], ['loans','Loan Tracker']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 col-span-2 md:col-span-1">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{fmt(totalExpenses)} <span className="text-sm font-normal">{currCode}</span></p>
            </div>
            {summary.slice(0, 3).map(s => (
              <div key={s.category} className="card p-4">
                <p className="text-sm text-gray-500 truncate">{s.category}</p>
                <p className="text-xl font-bold text-gray-900">{fmt(s.total)}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input w-auto">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input w-auto" placeholder="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input w-auto" placeholder="To" />
            {(filterCategory || dateFrom || dateTo) && (
              <button onClick={() => { setFilterCategory(''); setDateFrom(''); setDateTo(''); }} className="text-sm text-blue-600 hover:underline">Clear</button>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Date', 'Category', 'Description', 'Receipt Ref', `Amount (${currCode})`, 'Actions'].map(h => (
                    <th key={h} className="text-left p-4 text-sm font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">No expenses recorded</td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="p-4 text-sm">{exp.expense_date}</td>
                    <td className="p-4"><span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{exp.category}</span></td>
                    <td className="p-4 text-sm">{exp.description}</td>
                    <td className="p-4 text-xs text-gray-500">{exp.receipt_ref || '—'}</td>
                    <td className="p-4 font-medium text-red-600">{fmt(exp.amount)}</td>
                    <td className="p-4">
                      <button onClick={() => handleDelete(exp.id)} className="p-1 text-red-500 hover:text-red-700">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'aging' && aging && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">
                {fmt(aging.data?.reduce((s, r) => s + (parseFloat(r.balance)||0), 0))} <span className="text-sm font-normal">{currCode}</span>
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">Invoices Pending</p>
              <p className="text-2xl font-bold text-gray-900">{aging.data?.length || 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">Over 90 Days</p>
              <p className="text-2xl font-bold text-red-600">{aging.aging?.over90?.length || 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">31–90 Days</p>
              <p className="text-2xl font-bold text-yellow-600">{((aging.aging?.days31_60?.length || 0) + (aging.aging?.days61_90?.length || 0))}</p>
            </div>
          </div>

          {aging.data?.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-green-400" />
              <p className="font-medium text-gray-600">No outstanding balances</p>
              <p className="text-sm mt-1">All sales and loans are fully paid.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AgingBucket title="Current (0–30 days)" rows={aging.aging?.current || []} color="border-green-400" />
              <AgingBucket title="31–60 Days Overdue" rows={aging.aging?.days31_60 || []} color="border-yellow-400" />
              <AgingBucket title="61–90 Days Overdue" rows={aging.aging?.days61_90 || []} color="border-orange-400" />
              <AgingBucket title="Over 90 Days" rows={aging.aging?.over90 || []} color="border-red-500" />
            </div>
          )}
        </div>
      )}

      {tab === 'loans' && aging && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500">Active Loans</p>
              <p className="text-2xl font-bold text-blue-600">{aging.loans?.length || 0}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-500">Total Loan Balance</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(aging.loans?.reduce((s, l) => s + (parseFloat(l.remaining_balance)||0), 0))} <span className="text-sm font-normal">{currCode}</span></p>
            </div>
            <div className="card p-4 border-l-4 border-red-500">
              <p className="text-sm text-gray-500">Overdue / Expired</p>
              <p className="text-2xl font-bold text-red-600">{aging.loanAging?.overdue?.length || 0}</p>
            </div>
            <div className="card p-4 border-l-4 border-yellow-400">
              <p className="text-sm text-gray-500">Due in 30 Days</p>
              <p className="text-2xl font-bold text-yellow-600">{aging.loanAging?.urgent?.length || 0}</p>
            </div>
          </div>

          {(aging.loans?.length ?? 0) === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <Clock className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-600">No active loans</p>
              <p className="text-sm mt-1">When you create loans for customers, they'll appear here with countdowns.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Lender</th>
                    <th className="px-4 py-3 text-right">Loan Amount</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Monthly</th>
                    <th className="px-4 py-3 text-center">Days Active</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(aging.loans || []).map(l => {
                    const isOverdue = l.days_remaining !== null && l.days_remaining < 0;
                    const isUrgent = l.days_remaining !== null && l.days_remaining >= 0 && l.days_remaining <= 30;
                    const isUpcoming = l.days_remaining !== null && l.days_remaining > 30 && l.days_remaining <= 90;
                    return (
                      <tr key={l.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{l.customer_name}</div>
                          <div className="text-xs text-gray-400">{l.customer_phone}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {l.make ? `${l.make} ${l.model} ${l.year || ''}` : <span className="text-gray-400">No vehicle linked</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{l.lender_name || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(l.loan_amount)} <span className="text-xs text-gray-400">{currCode}</span></td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">{fmt(l.remaining_balance)} <span className="text-xs text-gray-400">{currCode}</span></td>
                        <td className="px-4 py-3 text-right text-gray-600">{l.monthly_payment ? fmt(l.monthly_payment) : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-700">{l.days_since_start}d</span>
                          {l.loan_term_months && <div className="text-xs text-gray-400">of {l.loan_term_months * 30}d term</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                              <AlertTriangle className="h-3 w-3" /> {Math.abs(l.days_remaining)}d OVERDUE
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                              <AlertCircle className="h-3 w-3" /> {l.days_remaining}d left
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                              <Clock className="h-3 w-3" /> {l.days_remaining}d left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              <CheckCircle className="h-3 w-3" /> {l.days_remaining !== null ? `${l.days_remaining}d left` : 'Active'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Expense</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Category *</label>
                  <select required value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                    className="input">
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" required value={formData.expense_date}
                    onChange={e => setFormData(f => ({ ...f, expense_date: e.target.value }))}
                    className="input" />
                </div>
              </div>
              <div>
                <label className="label">Description *</label>
                <input type="text" required value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="input" placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Amount ({currCode}) *</label>
                  <input type="number" required min="0" value={formData.amount}
                    onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                    className="input" placeholder="0" />
                </div>
                <div>
                  <label className="label">Receipt / Reference</label>
                  <input type="text" value={formData.receipt_ref}
                    onChange={e => setFormData(f => ({ ...f, receipt_ref: e.target.value }))}
                    className="input" placeholder="Receipt no." />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="input" rows={2} placeholder="Optional notes" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
