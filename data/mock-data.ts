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
