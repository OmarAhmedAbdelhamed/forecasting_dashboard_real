"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const risks = [
  {
    sku: "30000332",
    name: "Yudum Ayçiçek Yağı 5L",
    stock: 120,
    forecast: 450,
    days: "2 Gün",
    action: "Acil Sipariş"
  },
  {
    sku: "30045925",
    name: "Lipton Yellow Label 1kg",
    stock: 85,
    forecast: 150,
    days: "4 Gün",
    action: "Transfer"
  },
  {
    sku: "30431002",
    name: "Solo Tuvalet Kağıdı 32li",
    stock: 200,
    forecast: 240,
    days: "6 Gün",
    action: "İzle"
  },
];

export function StockRiskTable() {
  return (
    <Card className="border-red-200 bg-red-50/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Kritik Stok Uyarıları
        </CardTitle>
        <CardDescription>
            7 günden az stoku kalan ürünler.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ürün Adı</TableHead>
              <TableHead>Mevcut Stok</TableHead>
              <TableHead>7 Günlük Tahmin</TableHead>
              <TableHead>Kalan Gün</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {risks.map((item) => (
              <TableRow key={item.sku}>
                <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.sku}</span>
                    </div>
                </TableCell>
                <TableCell className="text-red-600 font-bold">{item.stock}</TableCell>
                <TableCell>{item.forecast}</TableCell>
                <TableCell>
                    <span className="font-bold text-red-600">{item.days}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
