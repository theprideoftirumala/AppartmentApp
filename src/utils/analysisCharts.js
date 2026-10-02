/**
 * D3 layouts for the Analysis page.
 * Scales and shapes come from d3. React only draws the returned geometry.
 */

import { max } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { arc, line, pie } from 'd3-shape';

const CASH_MARGIN = { top: 16, right: 16, bottom: 32, left: 72 };

export function cashPathLayout(rows, width = 640, height = 260) {
  const list = Array.isArray(rows) ? rows : [];
  const viewWidth = Math.max(280, width);
  const viewHeight = Math.max(200, height);
  const innerW = viewWidth - CASH_MARGIN.left - CASH_MARGIN.right;
  const innerH = viewHeight - CASH_MARGIN.top - CASH_MARGIN.bottom;
  if (!list.length) {
    return {
      width: viewWidth,
      height: viewHeight,
      margin: CASH_MARGIN,
      bars: [],
      running: '',
      ticks: [],
      labels: [],
      zeroY: CASH_MARGIN.top + innerH,
      empty: true,
    };
  }

  const x = scaleBand().domain(list.map((row) => row.month)).range([0, innerW]).padding(0.32);
  const values = list.flatMap((row) => [row.collection, row.expenses, row.running]);
  const yMax = max(values);
  const yMin = Math.min(0, ...values);
  const y = scaleLinear().domain([yMin, yMax || 1]).nice().range([innerH, 0]);
  const running = line()
    .x((row) => (x(row.month) ?? 0) + x.bandwidth() / 2)
    .y((row) => y(row.running))(list) || '';
  const band = x.bandwidth();
  const origin = y(0);
  const bars = list.flatMap((row) => {
    const left = x(row.month) ?? 0;
    const half = band / 2;
    return [
      barRect('collected', row.month, left, half, origin, y(row.collection), row.collection),
      barRect('spent', row.month, left + half, half, origin, y(row.expenses), row.expenses),
    ];
  });

  return {
    width: viewWidth,
    height: viewHeight,
    margin: CASH_MARGIN,
    bars,
    running,
    ticks: y.ticks(4).map((value) => ({ value, y: y(value) })),
    labels: list.map((row) => ({
      month: row.month,
      x: (x(row.month) ?? 0) + band / 2,
      running: row.running,
    })),
    zeroY: origin,
    empty: false,
  };
}

function barRect(kind, month, x, width, origin, yValue, amount) {
  return {
    kind,
    month,
    x,
    y: Math.min(origin, yValue),
    width: Math.max(0, width - 3),
    height: Math.abs(origin - yValue),
    amount,
  };
}

export function donutLayout(slices, size = 220) {
  const list = (Array.isArray(slices) ? slices : []).filter((slice) => Number(slice.value) > 0);
  const side = Math.max(140, size);
  const radius = side / 2 - 8;
  const pieGen = pie().value((slice) => Number(slice.value) || 0).sort(null);
  const arcGen = arc().innerRadius(radius * 0.62).outerRadius(radius);
  const arcs = pieGen(list).map((part) => ({
    key: part.data.key,
    label: part.data.label,
    value: Number(part.data.value) || 0,
    path: arcGen(part) || '',
    startAngle: part.startAngle,
    endAngle: part.endAngle,
  }));
  return {
    size: side,
    cx: side / 2,
    cy: side / 2,
    arcs,
    empty: arcs.length === 0,
    total: arcs.reduce((sum, part) => sum + part.value, 0),
  };
}

export function horizontalBarLayout(rows, width = 420, rowHeight = 32) {
  const list = Array.isArray(rows) ? rows : [];
  const viewWidth = Math.max(240, width);
  const labelW = 132;
  const amountW = 76;
  const inner = Math.max(1, viewWidth - labelW - amountW);
  const peak = max(list, (row) => Number(row.amount) || 0) || 1;
  const x = scaleLinear().domain([0, peak]).range([0, inner]);
  const bars = list.map((row, index) => ({
    key: row.key || row.label,
    label: row.label,
    amount: Number(row.amount) || 0,
    y: index * rowHeight,
    x: labelW,
    width: x(Number(row.amount) || 0),
    amountX: labelW + inner + 4,
  }));
  return {
    width: viewWidth,
    height: Math.max(rowHeight, list.length * rowHeight),
    rowHeight,
    bars,
    empty: bars.length === 0,
  };
}

export function flatCollectionLayout(rows, width = 640, rowHeight = 36) {
  const list = (Array.isArray(rows) ? rows : []).filter((row) => row.flat);
  const viewWidth = Math.max(280, width);
  const labelW = 40;
  const inner = Math.max(1, viewWidth - labelW - 8);
  const peak = max(list, (row) => Math.max(Number(row.due) || 0, Number(row.paid) || 0)) || 1;
  const x = scaleLinear().domain([0, peak]).range([0, inner]);
  const bars = list.map((row, index) => ({
    flat: String(row.flat),
    due: Number(row.due) || 0,
    paid: Number(row.paid) || 0,
    stillDue: Number(row.stillDue) || 0,
    status: row.status,
    y: index * rowHeight,
    barX: labelW,
    dueWidth: x(Number(row.due) || 0),
    paidWidth: x(Number(row.paid) || 0),
  }));
  return {
    width: viewWidth,
    height: Math.max(rowHeight, list.length * rowHeight),
    rowHeight,
    bars,
    empty: bars.length === 0,
  };
}
