import {
  InventoryItem,
  InventoryKPIs,
  StockTrendPoint,
  StoreInventoryPerformance,
  InventoryAlert,
  CustomProductList,
} from '@/types/inventory';
import { format, subDays, subHours } from 'date-fns';

// Hierarchical data structure: Bölge -> Mağaza -> Reyon -> Ürün

export interface Product {
  value: string;
  label: string;
  forecastDemand?: number;
  currentStock?: number;
}

export interface Category {
  value: string;
  label: string;
  products: Product[];
}

export interface Store {
  value: string;
  label: string;
  categories: Category[];
}

export interface Region {
  value: string;
  label: string;
  stores: Store[];
}

// ============ FLAT ARRAYS FOR DROPDOWNS ============

// Regions - flat list for simple dropdowns
export const REGIONS_FLAT = [
  { value: 'marmara', label: 'Marmara' },
  { value: 'ege', label: 'Ege' },
  { value: 'akdeniz', label: 'Akdeniz' },
  { value: 'ic_anadolu', label: 'İç Anadolu' },
  { value: 'karadeniz', label: 'Karadeniz' },
  { value: 'dogu_anadolu', label: 'Doğu Anadolu' },
  { value: 'guneydogu', label: 'Güneydoğu Anadolu' },
];

// Reyonlar (Departments/Sections)
export const REYONLAR = [
  { value: 'kasap', label: 'Kasap' },
  { value: 'manav', label: 'Manav' },
  { value: 'sut_urunleri', label: 'Süt Ürünleri' },
  { value: 'atistirmalik', label: 'Atıştırmalık' },
  { value: 'icecekler', label: 'İçecekler' },
  { value: 'temizlik', label: 'Temizlik' },
  { value: 'dondurma', label: 'Dondurma' },
  { value: 'unlu_mamuller', label: 'Unlu Mamuller' },
];

// Promotions (Promotional Campaigns)
export const PROMOTIONS = [
  { value: 'INTERNET_INDIRIMI', label: 'İnternet İndirimi' },
  { value: 'ALISVERIS_INDIRIMI_500', label: '500 TL Üzeri Alışveriş İndirimi' },
  { value: 'COKLU_ALIM', label: 'Çoklu Alım Fırsatı' },
  { value: 'OZEL_GUN_INDIRIMI', label: 'Özel Gün İndirimi' },
  { value: 'SADAKAT_KART', label: 'Sadakat Kart İndirimi' },
];

// ============ HIERARCHICAL DATA STRUCTURE ============

