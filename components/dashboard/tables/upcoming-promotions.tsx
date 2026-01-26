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
import { Badge } from "@/components/ui/badge";

const promotions = [
  {
    id: "PROMO-1024",
    name: "Yaz İndirimleri - Yudum Yağ",
    type: "Katalog",
    startDate: "28 May",
    discount: "%15",
    status: "Onaylandı"
  },
  {
    id: "PROMO-1025",
    name: "Çaykur Rize - Çoklu Alım",
    type: "VKA0",
    startDate: "30 May",
    discount: "3 Al 2 Öde",
    status: "Taslak"
  },
  {
    id: "PROMO-1026",
    name: "Temizlik Günleri - Solo",
    type: "Mağaza İçi",
    startDate: "02 Haz",
    discount: "%20",
    status: "Onaylandı"
  },
  {
    id: "PROMO-1027",
    name: "Kahvaltılık Fırsatları",
    type: "Katalog",
    startDate: "05 Haz",
    discount: "%10",
    status: "Beklemede"
  }
];

export function UpcomingPromotions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yaklaşan Promosyonlar (Gelecek 7 Gün)</CardTitle>
        <CardDescription>
            Onaylanan ve planlanan kampanyalar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kampanya Adı</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>İndirim</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell className="font-medium">{promo.name}</TableCell>
                <TableCell>{promo.type}</TableCell>
                <TableCell>{promo.startDate}</TableCell>
                 <TableCell>{promo.discount}</TableCell>
                <TableCell>
                  <Badge variant={promo.status === "Onaylandı" ? "default" : (promo.status === "Taslak" ? "secondary" : "outline")}>
                    {promo.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
