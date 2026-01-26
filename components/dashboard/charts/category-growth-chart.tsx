"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Yağlar", growth: 12.5, color: "#22c55e" }, // Green
  { name: "Süt Ürünleri", growth: 8.2, color: "#e5e7eb" }, // Gray
  { name: "İçecekler", growth: 5.4, color: "#e5e7eb" }, // Gray
  { name: "Atıştırmalık", growth: 3.1, color: "#e5e7eb" }, // Gray
  { name: "Temizlik", growth: -1.2, color: "#ef4444" }, // Red
];

export function CategoryGrowthChart() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Kategori Büyüme</CardTitle>
        <CardDescription>
          Geçen haftaya göre değişim (%)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart layout="vertical" data={data} margin={{ top: 0, right: 30, bottom: 0, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" hide />
            <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fontSize: 12, fill: "#6b7280" }} 
                axisLine={false} 
                tickLine={false} 
            />
            <Tooltip 
                cursor={{ fill: "transparent" }}
                contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}%`, "Büyüme"]}
            />
            <Bar dataKey="growth" radius={[0, 4, 4, 0]} barSize={30}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
