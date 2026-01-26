"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Pzt", revenue: 4200, target: 4000 },
  { name: "Sal", revenue: 3800, target: 4000 },
  { name: "Çar", revenue: 4500, target: 4200 },
  { name: "Per", revenue: 4800, target: 4200 },
  { name: "Cum", revenue: 5100, target: 4800 },
  { name: "Cmt", revenue: 5800, target: 5500 },
  { name: "Paz", revenue: 5600, target: 5500 },
];

export function RevenueTargetChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Ciro ve Hedef Karşılaştırması (Haftalık)</CardTitle>
        <CardDescription>
          Günlük gerçekleşen ciro ile hedeflenen cironun karşılaştırması.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₺${value}`}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                formatter={(value: number) => [`₺${value}`, ""]}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="revenue" name="Gerçekleşen Ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
            <Line type="monotone" dataKey="target" name="Hedef Ciro" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
