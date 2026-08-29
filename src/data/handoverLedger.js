/**
 * Figures copied from the society I&E workbook handed over on 29 Aug 2026.
 * Source: The Pride of Tirumala-APP.xlsx (same ledger as the earlier I&E Summary file).
 * Flat owner names are intentionally omitted.
 */

export const HANDOVER_SOURCE = 'The Pride of Tirumala-APP.xlsx';

export const HANDOVER_PROPERTY = {
  name: 'The Pride of Tirumala',
  area: 'Alkapur, Neknampur',
  address: 'PLNo 49&48&47, Road No 20, 500089',
  firstContribution: '2020-11-01',
  flatCount: 10,
};

/** Green Available balance cell on the Summary tab, last updated 29 Aug 2026. */
export const HANDOVER_AVAILABLE_BALANCE = 1712.54;
/** @deprecated Use HANDOVER_AVAILABLE_BALANCE — that sheet cell is the final figure. */
export const HANDOVER_CASH_SURPLUS = HANDOVER_AVAILABLE_BALANCE;

export const HANDOVER_META = {
  date: '2026-08-29',
  lastClosedMonth: "August '26",
  lastClosedCollection: 30000.0,
  lastClosedExpenses: 29422.0,
  lastClosedMonthSurplus: 578.0,
  lastClosedCarryIn: 1134.54,
  lifetimeCollection: 2725200.0,
  lifetimeExpenses: 2723487.46,
  sheetComputedNet: 1712.54,
  detailedExpenseRows: 759,
  lastDetailedDate: '2026-08-28',
  lastDetailedAmount: 1100,
  lastDetailedMemo: 'water tanker',
};

export const LATEST_RECURRING = {
  monthlyMaintenancePerFlat: 3000,
  watchmanSalary: 8500,
  garbage: 1500,
  waterCharges: 1417,
  electricityAug26: 2008,
  generatorAug26: 2000,
};

/** Phones from the Notes tab only. No UPI IDs were present in the workbook. */
export const HANDOVER_CONTACTS = [
  ['Lift / Elevator', 'Lift service', '', '8074839972', '', '', 'From Notes tab'],
  ['Electrical', 'Electrician', '', '9381238096', '', '', 'From Notes tab'],
  ['Plumbing', 'Plumber', '', '8144134773', '', '', 'From Notes tab'],
  ['Garbage', 'Garbage collection', '', '9704744892', '', '', 'From Notes tab'],
];

export const HANDOVER_PAYEES = [
  ['Watchman salary', 'Watchman', 'Watchman', '', '', '8500', "Latest monthly amount on August '26 Summary. Add UPI in this tab."],
  ['Garbage', 'Garbage', 'Garbage vendor', '9704744892', '', '1500', "Latest monthly amount on August '26 Summary."],
  ['Water tanker', 'Water Tanker', 'Water tanker', '', '', '1100', 'Last detailed log line dated 28 Aug 2026.'],
  ['Lift service', 'Lift / Elevator', 'Lift AMC', '8074839972', '', '', 'Phone from Notes tab.'],
  ['Electrician', 'Electrical', 'Electrician', '9381238096', '', '', 'Phone from Notes tab.'],
  ['Plumber', 'Plumbing', 'Plumber', '8144134773', '', '', 'Phone from Notes tab.'],
];

export const HANDOVER_NOTES = [
  ['Wifi', 'Id recorded on Notes tab', 'Tirumala 2021'],
  ['CC TV id', 'Label only on Notes tab', ''],
  ['Generator service', 'Label only on Notes tab', ''],
  ['Tanker booking', 'Label only on Notes tab', ''],
  ['Electricity Dept', 'Label only on Notes tab', ''],
  ['CC Cam', 'Label only on Notes tab', ''],
  ['Borewell activity', 'Contribution A / B / motor / borewell from Borewell Exp tab', 'A 70000, B 360000, motor 59000, borewell 417500, noted result -2500'],
  ['Motor repair (Oct tab)', 'Equal collection recorded on Motor repair oct tab', '1750 per flat, 17500 total'],
];

