import { useCallback, useEffect, useState } from 'react';
import { FIRST_APP_MONTH_LABEL } from '../config/constants';
import { getWorkingMonthLabels } from '../services/googleSheets';
import { getCurrentMonthLabel } from '../utils/helpers';
import { pickDefaultWorkingMonth } from '../utils/months';

export function useWorkingMonths() {
  const [months, setMonths] = useState([FIRST_APP_MONTH_LABEL]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setMonths(await getWorkingMonthLabels());
    } catch {
      setMonths([FIRST_APP_MONTH_LABEL]);
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
