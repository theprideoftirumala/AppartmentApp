/**
 * Google Sheet formulas the treasurer can read without the app.
 *
 * These strings are written with USER_ENTERED. They are not user input —
 * do not run them through sanitizeForSheet() (that strips a leading =).
 */

import { FLATS, SHEET_NAMES } from '../config/constants';

/** Column K on Maintenance: money still owed on that row. */
export function maintenanceStillDueFormula(row) {
  return `=IF(OR(A${row}="",C${row}=""),"",MAX(0,N(C${row})-N(D${row})))`;
}

/**
 * Monthly Summary columns B–I for a sheet row.
 * A is the month label (Sep-26). B–I recalculate from live tabs.
 */
export function monthlySummaryFormulaRow(row) {
  const opening = 'N(IFERROR(VLOOKUP("DEFICIT_LAST_YEAR",Configuration!A:B,2,FALSE),0))';
  const cumulative = row === 2
    ? `N(E${row})+${opening}`
    : `N(E${row})+N(F${row - 1})`;

  return [
    `=IF(A${row}="","",SUMIF(Maintenance!A:A,A${row},Maintenance!D:D))`,
    `=IF(A${row}="","",SUMIF('Misc Funds'!C:C,A${row},'Misc Funds'!E:E))`,
    `=IF(A${row}="","",SUMIF(Expenses!C:C,A${row},Expenses!F:F))`,
    `=IF(A${row}="","",N(B${row})+N(C${row})-N(D${row}))`,
    `=IF(A${row}="","",${cumulative})`,
    `=IF(A${row}="","",IFERROR(TEXT(COUNTIFS(Maintenance!A:A,A${row},Maintenance!H:H,"PAID")/MAX(COUNTIF(Maintenance!A:A,A${row}),1),"0%"),"0%"))`,
    `=IF(A${row}="","",IFERROR(TEXTJOIN(", ",TRUE,FILTER(Maintenance!B2:B&" ("&Maintenance!H2:H&")",(Maintenance!A2:A=A${row})*(Maintenance!H2:H<>"PAID")*(Maintenance!H2:H<>""))),""))`,
    `=IF(A${row}="","",IF(N(E${row})>=0,"SURPLUS","DEFICIT"))`,
  ];
}

/** Instruction + header rows for the Pending Dues lookup tab. */
export function pendingDuesStaticRows(monthLabel) {
  const flats = FLATS.map((flat) => [flat, '', '', '', '', '', '']);
  return [
    ['HOW TO USE', 'Type a month in the YELLOW cell (B3), for example Aug-26. The table below updates by itself.', 'Do not type in the grey table. To record a payment, edit the Maintenance tab (or use the app).'],
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
    ['TIP', 'Still due = Amount due − Amount paid. Change B3 to any month that exists on the Maintenance tab.', 'Net surplus / deficit for a month is on Monthly Summary (green SURPLUS or red DEFICIT).'],
  ];
}

/**
 * Cell formulas for Pending Dues.
 * Flat numbers stay in A9:A18 so a treasurer can see all 10 flats at a glance.
 */
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