export const REGIONS: Region[] = [
  {
    value: 'marmara',
    label: 'Marmara',
    stores: [
      {
        value: 'ist_kadikoy',
        label: 'İstanbul - Kadıköy',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1200,
                currentStock: 450,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2500,
                currentStock: 800,
              },
              {
                value: 'peynir',
                label: 'Peynir',
                forecastDemand: 800,
                currentStock: 200,
              },
              {
                value: 'yumurta',
                label: 'Yumurta',
                forecastDemand: 1500,
                currentStock: 600,
              },
              {
                value: 'tereyag',
                label: 'Tereyağ',
                forecastDemand: 400,
                currentStock: 150,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 3000,
                currentStock: 1200,
              },
              {
                value: 'kola',
                label: 'Kola',
                forecastDemand: 1800,
                currentStock: 700,
              },
              {
                value: 'meyve_suyu',
                label: 'Meyve Suyu',
                forecastDemand: 900,
                currentStock: 350,
              },
              {
                value: 'cay',
                label: 'Çay',
                forecastDemand: 600,
                currentStock: 250,
              },
            ],
          },
          {
            value: 'temizlik',
            label: 'Temizlik',
            products: [
              {
                value: 'deterjan',
                label: 'Deterjan',
                forecastDemand: 500,
                currentStock: 180,
              },
              {
                value: 'yumusatici',
                label: 'Yumuşatıcı',
                forecastDemand: 350,
                currentStock: 120,
              },
              {
                value: 'bulasik_det',
                label: 'Bulaşık Deterjanı',
                forecastDemand: 450,
                currentStock: 200,
              },
            ],
          },
        ],
      },
      {
        value: 'ist_besiktas',
        label: 'İstanbul - Beşiktaş',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1400,
                currentStock: 520,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2800,
                currentStock: 950,
              },
              {
                value: 'peynir',
                label: 'Peynir',
                forecastDemand: 1000,
                currentStock: 280,
              },
            ],
          },
          {
            value: 'kisisel_bakim',
            label: 'Kişisel Bakım',
            products: [
              {
                value: 'sampuan',
                label: 'Şampuan',
                forecastDemand: 600,
                currentStock: 220,
              },
              {
                value: 'dis_macunu',
                label: 'Diş Macunu',
                forecastDemand: 450,
                currentStock: 180,
              },
              {
                value: 'sabun',
                label: 'Sabun',
                forecastDemand: 700,
                currentStock: 300,
              },
            ],
          },
        ],
      },
      {
        value: 'ist_sisli',
        label: 'İstanbul - Şişli',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1600,
                currentStock: 600,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 3200,
                currentStock: 1100,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 3500,
                currentStock: 1400,
              },
              {
                value: 'kola',
                label: 'Kola',
                forecastDemand: 2000,
                currentStock: 800,
              },
            ],
          },
        ],
      },
      {
        value: 'ist_uskudar',
        label: 'İstanbul - Üsküdar',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1100,
                currentStock: 400,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2200,
                currentStock: 750,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'ege',
    label: 'Ege',
    stores: [
      {
        value: 'izmir_konak',
        label: 'İzmir - Konak',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 900,
                currentStock: 350,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 1800,
                currentStock: 600,
              },
              {
                value: 'zeytin',
                label: 'Zeytin',
                forecastDemand: 700,
                currentStock: 250,
              },
              {
                value: 'zeytinyagi',
                label: 'Zeytinyağı',
                forecastDemand: 500,
                currentStock: 180,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 2200,
                currentStock: 900,
              },
              {
                value: 'ayran',
                label: 'Ayran',
                forecastDemand: 800,
                currentStock: 300,
              },
            ],
          },
        ],
      },
      {
        value: 'izmir_karsiyaka',
        label: 'İzmir - Karşıyaka',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 850,
                currentStock: 320,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 1700,
                currentStock: 580,
              },
            ],
          },
          {
            value: 'temizlik',
            label: 'Temizlik',
            products: [
              {
                value: 'deterjan',
                label: 'Deterjan',
                forecastDemand: 400,
                currentStock: 150,
              },
              {
                value: 'cam_sil',
                label: 'Cam Sil',
                forecastDemand: 250,
                currentStock: 90,
              },
            ],
          },
        ],
      },
      {
        value: 'aydin_merkez',
        label: 'Aydın - Merkez',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 600,
                currentStock: 220,
              },
              {
                value: 'incir',
                label: 'İncir',
                forecastDemand: 400,
                currentStock: 150,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'ic_anadolu',
    label: 'İç Anadolu',
    stores: [
      {
        value: 'ankara_cankaya',
        label: 'Ankara - Çankaya',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1300,
                currentStock: 480,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2600,
                currentStock: 900,
              },
              {
                value: 'peynir',
                label: 'Peynir',
                forecastDemand: 700,
                currentStock: 260,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 2800,
                currentStock: 1100,
              },
              {
                value: 'kola',
                label: 'Kola',
                forecastDemand: 1600,
                currentStock: 620,
              },
            ],
          },
          {
            value: 'kisisel_bakim',
            label: 'Kişisel Bakım',
            products: [
              {
                value: 'sampuan',
                label: 'Şampuan',
                forecastDemand: 550,
                currentStock: 200,
              },
              {
                value: 'krem',
                label: 'Krem',
                forecastDemand: 300,
                currentStock: 110,
              },
            ],
          },
        ],
      },
      {
        value: 'ankara_kecioren',
        label: 'Ankara - Keçiören',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1000,
                currentStock: 380,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2000,
                currentStock: 700,
              },
            ],
          },
        ],
      },
      {
        value: 'konya_selcuklu',
        label: 'Konya - Selçuklu',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 750,
                currentStock: 280,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 1500,
                currentStock: 520,
              },
              {
                value: 'un',
                label: 'Un',
                forecastDemand: 600,
                currentStock: 220,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'akdeniz',
    label: 'Akdeniz',
    stores: [
      {
        value: 'antalya_muratpasa',
        label: 'Antalya - Muratpaşa',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 1100,
                currentStock: 420,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 2200,
                currentStock: 780,
              },
              {
                value: 'portakal',
                label: 'Portakal',
                forecastDemand: 900,
                currentStock: 350,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 4000,
                currentStock: 1600,
              },
              {
                value: 'portakal_suyu',
                label: 'Portakal Suyu',
                forecastDemand: 1200,
                currentStock: 450,
              },
            ],
          },
        ],
      },
      {
        value: 'mersin_yenisehir',
        label: 'Mersin - Yenişehir',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 800,
                currentStock: 300,
              },
              {
                value: 'limon',
                label: 'Limon',
                forecastDemand: 600,
                currentStock: 220,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'karadeniz',
    label: 'Karadeniz',
    stores: [
      {
        value: 'trabzon_ortahisar',
        label: 'Trabzon - Ortahisar',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 700,
                currentStock: 260,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 1400,
                currentStock: 500,
              },
              {
                value: 'findik',
                label: 'Fındık',
                forecastDemand: 500,
                currentStock: 180,
              },
              {
                value: 'tereyag',
                label: 'Tereyağ',
                forecastDemand: 350,
                currentStock: 130,
              },
            ],
          },
          {
            value: 'icecek',
            label: 'İçecek',
            products: [
              {
                value: 'cay',
                label: 'Çay',
                forecastDemand: 1200,
                currentStock: 450,
              },
              {
                value: 'su',
                label: 'Su',
                forecastDemand: 1800,
                currentStock: 700,
              },
            ],
          },
        ],
      },
      {
        value: 'samsun_ilkadim',
        label: 'Samsun - İlkadım',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'sut',
                label: 'Süt',
                forecastDemand: 650,
                currentStock: 240,
              },
              {
                value: 'ekmek',
                label: 'Ekmek',
                forecastDemand: 1300,
                currentStock: 460,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'dogu_anadolu',
    label: 'Doğu Anadolu',
    stores: [
      {
        value: 'erzurum_yakutiye',
        label: 'Erzurum - Yakutiye',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'et',
                label: 'Kırmızı Et',
                forecastDemand: 800,
                currentStock: 300,
              },
              {
                value: 'bal',
                label: 'Bal',
                forecastDemand: 500,
                currentStock: 200,
              },
              {
                value: 'kasar',
                label: 'Eski Kaşar',
                forecastDemand: 600,
                currentStock: 250,
              },
            ],
          },
          {
            value: 'elektronik',
            label: 'Elektronik',
            products: [
              {
                value: 'telefon',
                label: 'Akıllı Telefon',
                forecastDemand: 200,
                currentStock: 80,
              },
              {
                value: 'tablet',
                label: 'Tablet',
                forecastDemand: 150,
                currentStock: 60,
              },
            ],
          },
        ],
      },
      {
        value: 'van_ipekyolu',
        label: 'Van - İpekyolu',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'otlu_peynir',
                label: 'Otlu Peynir',
                forecastDemand: 700,
                currentStock: 300,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    value: 'guneydogu',
    label: 'Güneydoğu Anadolu',
    stores: [
      {
        value: 'gaziantep_sahinbey',
        label: 'Gaziantep - Şahinbey',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'fistik',
                label: 'Antep Fıstığı',
                forecastDemand: 1200,
                currentStock: 500,
              },
              {
                value: 'baklava',
                label: 'Baklava',
                forecastDemand: 800,
                currentStock: 300,
              },
            ],
          },
        ],
      },
      {
        value: 'diyarbakir_kayapinar',
        label: 'Diyarbakır - Kayapınar',
        categories: [
          {
            value: 'gida',
            label: 'Gıda',
            products: [
              {
                value: 'karpuz',
                label: 'Karpuz',
                forecastDemand: 1500,
                currentStock: 600,
              },
            ],
          },
          {
            value: 'teknoloji',
            label: 'Teknoloji',
            products: [
              {
                value: 'laptop',
                label: 'Dizüstü Bilgisayar',
                forecastDemand: 100,
                currentStock: 40,
              },
            ],
          },
        ],
      },
    ],
  },
];

