import { useEffect, useState, useRef } from 'react';
import {
  DollarSign, Receipt, Wallet, Landmark, Package, ShoppingBag,
  TrendingUp, TrendingDown, CreditCard, Car, Printer, X
} from 'lucide-react';
import { getFinancialManagement, recordImportOrderPayment } from '../api';
import { useAuth } from '../AuthContext';
import { useCurrency } from '../CurrencyContext';
function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function SummaryCard({ icon: Icon, label, value, tone = 'text-gray-900', onClick, active }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''}
        ${active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
          {onClick && <p className="mt-1 text-xs text-blue-500">View detail →</p>}
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyTable({ title }) {
  return <p className="py-6 text-sm text-gray-500">{title}</p>;
}

// Opens a new window with the invoice and triggers print
function InvoiceModal({ invoice, onClose }) {
  const contentRef = useRef();
  const { formatUGX } = useCurrency();

  const handlePrint = () => {
    const html = contentRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=820,height=700');
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 48px; color: #111; font-size: 14px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .company-name { font-size: 26px; font-weight: bold; color: #1d4ed8; }
        .invoice-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .invoice-number { font-size: 22px; font-weight: bold; }
        .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
        .bill-section { margin-bottom: 24px; }
        .bill-label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #9ca3af; margin-bottom: 4px; }
        .bill-name { font-size: 16px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f9fafb; text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
        td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
        .amount-col { text-align: right; }
        .total-row td { font-weight: bold; font-size: 16px; padding-top: 16px; }
        .balance-row td { color: #dc2626; font-weight: bold; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-partial { background: #fef3c7; color: #92400e; }
        .status-unpaid { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const statusClass =
    invoice.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
    invoice.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Invoice — {invoice.invoice_number}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable invoice content */}
        <div ref={contentRef} className="p-8">
          <div className="header flex items-start justify-between">
            <div>
              <div className="company-name text-2xl font-bold text-blue-700">CarTrack Uganda</div>
              <div className="invoice-label mt-1 text-sm text-gray-500">TAX INVOICE</div>
            </div>
            <div className="text-right">
              <div className="invoice-number text-xl font-bold text-gray-900">{invoice.invoice_number}</div>
              <div className="mt-1 text-sm text-gray-500">Date: {formatDate(invoice.sale_date)}</div>
              <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
                {invoice.payment_status}
              </span>
            </div>
          </div>

          <hr className="my-6 border-gray-200" />

          <div className="bill-section mb-6">
            <div className="bill-label text-xs font-semibold uppercase text-gray-400">Bill To</div>
            <div className="bill-name mt-1 text-base font-semibold text-gray-900">{invoice.counterparty_name || 'Customer'}</div>
          </div>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900">{invoice.item_name || 'Vehicle Sale'}</div>
                  {invoice.chassis_number && (
                    <div className="mt-0.5 text-xs text-gray-400">Chassis: {invoice.chassis_number}</div>
                  )}
                </td>
                <td className="px-4 py-4 text-right font-medium amount-col">{formatUGX(invoice.selling_price_ugx)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 total-row">
                <td className="px-4 py-3 text-right text-base font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 amount-col">{formatUGX(invoice.selling_price_ugx)}</td>
              </tr>
              {Number(invoice.amount_paid_ugx) > 0 && (
                <tr>
                  <td className="px-4 py-1 text-right text-sm text-gray-500">Amount Paid</td>
                  <td className="px-4 py-1 text-right text-sm text-green-600 amount-col">{formatUGX(invoice.amount_paid_ugx)}</td>
                </tr>
              )}
              {Number(invoice.balance_ugx) > 0 && (
                <tr className="balance-row">
                  <td className="px-4 py-1 text-right text-sm font-semibold">Balance Due</td>
                  <td className="px-4 py-1 text-right text-sm font-bold amount-col">{formatUGX(invoice.balance_ugx)}</td>
                </tr>
              )}
            </tfoot>
          </table>

          <div className="footer mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
            Thank you for your business — CarTrack Uganda
          </div>
        </div>
      </div>
    </div>
  );
}

const DEALERSHIP_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'income-statement', label: 'Income Statement' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'trial-balance', label: 'Trial Balance' },
];

export default function FinancialManagement() {
  const { user } = useAuth();
  const { formatUGX, formatUSD } = useCurrency();
  const dashboardPrintRef = useRef(null);
  const incomeStatementPrintRef = useRef(null);
  const balanceSheetPrintRef = useRef(null);
  const trialBalancePrintRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start_date: '', end_date: '' });
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [invoiceModal, setInvoiceModal] = useState(null);

  useEffect(() => { loadFinancials(); }, []);

  const loadFinancials = async (params = dateRange) => {
    setLoading(true);
    try {
      const response = await getFinancialManagement(params);
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to load financial data', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => { loadFinancials(dateRange); };

  const printNode = (node, title) => {
    if (!node) return;

    const w = window.open('', '_blank', 'width=1100,height=800');
    if (!w) {
      alert('Enable pop-ups to print this document.');
      return;
    }

    w.document.write(`<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; font-family: Arial, sans-serif; color: #111827; font-size: 13px; }
        h1, h2, h3 { margin: 0 0 8px; }
        p { margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        th { font-size: 11px; text-transform: uppercase; color: #6b7280; }
        .text-right { text-align: right; }
        .print\\:hidden { display: none !important; }
      </style>
    </head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handlePrintActiveDocument = () => {
    const printMap = {
      dashboard: { ref: dashboardPrintRef, title: 'Financial Dashboard' },
      'income-statement': { ref: incomeStatementPrintRef, title: 'Income Statement' },
      'balance-sheet': { ref: balanceSheetPrintRef, title: 'Balance Sheet' },
      'trial-balance': { ref: trialBalancePrintRef, title: 'Trial Balance' },
    };

    const target = printMap[tab] || printMap.dashboard;
    printNode(target.ref.current, `CarTrack Uganda - ${target.title}`);
  };

  const openPaymentModal = (invoice) => {
    setPaymentModal(invoice);
    setPaymentAmount(invoice.amount_paid_usd > 0 ? invoice.amount_paid_usd : '');
    setPaymentNotes('');
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount))) return;
    setPaymentSaving(true);
    try {
      await recordImportOrderPayment(paymentModal.id, {
        amount_paid_usd: Number(paymentAmount),
        payment_notes: paymentNotes,
      });
      setPaymentModal(null);
      loadFinancials(dateRange);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  const isSupplier = user?.role === 'foreign_bond_user';
  const pnl = data?.pnl || {};
  const summary = data?.summary || {};

  const periodLabel = dateRange.start_date && dateRange.end_date
    ? `${formatDate(dateRange.start_date)} — ${formatDate(dateRange.end_date)}`
    : 'All Time';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-500">
            {isSupplier
              ? 'Track supplier-side inventory cost, order invoices, and confirmed order value.'
              : 'Track sales invoices, receivables, purchasing, and inventory investment.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row">
          <button
            onClick={handlePrintActiveDocument}
            className="print:hidden flex items-center gap-1.5 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print Active Document
          </button>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={e => setDateRange(c => ({ ...c, start_date: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={e => setDateRange(c => ({ ...c, end_date: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply Range
          </button>
        </div>
      </div>

      {/* Tab navigation — dealership only */}
      {!isSupplier && (
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm w-fit flex-wrap">
          {DEALERSHIP_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : !data ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Financial management data could not be loaded.
        </div>
      ) : isSupplier ? (
        /* ─── SUPPLIER VIEW ─── */
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Package} label="Inventory Units" value={summary.active_inventory_units || 0} />
            <SummaryCard icon={Wallet} label="Inventory Cost" value={formatUSD(summary.inventory_cost_usd)} />
            <SummaryCard icon={Receipt} label="Pending Orders" value={summary.pending_orders || 0} />
            <SummaryCard icon={DollarSign} label="Order Value" value={formatUSD(summary.total_order_value_usd)} tone="text-green-600" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Supplier Order Invoices</h2>
              {data.orderInvoices?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Invoice</th>
                        <th className="px-4 py-3 text-left">Dealership</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-right">Units</th>
                        <th className="px-4 py-3 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orderInvoices.map(invoice => (
                        <tr key={invoice.id} className="border-b last:border-b-0">
                          <td className="px-4 py-3"><div className="font-medium">{invoice.invoice_number}</div><div className="text-xs text-gray-400">{formatDate(invoice.created_at)}</div></td>
                          <td className="px-4 py-3">{invoice.counterparty_name || 'Unknown'}</td>
                          <td className="px-4 py-3">{invoice.order_status}</td>
                          <td className="px-4 py-3 text-right">{invoice.units || 0}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatUSD(invoice.total_amount_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyTable title="No supplier invoices yet." />}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Inventory Cost by Make</h2>
              {data.inventoryByMake?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">Make</th>
                        <th className="px-4 py-3 text-right">Units</th>
                        <th className="px-4 py-3 text-right">Inventory Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventoryByMake.map(row => (
                        <tr key={row.make} className="border-b last:border-b-0">
                          <td className="px-4 py-3 font-medium">{row.make}</td>
                          <td className="px-4 py-3 text-right">{row.units || 0}</td>
                          <td className="px-4 py-3 text-right">{formatUSD(row.inventory_cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyTable title="No inventory cost data yet." />}
            </div>
          </div>
        </>
      ) : (
        /* ─── DEALERSHIP VIEW ─── */
        <>
          {/* ═══ DASHBOARD TAB ═══ */}
          {tab === 'dashboard' && (
            <div ref={dashboardPrintRef} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-3">Accounts Receivable (from customers)</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard icon={Receipt} label="Sales Invoices" value={summary.local_sales_count || 0} onClick={() => setTab('income-statement')} active={tab === 'income-statement'} />
                  <SummaryCard icon={Wallet} label="Total Revenue" value={formatUGX(summary.local_revenue_ugx)} tone="text-green-600" onClick={() => setTab('income-statement')} active={tab === 'income-statement'} />
                  <SummaryCard icon={Landmark} label="Receivables Outstanding" value={formatUGX(summary.outstanding_ugx)} tone="text-amber-600" onClick={() => setTab('balance-sheet')} active={tab === 'balance-sheet'} />
                  <SummaryCard icon={DollarSign} label="Gross Profit" value={formatUGX(summary.gross_profit_ugx)} tone={Number(summary.gross_profit_ugx) >= 0 ? 'text-green-600' : 'text-red-600'} onClick={() => setTab('income-statement')} active={tab === 'income-statement'} />
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-3">Accounts Payable (to suppliers)</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard icon={ShoppingBag} label="Import Orders" value={summary.import_orders_count || 0} onClick={() => setTab('balance-sheet')} />
                  <SummaryCard icon={ShoppingBag} label="Total Import Spend" value={formatUSD(summary.import_spend_usd)} onClick={() => setTab('trial-balance')} />
                  <SummaryCard icon={Landmark} label="Payables Outstanding" value={formatUSD(summary.payables_outstanding_usd || 0)} tone="text-red-600" onClick={() => setTab('balance-sheet')} />
                  <SummaryCard icon={Package} label="Inventory Value" value={formatUSD(summary.inventory_value_usd)} onClick={() => setTab('balance-sheet')} />
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-3">Local Acquisitions (trade-ins, auctions, local purchases)</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard icon={Car} label="Locally Acquired" value={summary.local_acquisition_count || 0} />
                  <SummaryCard icon={Wallet} label="Acquisition Cost" value={formatUGX(summary.local_acquisition_cost_ugx)} />
                </div>
              </div>

              {/* P&L Summary */}
              {data.pnl && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Summary</h2>
                    <button onClick={() => setTab('income-statement')} className="text-sm text-blue-600 hover:underline">
                      Full Income Statement →
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><TrendingUp className="h-4 w-4" />Revenue (Sales)</div>
                      <div className="mt-2 text-2xl font-bold text-blue-900">{formatUGX(pnl.revenue_ugx)}</div>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-700"><TrendingDown className="h-4 w-4" />Cost of Goods Sold</div>
                      <div className="mt-2 text-2xl font-bold text-red-900">{formatUGX(pnl.total_cogs_ugx)}</div>
                      <div className="mt-1 text-xs text-red-600">Imports: {formatUGX(pnl.cogs_from_imports_ugx)} · Local acq: {formatUGX(pnl.cogs_from_local_ugx)}</div>
                    </div>
                    <div className={`rounded-xl p-4 ${Number(pnl.gross_profit_ugx) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className={`flex items-center gap-2 text-sm font-medium ${Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-700' : 'text-red-700'}`}><DollarSign className="h-4 w-4" />Gross Profit</div>
                      <div className={`mt-2 text-2xl font-bold ${Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-900' : 'text-red-900'}`}>{formatUGX(pnl.gross_profit_ugx)}</div>
                      <div className={`mt-1 text-xs ${Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-600' : 'text-red-600'}`}>Gross margin: {pnl.gross_margin_pct}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sales & Purchase invoices */}
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Sales Invoices (Receivables)</h2>
                  {data.salesInvoices?.length ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left">Invoice</th>
                            <th className="px-4 py-3 text-left">Customer</th>
                            <th className="px-4 py-3 text-left">Vehicle</th>
                            <th className="px-4 py-3 text-left">Payment</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.salesInvoices.map(invoice => (
                            <tr key={invoice.id} className="border-b last:border-b-0">
                              <td className="px-4 py-3"><div className="font-medium text-gray-900">{invoice.invoice_number}</div><div className="text-xs text-gray-500">{formatDate(invoice.sale_date)}</div></td>
                              <td className="px-4 py-3">{invoice.counterparty_name}</td>
                              <td className="px-4 py-3">{invoice.item_name}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${invoice.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : invoice.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{invoice.payment_status}</span>
                                {invoice.balance_ugx > 0 && <div className="text-xs text-gray-500 mt-0.5">Bal: {formatUGX(invoice.balance_ugx)}</div>}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatUGX(invoice.selling_price_ugx)}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => setInvoiceModal(invoice)} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Print Invoice">
                                  <Printer className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <EmptyTable title="No sales invoices yet. Create local sales to populate dealership receivables and invoice tracking." />}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Purchase Ledger (Payables)</h2>
                  {data.purchaseInvoices?.length ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b bg-gray-50 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left">Order</th>
                            <th className="px-4 py-3 text-left">Supplier</th>
                            <th className="px-4 py-3 text-left">Payment</th>
                            <th className="px-4 py-3 text-right">Units</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-right">Outstanding</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.purchaseInvoices.map(invoice => (
                            <tr key={invoice.id} className="border-b last:border-b-0">
                              <td className="px-4 py-3"><div className="font-medium text-gray-900">{invoice.invoice_number}</div><div className="text-xs text-gray-500">{formatDate(invoice.created_at)}</div></td>
                              <td className="px-4 py-3">{invoice.counterparty_name || 'Unknown supplier'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${invoice.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : invoice.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{invoice.payment_status || 'Unpaid'}</span>
                                <div className="text-xs text-gray-500">{invoice.order_status}</div>
                              </td>
                              <td className="px-4 py-3 text-right">{invoice.units || 0}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatUSD(invoice.total_amount_usd)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${invoice.outstanding_usd > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatUSD(invoice.outstanding_usd || 0)}</td>
                              <td className="px-4 py-3 text-right">
                                {invoice.payment_status !== 'Paid' && (
                                  <button onClick={() => openPaymentModal(invoice)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                                    <CreditCard className="h-3 w-3" />Pay
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <EmptyTable title="No purchase invoices yet. Import orders from suppliers will appear here once they are created." />}
                </div>
              </div>

              {/* Payment breakdown */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Receivables — Payment Status Breakdown</h2>
                {data.paymentBreakdown?.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-right">Invoices</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.paymentBreakdown.map(row => (
                          <tr key={row.payment_status} className="border-b last:border-b-0">
                            <td className="px-4 py-3 font-medium">{row.payment_status}</td>
                            <td className="px-4 py-3 text-right">{row.count}</td>
                            <td className="px-4 py-3 text-right">{formatUGX(row.total_amount_ugx)}</td>
                            <td className="px-4 py-3 text-right">{formatUGX(row.balance_ugx)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyTable title="No payment breakdown yet." />}
              </div>

              {/* Local Acquisitions */}
              {data.localAcquisitions?.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Local Acquisitions Ledger</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">Vehicle</th>
                          <th className="px-4 py-3 text-left">Source Type</th>
                          <th className="px-4 py-3 text-left">From</th>
                          <th className="px-4 py-3 text-right">Acquisition Cost</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.localAcquisitions.map(v => (
                          <tr key={v.id} className="border-b last:border-b-0">
                            <td className="px-4 py-3 font-medium">{v.make} {v.model} {v.year}<div className="text-xs text-gray-400">{v.chassis_number}</div></td>
                            <td className="px-4 py-3 capitalize">{(v.source_type || '').replace('_', ' ')}</td>
                            <td className="px-4 py-3">{v.acquisition_source || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium">{v.acquisition_cost_ugx ? 'UGX ' + Number(v.acquisition_cost_ugx).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${v.status === 'Sold' ? 'bg-gray-100 text-gray-700' : v.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{v.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ INCOME STATEMENT TAB ═══ */}
          {tab === 'income-statement' && (
            <div ref={incomeStatementPrintRef} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Income Statement</h2>
                  <p className="text-sm text-gray-500">Period: {periodLabel}</p>
                </div>
                <button onClick={handlePrintActiveDocument} className="print:hidden flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
              <div className="p-8 space-y-0 font-mono text-sm max-w-2xl">
                <p className="mb-6 font-sans text-xs text-gray-400 uppercase tracking-widest">CarTrack Uganda — Statement of Profit & Loss</p>

                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">REVENUE</div>
                <div className="flex justify-between border-b border-gray-100 py-2.5">
                  <span className="text-gray-700">Sales Revenue (Local Vehicle Sales)</span>
                  <span className="font-semibold text-green-700">{formatUGX(pnl.revenue_ugx)}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-800 py-2.5 font-bold text-base">
                  <span>Total Revenue</span>
                  <span className="text-green-700">{formatUGX(pnl.revenue_ugx)}</span>
                </div>

                <div className="mb-1 mt-6 text-xs font-bold uppercase tracking-widest text-gray-400">COST OF GOODS SOLD</div>
                <div className="flex justify-between border-b border-gray-100 py-2.5">
                  <span className="text-gray-700">Imported Vehicle Costs (UGX equivalent)</span>
                  <span className="text-red-700">{formatUGX(pnl.cogs_from_imports_ugx)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 py-2.5">
                  <span className="text-gray-700">Local Acquisition Costs</span>
                  <span className="text-red-700">{formatUGX(pnl.cogs_from_local_ugx)}</span>
                </div>
                <div className="flex justify-between border-b-2 border-gray-800 py-2.5 font-bold text-base">
                  <span>Total Cost of Goods Sold</span>
                  <span className="text-red-700">{formatUGX(pnl.total_cogs_ugx)}</span>
                </div>

                <div className={`flex justify-between rounded-lg px-3 py-4 mt-4 text-xl font-bold ${Number(pnl.gross_profit_ugx) >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <span>GROSS PROFIT</span>
                  <span>{formatUGX(pnl.gross_profit_ugx)}</span>
                </div>
                <div className="mt-2 text-right text-sm text-gray-500 font-sans">Gross Margin: {pnl.gross_margin_pct}%</div>

                {/* Invoice detail */}
                {data.salesInvoices?.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400 font-sans">Revenue Detail — Sales Invoices</div>
                    <table className="min-w-full text-sm font-sans">
                      <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 text-left">Invoice</th>
                          <th className="py-2 text-left">Customer</th>
                          <th className="py-2 text-left">Vehicle</th>
                          <th className="py-2 text-left">Status</th>
                          <th className="py-2 text-right">Amount</th>
                          <th className="py-2 text-right print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.salesInvoices.map(inv => (
                          <tr key={inv.id} className="border-b border-gray-100">
                            <td className="py-2 font-medium">{inv.invoice_number}<div className="text-xs text-gray-400">{formatDate(inv.sale_date)}</div></td>
                            <td className="py-2">{inv.counterparty_name}</td>
                            <td className="py-2">{inv.item_name}</td>
                            <td className="py-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${inv.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : inv.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{inv.payment_status}</span>
                            </td>
                            <td className="py-2 text-right font-semibold">{formatUGX(inv.selling_price_ugx)}</td>
                            <td className="py-2 text-right print:hidden">
                              <button onClick={() => setInvoiceModal(inv)} className="rounded p-1 text-blue-600 hover:bg-blue-50" title="Print Invoice">
                                <Printer className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ BALANCE SHEET TAB ═══ */}
          {tab === 'balance-sheet' && (
            <div ref={balanceSheetPrintRef} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Balance Sheet</h2>
                  <p className="text-sm text-gray-500">As at: {dateRange.end_date ? formatDate(dateRange.end_date) : new Date().toLocaleDateString()}</p>
                </div>
                <button onClick={handlePrintActiveDocument} className="print:hidden flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 font-mono text-sm">
                {/* ASSETS */}
                <div className="border-b md:border-b-0 md:border-r border-gray-200 p-8">
                  <div className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-600">ASSETS</div>

                  <div className="mb-2 text-xs font-semibold uppercase text-gray-400">Current Assets</div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="pl-4 text-gray-700">Accounts Receivable</span>
                    <span className="font-medium">{formatUGX(summary.outstanding_ugx)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-gray-600 font-semibold">
                    <span className="text-gray-700">Total Current Assets</span>
                    <span>{formatUGX(summary.outstanding_ugx)}</span>
                  </div>

                  <div className="mb-2 mt-6 text-xs font-semibold uppercase text-gray-400">Non-Current Assets</div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="pl-4 text-gray-700">Inventory — Imports</span>
                    <span className="font-medium">{formatUSD(summary.inventory_value_usd)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="pl-4 text-gray-700">Inventory — Local (at cost)</span>
                    <span className="font-medium">{formatUGX(summary.local_acquisition_cost_ugx)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-gray-600 font-semibold">
                    <span className="text-gray-700">Total Non-Current Assets</span>
                    <span className="text-gray-500 text-xs">USD + UGX above</span>
                  </div>

                  <div className="mt-4 rounded-lg bg-blue-50 p-3 font-sans text-xs text-blue-700">
                    <strong>Note:</strong> Import inventory is in USD. Local inventory is in UGX.
                  </div>
                </div>

                {/* LIABILITIES & EQUITY */}
                <div className="p-8">
                  <div className="mb-4 text-xs font-bold uppercase tracking-widest text-red-600">LIABILITIES</div>

                  <div className="mb-2 text-xs font-semibold uppercase text-gray-400">Current Liabilities</div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="pl-4 text-gray-700">Accounts Payable (Suppliers)</span>
                    <span className="font-medium text-red-600">{formatUSD(summary.payables_outstanding_usd || 0)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-gray-600 font-semibold">
                    <span className="text-gray-700">Total Liabilities</span>
                    <span className="text-red-600">{formatUSD(summary.payables_outstanding_usd || 0)}</span>
                  </div>

                  <div className="mb-4 mt-8 text-xs font-bold uppercase tracking-widest text-green-600">EQUITY</div>
                  <div className="mb-2 text-xs font-semibold uppercase text-gray-400">Shareholders' Equity</div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="pl-4 text-gray-700">Retained Earnings (Gross Profit)</span>
                    <span className={`font-medium ${Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatUGX(pnl.gross_profit_ugx)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-gray-600 font-semibold">
                    <span className="text-gray-700">Total Equity</span>
                    <span className={Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-700' : 'text-red-700'}>{formatUGX(pnl.gross_profit_ugx)}</span>
                  </div>

                  <div className="mt-4 rounded-lg bg-amber-50 p-3 font-sans text-xs text-amber-700">
                    <strong>Simplified management balance sheet.</strong> Equity = Gross Profit (Revenue minus COGS). Full accounting requires capital accounts and operating expenses.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ TRIAL BALANCE TAB ═══ */}
          {tab === 'trial-balance' && (
            <div ref={trialBalancePrintRef} className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Trial Balance</h2>
                  <p className="text-sm text-gray-500">{dateRange.end_date ? `As at ${formatDate(dateRange.end_date)}` : 'All Time'}</p>
                </div>
                <button onClick={handlePrintActiveDocument} className="print:hidden flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
              <div className="overflow-x-auto p-8 font-mono text-sm">
                <p className="mb-6 font-sans text-xs text-gray-400 uppercase tracking-widest">CarTrack Uganda — Trial Balance</p>
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-gray-500">Account</th>
                      <th className="pb-3 text-right text-xs font-bold uppercase tracking-widest text-gray-500">Debit (Dr)</th>
                      <th className="pb-3 text-right text-xs font-bold uppercase tracking-widest text-gray-500">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={3} className="pt-4 pb-1 text-xs font-bold uppercase text-gray-400">Asset Accounts</td></tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">Accounts Receivable</td>
                      <td className="py-2.5 text-right">{formatUGX(summary.outstanding_ugx)}</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">Inventory — Imported Vehicles</td>
                      <td className="py-2.5 text-right">{formatUSD(summary.inventory_value_usd)}</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">Inventory — Local Acquisitions</td>
                      <td className="py-2.5 text-right">{formatUGX(summary.local_acquisition_cost_ugx)}</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                    </tr>

                    <tr><td colSpan={3} className="pt-6 pb-1 text-xs font-bold uppercase text-gray-400">Liability Accounts</td></tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">Accounts Payable — Suppliers</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                      <td className="py-2.5 text-right text-red-600">{formatUSD(summary.payables_outstanding_usd || 0)}</td>
                    </tr>

                    <tr><td colSpan={3} className="pt-6 pb-1 text-xs font-bold uppercase text-gray-400">Revenue Accounts</td></tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">Sales Revenue</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                      <td className="py-2.5 text-right text-green-700">{formatUGX(pnl.revenue_ugx)}</td>
                    </tr>

                    <tr><td colSpan={3} className="pt-6 pb-1 text-xs font-bold uppercase text-gray-400">Cost of Goods Sold</td></tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">COGS — Imported Vehicles</td>
                      <td className="py-2.5 text-right text-red-700">{formatUGX(pnl.cogs_from_imports_ugx)}</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2.5 pl-4 text-gray-800">COGS — Local Acquisitions</td>
                      <td className="py-2.5 text-right text-red-700">{formatUGX(pnl.cogs_from_local_ugx)}</td>
                      <td className="py-2.5 text-right text-gray-300">—</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-800">
                      <td className="pt-4 pb-2 font-bold text-gray-900 uppercase tracking-wide">Net Profit / (Loss)</td>
                      <td colSpan={2} className={`pt-4 pb-2 text-right text-lg font-bold ${Number(pnl.gross_profit_ugx) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatUGX(pnl.gross_profit_ugx)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <p className="mt-6 font-sans text-xs text-gray-400">
                  Note: Import inventory and payables are denominated in USD; local transactions are in UGX. A unified trial balance requires currency conversion.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Record Payment</h3>
            <p className="mt-1 text-sm text-gray-500">Order: <span className="font-medium text-gray-800">{paymentModal.invoice_number}</span></p>
            <p className="text-sm text-gray-500">Total: <span className="font-medium">{formatUSD(paymentModal.total_amount_usd)}</span></p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Amount Paid (USD)</label>
                <input type="number" min="0" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Payment Notes (optional)</label>
                <input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Bank transfer ref, cheque no., etc." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setPaymentModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecordPayment} disabled={paymentSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {paymentSaving ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice print modal */}
      {invoiceModal && <InvoiceModal invoice={invoiceModal} onClose={() => setInvoiceModal(null)} />}
    </div>
  );
}
