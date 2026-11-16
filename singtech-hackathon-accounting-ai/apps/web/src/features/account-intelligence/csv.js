// CSV export in the browser, no dependency. Values that a spreadsheet would run as a formula
// (starting with = + - @) are prefixed with an apostrophe so the file opens safely in Excel.

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** columns: [{ header, value: (row) => any }] */
export function toCsv(rows, columns) {
  const lines = [columns.map((c) => cell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadCsv(filename, csv) {
  // A byte order mark makes Excel read the file as UTF-8 (needed for "Singtel CUBΣ").
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
