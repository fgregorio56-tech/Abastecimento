"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME } from "@/lib/chartColors";
import { formatMonthShort } from "@/lib/format";

interface Props {
  data: { mes: string; valor: number }[];
  color: string;
  unidade: string;
}

export function MonthlyBarChart({ data, color, unidade }: Props) {
  const formatted = data.map((d) => ({ ...d, label: formatMonthShort(d.mes) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} ${unidade}`, ""]}
          labelStyle={{ color: CHART_CHROME.primaryInk, fontWeight: 600 }}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline }}
        />
        <Bar dataKey="valor" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
