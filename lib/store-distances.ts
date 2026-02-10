export interface StoreDistance {
  from: string;
  to: Record<string, { raw: string; value: number | null }>;
}

export const STORE_DISTANCE_MATRIX: StoreDistance[] = [
  {
    from: "Acıbadem",
    to: {
      "Acıbadem": { raw: "—", value: null },
      "Maltepe": { raw: "~14", value: 14 },
      "Merter": { raw: "~18", value: 18 },
      "İstinye": { raw: "~28", value: 28 },
      "Bayrampaşa": { raw: "~30", value: 30 },
      "Eskişehir": { raw: "~885", value: 885 },
      "Adana": { raw: "~940", value: 940 },
      "İzmir": { raw: "~470", value: 470 }
    }
  },
  {
    from: "Maltepe",
    to: {
      "Acıbadem": { raw: "~14", value: 14 },
      "Maltepe": { raw: "—", value: null },
      "Merter": { raw: "~22", value: 22 },
      "İstinye": { raw: "~32", value: 32 },
      "Bayrampaşa": { raw: "~28", value: 28 },
      "Eskişehir": { raw: "~890", value: 890 },
      "Adana": { raw: "~945", value: 945 },
      "İzmir": { raw: "~475", value: 475 }
    }
  },
  {
    from: "Merter",
    to: {
      "Acıbadem": { raw: "~18", value: 18 },
      "Maltepe": { raw: "~22", value: 22 },
      "Merter": { raw: "—", value: null },
      "İstinye": { raw: "~26", value: 26 },
      "Bayrampaşa": { raw: "~4", value: 4 },
      "Eskişehir": { raw: "~882", value: 882 },
      "Adana": { raw: "~938", value: 938 },
      "İzmir": { raw: "~468", value: 468 }
    }
  },
  {
    from: "İstinye",
    to: {
      "Acıbadem": { raw: "~28", value: 28 },
      "Maltepe": { raw: "~32", value: 32 },
      "Merter": { raw: "~26", value: 26 },
      "İstinye": { raw: "—", value: null },
      "Bayrampaşa": { raw: "~26", value: 26 },
      "Eskişehir": { raw: "~900", value: 900 },
      "Adana": { raw: "~960", value: 960 },
      "İzmir": { raw: "~480", value: 480 }
    }
  },
  {
    from: "Bayrampaşa",
    to: {
      "Acıbadem": { raw: "~30", value: 30 },
      "Maltepe": { raw: "~28", value: 28 },
      "Merter": { raw: "~4", value: 4 },
      "İstinye": { raw: "~26", value: 26 },
      "Bayrampaşa": { raw: "—", value: null },
      "Eskişehir": { raw: "~888", value: 888 },
      "Adana": { raw: "~936", value: 936 },
      "İzmir": { raw: "~472", value: 472 }
    }
  },
  {
    from: "Eskişehir",
    to: {
      "Acıbadem": { raw: "~885", value: 885 },
      "Maltepe": { raw: "~890", value: 890 },
      "Merter": { raw: "~882", value: 882 },
      "İstinye": { raw: "~900", value: 900 },
      "Bayrampaşa": { raw: "~888", value: 888 },
      "Eskişehir": { raw: "—", value: null },
      "Adana": { raw: "~480", value: 480 },
      "İzmir": { raw: "~457", value: 457 }
    }
  },
  {
    from: "Adana",
    to: {
      "Acıbadem": { raw: "~940", value: 940 },
      "Maltepe": { raw: "~945", value: 945 },
      "Merter": { raw: "~938", value: 938 },
      "İstinye": { raw: "~960", value: 960 },
      "Bayrampaşa": { raw: "~936", value: 936 },
      "Eskişehir": { raw: "~480", value: 480 },
      "Adana": { raw: "—", value: null },
      "İzmir": { raw: "~900", value: 900 }
    }
  },
  {
    from: "İzmir",
    to: {
      "Acıbadem": { raw: "~470", value: 470 },
      "Maltepe": { raw: "~475", value: 475 },
      "Merter": { raw: "~468", value: 468 },
      "İstinye": { raw: "~480", value: 480 },
      "Bayrampaşa": { raw: "~472", value: 472 },
      "Eskişehir": { raw: "~457", value: 457 },
      "Adana": { raw: "~900", value: 900 },
      "İzmir": { raw: "—", value: null }
    }
  }
];

/**
 * Get distance in km between two stores
 * @param fromStore - Origin store name
 * @param toStore - Destination store name
 * @returns Distance in km, or null if same store or not found
 */
export function getDistance(fromStore: string, toStore: string): number | null {
  const fromData = STORE_DISTANCE_MATRIX.find(d => d.from === fromStore);
  if (!fromData) return null;

  const distance = fromData.to[toStore];
  return distance?.value ?? null;
}

/**
 * Get formatted display string for distance
 * @param fromStore - Origin store name
 * @param toStore - Destination store name
 * @returns Formatted distance string (e.g., "~14" or "—")
 */
export function getDistanceDisplay(fromStore: string, toStore: string): string {
  const fromData = STORE_DISTANCE_MATRIX.find(d => d.from === fromStore);
  if (!fromData) return '?';

  const distance = fromData.to[toStore];
  return distance?.raw ?? '?';
}

/**
 * Get all store names from the distance matrix
 * @returns Array of store names
 */
export function getAllStoreNames(): string[] {
  return STORE_DISTANCE_MATRIX.map(d => d.from);
}
