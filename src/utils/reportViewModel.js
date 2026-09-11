/**
 * One view model for screen, PDF, image, email, and Web Share.
 * Year-to-date is fiscal books through the selected month (Sep–Aug).
 */

import { formatCurrency } from './helpers';
import { openingCardLabel, pdfMoneySummary, ytdRowsFromLedger } from './ledgerMath';
import { monthLabelToYearMonth } from './months';
import { stillDueHighlights } from './expertReport';

export function ytdRowsThroughMonth(ledger, throughMonth) {
  const rows = ytdRowsFromLedger(ledger);
  const cap = monthLabelToYearMonth(throughMonth);
  if (!cap) return rows;
  return rows.filter((row) => {
    const ym = monthLabelToYearMonth(row.month);
    return ym && ym <= cap;
  });
}

export function shareReportText(reportData = {}) {
  const month = reportData.month || 'this month';
  const collected = formatCurrency(reportData.totalCollection);
  const spent = formatCurrency(reportData.totalExpenses);
  const monthStatus = reportData.monthStatus || 'BALANCED';
  const monthNet = formatCurrency(Math.abs(Number(reportData.netBalance) || 0));
  const availableStatus = reportData.availableStatus || 'BALANCED';
  const available = formatCurrency(reportData.cumulativeBalance);
  return (
    `Monthly report for ${month}. ` +
    `Collected: ${collected}. Spent: ${spent}. ` +
    `This month: ${monthStatus} ${monthNet}. ` +
    `Available after ${month}: ${availableStatus} ${available}. ` +
    'The Google Sheet is the source of truth.'
  );
}

export function stillDueResidentCopy(stillDue) {
  const total = Number(stillDue?.total) || 0;
  const count = stillDue?.rows?.length || 0;
  if (total <= 0 || count <= 0) return '';
  return (
    `Still to collect ${formatCurrency(total)} from ${count} flat(s). ` +
    'Kindly remind with care — this is only the common account.'
  );
}

export function buildReportViewModel(reportData = {}) {
  const money = reportData.ledger
    ? pdfMoneySummary(reportData.ledger, reportData.month)
    : {
      openingSurplus: reportData.openingSurplus,
      openingFromMonth: reportData.openingFromMonth,
      monthCollection: reportData.totalCollection,
      monthExpenses: reportData.totalExpenses,
      monthNet: reportData.netBalance,
      monthStatus: reportData.monthStatus,
      availableBalance: reportData.cumulativeBalance,
      availableStatus: reportData.availableStatus,
    };
  const stillDue = stillDueHighlights(reportData.maintenance);
  return {
    month: reportData.month,
    apartmentName: reportData.apartmentName || 'The Pride of Tirumala',
    openingLabel: openingCardLabel(money.openingSurplus),
    openingSurplus: money.openingSurplus,
    openingFromMonth: money.openingFromMonth || reportData.openingFromMonth,
    collected: money.monthCollection,
    spent: money.monthExpenses,
    monthNet: money.monthNet,
    monthStatus: money.monthStatus,
    available: money.availableBalance,
    availableStatus: money.availableStatus,
    ytdRows: ytdRowsThroughMonth(reportData.ledger, reportData.month),
    stillDue,
    stillDueResident: stillDueResidentCopy(stillDue),
    shareText: shareReportText({
      ...reportData,
      monthStatus: money.monthStatus,
      netBalance: money.monthNet,
      availableStatus: money.availableStatus,
      cumulativeBalance: money.availableBalance,
    }),
  };
}
