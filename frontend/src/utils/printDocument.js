/**
 * printDocument — opens a styled A4 print window from HTML content.
 * No external dependencies. Works globally.
 *
 * @param {string} title  — document title shown in browser tab and print dialog
 * @param {string} html   — full HTML body content to print
 * @param {string} [extraCss] — optional extra CSS string
 */
export function printDocument(title, html, extraCss = '') {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print documents.');
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4; margin: 18mm 15mm; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #111;
      background: #fff;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .doc-header .company-name {
      font-size: 20pt;
      font-weight: 700;
      color: #1e40af;
    }
    .doc-header .company-sub {
      font-size: 9pt;
      color: #555;
      margin-top: 3px;
    }
    .doc-header .doc-meta {
      text-align: right;
    }
    .doc-meta .doc-type {
      font-size: 16pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .doc-meta .doc-ref {
      font-size: 9pt;
      color: #555;
      margin-top: 4px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .party-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .party-box h4 {
      font-size: 8pt;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .party-box .party-name {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
    }
    .party-box p {
      font-size: 9pt;
      color: #475569;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    thead tr {
      background: #1e40af;
      color: #fff;
    }
    thead th {
      padding: 9px 12px;
      text-align: left;
      font-size: 9pt;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    thead th.right { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 9px 12px; font-size: 10pt; vertical-align: top; }
    tbody td.right { text-align: right; }
    .totals-table { margin-left: auto; width: 300px; }
    .totals-table td { padding: 5px 10px; font-size: 10pt; }
    .totals-table .total-row { font-weight: 700; font-size: 12pt; border-top: 2px solid #1e40af; }
    .totals-table .total-row td { padding-top: 8px; }
    .doc-footer {
      margin-top: 30px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-partial { background: #fef9c3; color: #854d0e; }
    .status-unpaid { background: #fee2e2; color: #991b1b; }
    .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-top: 14px; font-size: 9.5pt; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .info-item { }
    .info-item label { font-size: 8pt; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
    .info-item span { font-size: 10pt; font-weight: 500; }
    ${extraCss}
  </style>
</head>
<body>
  ${html}
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`);
  win.document.close();
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build a standard document header HTML block
 */
export function docHeader({ companyName = 'Car Tracking System', companyAddress = '', docType, docRef, docDate }) {
  return `
    <div class="doc-header">
      <div>
        <div class="company-name">${escapeHtml(companyName)}</div>
        <div class="company-sub">${escapeHtml(companyAddress)}</div>
      </div>
      <div class="doc-meta">
        <div class="doc-type">${escapeHtml(docType)}</div>
        <div class="doc-ref">Ref: ${escapeHtml(docRef)}</div>
        <div class="doc-ref">Date: ${escapeHtml(docDate)}</div>
      </div>
    </div>
  `;
}

/**
 * Standard document footer
 */
export function docFooter(note = 'Thank you for your business. This is a computer-generated document.') {
  return `<div class="doc-footer">${escapeHtml(note)}</div>`;
}

/**
 * Format a number as currency for HTML (no DOM required)
 */
export function fmtMoney(value, currency = 'UGX') {
  const num = parseFloat(value) || 0;
  if (currency === 'UGX') return `UGX ${num.toLocaleString('en-UG', { minimumFractionDigits: 0 })}`;
  return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
