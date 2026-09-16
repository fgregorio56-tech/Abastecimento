"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME, CHART_COLORS } from "@/lib/chartColors";
import { formatMonthShort } from "@/lib/format";

interface Props {
  data: { mes: string; media: number | null }[];
}

export function TrendChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, label: formatMonthShort(d.mes) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_CHROME.gridline} strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_CHROME.mutedInk, fontSize: 12 }}
          axisLine={{ stroke: CHART_CHROME.baseline }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_CHROME.mutedInk, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km/l`, "Média"]}
          labelStyle={{ color: CHART_CHROME.primaryInk, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline }}
        />
        <Line
          type="monotone"
          dataKey="media"
          stroke={CHART_COLORS.blue}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART_COLORS.blue, stroke: CHART_CHROME.surface, strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
