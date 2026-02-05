'use client';

import { AlertCard } from '@/components/dashboard/alert-card';

export function AlertsBar() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <AlertCard
        title="Yüksek Büyüme"
        count={42}
        status="critical"
        infoText="Satışı beklenenden fazla olanlar / Çok fazla satan ürünler"
        onClick={() => { console.log('High Growth Clicked'); }}
      />
      <AlertCard
        title="Düşük Büyüme"
        count={1}
        status="success"
        infoText="Satışı beklenenden az olanlar / Satmayan ürünler"
        onClick={() => { console.log('Low Growth Clicked'); }}
      />
      <AlertCard
        title="Tahmin Uyarısı"
        count={3}
        status="critical"
        infoText="Tahminde hata oranı çok fazla olan ürünler"
        onClick={() => { console.log('Forecast Clicked'); }}
      />
      <AlertCard
        title="Veri Temizliği"
        count={1}
        status="warning"
        infoText="Bir ürünün verilerinde bir hata ya da bir varyant eksik olan"
        onClick={() => { console.log('Data Cleansing Clicked'); }}
      />
    </div>
  );
}
