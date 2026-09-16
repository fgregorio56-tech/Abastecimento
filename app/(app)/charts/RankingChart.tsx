"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_CHROME } from "@/lib/chartColors";

interface Props {
  data: { placa: string; media: number }[];
  color: string;
}

export function RankingChart({ data, color }: Props) {
  const height = Math.max(120, data.length * 36 + 24);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={CHART_CHROME.gridline} strokeWidth={1} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="placa"
          tick={{ fill: CHART_CHROME.primaryInk, fontSize: 12, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km/l`, "Média"]}
          contentStyle={{ borderRadius: 8, borderColor: CHART_CHROME.gridline }}
        />
        <Bar dataKey="media" fill={color} radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: "right", fill: CHART_CHROME.secondaryInk, fontSize: 12, formatter: (v: unknown) => Number(v).toFixed(2) }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
