export interface GrowthProduct {
  id: string;
  name: string;
  growth: number;
  type: 'high' | 'low';
  category: string;
  forecast: number;
  actualSales: number;
  lastMonthSales: number;
  trend: 'up' | 'down';
  store: string;
}

export interface ForecastErrorProduct {
  id: string;
  name: string;
  error: number;
  accuracy: number;
  forecast: number;
  actual: number;
  mape: number;
  bias: 'under' | 'over';
  action: string;
  store: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'ok';
}

// Growth Products Data - Reference data for alerts
export const GROWTH_PRODUCTS_DATA: GrowthProduct[] = [
  {
    id: 'SKU-001',
    name: 'Yudum Ayçiçek Yağı 5L',
    growth: 18.5,
    type: 'high',
    category: 'Gıda',
    forecast: 2450,
    actualSales: 2890,
    lastMonthSales: 2440,
    trend: 'up',
    store: '1001',
  },
  {
    id: 'SKU-002',
    name: 'Beypazarı Soda 6lı',
    growth: 15.2,
    type: 'high',
    category: 'İçecek',
    forecast: 1890,
    actualSales: 2180,
    lastMonthSales: 1890,
    trend: 'up',
    store: '1002',
  },
  {
    id: 'SKU-003',
    name: 'Nutella 750g',
    growth: 12.8,
    type: 'high',
    category: 'Gıda',
    forecast: 980,
    actualSales: 1105,
    lastMonthSales: 980,
    trend: 'up',
    store: '1001',
  },
  {
    id: 'SKU-004',
    name: 'Erikli Su 5L',
    growth: 10.4,
    type: 'high',
    category: 'İçecek',
    forecast: 3200,
    actualSales: 3533,
    lastMonthSales: 3200,
    trend: 'up',
    store: '1003',
  },
  {
    id: 'SKU-005',
    name: 'Coca Cola 2.5L',
    growth: 8.7,
    type: 'high',
    category: 'İçecek',
    forecast: 2100,
    actualSales: 2283,
    lastMonthSales: 2100,
    trend: 'up',
    store: '1001',
  },
  {
    id: 'SKU-006',
    name: 'Çaykur Rize 1kg',
    growth: -8.2,
    type: 'low',
    category: 'İçecek',
    forecast: 650,
    actualSales: 597,
    lastMonthSales: 650,
    trend: 'down',
    store: '1002',
  },
  {
    id: 'SKU-007',
    name: 'Solo Tuvalet Kağıdı',
    growth: -6.5,
    type: 'low',
    category: 'Temizlik',
    forecast: 820,
    actualSales: 767,
    lastMonthSales: 820,
    trend: 'down',
    store: '1004',
  },
  {
    id: 'SKU-008',
    name: 'Algida Magnum',
    growth: -5.1,
    type: 'low',
    category: 'Gıda',
    forecast: 340,
    actualSales: 323,
    lastMonthSales: 340,
    trend: 'down',
    store: '1005',
  },
  {
    id: 'SKU-009',
    name: 'Selpak Mendil 150li',
    growth: -3.8,
    type: 'low',
    category: 'Temizlik',
    forecast: 560,
    actualSales: 539,
    lastMonthSales: 560,
    trend: 'down',
    store: '1003',
  },
];

// Forecast Error Products Data
export const FORECAST_ERROR_DATA: ForecastErrorProduct[] = [
  {
    id: 'SKU-010',
    name: 'Omo Matik 6kg',
    error: 18.5,
    accuracy: 81.5,
    forecast: 450,
    actual: 534,
    mape: 18.5,
    bias: 'under',
    action: 'Model güncelle',
    store: '1001',
    severity: 'critical',
  },
  {
    id: 'SKU-011',
    name: 'Eti Çikolatalı Gofret',
    error: 15.2,
    accuracy: 84.8,
    forecast: 890,
    actual: 1025,
    mape: 15.2,
    bias: 'under',
    action: 'Parametre ayarla',
    store: '1002',
    severity: 'high',
  },
  {
    id: 'SKU-012',
    name: 'Ülker Çokoprens',
    error: 12.8,
    accuracy: 87.2,
    forecast: 1200,
    actual: 1354,
    mape: 12.8,
    bias: 'under',
    action: 'İnceleme gerekli',
    store: '1001',
    severity: 'high',
  },
  {
    id: 'SKU-013',
    name: 'Torku Banada',
    error: 9.4,
    accuracy: 90.6,
    forecast: 670,
    actual: 733,
    mape: 9.4,
    bias: 'under',
    action: 'İzle',
    store: '1003',
    severity: 'medium',
  },
  {
    id: 'SKU-014',
    name: 'Pepsi 1L',
    error: 8.1,
    accuracy: 91.9,
    forecast: 1450,
    actual: 1333,
    mape: 8.1,
    bias: 'over',
    action: 'İzle',
    store: '1004',
    severity: 'medium',
  },
  {
    id: 'SKU-015',
    name: 'Fanta 1L',
    error: 6.5,
    accuracy: 93.5,
    forecast: 980,
    actual: 916,
    mape: 6.5,
    bias: 'over',
    action: 'Kabul edilir',
    store: '1005',
    severity: 'low',
  },
  {
    id: 'SKU-016',
    name: 'Sprite 1L',
    error: 4.2,
    accuracy: 95.8,
    forecast: 760,
    actual: 792,
    mape: 4.2,
    bias: 'under',
    action: 'İyi',
    store: '1001',
    severity: 'ok',
  },
  {
    id: 'SKU-017',
    name: 'Schweppes 1L',
    error: 2.8,
    accuracy: 97.2,
    forecast: 340,
    actual: 349,
    mape: 2.8,
    bias: 'under',
    action: 'Mükemmel',
    store: '1002',
    severity: 'ok',
  },
];
