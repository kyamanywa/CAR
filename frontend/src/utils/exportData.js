import * as XLSX from 'xlsx';

/**
 * exportToExcel — exports an array of objects to a .xlsx file download.
 * @param {Object[]} data     — array of row objects
 * @param {string}   filename — without extension
 * @param {string}   [sheetName]
 */
export function exportToExcel(data, filename, sheetName = 'Data') {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * exportToCSV — exports an array of objects to a .csv file download.
 */
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
