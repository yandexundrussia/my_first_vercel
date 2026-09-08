"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { classifyItem, goodnessColor, computeGoodness } from "@/lib/colorScale";

type SlotPoint = {
  label: string;
  yieldPct: number;
  itemAverages: number[];
};

type TestItemMeta = {
  name: string;
  unit: string;
  lower: number | null;
  upper: number | null;
};

export default function ProductMetricsChart({
  data,
  items,
}: {
  data: SlotPoint[];
  items: TestItemMeta[];
}) {
  const [metric, setMetric] = useState<number>(-1); // -1 = yield

  const isYield = metric === -1;
  const selectedItem = !isYield ? items[metric] : null;
  const kind = selectedItem ? classifyItem(selectedItem.name) : "neutral";
  const unit = isYield ? "%" : selectedItem?.unit || "";
  const label = isYield ? "Yield" : selectedItem?.name || "";

  const values = data.map((d) => (isYield ? d.yieldPct : d.itemAverages[metric]));
  const validValues = values.filter((v) => v !== undefined && !isNaN(v));
  const dataMin = validValues.length ? Math.min(...validValues) : 0;
  const dataMax = validValues.length ? Math.max(...validValues) : 1;

  const chartData = data.map((d, i) => ({
    label: d.label,
    value: values[i],
  }));

  function dotColor(value: number) {
    if (isYield) return "#F59E0B";
    if (value === undefined || isNaN(value)) return "#6B7280";
    const t = computeGoodness(
      value,
      { lower: selectedItem?.lower ?? null, upper: selectedItem?.upper ?? null },
      kind,
      dataMin,
      dataMax
    );
    return goodnessColor(t);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setMetric(-1)}
          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
            isYield
              ? "bg-[#F59E0B] text-[#0B0D12] border-[#F59E0B]"
              : "border-[#2A2E37] text-[#9CA3AF] hover:border-[#F59E0B]/50"
          }`}
        >
          YIELD
        </button>
        {items.map((it, idx) => (
          <button
            key={it.name + idx}
            onClick={() => setMetric(idx)}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              metric === idx
                ? "bg-[#F59E0B] text-[#0B0D12] border-[#F59E0B]"
                : "border-[#2A2E37] text-[#9CA3AF] hover:border-[#F59E0B]/50"
            }`}
          >
            {it.name}
          </button>
        ))}
      </div>

      {!isYield && (
        <p className="text-xs text-[#6B7280] font-mono mb-2">
          {kind === "lower" && "낮을수록 좋음 (초록=좋음, 빨강=나쁨)"}
          {kind === "target" && "중간값에 가까울수록 좋음 (초록=좋음, 빨강=나쁨)"}
          {kind === "neutral" && "참고용, 방향성 없음"}
        </p>
      )}

      <div className="border border-[#2A2E37] rounded-md bg-[#12151C] p-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid stroke="#2A2E37" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#6B7280"
              fontSize={11}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={11}
              domain={isYield ? [0, 100] : ["auto", "auto"]}
              tickFormatter={(v) => `${v}${isYield ? "%" : ""}`}
            />
            <Tooltip
              contentStyle={{
                background: "#12151C",
                border: "1px solid #2A2E37",
                fontFamily: "monospace",
                fontSize: 12,
              }}
              formatter={((v: unknown) => [
                `${Number(v ?? 0).toFixed(3)}${unit ? " " + unit : ""}`,
                label,
              ]) as any}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4B5563"
              strokeWidth={2}
              connectNulls
              dot={(props: { cx?: number; cy?: number; payload?: { value: number }; index?: number }) => {
                const { cx, cy, payload, index } = props;
                if (cx === undefined || cy === undefined || !payload) return <g key={index} />;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={dotColor(payload.value)}
                    stroke="#0B0D12"
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
