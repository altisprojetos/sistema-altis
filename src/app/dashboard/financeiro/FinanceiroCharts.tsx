"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const COLORS = ["#0A2238", "#F2480A", "#2E7D32", "#1565C0", "#6A1B9A", "#E65100"];

type MonthlyPoint = { label: string; previsao: number; real: number; custos: number };
type ServicePoint = { group: string; count: number; total: number };

function currencyTick(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {BRL.format(p.value)}
        </p>
      ))}
    </div>
  );
}

export function MonthlyBarChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} width={60} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="real" name="Faturamento Real" fill="#0A2238" radius={[3, 3, 0, 0]} />
        <Bar dataKey="previsao" name="Previsão" fill="#F2480A" radius={[3, 3, 0, 0]} />
        <Bar dataKey="custos" name="Custos" fill="#e0e0e0" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ServiceTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { group, total, count } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded shadow px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{group}</p>
      <p>{BRL.format(total)} — {count} processo{count !== 1 ? "s" : ""}</p>
    </div>
  );
}

export function ServicePieChart({ data }: { data: ServicePoint[] }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
      Nenhum dado disponível
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="group"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${(name ?? "").substring(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ServiceTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
