'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function KpiChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a8c4d9" opacity={0.3} />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7a99b5', fontSize: 12 }} dy={10} />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#7a99b5', fontSize: 12 }} 
          tickFormatter={(value) => `$${value / 1000000}M`}
          dx={-10}
        />
        <Tooltip 
          cursor={{ fill: '#f7fbff' }}
          contentStyle={{ borderRadius: '8px', border: '1px solid #a8c4d9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
        />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
        <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
