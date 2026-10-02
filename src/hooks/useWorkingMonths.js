import { useCallback, useEffect, useRef, useState } from 'react';
import { FIRST_APP_MONTH_LABEL } from '../config/constants';
import { getWorkingMonthLabels } from '../services/googleSheets';
import { getCurrentMonthLabel } from '../utils/helpers';
import { dropdownMonthOnOptions, pickDefaultWorkingMonth } from '../utils/months';

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

/** Month dropdown that starts on the current month once the sheet list is ready. */
export function useSelectedWorkingMonth() {
  const working = useWorkingMonths();
  const [month, setMonth] = useState(() => getCurrentMonthLabel());
  const settled = useRef(false);

  useEffect(() => {
    if (working.loading) return;
    const currentLabel = getCurrentMonthLabel();
    setMonth((selected) => dropdownMonthOnOptions({
      months: working.months,
      selected,
      settle: settled.current,
      currentLabel,
    }));
    settled.current = true;
  }, [working.loading, working.months]);

  return {
    months: working.months,
    loading: working.loading,
    refresh: working.refresh,
    month,
    setMonth,
  };
}
