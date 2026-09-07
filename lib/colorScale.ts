// lib/colorScale.ts

export type ItemKind = "lower" | "target" | "neutral";

// 항목 이름으로 "낮을수록 좋음(Leakage)" / "중간값에 가까울수록 좋음(Capacitance)" 판단
export function classifyItem(name: string): ItemKind {
  const n = name.toLowerCase();
  if (n.includes("leakage")) return "lower";
  if (n.includes("capacitance")) return "target";
  return "neutral";
}

// t: 0(나쁨,빨강) ~ 1(좋음,초록)
export function goodnessColor(t: number): string {
  const stops: [number, number, number][] = [
    [248, 113, 113], // red
    [250, 204, 21], // yellow
    [52, 211, 153], // green
  ];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const [r1, g1, b1] = stops[idx];
  const [r2, g2, b2] = stops[idx + 1];
  const r = Math.round(r1 + (r2 - r1) * frac);
  const g = Math.round(g1 + (g2 - g1) * frac);
  const b = Math.round(b1 + (b2 - b1) * frac);
  return `rgb(${r},${g},${b})`;
}

// value가 얼마나 "좋은지" 0~1로 계산. lower/upper 스펙이 없으면 데이터 범위로 대체.
export function computeGoodness(
  value: number,
  spec: { lower: number | null; upper: number | null },
  kind: ItemKind,
  dataMin: number,
  dataMax: number
): number {
  const lo =
    spec.lower !== null && !isNaN(spec.lower) ? spec.lower : dataMin;
  const hi =
    spec.upper !== null && !isNaN(spec.upper) ? spec.upper : dataMax;

  if (kind === "lower") {
    if (hi === lo) return 0.5;
    const t = 1 - (value - lo) / (hi - lo);
    return Math.max(0, Math.min(1, t));
  }
  if (kind === "target") {
    const target = (lo + hi) / 2;
    const maxDev = (hi - lo) / 2 || 1;
    const dev = Math.abs(value - target);
    const t = 1 - dev / maxDev;
    return Math.max(0, Math.min(1, t));
  }
  // neutral: 방향성 없이 그냥 데이터 내 상대 위치
  if (dataMax === dataMin) return 0.5;
  return Math.max(0, Math.min(1, (value - dataMin) / (dataMax - dataMin)));
}
