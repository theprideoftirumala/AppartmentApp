/**
 * Guest PIN may only read a resident-safe snapshot — not phones, emails, or remarks.
 */

export const GUEST_CACHE_VERSION = 1;

function pickConfig(config = {}) {
  return {
    APARTMENT_NAME: config.APARTMENT_NAME,
    MONTHLY_MAINTENANCE: config.MONTHLY_MAINTENANCE,
    OPENING_SURPLUS: config.OPENING_SURPLUS,
    TREASURER_FLAT: config.TREASURER_FLAT,
    PRESIDENT_FLAT: config.PRESIDENT_FLAT,
    CORPUS_FUND: config.CORPUS_FUND,
  };
}

export function toGuestDashboardSnapshot(data = {}) {
  return {
    schemaVersion: GUEST_CACHE_VERSION,
    guest: true,
    config: pickConfig(data.config),
    totals: {
      totalCollected: data.totals?.totalCollected,
      totalExpenses: data.totals?.totalExpenses,
      currentBalance: data.totals?.currentBalance,
      corpusFund: data.totals?.corpusFund,
      openingSurplus: data.totals?.openingSurplus,
      availableStatus: data.totals?.availableStatus,
      monthNet: data.totals?.monthNet,
      monthStatus: data.totals?.monthStatus,
    },
    ledger: {
      opening: data.ledger?.opening,
      available: data.ledger?.available,
      status: data.ledger?.status,
      months: (data.ledger?.months || []).map((row) => ({
        month: row.month,
        collection: row.collection,
        expenses: row.expenses,
        net: row.net,
        running: row.running,
        status: row.status,
        runningStatus: row.runningStatus,
        collectionPct: row.collectionPct,
      })),
    },
    maintenance: (data.maintenance || []).map((row) => ({
      month: row.month,
      flat: row.flat,
      amountDue: row.amountDue,
      amountPaid: row.amountPaid,
      status: row.status,
      stillDue: row.stillDue,
    })),
    expenses: (data.expenses || []).map((row) => ({
      month: row.month,
      category: row.category,
      amount: row.amount,
    })),
    reminders: (data.reminders || []).map((row) => ({
      id: row.id,
      title: row.title,
      nextDue: row.nextDue,
      status: row.status,
    })),
    flats: (data.flats || []).map((row) => ({ flat: row.flat })),
    contacts: [],
    summaries: [],
    miscFunds: [],
    liveSnapshot: data.liveSnapshot || null,
    corrections: [],
    dataHealth: data.dataHealth
      ? { blocking: data.dataHealth.blocking, summary: data.dataHealth.summary, issues: [] }
      : null,
  };
}

export function isGuestDashboardSnapshot(data) {
  return Boolean(data?.guest || data?.schemaVersion === GUEST_CACHE_VERSION);
}
