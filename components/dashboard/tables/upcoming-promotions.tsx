'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';
import { Badge } from '@/components/ui/shared/badge';

import { Promotion } from '@/data/mock-data';

interface UpcomingPromotionsProps {
  promotions: Promotion[];
}

export function UpcomingPromotions({ promotions }: UpcomingPromotionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yaklaşan Promosyonlar (Gelecek 7 Gün)</CardTitle>
        <CardDescription>Onaylanan ve planlanan kampanyalar.</CardDescription>
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
                <TableCell className='font-medium'>{promo.name}</TableCell>
                <TableCell>{promo.type}</TableCell>
                <TableCell>{promo.startDate}</TableCell>
                <TableCell>{promo.discount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      promo.status === 'Onaylandı'
                        ? 'default'
                        : promo.status === 'Taslak'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
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
