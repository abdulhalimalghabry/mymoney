import { Transaction, Account } from '../types';

export function exportTransactionsToCSV(
  transactions: Transaction[],
  accounts: Account[],
  filename: string = 'transactions'
) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const rows = transactions.map((t) => ({
    'التاريخ': t.date,
    'النوع': t.type === 'income' ? 'دخل' : t.type === 'expense' ? 'مصروف' : 'تحويل',
    'التصنيف': t.category,
    'التصنيف الفرعي': t.subcategory || '',
    'المبلغ': t.amount,
    'العملة': t.currency,
    'الحساب المالي': accountMap.get(t.accountId) || t.accountId || '',
    'الوصف': t.description || '',
    'الملاحظات': t.notes || '',
  }));

  downloadCSV(filename.replace(/\.csv$/, ''), rows);
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    return;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Arabic / International characters
    keys.join(separator) +
    '\n' +
    rows
      .map(row => {
        return keys
          .map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