// Helper functions to extract flat lists
export function getAllStores(): {
  value: string;
  label: string;
  regionValue: string;
}[] {
  return REGIONS.flatMap((region) =>
    region.stores.map((store) => ({
      value: store.value,
      label: store.label,
      regionValue: region.value,
    })),
  );
}

export function getAllCategories(): {
  value: string;
  label: string;
  storeValue: string;
}[] {
  return REGIONS.flatMap((region) =>
    region.stores.flatMap((store) =>
      store.categories.map((category) => ({
        value: `${store.value}_${category.value}`,
        label: category.label,
        storeValue: store.value,
      })),
    ),
  );
}

export function getAllProducts(): {
  value: string;
  label: string;
  categoryKey: string;
}[] {
  return REGIONS.flatMap((region) =>
    region.stores.flatMap((store) =>
      store.categories.flatMap((category) =>
        category.products.map((product) => ({
          value: `${store.value}_${category.value}_${product.value}`,
          label: product.label,
          categoryKey: `${store.value}_${category.value}`,
        })),
      ),
    ),
  );
}

// Get stores filtered by selected regions
export function getStoresByRegions(
  selectedRegions: string[],
): { value: string; label: string }[] {
  if (selectedRegions.length === 0) {
    return REGIONS.flatMap((r) =>
      r.stores.map((s) => ({ value: s.value, label: s.label })),
    );
  }
  return REGIONS.filter((r) => selectedRegions.includes(r.value)).flatMap((r) =>
    r.stores.map((s) => ({ value: s.value, label: s.label })),
  );
}

