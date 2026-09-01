"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AdminChartProps {
    data: any[];
    dataKey: string;     // The property to plot on Y-axis
    xAxisKey: string;    // The property to plot on X-axis (e.g. date)
    color?: string;      // Color for the chart fill
    height?: number;     // Chart height
}

export default function AdminChart({
    data,
    dataKey,
    xAxisKey,
    color = "#2563eb",
    height = 300
}: AdminChartProps) {
    if (!data || data.length === 0) {
        return (
            <div
                className="w-full flex items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200"
                style={{ height }}
            >
                <p className="text-sm font-bold text-gray-400">ยังไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ</p>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height }}>
            <ResponsiveContainer>
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey={xAxisKey}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 700 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 700 }}
                        width={60}
                    />
                    <Tooltip
                        contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            fontWeight: 'bold',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: '#1f2937' }}
                    />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#color-${dataKey})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
