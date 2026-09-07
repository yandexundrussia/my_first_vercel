"use client";

import { useEffect, useRef, useState } from "react";
import { classifyItem, goodnessColor, computeGoodness } from "@/lib/colorScale";

type TestItem = {
  name: string;
  lower: number | null;
  upper: number | null;
  unit: string;
};

const BIN_COLORS: Record<number, string> = {
  1: "#34D399",
  3: "#F87171",
  4: "#FB923C",
};
function colorForBin(bin: number) {
  return BIN_COLORS[bin] || "#6B7280";
}

export default function WaferMap({
  xs,
  ys,
  bins,
  vals,
  items,
}: {
  xs: number[];
  ys: number[];
  bins: number[];
  vals: number[][];
  items: TestItem[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metric, setMetric] = useState<number>(-1); // -1 = bin 맵

  const selectedItem = metric >= 0 ? items[metric] : null;
  const kind = selectedItem ? classifyItem(selectedItem.name) : "neutral";

  let dataMin = Infinity;
  let dataMax = -Infinity;
  if (metric >= 0 && vals[metric]) {
    for (const v of vals[metric]) {
      if (v === undefined || isNaN(v)) continue;
      if (v < dataMin) dataMin = v;
      if (v > dataMax) dataMax = v;
    }
    if (!isFinite(dataMin) || !isFinite(dataMax)) {
      dataMin = 0;
      dataMax = 1;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || xs.length === 0) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < minX) minX = xs[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
    const cols = maxX - minX + 1;
    const rows = maxY - minY + 1;
    const side = Math.max(cols, rows);
    const cellSize = Math.max(1, Math.floor(640 / side));

    canvas.width = side * cellSize;
    canvas.height = side * cellSize;
    const offsetX = Math.floor((side - cols) / 2) * cellSize;
    const offsetY = Math.floor((side - rows) / 2) * cellSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0B0D12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const metricVals = metric >= 0 ? vals[metric] : null;

    for (let i = 0; i < xs.length; i++) {
      let color: string;
      if (metric === -1) {
        color = colorForBin(bins[i]);
      } else {
        const v = metricVals ? metricVals[i] : undefined;
        if (v === undefined || isNaN(v)) {
          color = "#374151";
        } else {
          const t = computeGoodness(
            v,
            { lower: selectedItem?.lower ?? null, upper: selectedItem?.upper ?? null },
            kind,
            dataMin,
            dataMax
          );
          color = goodnessColor(t);
        }
      }
      ctx.fillStyle = color;
      const px = offsetX + (xs[i] - minX) * cellSize;
      const py = offsetY + (maxY - ys[i]) * cellSize;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }, [xs, ys, bins, vals, metric, dataMin, dataMax, kind, selectedItem]);

  return (
    <div className="border border-[#2A2E37] rounded-md p-4 bg-[#12151C] inline-block">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => setMetric(-1)}
          className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
            metric === -1
              ? "bg-[#F59E0B] text-[#0B0D12] border-[#F59E0B]"
              : "border-[#2A2E37] text-[#9CA3AF] hover:border-[#F59E0B]/50"
          }`}
        >
          BIN
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

      <div className="overflow-auto max-w-full">
        <canvas ref={canvasRef} className="block" />
      </div>

      {metric === -1 && (
        <div className="flex gap-5 mt-4 text-xs font-mono text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block bg-[#34D399] rounded-sm" />
            bin1 (pass)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block bg-[#F87171] rounded-sm" />
            bin3
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block bg-[#FB923C] rounded-sm" />
            bin4
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block bg-[#6B7280] rounded-sm" />
            other
          </span>
        </div>
      )}

      {selectedItem && (
        <div className="mt-4 text-xs font-mono text-[#9CA3AF]">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span>unit: {selectedItem.unit || "-"}</span>
            <span>
              LSL:{" "}
              {selectedItem.lower !== null && !isNaN(selectedItem.lower)
                ? selectedItem.lower
                : "-"}
            </span>
            <span>
              USL:{" "}
              {selectedItem.upper !== null && !isNaN(selectedItem.upper)
                ? selectedItem.upper
                : "-"}
            </span>
            <span>
              data range: {dataMin.toFixed(3)} ~ {dataMax.toFixed(3)}
            </span>
            <span className="text-[#6B7280]">
              {kind === "lower" && "(낮을수록 좋음)"}
              {kind === "target" && "(중간값에 가까울수록 좋음)"}
              {kind === "neutral" && "(참고용, 방향성 없음)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>bad</span>
            <div
              className="h-2 w-40 rounded-sm"
              style={{
                background:
                  "linear-gradient(to right, rgb(248,113,113), rgb(250,204,21), rgb(52,211,153))",
              }}
            />
            <span>good</span>
          </div>
        </div>
      )}
    </div>
  );
}
