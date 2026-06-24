'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function DashboardLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-[var(--dim)]">No hay datos suficientes</div>;

  // Extraer las llaves de los centros de costo dinámicamente de toda la data
  const keysSet = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(k => {
      if (k !== 'name') keysSet.add(k);
    });
  });
  const keys = Array.from(keysSet);

  // Paleta de colores para las líneas (Estilo moderno y suave)
  const colors = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#0ea5e9'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a8c4d9" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#7a99b5', fontSize: 12 }} 
          dy={10} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#7a99b5', fontSize: 12 }} 
          tickFormatter={(value) => `$${value / 1000}K`}
          dx={-10}
        />
        <Tooltip 
          cursor={{ fill: '#f7fbff' }}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
        />
        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
        
        {keys.map((key, idx) => (
          <Line 
            key={key}
            type="monotone" 
            dataKey={key} 
            name={key}
            stroke={colors[idx % colors.length]} 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
