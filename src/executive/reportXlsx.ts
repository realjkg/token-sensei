// XLSX export (Ratio v2 Wave 2b). SheetJS workbook with the eight user-approved
// columns, sourced from the shared report view-model. Auto-fit column widths so
// a board reviewer never has to widen a column by hand. Server-only: imported
// exclusively by the /api/report/snapshot route.

import * as XLSX from 'xlsx';
import { buildReportModel, type ReportRow } from './reportModel';

// Exact, user-approved column order. Exported so tests assert the header row.
export const REPORT_COLUMNS = [
  'Initiative Name',
  'Monthly Cost ($)',
  'Annual Run Rate ($)',
  'Budget Consumed (%)',
  'Status',
  'Cost Efficiency Score',
  'Savings Opportunity ($)',
  'Last Updated',
] as const;

type ReportRecord = Record<(typeof REPORT_COLUMNS)[number], string | number>;

function toRecord(row: ReportRow): ReportRecord {
  return {
    'Initiative Name': row.name,
    'Monthly Cost ($)': row.monthlyCost,
    'Annual Run Rate ($)': row.annualRunRate,
    'Budget Consumed (%)': row.budgetConsumedPct,
    Status: row.status,
    'Cost Efficiency Score': Number(row.costEfficiency.toFixed(1)),
    'Savings Opportunity ($)': row.savingsOpportunity,
    'Last Updated': row.lastUpdated,
  };
}

// Width = widest cell (header included) + small padding, in character units.
function autoWidths(records: ReportRecord[]): XLSX.ColInfo[] {
  return REPORT_COLUMNS.map((col) => {
    const widest = records.reduce(
      (max, rec) => Math.max(max, String(rec[col]).length),
      col.length,
    );
    return { wch: widest + 2 };
  });
}

export function buildReportWorkbook(now: Date = new Date()): Buffer {
  const { rows } = buildReportModel(now);
  const records = rows.map(toRecord);

  const sheet = XLSX.utils.json_to_sheet(records, { header: [...REPORT_COLUMNS] });
  sheet['!cols'] = autoWidths(records);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Initiatives');

  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

