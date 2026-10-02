/**
 * SVG charts for the Analysis page.
 * Geometry is computed by the D3 layouts in analysisCharts.js.
 */

import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import {
  cashPathLayout,
  donutLayout,
  flatCollectionLayout,
  horizontalBarLayout,
} from '../../utils/analysisCharts';

function useElementWidth(fallback) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const apply = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

function axisRupee(value) {
  return formatCurrency(value);
}

export function CashPathChart({ rows }) {
  const [ref, width] = useElementWidth(640);
  const layout = cashPathLayout(rows, width, 260);

  return (
    <div className="analysis-chart" ref={ref}>
      {layout.empty ? (
        <p className="text-muted">No months on the books through this selection.</p>
      ) : (
        <svg
          className="analysis-svg"
          role="img"
          aria-label="Collected, spent, and available cash for each month through the selection"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height}
        >
          <g transform={`translate(${layout.margin.left},${layout.margin.top})`}>
            {layout.ticks.map((tick) => (
              <g key={tick.value} transform={`translate(0,${tick.y})`}>
                <line className="analysis-grid" x1={0} x2={layout.width - layout.margin.left - layout.margin.right} />
                <text className="analysis-tick" x={-8} dy="0.32em" textAnchor="end">{axisRupee(tick.value)}</text>
              </g>
            ))}
            <line
              className="analysis-zero"
              x1={0}
              x2={layout.width - layout.margin.left - layout.margin.right}
              y1={layout.zeroY}
              y2={layout.zeroY}
            />
            {layout.bars.map((bar) => (
              <rect
                key={`${bar.kind}-${bar.month}`}
                className={bar.kind === 'collected' ? 'analysis-collected' : 'analysis-spent'}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={2}
              >
                <title>{`${bar.month} ${bar.kind === 'collected' ? 'collected' : 'spent'} ${formatCurrency(bar.amount)}`}</title>
              </rect>
            ))}
            <path className="analysis-running" d={layout.running} />
            {layout.labels.map((label) => (
              <text
                key={label.month}
                className="analysis-tick"
                x={label.x}
                y={layout.height - layout.margin.top - layout.margin.bottom + 18}
                textAnchor="middle"
              >
                {label.month}
              </text>
            ))}
          </g>
        </svg>
      )}
      <ul className="analysis-legend">
        <li><span className="analysis-swatch analysis-collected" /> Collected</li>
        <li><span className="analysis-swatch analysis-spent" /> Spent</li>
        <li><span className="analysis-swatch analysis-running-swatch" /> Available after the month</li>
      </ul>
    </div>
  );
}

export function StatusDonut({ slices }) {
  const layout = donutLayout(slices, 220);
  return (
    <div className="analysis-donut-wrap">
      {layout.empty ? (
        <p className="text-muted">No maintenance rows for this month.</p>
      ) : (
        <svg className="analysis-svg" role="img" aria-label="Maintenance status counts for the selected month" width={layout.size} height={layout.size} viewBox={`0 0 ${layout.size} ${layout.size}`}>
          <g transform={`translate(${layout.cx},${layout.cy})`}>
            {layout.arcs.map((part) => (
              <path key={part.key} className={`analysis-slice analysis-slice-${part.key.toLowerCase()}`} d={part.path}>
                <title>{`${part.label}: ${part.value}`}</title>
              </path>
            ))}
            <text className="analysis-donut-total" textAnchor="middle" dy="-0.1em">{layout.total}</text>
            <text className="analysis-tick" textAnchor="middle" dy="1.2em">flats</text>
          </g>
        </svg>
      )}
      <ul className="analysis-legend">
        {layout.arcs.map((part) => (
          <li key={part.key}>
            <span className={`analysis-swatch analysis-slice-${part.key.toLowerCase()}`} />
            {part.label} · {part.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AmountBars({ rows, label }) {
  const [ref, width] = useElementWidth(420);
  const layout = horizontalBarLayout(rows, width, 34);
  return (
    <div className="analysis-chart" ref={ref}>
      {layout.empty ? (
        <p className="text-muted">No {label} for this month.</p>
      ) : (
        <svg
          className="analysis-svg"
          role="img"
          aria-label={label}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height}
        >
          {layout.bars.map((bar) => (
            <g key={bar.key} transform={`translate(0,${bar.y})`}>
              <text className="analysis-tick" x={0} y={layout.rowHeight / 2} dy="0.32em">
                {bar.label.length > 18 ? `${bar.label.slice(0, 16)}…` : bar.label}
                <title>{bar.label}</title>
              </text>
              <rect className="analysis-collected" x={bar.x} y={8} width={bar.width} height={layout.rowHeight - 16} rx={3} />
              <text className="analysis-tick" x={bar.amountX} y={layout.rowHeight / 2} dy="0.32em">{formatCurrency(bar.amount)}</text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function FlatBars({ rows }) {
  const [ref, width] = useElementWidth(640);
  const layout = flatCollectionLayout(rows, width, 34);
  return (
    <div className="analysis-chart" ref={ref}>
      {layout.empty ? (
        <p className="text-muted">No maintenance rows for this month.</p>
      ) : (
        <svg
          className="analysis-svg"
          role="img"
          aria-label="Amount due and amount paid for each flat this month"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          height={layout.height}
        >
          {layout.bars.map((bar) => (
            <g key={bar.flat} transform={`translate(0,${bar.y})`}>
              <text className="analysis-tick" x={0} y={layout.rowHeight / 2} dy="0.32em">{bar.flat}</text>
              <rect className="analysis-due" x={bar.barX} y={10} width={bar.dueWidth} height={6} rx={2} />
              <rect className="analysis-collected" x={bar.barX} y={18} width={bar.paidWidth} height={8} rx={2}>
                <title>{`${bar.flat} paid ${formatCurrency(bar.paid)} of ${formatCurrency(bar.due)}`}</title>
              </rect>
            </g>
          ))}
        </svg>
      )}
      <ul className="analysis-legend">
        <li><span className="analysis-swatch analysis-due" /> Due</li>
        <li><span className="analysis-swatch analysis-collected" /> Paid</li>
      </ul>
    </div>
  );
}