export const HANDOVER_MONTHS = [
  {
    "label": "Nov'20",
    "carryIn": null,
    "collection": 20000.0,
    "expenses": 7500.0,
    "surplus": 12500.0,
    "byCategory": {
      "Cleaning": 500.0,
      "Watchman salary": 7000.0
    }
  },
  {
    "label": "Dec'20",
    "carryIn": 12500.0,
    "collection": 20000.0,
    "expenses": 12068.0,
    "surplus": 7932.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Electricity": 4368.0,
      "Watchman salary": 7000.0
    }
  },
  {
    "label": "Jan'21",
    "carryIn": 20432.0,
    "collection": 20000.0,
    "expenses": 13626.0,
    "surplus": 6374.0,
    "byCategory": {
      "Generator": 1652.0,
      "Repairs": 890.0,
      "Electricity": 3834.0,
      "Watchman salary": 7000.0,
      "Sundry": 250.0
    }
  },
  {
    "label": "Feb'21",
    "carryIn": 26806.0,
    "collection": 20000.0,
    "expenses": 20055.0,
    "surplus": -55.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 2000.0,
      "Lift Service": 1500.0,
      "Garbage": 500.0,
      "Electricity": 4055.0,
      "Watchman salary": 7000.0,
      "Sundry": 4300.0
    }
  },
  {
    "label": "Mar'21",
    "carryIn": 26751.0,
    "collection": 20000.0,
    "expenses": 20748.0,
    "surplus": -748.0,
    "byCategory": {
      "Cleaning": 385.0,
      "Generator": 2000.0,
      "Service charges": 300.0,
      "Garbage": 700.0,
      "Electricity": 6063.0,
      "Watchman salary": 7000.0,
      "Sundry": 4300.0
    }
  },
  {
    "label": "April'21",
    "carryIn": 26003.0,
    "collection": 20000.0,
    "expenses": 28871.0,
    "surplus": -8871.0,
    "byCategory": {
      "Cleaning": 950.0,
      "Service charges": 200.0,
      "Repairs": 4300.0,
      "Garbage": 700.0,
      "Electricity": 6561.0,
      "Watchman salary": 7000.0,
      "Water": 4200.0,
      "Sundry": 4960.0
    }
  },
  {
    "label": "May'21",
    "carryIn": 17132.0,
    "collection": 20000.0,
    "expenses": 20346.0,
    "surplus": -346.0,
    "byCategory": {
      "Generator": 2000.0,
      "Service charges": 100.0,
      "Repairs": 250.0,
      "Garbage": 700.0,
      "Electricity": 9855.0,
      "Watchman salary": 3500.0,
      "Water": 3600.0,
      "Sundry": 341.0
    }
  },
  {
    "label": "June'21",
    "carryIn": 16786.0,
    "collection": 50000.0,
    "expenses": 19550.0,
    "surplus": 30450.0,
    "byCategory": {
      "Cleaning": 2030.0,
      "Generator": 2100.0,
      "Garbage": 700.0,
      "Electricity": 9400.0,
      "Water": 2400.0,
      "Sundry": 2920.0
    }
  },
  {
    "label": "Jul'21",
    "carryIn": 47236.0,
    "collection": 20000.0,
    "expenses": 25915.0,
    "surplus": -5915.0,
    "byCategory": {
      "Generator": 2100.0,
      "Garbage": 700.0,
      "Electricity": 6815.0,
      "Watchman salary": 9300.0,
      "Water": 2400.0,
      "Sundry": 4600.0
    }
  },
  {
    "label": "Aug'21",
    "carryIn": 41321.0,
    "collection": 20000.0,
    "expenses": 24878.0,
    "surplus": -4878.0,
    "byCategory": {
      "Cleaning": 160.0,
      "Electricity": 7298.0,
      "Watchman salary": 11700.0,
      "Water": 1200.0,
      "Sundry": 4520.0
    }
  },
  {
    "label": "Sept'21",
    "carryIn": 36443.0,
    "collection": 20000.0,
    "expenses": 42234.0,
    "surplus": -22234.0,
    "byCategory": {
      "Cleaning": 500.0,
      "Generator": 2000.0,
      "Service charges": 20000.0,
      "Repairs": 1500.0,
      "Garbage": 700.0,
      "Electricity": 4582.0,
      "Watchman salary": 2833.0,
      "Sundry": 10119.0
    }
  },
  {
    "label": "Oct'21",
    "carryIn": 14209.0,
    "collection": 20000.0,
    "expenses": 31263.0,
    "surplus": -11263.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Lift Service": 1500.0,
      "Service charges": 12300.0,
      "Garbage": 700.0,
      "Electricity": 3263.0,
      "Watchman salary": 6500.0,
      "Sundry": 6300.0
    }
  },
  {
    "label": "Nov'21",
    "carryIn": 2946.0,
    "collection": 20000.0,
    "expenses": 23484.0,
    "surplus": -3484.0,
    "byCategory": {
      "Generator": 2000.0,
      "Service charges": 5500.0,
      "Garbage": 700.0,
      "Electricity": 3634.0,
      "Watchman salary": 7000.0,
      "Sundry": 4650.0
    }
  },
  {
    "label": "Dec'21",
    "carryIn": -538.0,
    "collection": 20000.0,
    "expenses": 15355.0,
    "surplus": 4645.0,
    "byCategory": {
      "Garbage": 700.0,
      "Electricity": 3055.0,
      "Watchman salary": 6000.0,
      "Sundry": 5600.0
    }
  },
  {
    "label": "Jan'22",
    "carryIn": 4107.0,
    "collection": 20000.0,
    "expenses": 16546.0,
    "surplus": 3454.0,
    "byCategory": {
      "Garbage": 700.0,
      "Electricity": 4296.0,
      "Watchman salary": 7000.0,
      "Sundry": 4550.0
    }
  },
  {
    "label": "Feb'22",
    "carryIn": 7561.0,
    "collection": 20000.0,
    "expenses": 24200.0,
    "surplus": -4200.0,
    "byCategory": {
      "Generator": 2000.0,
      "Service charges": 4000.0,
      "Garbage": 700.0,
      "Electricity": 6000.0,
      "Watchman salary": 7000.0,
      "Sundry": 4500.0
    }
  },
  {
    "label": "Mar'22",
    "carryIn": 3361.0,
    "collection": 20000.0,
    "expenses": 31428.0,
    "surplus": -11428.0,
    "byCategory": {
      "Generator": 3000.0,
      "Service charges": 3360.0,
      "Garbage": 700.0,
      "Electricity": 6568.0,
      "Watchman salary": 11000.0,
      "Water": 1800.0,
      "Sundry": 5000.0
    }
  },
  {
    "label": "Apr'22",
    "carryIn": -8067.0,
    "collection": 300000.0,
    "expenses": 256728.0,
    "surplus": 43272.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 2000.0,
      "Service charges": 16000.0,
      "Repairs": 220980.0,
      "Garbage": 700.0,
      "Electricity": 5548.0,
      "Watchman salary": 3000.0,
      "Water": 2500.0,
      "Sundry": 5300.0
    }
  },
  {
    "label": "May'22",
    "carryIn": 35205.0,
    "collection": 20000.0,
    "expenses": 61528.0,
    "surplus": -41528.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 2000.0,
      "Lift Service": 10000.0,
      "Service charges": 23986.0,
      "Garbage": 700.0,
      "Electricity": 7162.0,
      "Watchman salary": 7000.0,
      "Water": 5500.0,
      "Sundry": 4480.0
    }
  },
  {
    "label": "June '22",
    "carryIn": -6323.0,
    "collection": 20000.0,
    "expenses": 24986.0,
    "surplus": -4986.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 2000.0,
      "Repairs": 1500.0,
      "Garbage": 700.0,
      "Electricity": 5986.0,
      "Watchman salary": 7000.0,
      "Water": 2500.0,
      "Sundry": 4600.0
    }
  },
  {
    "label": "July '22",
    "carryIn": -11309.0,
    "collection": 20000.0,
    "expenses": 25780.0,
    "surplus": -5780.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 4000.0,
      "Garbage": 700.0,
      "Electricity": 4244.0,
      "Watchman salary": 7000.0,
      "Water": 3916.0,
      "Sundry": 5220.0
    }
  },
  {
    "label": "Aug '22",
    "carryIn": -17089.0,
    "collection": 20000.0,
    "expenses": 21979.0,
    "surplus": -1979.0,
    "byCategory": {
      "Cleaning": 800.0,
      "Generator": 2000.0,
      "Lift Service": 2800.0,
      "Garbage": 700.0,
      "Electricity": 4179.0,
      "Watchman salary": 7000.0,
      "Sundry": 4500.0
    }
  },
  {
    "label": "Sep'22",
    "carryIn": -19068.0,
    "collection": 75000.0,
    "expenses": 54236.0,
    "surplus": 20764.0,
    "byCategory": {
      "Generator": 2000.0,
      "Repairs": 36191.0,
      "Garbage": 700.0,
      "Electricity": 2715.0,
      "Watchman salary": 8000.0,
      "Sundry": 4630.0
    }
  },
  {
    "label": "Oct'22",
    "carryIn": 1696.0,
    "collection": 25000.0,
    "expenses": 22129.0,
    "surplus": 2871.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 700.0,
      "Electricity": 1943.0,
      "Watchman salary": 8000.0,
      "Water": 5666.0,
      "Sundry": 3820.0
    }
  },
  {
    "label": "Nov'22",
    "carryIn": 4567.0,
    "collection": 25000.0,
    "expenses": 19687.0,
    "surplus": 5313.0,
    "byCategory": {
      "Cleaning": 700.0,
      "Generator": 2000.0,
      "Garbage": 700.0,
      "Electricity": 3017.0,
      "Watchman salary": 8000.0,
      "Water": 1720.0,
      "Sundry": 3550.0
    }
  },
  {
    "label": "Dec'22",
    "carryIn": 9880.0,
    "collection": 25000.0,
    "expenses": 57102.0,
    "surplus": -32102.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 700.0,
      "Electricity": 4759.0,
      "Watchman salary": 8000.0,
      "Water": 1417.0,
      "Sundry": 41226.0
    }
  },
  {
    "label": "Jan'23",
    "carryIn": -22222.0,
    "collection": 125100.0,
    "expenses": 76885.0,
    "surplus": 48215.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 700.0,
      "Electricity": 4297.0,
      "Watchman salary": 16000.0,
      "Water": 1416.0,
      "Sundry": 52472.0
    }
  },
  {
    "label": "Feb'23",
    "carryIn": 25993.0,
    "collection": 25000.0,
    "expenses": 10117.0,
    "surplus": 14883.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 700.0,
      "Electricity": 4780.0,
      "Watchman salary": 500.0,
      "Water": 1417.0,
      "Sundry": 720.0
    }
  },
  {
    "label": "March'23",
    "carryIn": 40876.0,
    "collection": 25000.0,
    "expenses": 20730.0,
    "surplus": 4270.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 700.0,
      "Electricity": 7649.0,
      "Watchman salary": 5500.0,
      "Water": 1417.0,
      "Sundry": 3464.0
    }
  },
  {
    "label": "April'23",
    "carryIn": 45146.0,
    "collection": 25000.0,
    "expenses": 25239.0,
    "surplus": -239.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 900.0,
      "Electricity": 8422.0,
      "Watchman salary": 7000.0,
      "Water": 1417.0,
      "Sundry": 5500.0
    }
  },
  {
    "label": "May'23",
    "carryIn": 44907.0,
    "collection": 25000.0,
    "expenses": 33754.0,
    "surplus": -8754.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 900.0,
      "Electricity": 5957.0,
      "Watchman salary": 7000.0,
      "Water": 1417.0,
      "Sundry": 16480.0
    }
  },
  {
    "label": "June'23",
    "carryIn": 36153.0,
    "collection": 25000.0,
    "expenses": 28808.0,
    "surplus": -3808.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 900.0,
      "Electricity": 5951.0,
      "Watchman salary": 7000.0,
      "Water": 1417.0,
      "Sundry": 11540.0
    }
  },
  {
    "label": "July'23",
    "carryIn": 32345.0,
    "collection": 25000.0,
    "expenses": 21427.0,
    "surplus": 3573.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 900.0,
      "Electricity": 290.0,
      "Watchman salary": 9000.0,
      "Water": 1417.0,
      "Sundry": 7820.0
    }
  },
  {
    "label": "Aug'23",
    "carryIn": 35918.0,
    "collection": 25000.0,
    "expenses": 25821.0,
    "surplus": -821.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 900.0,
      "Electricity": 3963.0,
      "Watchman salary": 6000.0,
      "Water": 1417.0,
      "Sundry": 11541.0
    }
  },
  {
    "label": "Sept'23",
    "carryIn": 35097.0,
    "collection": 25000.0,
    "expenses": 72253.0,
    "surplus": -47253.0,
    "byCategory": {
      "Cleaning": 680.0,
      "Generator": 2100.0,
      "Service charges": 1700.0,
      "Repairs": 20100.0,
      "Garbage": 900.0,
      "Electricity": 26308.0,
      "Internet": 797.0,
      "Watchman salary": 6000.0,
      "Water": 6100.0,
      "Pest Control": 4500.0,
      "Sundry": 3068.0
    }
  },
  {
    "label": "Oct'23",
    "carryIn": -12156.0,
    "collection": 25000.0,
    "expenses": 12230.82,
    "surplus": 12769.18,
    "byCategory": {
      "Service charges": 300.0,
      "Electricity": 3982.0,
      "Internet": 588.82,
      "Watchman salary": 7000.0,
      "Sundry": 360.0
    }
  },
  {
    "label": "Nov'23",
    "carryIn": 613.18,
    "collection": 25000.0,
    "expenses": 23526.82,
    "surplus": 1473.18,
    "byCategory": {
      "Cleaning": 938.0,
      "Generator": 2100.0,
      "Garbage": 1800.0,
      "Electricity": 1190.0,
      "Internet": 588.82,
      "Watchman salary": 7000.0,
      "Water": 4250.0,
      "Sundry": 5660.0
    }
  },
  {
    "label": "Dec'23",
    "carryIn": 2086.36,
    "collection": 25000.0,
    "expenses": 21182.82,
    "surplus": 3817.18,
    "byCategory": {
      "Cleaning": 300.0,
      "Generator": 2100.0,
      "Service charges": 700.0,
      "Garbage": 900.0,
      "Electricity": 3721.0,
      "Internet": 588.82,
      "Watchman salary": 7000.0,
      "Water": 3473.0,
      "Sundry": 2400.0
    }
  },
  {
    "label": "Jan'24",
    "carryIn": 5903.54,
    "collection": 25000.0,
    "expenses": 27968.0,
    "surplus": -2968.0,
    "byCategory": {
      "Cleaning": 358.0,
      "Service charges": 2700.0,
      "Garbage": 900.0,
      "Electricity": 3685.0,
      "Internet": 589.0,
      "Watchman salary": 14000.0,
      "Water": 5616.0,
      "Sundry": 120.0
    }
  },
  {
    "label": "Feb'24",
    "carryIn": 2935.54,
    "collection": 545000.0,
    "expenses": 504480.0,
    "surplus": 40520.0,
    "byCategory": {
      "Cleaning": 400.0,
      "Service charges": 550.0,
      "Garbage": 1100.0,
      "Electricity": 3002.0,
      "Internet": 588.0,
      "Water": 10965.0,
      "Sundry": 487875.0
    }
  },
  {
    "label": "Mar'24",
    "carryIn": 43455.54,
    "collection": 25000.0,
    "expenses": 28509.0,
    "surplus": -3509.0,
    "byCategory": {
      "Service charges": 200.0,
      "Garbage": 1200.0,
      "Electricity": 3506.0,
      "Internet": 588.0,
      "Watchman salary": 7000.0,
      "Water": 11515.0,
      "Pest Control": 4500.0
    }
  },
  {
    "label": "Apr'24",
    "carryIn": 39946.54,
    "collection": 25000.0,
    "expenses": 28059.0,
    "surplus": -3059.0,
    "byCategory": {
      "Cleaning": 389.0,
      "Generator": 1500.0,
      "Service charges": 400.0,
      "Garbage": 1200.0,
      "Electricity": 2564.0,
      "Internet": 589.0,
      "Watchman salary": 7000.0,
      "Water": 9917.0,
      "Pest Control": 4500.0
    }
  },
  {
    "label": "May'24",
    "carryIn": 36887.54,
    "collection": 25000.0,
    "expenses": 28868.0,
    "surplus": -3868.0,
    "byCategory": {
      "Generator": 1500.0,
      "Service charges": 8500.0,
      "Garbage": 1200.0,
      "Electricity": 1704.0,
      "Internet": 589.0,
      "Watchman salary": 7000.0,
      "Water": 2750.0,
      "Pest Control": 5625.0
    }
  },
  {
    "label": "June'24",
    "carryIn": 33019.54,
    "collection": 25000.0,
    "expenses": 28336.0,
    "surplus": -3336.0,
    "byCategory": {
      "Cleaning": 310.0,
      "Lift Service": 10700.0,
      "Service charges": 400.0,
      "Garbage": 1200.0,
      "Electricity": 2436.0,
      "Internet": 588.0,
      "Watchman salary": 7000.0,
      "Water": 5267.0,
      "Pest Control": 0.0,
      "Sundry": 435.0
    }
  },
  {
    "label": "July'24",
    "carryIn": 29683.54,
    "collection": 25000.0,
    "expenses": 30940.0,
    "surplus": -5940.0,
    "byCategory": {
      "Generator": 2000.0,
      "Service charges": 500.0,
      "Repairs": 5000.0,
      "Garbage": 1200.0,
      "Electricity": 2376.0,
      "Internet": 588.0,
      "Watchman salary": 7000.0,
      "Water": 11916.0,
      "Sundry": 360.0
    }
  },
  {
    "label": "Aug'24",
    "carryIn": 23743.54,
    "collection": 25000.0,
    "expenses": 30154.0,
    "surplus": -5154.0,
    "byCategory": {
      "Cleaning": 260.0,
      "Generator": 2000.0,
      "Lift Service": 800.0,
      "Service charges": 300.0,
      "Repairs": 50.0,
      "Garbage": 1200.0,
      "Electricity": 2970.0,
      "Internet": 589.0,
      "Watchman salary": 7000.0,
      "Water": 9567.0,
      "Pest Control": 4500.0,
      "Sundry": 918.0
    }
  },
  {
    "label": "Sep'24",
    "carryIn": 18589.54,
    "collection": 25000.0,
    "expenses": 23287.0,
    "surplus": 1713.0,
    "byCategory": {
      "Cleaning": 799.0,
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 3824.0,
      "Internet": 589.0,
      "Watchman salary": 8000.0,
      "Water": 2516.0,
      "Pest Control": 4500.0,
      "Sundry": 859.0
    }
  },
  {
    "label": "Oct'24",
    "carryIn": 20302.54,
    "collection": 42500.0,
    "expenses": 36604.0,
    "surplus": 5896.0,
    "byCategory": {
      "Generator": 1000.0,
      "Service charges": 420.0,
      "Garbage": 1200.0,
      "Electricity": 3706.0,
      "Internet": 589.0,
      "Watchman salary": 6000.0,
      "Water": 18917.0,
      "Pest Control": 4500.0,
      "Sundry": 272.0
    }
  },
  {
    "label": "Nov'24",
    "carryIn": 26198.54,
    "collection": 25000.0,
    "expenses": 18886.0,
    "surplus": 6114.0,
    "byCategory": {
      "Cleaning": 100.0,
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 4127.0,
      "Internet": 589.0,
      "Watchman salary": 7000.0,
      "Pest Control": 4500.0,
      "Sundry": 370.0
    }
  },
  {
    "label": "Dec'24",
    "carryIn": 32312.54,
    "collection": 25000.0,
    "expenses": 23683.0,
    "surplus": 1317.0,
    "byCategory": {
      "Cleaning": 1370.0,
      "Garbage": 1200.0,
      "Electricity": 3691.0,
      "Internet": 589.0,
      "Watchman salary": 9500.0,
      "Water": 2833.0,
      "Pest Control": 4500.0
    }
  },
  {
    "label": "Jan'25",
    "carryIn": 33629.54,
    "collection": 25000.0,
    "expenses": 22258.0,
    "surplus": 2742.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 1200.0,
      "Electricity": 4393.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 1416.0,
      "Pest Control": 4500.0,
      "Sundry": 660.0
    }
  },
  {
    "label": "feb'25",
    "carryIn": 36371.54,
    "collection": 25000.0,
    "expenses": 45523.0,
    "surplus": -20523.0,
    "byCategory": {
      "Generator": 17000.0,
      "Lift Service": 4650.0,
      "Repairs": 3500.0,
      "Garbage": 1200.0,
      "Electricity": 3767.0,
      "Internet": 589.0,
      "Watchman salary": 5500.0,
      "Water": 4467.0,
      "Pest Control": 4500.0,
      "Sundry": 350.0
    }
  },
  {
    "label": "mar'25",
    "carryIn": 15848.54,
    "collection": 25000.0,
    "expenses": 40090.0,
    "surplus": -15090.0,
    "byCategory": {
      "Generator": 1000.0,
      "Lift Service": 3600.0,
      "Garbage": 1200.0,
      "Electricity": 3625.0,
      "Internet": 589.0,
      "Watchman salary": 10500.0,
      "Water": 14866.0,
      "Pest Control": 4500.0,
      "Sundry": 210.0
    }
  },
  {
    "label": "apr'25",
    "carryIn": 758.54,
    "collection": 25000.0,
    "expenses": 27484.0,
    "surplus": -2484.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 3528.0,
      "Internet": 589.0,
      "Watchman salary": 4500.0,
      "Water": 11317.0,
      "Pest Control": 4500.0,
      "Sundry": 850.0
    }
  },
  {
    "label": "may'25",
    "carryIn": -1725.46,
    "collection": 25000.0,
    "expenses": 23665.0,
    "surplus": 1335.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 3060.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 10216.0,
      "Sundry": 100.0
    }
  },
  {
    "label": "june'25",
    "carryIn": -390.46,
    "collection": 25000.0,
    "expenses": 31596.0,
    "surplus": -6596.0,
    "byCategory": {
      "Cleaning": 230.0,
      "Generator": 1000.0,
      "Service charges": 2800.0,
      "Garbage": 1200.0,
      "Electricity": 2780.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 15317.0,
      "Sundry": 180.0
    }
  },
  {
    "label": "july'25",
    "carryIn": -6986.46,
    "collection": 25000.0,
    "expenses": 31778.0,
    "surplus": -6778.0,
    "byCategory": {
      "Generator": 1000.0,
      "Service charges": 480.0,
      "Garbage": 1200.0,
      "Electricity": 6253.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 14016.0,
      "Sundry": 740.0
    }
  },
  {
    "label": "aug'25",
    "carryIn": -13764.46,
    "collection": 50000.0,
    "expenses": 23735.0,
    "surplus": 26265.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 9829.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 3617.0
    }
  },
  {
    "label": "sep'25",
    "carryIn": 12500.54,
    "collection": 30000.0,
    "expenses": 29197.0,
    "surplus": 803.0,
    "byCategory": {
      "Generator": 1000.0,
      "Repairs": 240.0,
      "Garbage": 1200.0,
      "Electricity": 8852.0,
      "Internet": 589.0,
      "Watchman salary": 7500.0,
      "Water": 1416.0,
      "Sundry": 8400.0
    }
  },
  {
    "label": "oct'25",
    "carryIn": 13303.54,
    "collection": 32600.0,
    "expenses": 21983.0,
    "surplus": 10617.0,
    "byCategory": {
      "Cleaning": 1200.0,
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 3442.0,
      "Internet": 589.0,
      "Watchman salary": 8500.0,
      "Water": 1417.0,
      "Sundry": 4635.0
    }
  },
  {
    "label": "nov'25",
    "carryIn": 23920.54,
    "collection": 30000.0,
    "expenses": 19788.0,
    "surplus": 10212.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 2309.0,
      "Internet": 3749.0,
      "Watchman salary": 8500.0,
      "Water": 1416.0,
      "Sundry": 1614.0
    }
  },
  {
    "label": "dec'25",
    "carryIn": 34132.54,
    "collection": 30000.0,
    "expenses": 18520.0,
    "surplus": 11480.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 2213.0,
      "Watchman salary": 9500.0,
      "Water": 1417.0,
      "Sundry": 3190.0
    }
  },
  {
    "label": "Jan'26",
    "carryIn": 45612.54,
    "collection": 30000.0,
    "expenses": 47126.0,
    "surplus": -17126.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1200.0,
      "Electricity": 2427.0,
      "Watchman salary": 7500.0,
      "Water": 1417.0,
      "Pest Control": 4500.0,
      "Sundry": 29082.0
    }
  },
  {
    "label": "Feb'26",
    "carryIn": 28486.54,
    "collection": 30000.0,
    "expenses": 32454.0,
    "surplus": -2454.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1500.0,
      "Electricity": 1837.0,
      "Watchman salary": 7500.0,
      "Water": 1417.0,
      "Pest Control": 4500.0,
      "Sundry": 14700.0
    }
  },
  {
    "label": "Mar'26",
    "carryIn": 26032.54,
    "collection": 30000.0,
    "expenses": 59360.0,
    "surplus": -29360.0,
    "byCategory": {
      "Generator": 1000.0,
      "Garbage": 1500.0,
      "Electricity": 1744.0,
      "Watchman salary": 7500.0,
      "Water": 1416.0,
      "Pest Control": 4500.0,
      "Sundry": 41700.0
    }
  },
  {
    "label": "April '26",
    "carryIn": -3327.46,
    "collection": 30000.0,
    "expenses": 33456.0,
    "surplus": -3456.0,
    "byCategory": {
      "Garbage": 1500.0,
      "Electricity": 1561.0,
      "Watchman salary": 8500.0,
      "Water": 1417.0,
      "Pest Control": 4500.0,
      "Sundry": 15978.0
    }
  },
  {
    "label": "May'26",
    "carryIn": -6783.46,
    "collection": 30000.0,
    "expenses": 29003.0,
    "surplus": 997.0,
    "byCategory": {
      "Garbage": 1500.0,
      "Electricity": 986.0,
      "Internet": 3000.0,
      "Watchman salary": 8500.0,
      "Water": 1417.0,
      "Sundry": 13600.0
    }
  },
  {
    "label": "June'26",
    "carryIn": -5786.46,
    "collection": 30000.0,
    "expenses": 26148.0,
    "surplus": 3852.0,
    "byCategory": {
      "Garbage": 1500.0,
      "Electricity": 2191.0,
      "Watchman salary": 8500.0,
      "Water": 1417.0,
      "Sundry": 12540.0
    }
  },
  {
    "label": "July'26",
    "carryIn": -1934.46,
    "collection": 30000.0,
    "expenses": 26931.0,
    "surplus": 3069.0,
    "byCategory": {
      "Garbage": 1500.0,
      "Electricity": 1915.0,
      "Watchman salary": 8500.0,
      "Water": 1416.0,
      "Sundry": 13600.0
    }
  },
  {
    "label": "August '26",
    "carryIn": 1134.54,
    "collection": 30000.0,
    "expenses": 29422.0,
    "surplus": 578.0,
    "byCategory": {
      "Generator": 2000.0,
      "Garbage": 1500.0,
      "Electricity": 2008.0,
      "Watchman salary": 8500.0,
      "Water": 1417.0,
      "Sundry": 13997.0
    }
  }
];

