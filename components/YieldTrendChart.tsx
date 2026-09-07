"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { label: string; yieldPct: number };

export default function YieldTrendChart({ data }: { data: Point[] }) {
  return (
    <div className="border border-[#2A2E37] rounded-md bg-[#12151C] p-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#12151C",
              border: "1px solid #2A2E37",
              fontFamily: "monospace",
              fontSize: 12,
            }}
            formatter={(v: number | string) => [`${Number(v).toFixed(2)}%`, "yield"]}
          />
          <Line
            type="monotone"
            dataKey="yieldPct"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 3, fill: "#F59E0B" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