// Get categories filtered by selected stores
export function getCategoriesByStores(
  selectedStores: string[],
  selectedRegions: string[] = [],
): { value: string; label: string }[] {
  let regionsToUse = REGIONS;
  if (selectedRegions.length > 0) {
    regionsToUse = REGIONS.filter((r) => selectedRegions.includes(r.value));
  }

  const allStores = regionsToUse.flatMap((r) => r.stores);
  const storesToUse =
    selectedStores.length === 0
      ? allStores
      : allStores.filter((s) => selectedStores.includes(s.value));

  const categoryMap = new Map<string, string>();
  storesToUse.forEach((s) => {
    s.categories.forEach((c) => {
      const key = `${s.value}_${c.value}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, c.label);
      }
    });
  });

  return Array.from(categoryMap.entries()).map(([value, label]) => ({
    value,
    label,
  }));
}

// Get products filtered by selected categories/stores/regions
export function getProductsByContext(
  selectedRegions: string[],
  selectedStores: string[],
  selectedCategories: string[],
): { value: string; label: string }[] {
  let regionsToUse = REGIONS;
  if (selectedRegions.length > 0) {
    regionsToUse = REGIONS.filter((r) => selectedRegions.includes(r.value));
  }

  let storesToUse = regionsToUse.flatMap((r) => r.stores);
  if (selectedStores.length > 0) {
    storesToUse = storesToUse.filter((s) => selectedStores.includes(s.value));
  }

  const allProducts: { value: string; label: string }[] = [];
  storesToUse.forEach((s) => {
    s.categories.forEach((c) => {
      const catKey = `${s.value}_${c.value}`;
      if (
        selectedCategories.length === 0 ||
        selectedCategories.includes(catKey)
      ) {
        c.products.forEach((p) => {
          allProducts.push({
            value: `${catKey}_${p.value}`,
            label: p.label,
          });
        });
      }
    });
  });

  return allProducts;
}

/**
 * Resolves the "Effective Product List" based on hierarchical selection.
 * If specific products are selected, uses those.
 * If not, defaults to all products visible in the current filter context.
 */
export function getEffectiveProductList(
  regions: string[],
  stores: string[],
  categories: string[],
  products: string[] = [],
): string[] {
  if (products.length > 0) {return products;}

  const contextProducts = getProductsByContext(regions, stores, categories);
  return contextProducts.map((p) => p.value);
}

// Simple flat lists for backward compatibility
export const STORES = getAllStores();
export const CATEGORIES = getAllCategories();
export const PRODUCTS = getAllProducts();

// --- Dynamic Data Types ---

export interface DashboardMetrics {
  accuracy: number;
  accuracyChange: number;
  forecastValue: number;
  forecastUnit: number;
  forecastChange: number;
  ytdValue: number;
  ytdChange: number;
  gapToSales: number;
  gapToSalesChange: number;
}

export interface RevenueChartData {
  week: string;
  actual: number;
  plan: number;
}

export interface HistoricalChartData {
  week: string;
  y2024: number;
  y2025: number;
  y2026: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  type: string;
  startDate: string;
  discount: string;
  status: 'Onaylandı' | 'Taslak' | 'Beklemede';
}

export interface StockRisk {
  sku: string;
  name: string;
  stock: number;
  forecast: number;
  days: string;
  action: string;
}

function filterProducts(
  regions: string[],
  stores: string[],
  categories: string[],
): Product[] {
  let filtered = REGIONS;

  if (regions.length > 0) {
    filtered = filtered.filter((r) => regions.includes(r.value));
  }

  let filteredStores = filtered.flatMap((r) => r.stores);
  if (stores.length > 0) {
    filteredStores = filteredStores.filter((s) => stores.includes(s.value));
  }

  const allProducts: Product[] = [];

  filteredStores.forEach((store) => {
    store.categories.forEach((cat) => {
      const catKey = `${store.value}_${cat.value}`;
      if (categories.length === 0 || categories.includes(catKey)) {
        allProducts.push(...cat.products);
      }
    });
  });

  return allProducts;
}

// Deterministic pseudo-random number generator based on a seed string
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function getMetrics(
  regions: string[],
  stores: string[],
  categories: string[],
): DashboardMetrics {
  // Generate metrics based on the selection "hash" to make it consistent but dynamic
  const seed =
    regions.join('') + stores.join('') + categories.join('') + 'metrics';
  const rand = seededRandom(seed);

  // Calculate actual total value to scale the metrics
  const items = generateInventoryItems(regions, stores, categories);
  const totalValue = items.reduce((sum, item) => sum + item.stockValue, 0);

  // Base values derived from actual total
  const baseAccuracy = 92;
  const baseForecastVal = totalValue * 1.1; // Forecast slightly higher than current stock
  const baseForecastUnit = items.reduce(
    (sum, item) => sum + item.forecastedDemand,
    0,
  );

  return {
    accuracy: baseAccuracy + rand * 5, // 92% - 97%
    accuracyChange: rand * 2 - 0.5, // -0.5% to +1.5%
    forecastValue: baseForecastVal,
    forecastUnit: baseForecastUnit,
    forecastChange: rand * 10, // 0% - 10%
    ytdValue: baseForecastVal * 5 * (0.9 + rand * 0.2), // Simplify YTD
    ytdChange: 10 + rand * 5,
    gapToSales: -1 - rand * 2, // -1% to -3%
    gapToSalesChange: -0.5 + rand * 1,
  };
}

export function getRevenueChartData(
  regions: string[],
  stores: string[],
  categories: string[],
): RevenueChartData[] {
  const seed =
    regions.join('') + stores.join('') + categories.join('') + 'revenue';

  // Scale based on actual inventory
  const items = generateInventoryItems(regions, stores, categories);
  const totalValue = items.reduce((sum, item) => sum + item.stockValue, 0);

  // Weekly revenue is roughly total value / coverage days * 7, or just proportional
  // Let's assume weekly revenue is about 20-25% of stock value in fast moving goods, maybe less.
  // actually, if coverage is 30 days, monthly sales = stock. Weekly = stock / 4.
  const baseVal = totalValue / 4.5;

  const weeks = [
    '6 Oca',
    '13 Oca',
    '20 Oca',
    '27 Oca',
    '3 Şub',
    '10 Şub',
    '17 Şub',
    '24 Şub',
    '3 Mar',
    '10 Mar',
    '17 Mar',
    '24 Mar',
  ];

  return weeks.map((week, index) => {
    const weekRand = seededRandom(seed + week);
    // Trend: slightly up
    const trend = 1 + index * 0.02;

    const actual = baseVal * trend * (0.9 + weekRand * 0.2);
    const plan = baseVal * trend * (0.95 + weekRand * 0.1); // Plan is smoother

    return {
      week,
      actual: Math.round(actual),
      plan: Math.round(plan),
    };
  });
}

export function getHistoricalChartData(
  regions: string[],
  stores: string[],
  categories: string[],
): HistoricalChartData[] {
  const seed =
    regions.join('') + stores.join('') + categories.join('') + 'historical';
  // Scale based on actual stock quantity units
  const items = generateInventoryItems(regions, stores, categories);
  const totalUnits = items.reduce((sum, item) => sum + item.stockLevel, 0);

  // Historical data usually units? "baseUnits" implies units.
  // If we have 2026 data, it should align with `totalUnits`.

  const data: HistoricalChartData[] = [];
  for (let i = 1; i <= 52; i++) {
    const weekRand = seededRandom(seed + `wk${i}`);
    const seasonalFactor = 1 + Math.sin((i / 52) * Math.PI * 2) * 0.2; // Seasonal wave

    // Align 2026 wks 1-4 to be close to current totalUnits
    // 2024, 2025 scaled down assuming growth
    const baseUnits = totalUnits * seasonalFactor;

    data.push({
      week: `Wk ${i}`,
      y2024: Math.round(baseUnits * 0.8 * (0.9 + weekRand * 0.2)),
      y2025: Math.round(baseUnits * 0.9 * (0.9 + weekRand * 0.2)),
      y2026: i <= 4 ? Math.round(baseUnits * (0.9 + weekRand * 0.2)) : null, // Only first 4 weeks for 2026
    });
  }
  return data;
}

export function getPromotions(): Promotion[] {
  // Return a static list but maybe filter slightly or just return same for now
  // In a real app, promotions would be linked to products/stores.
  return [
    {
      id: 'PROMO-1024',
      name: 'Yaz İndirimleri - Yudum Yağ',
      type: 'Katalog',
      startDate: '28 May',
      discount: '%15',
      status: 'Onaylandı',
    },
    {
      id: 'PROMO-1025',
      name: 'Çaykur Rize - Çoklu Alım',
      type: 'COKLU_ALIM',
      startDate: '30 May',
      discount: '3 Al 2 Öde',
      status: 'Taslak',
    },
    {
      id: 'PROMO-1026',
      name: 'Temizlik Günleri - Solo',
      type: 'Mağaza İçi',
      startDate: '02 Haz',
      discount: '%20',
      status: 'Onaylandı',
    },
    {
      id: 'PROMO-1027',
      name: 'Kahvaltılık Fırsatları',
      type: 'Katalog',
      startDate: '05 Haz',
      discount: '%10',
      status: 'Beklemede',
    },
  ];
}

export function getStockRisks(
  regions: string[],
  stores: string[],
  categories: string[],
): StockRisk[] {
  // Generate some risks based on the products in the filtered scope
  const products = filterProducts(regions, stores, categories);

  // Take top 5 products and pretend they are at risk
  return products.slice(0, 5).map((p) => ({
    sku: `SKU-${p.value.toUpperCase()}`,
    name: p.label,
    stock: p.currentStock || 0,
    forecast: p.forecastDemand || 0,
    days: `${Math.floor(Math.random() * 5) + 1} Gün`,
    action: Math.random() > 0.5 ? 'Acil Sipariş' : 'Transfer',
  }));
}

// ============ PROMOTION ANALYTICS DATA ============

export interface PromotionHistoryItem {
  date: string;
  name: string;
  type: string;
  uplift: string;
  upliftVal: string;
  profit: string;
  roi: number;
  stock: 'OK' | 'OOS' | 'Over';
  forecast: string;
  // NEW FIELDS
  stockCostIncrease?: string; // Tahmini Stok Maliyeti Artışı
  lostSalesVal?: string; // Kaçırılan Ciro (OOS durumunda)
}

export const PROMOTION_HISTORY_DATA: PromotionHistoryItem[] = [
  {
    date: '10-19 Mayıs 2025',
    name: 'Bahar Temizliği',
    type: 'INTERNET_INDIRIMI',
    uplift: '+42%',
    upliftVal: '₺12.4k',
    profit: '+₺3.2k',
    roi: 142,
    stock: 'OK',
    forecast: '92%',
    stockCostIncrease: '₺1.2k',
    lostSalesVal: '₺0',
  },
  {
    date: '05-12 Nisan 2025',
    name: 'Ramazan Paketi',
    type: 'ALISVERIS_INDIRIMI_500',
    uplift: '+55%',
    upliftVal: '₺18.1k',
    profit: '-₺1.2k',
    roi: -15,
    stock: 'OOS',
    forecast: '65%',
    stockCostIncrease: '₺450',
    lostSalesVal: '₺4.5k', // OOS caused lost sales
  },
  {
    date: '10-14 Şubat 2025',
    name: 'Sevgililer Günü',
    type: 'COKLU_ALIM',
    uplift: '+18%',
    upliftVal: '₺4.5k',
    profit: '-₺0.8k',
    roi: 45,
    stock: 'Over',
    forecast: '88%',
    stockCostIncrease: '₺2.1k', // Excessive stock cost
    lostSalesVal: '₺0',
  },
  {
    date: '15-20 Ocak 2025',
    name: 'Kış İndirimi',
    type: 'OZEL_GUN_INDIRIMI',
    uplift: '+30%',
    upliftVal: '₺9.2k',
    profit: '+₺1.5k',
    roi: 85,
    stock: 'OK',
    forecast: '95%',
    stockCostIncrease: '₺800',
    lostSalesVal: '₺0',
  },
  {
    date: '20-25 Aralık 2024',
    name: 'Yılbaşı Özel',
    type: 'INTERNET_INDIRIMI',
    uplift: '+48%',
    upliftVal: '₺15.2k',
    profit: '+₺4.1k',
    roi: 155,
    stock: 'OK',
    forecast: '94%',
    stockCostIncrease: '₺1.5k',
    lostSalesVal: '₺0',
  },
  {
    date: '24-28 Kasım 2024',
    name: 'Efsane Cuma',
    type: 'SADAKAT_KART',
    uplift: '+60%',
    upliftVal: '₺22.5k',
    profit: '-₺0.5k',
    roi: -5,
    stock: 'OOS',
    forecast: '70%',
    stockCostIncrease: '₺300',
    lostSalesVal: '₺8.2k',
  },
];

// ============ INVENTORY PAGE MOCK DATA ============

// Helper to generate random numbers

const randomFloat = (min: number, max: number) =>
  Number((Math.random() * (max - min) + min).toFixed(2));

// KPI Mock Data - Recalculated based on filters
export function getInventoryKPIs(
  regions: string[],
  stores: string[],
  categories: string[],
  products: string[] = [],
): InventoryKPIs {
  // 1. Generate the actual items for this context
  const items = generateInventoryItems(regions, stores, categories, products);

  // 2. Calculate aggregates
  const totalStockValue = items.reduce((sum, item) => sum + item.stockValue, 0);
  const totalInventoryItems = items.length;

  // Calculate average days of coverage
  const totalDays = items.reduce((sum, item) => sum + item.daysOfCoverage, 0);
  const stockCoverageDays =
    totalInventoryItems > 0 ? Math.round(totalDays / totalInventoryItems) : 0;

  // Filter for specific statuses
  const excessItems = items.filter((i) => i.status === 'Overstock');
  const excessInventoryItems = excessItems.length;
  const excessInventoryValue = excessItems.reduce(
    (sum, i) => sum + i.stockValue,
    0,
  );

  const riskItems = items.filter(
    (i) => i.status === 'Low Stock' || i.status === 'Out of Stock',
  );
  const stockOutRiskItems = riskItems.length;
  const stockOutRiskValue = riskItems.reduce(
    (sum, i) => sum + i.forecastedDemand * i.price,
    0,
  );

  const neverSoldItems = items.filter((i) => i.turnoverRate < 2).length; // Assuming low turnover = never sold candidate
  const neverSoldValue = items
    .filter((i) => i.turnoverRate < 2)
    .reduce((sum, i) => sum + i.stockValue, 0);

  const reorderNeededItems = items.filter(
    (i) => i.stockLevel <= i.reorderPoint,
  ).length;
  const overstockPercentage =
    totalInventoryItems > 0
      ? Math.round((excessInventoryItems / totalInventoryItems) * 100)
      : 0;

  return {
    totalStockValue,
    totalInventoryItems,
    stockCoverageDays,
    excessInventoryItems,
    excessInventoryValue,
    stockOutRiskItems,
    stockOutRiskValue,
    neverSoldItems,
    neverSoldValue,
    overstockPercentage,
    reorderNeededItems,
  };
}

// Inventory List Mock Data - Recalculated based on filters
export function generateInventoryItems(
  regions: string[],
  stores: string[],
  categories: string[],
  products: string[] = [],
): (InventoryItem & { originalValue: string })[] {
  const effectiveProductKeys = getEffectiveProductList(
    regions,
    stores,
    categories,
    products,
  );
  const allProducts = getAllProducts();
  const filteredProductMetadata = allProducts.filter((p) =>
    effectiveProductKeys.includes(p.value),
  );

  return filteredProductMetadata.map((p) => {
    const [, , slug] = p.value.split('_');

    // Use specific seeds for each attribute to ensure stability regardless of index
    const rStock = seededRandom(p.value + '_stock');
    const rMin = seededRandom(p.value + '_min');
    const rDemand = seededRandom(p.value + '_demand');
    const rPrice = seededRandom(p.value + '_price');

    const category = p.categoryKey.split('_').pop() || 'General';
    const isElectronics = ['elektronik', 'teknoloji'].includes(category);

    // Stock: 0 to 2500
    let stock = Math.floor(rStock * 2500);
    if (isElectronics) {
      stock = Math.round(stock * 1.5); // Higher stock count for electronics
    }

    const minStock = 50 + Math.floor(rMin * 100);
    const demand = 100 + Math.floor(rDemand * 900);

    // Price: 50 to 500
    let unitPrice = 50 + Math.floor(rPrice * 450);
    if (isElectronics) {
      // Ensure electronics are at least 20,000 TL, going up to ~45,000 TL
      unitPrice = 20000 + Math.floor(rPrice * 25000);
    }

    let status = 'In Stock';
    if (stock === 0) {status = 'Out of Stock';}
    else if (stock < minStock) {status = 'Low Stock';}
    else if (stock > demand * 1.5) {status = 'Overstock';}

    const rMisc = seededRandom(p.value + '_misc');

    return {
      id: `INV-${p.value}`, // Stable ID based on unique value
      sku: `SKU-${slug.toUpperCase()}-${1000 + Math.floor(rMisc * 1000)}`, // Stable SKU
      productName: p.label,
      category: category,
      productKey: p.value,
      stockLevel: stock,
      minStockLevel: minStock,
      maxStockLevel: minStock * 4,
      reorderPoint: minStock + 20,
      forecastedDemand: demand,
      stockValue: stock * unitPrice,
      daysOfCoverage:
        demand > 0 ? Number((stock / (demand / 30)).toFixed(1)) : 0,
      status,
      turnoverRate: stock > 0 ? Number(((demand * 12) / stock).toFixed(1)) : 0,
      lastRestockDate: format(
        subDays(new Date(), Math.floor(rMisc * 30)),
        'yyyy-MM-dd',
      ),
      leadTimeDays: 3 + Math.floor(rMisc * 10),
      quantityOnOrder: stock < minStock ? minStock * 2 : 0,
      todaysSales: Math.max(
        0,
        Math.round((demand / 30) * (0.5 + seededRandom(p.value))),
      ),
      price: unitPrice,
      originalValue: p.value,
    } as InventoryItem & { originalValue: string };
  });
}

// Trends Mock Data - Recalculated based on filters
export const generateStockTrends = (
  days = 30,
  regions: string[] = [],
  stores: string[] = [],
  categories: string[] = [],
  products: string[] = [],
): StockTrendPoint[] => {
  const effectiveProductKeys = getEffectiveProductList(
    regions,
    stores,
    categories,
    products,
  );
  const seed = effectiveProductKeys.join('') || 'trends';
  const today = new Date();

  // Determine total demand and current stock from the filtered items
  const items = generateInventoryItems(regions, stores, categories, products);
  const currentTotalStock = items.reduce(
    (sum, item) => sum + item.stockLevel,
    0,
  );
  const totalMonthlyDemand = items.reduce(
    (sum, item) => sum + item.forecastedDemand,
    0,
  );

  // 1. Calculate Intelligent Parameters
  // Avoid division by zero, ensure min demand for realism
  let avgDailyDemand = totalMonthlyDemand;
  if (currentTotalStock > 0) {
    // Ensure turnover is at least once every 100 days (avoid dead lines)
    avgDailyDemand = Math.max(avgDailyDemand, currentTotalStock / 100, 5);
  } else {
    avgDailyDemand = Math.max(avgDailyDemand, 5);
  }

  const safetyStockLevel = Math.round(avgDailyDemand * 2); // 2 Days safety
  const reorderPoint = Math.round(avgDailyDemand * 4); // Reorder at 4 days
  const restockAmount = Math.round(avgDailyDemand * 7); // Order 7 days worth
  const maxStockLevel = reorderPoint + restockAmount;

  const points: StockTrendPoint[] = [];
  let currentSimulatedStock = currentTotalStock;

  // 2. Strict Backward Simulation
  // We work backwards from today (i=0) to 30 days ago.
  // Logic: Stock[Yesterday] = Stock[Today] + Demand[Today] - (Did we restock today?)

  for (let i = 0; i < days; i++) {
    const reverseIndex = i;
    const date = subDays(today, reverseIndex);
    const daySeed = seed + format(date, 'yyyy-MM-dd');

    // Generate Randomized Demand for this day
    // Fluctuations: +/- 40% around average
    const variance = seededRandom(daySeed) * 0.8 + 0.6;
    const dailyDemand = Math.round(avgDailyDemand * variance);

    // Backward Step:
    // "Yesterday's stock" must have been "Today's Stock" + "Today's Consumption"
    let prevStock = currentSimulatedStock + dailyDemand;

    // Backward Restock Detection:
    // If working backwards makes our stock unrealistically high (exceeding MaxStockLevel),
    // it implies a Restock Event must have occurred in the forward direction (Yesterday -> Today).
    // So "Yesterday" was actually much lower (before the restock arrived).
    if (prevStock > maxStockLevel) {
      // Un-apply the restock amount
      prevStock -= restockAmount;
      // Ensure we don't simulate negative history (impossible)
      if (prevStock < 0) {prevStock = safetyStockLevel;}
    }

    points.push({
      date: format(date, 'MMM dd'),
      actualStock: Math.round(currentSimulatedStock),
      forecastDemand: dailyDemand,
      safetyStock: safetyStockLevel,
    });

    // Prepare for next iteration (moving backwards in time)
    currentSimulatedStock = prevStock;
  }

  // Reverse to get chronological order (Day -29 -> Today)
  return points.reverse();
};

// Store Comparison Mock Data - Recalculated based on filters
export function generateStorePerformance(
  regions: string[],
  selectedStores: string[] = [],
  selectedProducts: string[] = [],
  selectedCategories: string[] = [],
): StoreInventoryPerformance[] {
  // 1. Get all relevant items
  const items = generateInventoryItems(
    regions,
    selectedStores,
    selectedCategories,
    selectedProducts,
  );

  // 2. Group by store
  const storeMap = new Map<
    string,
    {
      storeName: string;
      stockLevel: number;
      dailySales: number;
      inventoryValue: number;
      costOfGoods: number;
    }
  >();

  // Initialize map with selected stores to ensure they appear even if empty
  const storeOptions = getStoresByRegions(regions);
  const storesToCompare =
    selectedStores.length > 0
      ? storeOptions.filter((s) => selectedStores.includes(s.value))
      : storeOptions;

  storesToCompare.forEach((s) => {
    storeMap.set(s.value, {
      storeName: s.label,
      stockLevel: 0,
      dailySales: 0,
      inventoryValue: 0,
      costOfGoods: 0,
    });
  });

  // Aggregate item data
  items.forEach((item) => {
    const storeValue =
      item.originalValue.split('_')[0] + '_' + item.originalValue.split('_')[1]; // e.g. ist_kadikoy

    if (storeMap.has(storeValue)) {
      const storeData = storeMap.get(storeValue)!;
      storeData.stockLevel += item.stockLevel;
      storeData.dailySales += item.todaysSales;
      storeData.inventoryValue += item.stockValue;
    }
  });

  // 3. Convert to array and calculate derived metrics
  return Array.from(storeMap.entries()).map(([storeId, data]) => {
    const daysOfInventory =
      data.dailySales > 0 ? Math.round(data.stockLevel / data.dailySales) : 0;

    // Simulate efficiency based on days of inventory (ideal is ~30)
    // 30 days = 100%, 0 days = 0%, 60 days = 50%
    const efficiency = Math.max(
      0,
      Math.min(100, 100 - Math.abs(daysOfInventory - 30) * 1.5),
    );

    return {
      storeId,
      storeName: data.storeName,
      stockLevel: data.stockLevel,
      sellThroughRate: randomFloat(40, 95), // Still random for now as we don't track historical sales per store in detail
      dailySales: data.dailySales,
      daysOfInventory,
      stockEfficiency: Number(efficiency.toFixed(1)),
    };
  });
}

// Alerts Mock Data - Recalculated based on filters
const ALL_CATEGORIES = [
  'gida',
  'icecek',
  'temizlik',
  'kisisel_bakim',
  'elektronik',
  'teknoloji',
];

export const generateInventoryAlerts = (
  regions: string[],
  stores: string[],
): InventoryAlert[] => {
  // Pass empty array for categories to mean "ALL" (bypass strict key matching)
  const items = generateInventoryItems(regions, stores, []);
  // Helper to find Transfer Sources (simulate finding overstocked stores)
  // Helper to find Transfer Sources (simulate finding overstocked stores)
  const allStoresData = getAllStores();
  const storeMap = new Map(allStoresData.map((s) => [s.value, s.label]));
  const allStores = allStoresData.map((s) => s.label);

  const getTransferSource = (currentStore: string) => {
    const potentialSources = allStores.filter(
      (s) => s !== currentStore && s !== 'Hepsi',
    );
    if (potentialSources.length === 0) {return null;}
    return potentialSources[
      Math.floor(Math.random() * potentialSources.length)
    ];
  };

  const today = new Date();
  const alerts: InventoryAlert[] = [];

  items.forEach((item) => {
    // Derive store name from productKey (format: region_storeVal_slug)
    let derivedStoreName = 'Merkez Depo';
    // @ts-ignore
    if (item.productKey) {
      // @ts-ignore
      const parts = item.productKey.split('_');
      if (parts.length >= 2) {
        const storeVal = parts[1];
        derivedStoreName = storeMap.get(storeVal) || `Mağaza ${storeVal}`;
      }
    }
    // @ts-ignore
    const storeName = item.storeName || derivedStoreName;

    // 1. Stockout Logic (High Severity)
    if (item.stockLevel === 0) {
      const transferSource = getTransferSource(storeName);
      const isTransferable = Math.random() > 0.5; // Simulate 50% chance of transfer availability

      if (isTransferable && transferSource) {
        // Transfer Opportunity
        const transferQty = Math.round(item.forecastedDemand * 0.5); // Cover 2 weeks
        alerts.push({
          id: `alert-${item.id}-transfer`,
          type: 'stockout', // Main issue is still stockout
          sku: item.sku,
          productName: item.productName,
          storeName: storeName,
          message: `Stok tükendi. ${transferSource} mağazasında fazla stok tespit edildi.`,
          date: format(
            subDays(today, Math.floor(Math.random() * 2)),
            'MMM dd, HH:mm',
          ),
          severity: 'high',
          metrics: {
            currentStock: 0,
            threshold: item.minStockLevel,
            forecastedDemand: item.forecastedDemand,
            transferSourceStore: transferSource,
            transferQuantity: transferQty,
          },
          recommendation: `Acil Transfer Önerisi: ${transferSource} mağazasından ${transferQty} adet ürün transfer ederek 15 günlük talebi karşılayın. Bu işlem, ${storeName} mağazasındaki satış kaybını önleyecektir.`,
          actionType: 'transfer',
        });
      } else {
        // Standard Replenishment
        alerts.push({
          id: `alert-${item.id}-po`,
          type: 'stockout',
          sku: item.sku,
          productName: item.productName,
          storeName: storeName,
          message: 'Stok tükendi. Acil tedarik gerekiyor.',
          date: format(
            subDays(today, Math.floor(Math.random() * 2)),
            'MMM dd, HH:mm',
          ),
          severity: 'high',
          metrics: {
            currentStock: 0,
            threshold: item.minStockLevel,
            forecastedDemand: item.forecastedDemand,
          },
          recommendation: `Acil Satın Alma: Mevcut satış hızıyla (Günlük ${Math.round(item.forecastedDemand / 30)} adet) hemen sipariş verin. Hedef stok seviyesi: ${item.maxStockLevel}.`,
          actionType: 'reorder',
        });
      }
    }
    // 2. Low Stock (Reorder Level)
    else if (item.stockLevel <= item.reorderPoint) {
      alerts.push({
        id: `alert-${item.id}-low`,
        type: 'reorder',
        sku: item.sku,
        productName: item.productName,
        storeName: storeName,
        message: 'Kritik stok seviyesi (Reorder Point altında).',
        date: format(subDays(today, Math.floor(Math.random() * 5)), 'MMM dd'),
        severity: 'medium',
        metrics: {
          currentStock: item.stockLevel,
          threshold: item.reorderPoint,
          forecastedDemand: item.forecastedDemand,
        },
        recommendation: `Sipariş Planlayın: Stok, sipariş verme noktasına (${item.reorderPoint}) ulaştı. Gelecek ayki ${item.forecastedDemand} adetlik talebi karşılamak için sipariş oluşturun.`,
        actionType: 'reorder',
      });
    }
    // 3. Demand Surge (High Velocity Risk)
    // If stock is OK but Coverage is dangerously low due to high forecast
    else if (
      item.stockLevel > 0 &&
      item.daysOfCoverage < 10 &&
      item.daysOfCoverage > 0
    ) {
      alerts.push({
        id: `alert-${item.id}-surge`,
        type: 'surge',
        sku: item.sku,
        productName: item.productName,
        storeName: storeName,
        message: 'Talep artışı riski. Stok koruması düşük.',
        date: format(today, 'MMM dd'),
        severity: 'medium',
        metrics: {
          currentStock: item.stockLevel,
          threshold: 10, // Target 10 days coverage
          forecastedDemand: item.forecastedDemand,
        },
        recommendation: `Talep Artışı: Tahmini talep (${item.forecastedDemand} adet/ay) mevcut stoğu 10 günden kısa sürede tüketecek. Güvenlik stoğunu artırmayı değerlendirin.`,
        actionType: 'review',
      });
    }
    // 4. Overstock
    else if (item.stockLevel > item.maxStockLevel * 1.5) {
      alerts.push({
        id: `alert-${item.id}-over`,
        type: 'overstock',
        sku: item.sku,
        productName: item.productName,
        storeName: storeName,
        message: `Stok fazlası (${item.stockLevel} adet). Maksimum seviyenin üzerinde.`,
        date: format(subDays(today, Math.floor(Math.random() * 10)), 'MMM dd'),
        severity: 'low',
        metrics: {
          currentStock: item.stockLevel,
          threshold: item.maxStockLevel,
          forecastedDemand: item.forecastedDemand,
        },
        recommendation: 'Stok Eritme: Stok maliyetini düşürmek için promosyon yapın veya düşük stoklu mağazalara dağıtım planlayın.',
        actionType: 'promotion',
      });
    }
    // 5. Deadstock
    else if (item.turnoverRate < 2 && item.stockLevel > 50) {
      alerts.push({
        id: `alert-${item.id}-dead`,
        type: 'deadstock',
        sku: item.sku,
        productName: item.productName,
        storeName: storeName,
        message: 'Durgun stok. Son 90 günde düşük hareket.',
        date: format(subDays(today, 3), 'MMM dd'),
        severity: 'low',
        metrics: {
          currentStock: item.stockLevel,
          threshold: 0,
          forecastedDemand: item.forecastedDemand,
        },
        recommendation: 'Ürün Yaşlandırma: Bu ürün kategorisinde satış hızı çok düşük. İade veya indirimli satış opsiyonlarını değerlendirin.',
        actionType: 'review',
      });
    }
  });

  // Sort by severity (High -> Medium -> Low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
};

// Custom Lists
export const mockCustomLists: CustomProductList[] = [
  {
    id: '1',
    name: 'Yaz Kampanyası Hedefleri',
    itemCount: 45,
    lastModified: '2025-05-10',
    skus: [],
  },
  {
    id: '2',
    name: 'Yavaş Giden Ürünler',
    itemCount: 128,
    lastModified: '2025-05-08',
    skus: [],
  },
  {
    id: '3',
    name: 'High Value Electronics',
    itemCount: 12,
    lastModified: '2025-05-01',
    skus: [],
  },
];

export interface SimilarCampaign {
  id: string;
  name: string;
  date: string;
  similarityScore: number;
  type: string;
  lift: number;
  roi: number;
  stockOutDays: number;
}

export const SIMILAR_CAMPAIGNS: SimilarCampaign[] = [
  {
    id: 'SC-1',
    name: 'İnternet\'e Özel İndirim Günleri',
    date: 'Nisan 2024',
    similarityScore: 95,
    type: 'INTERNET_INDIRIMI',
    lift: 38,
    roi: 120,
    stockOutDays: 0,
  },
  {
    id: 'SC-2',
    name: '500 TL Üzeri Alışveriş İndirimi',
    date: 'Ekim 2024',
    similarityScore: 82,
    type: 'INTERNET_INDIRIMI',
    lift: 45,
    roi: 110,
    stockOutDays: 2,
  },
  {
    id: 'SC-3',
    name: '3 Al 2 Öde Fırsatı',
    date: 'Haziran 2024',
    similarityScore: 65,
    type: 'COKLU_ALIM',
    lift: 22,
    roi: 40,
    stockOutDays: 0,
  },
  {
    id: 'SC-4',
    name: 'Okula Dönüş Sepet İndirimi',
    date: 'Eylül 2024',
    similarityScore: 88,
    type: 'ALISVERIS_INDIRIMI_500',
    lift: 55,
    roi: 145,
    stockOutDays: 5,
  },
  {
    id: 'SC-5',
    name: 'Kış Sezonu Dev İndirimi',
    date: 'Ocak 2025',
    similarityScore: 75,
    type: 'ALISVERIS_INDIRIMI_500',
    lift: 42,
    roi: 90,
    stockOutDays: 1,
  },
  {
    id: 'SC-6',
    name: 'Hafta Sonu Süper Fırsat',
    date: 'Mayıs 2024',
    similarityScore: 60,
    type: 'SADAKAT_KART',
    lift: 15,
    roi: 30,
    stockOutDays: 0,
  },
  {
    id: 'SC-7',
    name: 'Gazete Manşet İndirimi',
    date: 'Mart 2024',
    similarityScore: 92,
    type: 'OZEL_GUN_INDIRIMI',
    lift: 70,
    roi: 65,
    stockOutDays: 3,
  },
];

