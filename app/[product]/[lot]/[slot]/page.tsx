import Link from "next/link";
import { getExportedSlot } from "@/lib/readExport";
import WaferMap from "@/components/WaferMap";

function yieldColor(pct: number) {
  if (pct >= 90) return "#34D399";
  if (pct >= 70) return "#F59E0B";
  return "#F87171";
}

export default async function SlotDetailPage({
  params,
}: {
  params: Promise<{ product: string; lot: string; slot: string }>;
}) {
  const { product: rawProduct, lot: rawLot, slot: rawSlot } = await params;
  const product = decodeURIComponent(rawProduct);
  const lot = decodeURIComponent(rawLot);
  const slot = decodeURIComponent(rawSlot);

  const data = getExportedSlot(product, lot, slot);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#0B0D12] text-[#E5E7EB] flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-[#F87171] mb-4">
            해당 슬랏의 추출된 데이터를 찾을 수 없습니다.
          </p>
          <Link href="/" className="text-sm text-[#F59E0B] underline font-mono">
            ← 목록으로
          </Link>
        </div>
      </main>
    );
  }

  const yc = yieldColor(data.yieldPct);
  const anyOutOfSpec = data.specRows.some((r) => r.outOfSpec > 0);

  return (
    <main className="min-h-screen bg-[#0B0D12] text-[#E5E7EB] font-sans">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="text-xs text-[#6B7280] hover:text-[#F59E0B] font-mono transition-colors"
        >
          ← back
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mt-3 mb-1">
          {product} <span className="text-[#4B5563]">/</span> {lot}{" "}
          <span className="text-[#4B5563]">/</span> #{slot}
        </h1>
        <p className="text-xs text-[#6B7280] font-mono mb-8">
          추출된 결과 (재시험 최종 반영)
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#2A2E37] rounded-md overflow-hidden mb-10">
          <div className="px-5 py-4 border-r border-[#2A2E37]">
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] mb-1">
              total
            </p>
            <p className="text-2xl font-mono">{data.total.toLocaleString()}</p>
          </div>
          <div className="px-5 py-4 border-r border-[#2A2E37]">
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] mb-1">
              pass (bin1)
            </p>
            <p className="text-2xl font-mono text-[#34D399]">
              {data.pass.toLocaleString()}
            </p>
          </div>
          <div className="px-5 py-4 border-r border-[#2A2E37]">
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] mb-1">
              fail
            </p>
            <p className="text-2xl font-mono text-[#F87171]">
              {(data.total - data.pass).toLocaleString()}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide text-[#6B7280] mb-1">
              yield
            </p>
            <p className="text-2xl font-mono" style={{ color: yc }}>
              {data.yieldPct.toFixed(2)}%
            </p>
          </div>
        </div>

        <h2 className="text-sm font-medium text-[#9CA3AF] mb-3 font-mono">
          wafer map
        </h2>
        <div className="mb-10">
          <WaferMap
            xs={data.xs}
            ys={data.ys}
            bins={data.bins}
            vals={data.vals}
            items={data.items}
          />
        </div>

        <h2 className="text-sm font-medium text-[#9CA3AF] mb-3 font-mono">
          bin1 spec check
          {anyOutOfSpec && (
            <span className="ml-2 text-[#F87171]">⚠ 스펙 이탈 발견</span>
          )}
        </h2>
        <div className="border border-[#2A2E37] rounded-md overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-[#2A2E37] text-[#6B7280] text-xs">
                <th className="text-left px-4 py-2 font-normal">item</th>
                <th className="text-left px-4 py-2 font-normal">unit</th>
                <th className="text-right px-4 py-2 font-normal">LSL</th>
                <th className="text-right px-4 py-2 font-normal">USL</th>
                <th className="text-right px-4 py-2 font-normal">bin1 min</th>
                <th className="text-right px-4 py-2 font-normal">bin1 max</th>
                <th className="text-right px-4 py-2 font-normal">스펙 이탈</th>
              </tr>
            </thead>
            <tbody>
              {data.specRows.map((r, idx) => (
                <tr
                  key={r.name + idx}
                  className="border-b border-[#2A2E37] last:border-0"
                >
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{r.unit || "-"}</td>
                  <td className="px-4 py-2 text-right text-[#6B7280]">
                    {r.lower !== null && !isNaN(r.lower) ? r.lower : "-"}
                  </td>
                  <td className="px-4 py-2 text-right text-[#6B7280]">
                    {r.upper !== null && !isNaN(r.upper) ? r.upper : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isNaN(r.min) ? "-" : r.min.toFixed(3)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isNaN(r.max) ? "-" : r.max.toFixed(3)}
                  </td>
                  <td
                    className="px-4 py-2 text-right"
                    style={{ color: r.outOfSpec > 0 ? "#F87171" : "#34D399" }}
                  >
                    {r.outOfSpec > 0 ? `${r.outOfSpec}건` : "없음"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
