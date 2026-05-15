import { Printer, Download, X } from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';
import { printDocument, docHeader, docFooter, fmtMoney, fmtDate } from '../utils/printDocument';

function PrintableInvoice({ invoice, type = 'sales', onClose, companyName = 'Car Tracking System', companyAddress = '' }) {

  const isSalesInvoice = type === 'sales';
  const customerName = isSalesInvoice ? invoice.customer_name : invoice.counterparty_name;
  const invoiceNumber = invoice.invoice_number || invoice.order_number || '—';
  const invoiceDate = isSalesInvoice ? invoice.sale_date : invoice.created_at;

  const handlePrint = () => {
    const payStatus = invoice.payment_status || 'Unpaid';
    const statusClass = payStatus === 'Paid' ? 'status-paid' : payStatus === 'Partial' ? 'status-partial' : 'status-unpaid';

    const header = docHeader({
      companyName,
      companyAddress,
      docType: isSalesInvoice ? 'Sales Invoice' : 'Purchase Order',
      docRef: invoiceNumber,
      docDate: fmtDate(invoiceDate),
    });

    const parties = `
      <div class="parties">
        <div class="party-box">
          <h4>${isSalesInvoice ? 'Bill To' : 'Supplier'}</h4>
          <div class="party-name">${customerName || '—'}</div>
          ${invoice.customer_phone ? `<p>Tel: ${invoice.customer_phone}</p>` : ''}
          ${invoice.customer_email ? `<p>Email: ${invoice.customer_email}</p>` : ''}
        </div>
        <div class="party-box">
          <h4>Status &amp; Payment</h4>
          <div><span class="status-badge ${statusClass}">${payStatus}</span></div>
          ${isSalesInvoice ? `
            ${invoice.quantity > 1 ? `<p style="margin-top:8px">Quantity: <strong>${invoice.quantity} units</strong></p>` : ''}
            ${invoice.quantity > 1 ? `<p>Unit price: <strong>${fmtMoney((invoice.unit_price_ugx || invoice.selling_price_ugx / invoice.quantity))}</strong></p>` : ''}
            <p style="margin-top:8px">Sale price: <strong>${fmtMoney(invoice.selling_price_ugx)}</strong></p>
            <p>Paid: <strong>${fmtMoney(invoice.amount_paid_ugx)}</strong></p>
            <p>Balance: <strong>${fmtMoney(invoice.balance_ugx)}</strong></p>
          ` : `
            <p style="margin-top:8px">Total: <strong>${fmtMoney(invoice.total_amount_usd, 'USD')}</strong></p>
          `}
        </div>
      </div>
    `;

    const infoGrid = `
      <div class="info-grid">
        ${invoice.make ? `<div class="info-item"><label>Vehicle</label><span>${invoice.make} ${invoice.model || ''} ${invoice.year || ''}</span></div>` : ''}
        ${invoice.chassis_number ? `<div class="info-item"><label>Chassis No.</label><span>${invoice.chassis_number}</span></div>` : ''}
        ${invoice.color ? `<div class="info-item"><label>Color</label><span>${invoice.color}</span></div>` : ''}
        ${invoice.quantity ? `<div class="info-item"><label>Quantity</label><span>${invoice.quantity} unit${invoice.quantity > 1 ? 's' : ''}</span></div>` : ''}
        ${invoice.units ? `<div class="info-item"><label>Units</label><span>${invoice.units}</span></div>` : ''}
        ${invoice.payment_method ? `<div class="info-item"><label>Payment Method</label><span>${invoice.payment_method}</span></div>` : ''}
      </div>
    `;

    const itemTable = isSalesInvoice ? `
      <table>
        <thead>
          <tr>
            <th>Description</th>
            ${invoice.quantity > 1 ? '<th class="right">Qty</th><th class="right">Unit Price</th>' : ''}
            <th class="right">Amount (UGX)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${invoice.make || ''} ${invoice.model || ''} ${invoice.year || ''} — ${invoice.chassis_number || 'Vehicle'}</td>
            ${invoice.quantity > 1 ? `<td class="right">${invoice.quantity}</td><td class="right">${fmtMoney(invoice.unit_price_ugx || invoice.selling_price_ugx / invoice.quantity)}</td>` : ''}
            <td class="right">${fmtMoney(invoice.selling_price_ugx)}</td>
          </tr>
        </tbody>
      </table>
      <table class="totals-table">
        <tbody>
          ${invoice.quantity > 1 ? `<tr><td>Subtotal (${invoice.quantity} units × ${fmtMoney(invoice.unit_price_ugx || invoice.selling_price_ugx / invoice.quantity)})</td><td class="right">${fmtMoney(invoice.selling_price_ugx)}</td></tr>` : ''}
          <tr><td>Sale Price</td><td class="right">${fmtMoney(invoice.selling_price_ugx)}</td></tr>
          <tr><td>Amount Paid</td><td class="right">${fmtMoney(invoice.amount_paid_ugx)}</td></tr>
          <tr class="total-row"><td>Balance Due</td><td class="right">${fmtMoney(invoice.balance_ugx)}</td></tr>
        </tbody>
      </table>
    ` : `
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="right">Qty</th>
            <th class="right">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Import Order — ${invoice.units || 0} vehicles</td>
            <td class="right">${invoice.units || 0}</td>
            <td class="right">${fmtMoney(invoice.total_amount_usd, 'USD')}</td>
          </tr>
        </tbody>
      </table>
      <table class="totals-table">
        <tbody>
          <tr class="total-row"><td>Total Due</td><td class="right">${fmtMoney(invoice.total_amount_usd, 'USD')}</td></tr>
        </tbody>
      </table>
    `;

    const notes = invoice.notes ? `<div class="notes-box"><strong>Notes:</strong> ${invoice.notes}</div>` : '';

    printDocument(
      `${isSalesInvoice ? 'Invoice' : 'Purchase Order'} ${invoiceNumber}`,
      header + parties + infoGrid + itemTable + notes + docFooter()
    );
  };

  const handleDownload = () => {
    // Trigger print which has save-as-PDF option
    handlePrint();
  };

  const payStatus = invoice.payment_status || 'Unpaid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-4 rounded-t-xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isSalesInvoice ? 'Sales Invoice' : 'Purchase Order'} — {invoiceNumber}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{fmtDate(invoiceDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 font-medium"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="rounded-lg bg-gray-200 p-2 hover:bg-gray-300">
              <X className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Quick summary */}
        <div className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{isSalesInvoice ? 'Customer' : 'Supplier'}</p>
              <p className="font-semibold text-gray-800">{customerName || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                payStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                payStatus === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>{payStatus}</span>
            </div>
          </div>

          {isSalesInvoice ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr className="px-4">
                    <td className="px-4 py-2.5 text-gray-500">Vehicle</td>
                    <td className="px-4 py-2.5 font-medium text-right">{invoice.make} {invoice.model} {invoice.year}</td>
                  </tr>
                  {invoice.quantity && invoice.quantity > 1 && (
                    <>
                      <tr><td className="px-4 py-2.5 text-gray-500">Quantity</td><td className="px-4 py-2.5 font-medium text-right">{invoice.quantity} units</td></tr>
                      <tr><td className="px-4 py-2.5 text-gray-500">Unit Price</td><td className="px-4 py-2.5 font-medium text-right">{fmtMoney(invoice.unit_price_ugx || invoice.selling_price_ugx / invoice.quantity)}</td></tr>
                    </>
                  )}
                  <tr><td className="px-4 py-2.5 text-gray-500">Sale Price</td><td className="px-4 py-2.5 font-medium text-right">{fmtMoney(invoice.selling_price_ugx)}</td></tr>
                  <tr><td className="px-4 py-2.5 text-gray-500">Amount Paid</td><td className="px-4 py-2.5 font-medium text-right text-green-600">{fmtMoney(invoice.amount_paid_ugx)}</td></tr>
                  <tr className="bg-gray-50 font-bold"><td className="px-4 py-3 text-gray-700">Balance Due</td><td className="px-4 py-3 text-right text-orange-600">{fmtMoney(invoice.balance_ugx)}</td></tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-2.5 text-gray-500">Units</td><td className="px-4 py-2.5 font-medium text-right">{invoice.units || '—'}</td></tr>
                  <tr className="bg-gray-50 font-bold"><td className="px-4 py-3 text-gray-700">Total Amount</td><td className="px-4 py-3 text-right">{fmtMoney(invoice.total_amount_usd, 'USD')}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center pt-2">
            Click <strong>Print / Save PDF</strong> to open the full formatted document. In the print dialog, choose <em>"Save as PDF"</em> to download.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrintableInvoice;
