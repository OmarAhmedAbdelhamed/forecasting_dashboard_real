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
  { value: 'KATALOG', label: 'KATALOG (Genel İndirim)' },
  { value: 'ZKAE', label: 'ZKAE (Kasa Arkası)' },
  { value: 'VKA0', label: 'VKA0 (Çoklu Alım)' },
  { value: 'GAZETE', label: 'GAZETE İLANI' },
  { value: '50TL_OP', label: '50 TL üzeri Operasyon' },
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

// Get categories filtered by selected stores (deduplicated)
export function getCategoriesByStores(
  selectedStores: string[],
): { value: string; label: string }[] {
  const allStores = REGIONS.flatMap((r) => r.stores);
  const storesToUse =
    selectedStores.length === 0
      ? allStores
      : allStores.filter((s) => selectedStores.includes(s.value));

  // Collect unique categories by value
  const categoryMap = new Map<string, string>();
  storesToUse.forEach((s) => {
    s.categories.forEach((c) => {
      if (!categoryMap.has(c.value)) {
        categoryMap.set(c.value, c.label);
      }
    });
  });

  return Array.from(categoryMap.entries()).map(([value, label]) => ({
    value,
    label,
  }));
}

// Get products filtered by selected categories
export function getProductsByCategories(
  selectedCategories: string[],
): { value: string; label: string }[] {
  const allProducts: { value: string; label: string; categoryKey: string }[] =
    [];
  REGIONS.forEach((region) => {
    region.stores.forEach((store) => {
      store.categories.forEach((category) => {
        const categoryKey = `${store.value}_${category.value}`;
        category.products.forEach((product) => {
          allProducts.push({
            value: `${categoryKey}_${product.value}`,
            label: product.label,
            categoryKey,
          });
        });
      });
    });
  });

  if (selectedCategories.length === 0) {
    return allProducts.map((p) => ({ value: p.value, label: p.label }));
  }
  return allProducts
    .filter((p) => selectedCategories.includes(p.categoryKey))
    .map((p) => ({ value: p.value, label: p.label }));
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

  let filteredCategories = filteredStores.flatMap((s) => s.categories);

  if (categories.length > 0) {
    filteredCategories = filteredCategories.filter((c) => {
      return true;
    });
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

  // Base values
  const baseAccuracy = 92;
  const baseForecastVal = 2500000;
  const baseForecastUnit = 120000;

  // Modifiers based on selection size (smaller selection = smaller absolute numbers)
  // If no filters, we assume "All"
  const scale =
    regions.length === 0 && stores.length === 0
      ? 1
      : stores.length > 0
        ? 0.1 * stores.length
        : 0.3 * regions.length;

  return {
    accuracy: baseAccuracy + rand * 5, // 92% - 97%
    accuracyChange: rand * 2 - 0.5, // -0.5% to +1.5%
    forecastValue: baseForecastVal * scale * (0.8 + rand * 0.4),
    forecastUnit: baseForecastUnit * scale * (0.8 + rand * 0.4),
    forecastChange: rand * 10, // 0% - 10%
    ytdValue: baseForecastVal * scale * 5 * (0.9 + rand * 0.2),
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
  const scale =
    regions.length === 0 && stores.length === 0
      ? 1
      : stores.length > 0
        ? 0.1 * stores.length
        : 0.3 * regions.length;

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
    const baseVal = 6000000 * scale;
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
    regions.join('') + stores.join('') + categories.join('') + 'history';
  const scale =
    regions.length === 0 && stores.length === 0
      ? 1
      : stores.length > 0
        ? 0.1 * stores.length
        : 0.3 * regions.length;

  const data: HistoricalChartData[] = [];
  for (let i = 1; i <= 52; i++) {
    const weekRand = seededRandom(seed + `wk${i}`);
    const seasonalFactor = 1 + Math.sin((i / 52) * Math.PI * 2) * 0.2; // Seasonal wave
    const baseUnits = 20000 * scale * seasonalFactor;

    data.push({
      week: `Wk ${i}`,
      y2024: Math.round(baseUnits * (0.9 + weekRand * 0.2)),
      y2025: Math.round(baseUnits * 1.1 * (0.9 + weekRand * 0.2)),
      y2026:
        i <= 4 ? Math.round(baseUnits * 1.2 * (0.9 + weekRand * 0.2)) : null, // Only first 4 weeks for 2026
    });
  }
  return data;
}

export function getPromotions(
  regions: string[],
  stores: string[],
  categories: string[],
): Promotion[] {
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
      type: 'VKA0',
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

export const PROMOTION_HISTORY_DATA = [
  {
    date: '10-19 Mayıs 2025',
    name: 'Bahar Temizliği',
    type: 'KATALOG',
    uplift: '+42%',
    upliftVal: '₺12.4k',
    profit: '+₺3.2k',
    roi: 142,
    stock: 'OK',
    forecast: '92%',
  },
  {
    date: '05-12 Nisan 2025',
    name: 'Ramazan Paketi',
    type: 'ZKAE',
    uplift: '+55%',
    upliftVal: '₺18.1k',
    profit: '-₺1.2k',
    roi: -15,
    stock: 'OOS',
    forecast: '65%',
  },
  {
    date: '10-14 Şubat 2025',
    name: 'Sevgililer Günü',
    type: 'VKA0',
    uplift: '+18%',
    upliftVal: '₺4.5k',
    profit: '-₺0.8k',
    roi: 45,
    stock: 'Over',
    forecast: '88%',
  },
  {
    date: '15-20 Ocak 2025',
    name: 'Kış İndirimi',
    type: 'GAZETE',
    uplift: '+30%',
    upliftVal: '₺9.2k',
    profit: '+₺1.5k',
    roi: 85,
    stock: 'OK',
    forecast: '95%',
  },
  {
    date: '20-25 Aralık 2024',
    name: 'Yılbaşı Özel',
    type: 'KATALOG',
    uplift: '+48%',
    upliftVal: '₺15.2k',
    profit: '+₺4.1k',
    roi: 155,
    stock: 'OK',
    forecast: '94%',
  },
  {
    date: '24-28 Kasım 2024',
    name: 'Efsane Cuma',
    type: '50TL_OP',
    uplift: '+60%',
    upliftVal: '₺22.5k',
    profit: '-₺0.5k',
    roi: -5,
    stock: 'OOS',
    forecast: '70%',
  },
];
