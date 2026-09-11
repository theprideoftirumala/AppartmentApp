import { formatCurrency } from '../../utils/helpers';

const CATEGORY_COLORS = ['#1f7a4c', '#b84e40', '#3d6b99', '#d4893a', '#6b5b95', '#8a4b12'];

export function CollectionDonut({ pct, paid, total }) {
  const ring = 2 * Math.PI * 42;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * ring;
  return (
    <div className="report-chart-block">
      <h4 className="report-chart-title">Collection</h4>
      <svg className="report-donut" viewBox="0 0 120 120" aria-label={`${pct}% collected`}>
        <circle cx="62" cy="62" r="42" fill="none" stroke="#e4d8c6" strokeWidth="12" />
        <circle cx="60" cy="60" r="42" fill="none" stroke="#efe6d8" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="#1f7a4c"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${ring}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="56" textAnchor="middle" className="report-donut-value">{pct}%</text>
        <text x="60" y="72" textAnchor="middle" className="report-donut-label">Collected</text>
      </svg>
      <p className="report-chart-caption">{paid} of {total} flats paid</p>
    </div>
  );
}

export function CompareBars({ collection, expenses, collectionPct, expensesPct }) {
  return (
    <div className="report-chart-block">
      <h4 className="report-chart-title">This month</h4>
      <div className="report-compare">
        <div className="report-compare-row">
          <span>Collected</span>
          <div className="report-compare-track">
            <div className="report-compare-fill report-compare-collect" style={{ width: `${collectionPct}%` }} />
          </div>
          <strong>{formatCurrency(collection)}</strong>
        </div>
        <div className="report-compare-row">
          <span>Spent</span>
          <div className="report-compare-track">
            <div className="report-compare-fill report-compare-spend" style={{ width: `${expensesPct}%` }} />
          </div>
          <strong>{formatCurrency(expenses)}</strong>
        </div>
      </div>
    </div>
  );
}

export function CategoryBars({ rows }) {
  if (!rows.length) {
    return (
      <div className="report-chart-block">
        <h4 className="report-chart-title">Expense mix</h4>
        <p className="text-muted text-sm">No expenses this month</p>
      </div>
    );
  }
  return (
    <div className="report-chart-block">
      <h4 className="report-chart-title">Expense mix</h4>
      <div className="expense-breakdown">
        {rows.map((row, i) => (
          <div key={row.name} className="expense-bar-item">
            <div className="expense-bar-header">
              <span className="expense-bar-label">{row.name}</span>
              <span className="expense-bar-value">{formatCurrency(row.total)} ({row.pct}%)</span>
            </div>
            <div className="expense-bar-track">
              <div
                className="expense-bar-fill"
                style={{ width: `${row.pct}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function YtdBars({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="report-ytd-chart" role="img" aria-label="Year-to-date collection versus expenses">
      {rows.map((row) => (
        <div key={row.month} className="report-ytd-col">
          <div className="report-ytd-bars">
            <div className="report-ytd-bar report-ytd-collect" style={{ height: `${row.collectionH}%` }} title={`Collected ${formatCurrency(row.collection)}`} />
            <div className="report-ytd-bar report-ytd-spend" style={{ height: `${row.expensesH}%` }} title={`Spent ${formatCurrency(row.expenses)}`} />
          </div>
          <span>{row.month}</span>
        </div>
      ))}
    </div>
  );
}
