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

import { PromotionItem } from '@/services/types/api';

interface UpcomingPromotionsProps {
  promotions: PromotionItem[];
}

export function UpcomingPromotions({ promotions }: UpcomingPromotionsProps) {
  return (
    <Card>
      <CardHeader className='pb-2 pt-3 px-4'>
        <CardTitle className='text-base md:text-lg'>
          Yaklaşan Promosyonlar (Gelecek 7 Gün)
        </CardTitle>
        <CardDescription className='text-xs'>
          Onaylanan ve planlanan kampanyalar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kampanya Adı</TableHead>
              <TableHead>Süre (Gün)</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>İndirim</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center text-sm text-muted-foreground'
                >
                  Gösterilecek promosyon bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promo) => (
                <TableRow key={`${promo.name}-${promo.startDate}`}>
                  <TableCell className='font-medium'>{promo.name}</TableCell>
                  <TableCell>{promo.durationDays}</TableCell>
                  <TableCell>{promo.startDate}</TableCell>
                  <TableCell>{promo.endDate}</TableCell>
                  <TableCell>{promo.discount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        promo.status === 'Aktif'
                          ? 'default'
                          : promo.status === 'Beklemede'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {promo.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