export function handoverLifetimeTotals(rows = HANDOVER_MONTHS) {
  const collection = rows.reduce((sum, row) => sum + Number(row.collection || 0), 0);
  const expenses = rows.reduce((sum, row) => sum + Number(row.expenses || 0), 0);
  return {
    collection,
    expenses,
    net: Math.round((collection - expenses) * 100) / 100,
  };
}

function optionalAmount(value) {
  if (value === '' || value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Turn Handover Summary sheet rows back into the objects the app page uses. */
export function parseHandoverSummaryRows(rows = []) {
  return (rows || [])
    .filter((row) => String(row?.[0] || '').trim())
    .map((row) => ({
      label: String(row[0]).trim(),
      carryIn: optionalAmount(row[1]) ?? null,
      collection: Number(row[2] || 0),
      expenses: Number(row[3] || 0),
      surplus: Number(row[4] || 0),
      byCategory: {
        Cleaning: optionalAmount(row[5]),
        Generator: optionalAmount(row[6]),
        'Lift Service': optionalAmount(row[7]),
        'Service charges': optionalAmount(row[8]),
        Repairs: optionalAmount(row[9]),
        Garbage: optionalAmount(row[10]),
        Electricity: optionalAmount(row[11]),
        Internet: optionalAmount(row[12]),
        'Watchman salary': optionalAmount(row[13]),
        Water: optionalAmount(row[14]),
        'Pest Control': optionalAmount(row[15]),
        Sundry: optionalAmount(row[16]),
      },
    }));
}

export function handoverSummaryRows(months = HANDOVER_MONTHS) {
  return months.map((month) => {
    const category = month.byCategory || {};
    return [
      month.label,
      month.carryIn ?? '',
      month.collection,
      month.expenses,
      month.surplus,
      category.Cleaning ?? '',
      category.Generator ?? '',
      category['Lift Service'] ?? '',
      category['Service charges'] ?? '',
      category.Repairs ?? '',
      category.Garbage ?? '',
      category.Electricity ?? '',
      category.Internet ?? '',
      category['Watchman salary'] ?? '',
      category.Water ?? '',
      category['Pest Control'] ?? '',
      category.Sundry ?? '',
    ];
  });
}
