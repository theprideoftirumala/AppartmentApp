import { useCallback, useEffect, useState } from 'react';
import { FIRST_LIVE_MONTH_LABEL } from '../config/constants';
import { getWorkingMonthLabels } from '../services/googleSheets';
import { getCurrentMonthLabel } from '../utils/helpers';
import { pickDefaultWorkingMonth } from '../utils/liveSummaryLayout';

export function useWorkingMonths() {
  const [months, setMonths] = useState([FIRST_LIVE_MONTH_LABEL]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMonths(await getWorkingMonthLabels());
    } catch {
      setMonths([FIRST_LIVE_MONTH_LABEL]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    months,
    loading,
    refresh,
    defaultMonth: pickDefaultWorkingMonth(months, getCurrentMonthLabel()),
  };
}
