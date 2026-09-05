/**
 * Google Sheet formulas a treasurer can read without the app.
 * Written with USER_ENTERED. Do not run through sanitizeForSheet().
 */

import { FIRST_APP_MONTH_LABEL, FLATS, OPENING_SURPLUS, SHEET_NAMES } from '../config/constants';

export function maintenanceStillDueFormula(row) {
  return `=IF(OR(A${row}="",C${row}=""),"",MAX(0,N(C${row})-N(D${row})))`;
}

function monthKey(row) {
  return `IF(ISNUMBER(A${row}),TEXT(A${row},"MMM-YY"),TRIM(""&A${row}))`;
}

/**
 * Monthly Summary B–H for a sheet row.
 * A is the month label. Opening surplus is Configuration OPENING_SURPLUS (612).
 */
export function monthlySummaryFormulaRow(row) {
  const opening = `N(IFERROR(VLOOKUP("OPENING_SURPLUS",Configuration!A:B,2,FALSE),${OPENING_SURPLUS}))`;
  const running = row === 2
    ? `${opening}+N(D${row})`
    : `N(E${row - 1})+N(D${row})`;

  return [
    `=IF(A${row}="","",SUMIF(Maintenance!A:A,${monthKey(row)},Maintenance!D:D))`,
    `=IF(A${row}="","",SUMIF(Expenses!C:C,${monthKey(row)},Expenses!F:F))`,
    `=IF(A${row}="","",N(B${row})-N(C${row}))`,
    `=IF(A${row}="","",${running})`,
    `=IF(A${row}="","",IF(N(D${row})>0,"SURPLUS",IF(N(D${row})<0,"DEFICIT","BALANCED")))`,
    `=IF(A${row}="","",IFERROR(TEXT(COUNTIFS(Maintenance!A:A,A${row},Maintenance!H:H,"PAID")/MAX(COUNTIF(Maintenance!A:A,A${row}),1),"0%"),"0%"))`,
    `=IF(A${row}="","",IFERROR(TEXTJOIN(", ",TRUE,FILTER(Maintenance!B2:B,(Maintenance!A2:A=A${row})*(Maintenance!H2:H<>"PAID")*(Maintenance!H2:H<>"WAIVED")*(Maintenance!H2:H<>""))),""))`,
  ];
}

export function balanceStaticRows() {
  return [
    ['THE PRIDE OF TIRUMALA — CASH POSITION', '', 'Open this tab first. Amounts update from Maintenance and Expenses.'],
    ['Books start', FIRST_APP_MONTH_LABEL, 'Earlier months are not on this sheet.'],
    ['', '', ''],
    ['What to look at', 'Amount / status', 'Plain-English meaning'],
    ['Opening surplus (carry-forward)', '', 'Money already in hand on 1 Sep 2026. Comes from Configuration OPENING_SURPLUS.'],
    ['Total collected (all months)', '', 'Sum of Amount Paid on the Maintenance tab.'],
    ['Total spent (all months)', '', 'Sum of Amount on the Expenses tab.'],
    ['Available balance', '', 'Opening surplus + collected − spent. This is the society cash position.'],
    ['Overall status', '', 'SURPLUS if available balance > 0. DEFICIT if below 0. BALANCED if exactly 0.'],
    ['', '', ''],
    ['How to read a month', 'Open Monthly Summary', 'This month surplus/deficit is Collected − Spent. Running balance is the available cash after that month.'],
    ['Who still owes', 'Open Pending Dues', 'Type Sep-26 (or any month) in the yellow cell.'],
  ];
}

export function balanceFormulaCells() {
  return {
    B5: `=N(IFERROR(VLOOKUP("OPENING_SURPLUS",Configuration!A:B,2,FALSE),${OPENING_SURPLUS}))`,
    B6: '=IFERROR(SUMIF(Maintenance!A:A,"<>",Maintenance!D:D),0)',
    B7: '=IFERROR(SUMIF(Expenses!C:C,"<>",Expenses!F:F),0)',
    B8: '=N(B5)+N(B6)-N(B7)',
    B9: '=IF(N(B8)>0,"SURPLUS",IF(N(B8)<0,"DEFICIT","BALANCED"))',
  };
}

export function pendingDuesStaticRows(monthLabel = FIRST_APP_MONTH_LABEL) {
  const flats = FLATS.map((flat) => [flat, '', '', '', '', '', '']);
  return [
    ['HOW TO USE', 'Type a month in the YELLOW cell (B3), for example Sep-26. The table below updates by itself.', 'Do not type in the grey table. To record a payment, edit the Maintenance tab (or use the app).'],
    ['', '', ''],
    ['Month to check →', monthLabel, '← change only this yellow cell. Use MMM-YY (Sep-26).'],
    ['', '', ''],
    ['Total still due (₹)', '', 'Amount due minus amount paid for the month in B3'],
    ['Flats not fully paid', '', 'Count of flats whose status is not PAID or WAIVED'],
    ['', '', ''],
    ['Flat', 'Owner name', 'Amount due (₹)', 'Amount paid (₹)', 'Still due (₹)', 'Status', 'Remarks'],
    ...flats,
    ['', '', '', '', '', '', ''],
    ['Who to remind', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['TIP', 'Still due = Amount due − Amount paid. Change B3 to any month on the Maintenance tab.', 'Net surplus / deficit and running balance are on Monthly Summary and the Balance tab.'],
  ];
}

export function pendingDuesFormulaCells() {
  const cells = {
    B5: `=IF($B$3="","",SUMIFS(Maintenance!C:C,Maintenance!A:A,$B$3)-SUMIFS(Maintenance!D:D,Maintenance!A:A,$B$3))`,
    B6: `=IF($B$3="","",COUNTIFS(Maintenance!A:A,$B$3,Maintenance!H:H,"<>PAID",Maintenance!H:H,"<>WAIVED"))`,
    A20: 'Who to remind',
    B20: `=IF($B$3="","",IFERROR(TEXTJOIN(", ",TRUE,FILTER(Maintenance!B2:B,(Maintenance!A2:A=$B$3)*(Maintenance!H2:H<>"PAID")*(Maintenance!H2:H<>"WAIVED"))),"Everyone has paid for this month."))`,
  };

  FLATS.forEach((_, i) => {
    const r = 9 + i;
    cells[`B${r}`] = `=IF($B$3="","",IFERROR(VLOOKUP(A${r},Flats!A:B,2,FALSE),""))`;
    cells[`C${r}`] = `=IF($B$3="","",IFERROR(SUMIFS(Maintenance!C:C,Maintenance!A:A,$B$3,Maintenance!B:B,A${r}),""))`;
    cells[`D${r}`] = `=IF($B$3="","",IFERROR(SUMIFS(Maintenance!D:D,Maintenance!A:A,$B$3,Maintenance!B:B,A${r}),""))`;
    cells[`E${r}`] = `=IF(OR($B$3="",C${r}=""),"",MAX(0,N(C${r})-N(D${r})))`;
    cells[`F${r}`] = `=IF($B$3="","",IFERROR(INDEX(FILTER(Maintenance!H:H,(Maintenance!A:A=$B$3)*(Maintenance!B:B=A${r})),1),""))`;
    cells[`G${r}`] = `=IF($B$3="","",IFERROR(INDEX(FILTER(Maintenance!J:J,(Maintenance!A:A=$B$3)*(Maintenance!B:B=A${r})),1),""))`;
  });

  return cells;
}

export function pendingDuesSheetTitle() {
  return SHEET_NAMES.PENDING_DUES;
}
