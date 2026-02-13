export interface StoreDistance {
  from: string;
  to: Record<string, { raw: string; value: number | null }>;
}

type StoreNode =
  | 'acibadem'
  | 'maltepe'
  | 'merter'
  | 'istinye'
  | 'bayrampasa'
  | 'eskisehir'
  | 'adana'
  | 'izmir';

const STORE_NODE_BY_CODE: Partial<Record<string, StoreNode>> = {
  '1012': 'acibadem',
  '1013': 'maltepe',
  '1014': 'merter',
  '1016': 'istinye',
  '1053': 'bayrampasa',
  '1017': 'eskisehir',
  '1051': 'adana',
  '1054': 'izmir',
};

const STORE_LABEL_BY_NODE: Record<StoreNode, string> = {
  acibadem: 'Acibadem',
  maltepe: 'Maltepe',
  merter: 'Merter',
  istinye: 'Istinye',
  bayrampasa: 'Bayrampasa',
  eskisehir: 'Eskisehir',
  adana: 'Adana',
  izmir: 'Izmir',
};

// Backward-compatible aliases for free-text store labels.
const STORE_NAME_ALIASES: Partial<Record<string, StoreNode>> = {
  acibadem: 'acibadem',
  'istanbul acibadem': 'acibadem',
  kadikoy: 'acibadem',
  'istanbul kadikoy': 'acibadem',

  maltepe: 'maltepe',
  'istanbul maltepe': 'maltepe',

  merter: 'merter',
  'istanbul merter': 'merter',
  bakirkoy: 'merter',
  'istanbul bakirkoy': 'merter',

  istinye: 'istinye',
  'istanbul istinye': 'istinye',
  sariyer: 'istinye',
  'istanbul sariyer': 'istinye',

  bayrampasa: 'bayrampasa',
  'istanbul bayrampasa': 'bayrampasa',

  eskisehir: 'eskisehir',
  'eskisehir neo': 'eskisehir',

  adana: 'adana',
  'adana m1': 'adana',

  izmir: 'izmir',
  'izmir balcova': 'izmir',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\u0131/g, 'i')
    .replace(/\s+/g, ' ');
}

function extractStoreCode(input: string): string | null {
  const exact = input.trim();
  if (/^\d{4}$/.test(exact)) {
    return exact;
  }
  const match = /(?:^|[\s_-])(\d{4})(?:$|[\s_-])/.exec(exact);
  return match?.[1] ?? null;
}

function resolveNode(input: string): StoreNode | null {
  const storeCode = extractStoreCode(input);
  if (storeCode !== null && STORE_NODE_BY_CODE[storeCode]) {
    return STORE_NODE_BY_CODE[storeCode];
  }

  const normalized = normalizeText(input.replace(/-\s*\d+\s*$/, '').trim());
  const directAlias = STORE_NAME_ALIASES[normalized];
  if (directAlias) {
    return directAlias;
  }

  const parts = normalized
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean);
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : normalized;
  return STORE_NAME_ALIASES[lastPart] ?? null;
}

const DISTANCE_BY_NODE: Record<
  StoreNode,
  Record<StoreNode, { raw: string; value: number | null }>
> = {
  acibadem: {
    acibadem: { raw: '-', value: null },
    maltepe: { raw: '~14', value: 14 },
    merter: { raw: '~18', value: 18 },
    istinye: { raw: '~28', value: 28 },
    bayrampasa: { raw: '~30', value: 30 },
    eskisehir: { raw: '~885', value: 885 },
    adana: { raw: '~940', value: 940 },
    izmir: { raw: '~470', value: 470 },
  },
  maltepe: {
    acibadem: { raw: '~14', value: 14 },
    maltepe: { raw: '-', value: null },
    merter: { raw: '~22', value: 22 },
    istinye: { raw: '~32', value: 32 },
    bayrampasa: { raw: '~28', value: 28 },
    eskisehir: { raw: '~890', value: 890 },
    adana: { raw: '~945', value: 945 },
    izmir: { raw: '~475', value: 475 },
  },
  merter: {
    acibadem: { raw: '~18', value: 18 },
    maltepe: { raw: '~22', value: 22 },
    merter: { raw: '-', value: null },
    istinye: { raw: '~26', value: 26 },
    bayrampasa: { raw: '~4', value: 4 },
    eskisehir: { raw: '~882', value: 882 },
    adana: { raw: '~938', value: 938 },
    izmir: { raw: '~468', value: 468 },
  },
  istinye: {
    acibadem: { raw: '~28', value: 28 },
    maltepe: { raw: '~32', value: 32 },
    merter: { raw: '~26', value: 26 },
    istinye: { raw: '-', value: null },
    bayrampasa: { raw: '~26', value: 26 },
    eskisehir: { raw: '~900', value: 900 },
    adana: { raw: '~960', value: 960 },
    izmir: { raw: '~480', value: 480 },
  },
  bayrampasa: {
    acibadem: { raw: '~30', value: 30 },
    maltepe: { raw: '~28', value: 28 },
    merter: { raw: '~4', value: 4 },
    istinye: { raw: '~26', value: 26 },
    bayrampasa: { raw: '-', value: null },
    eskisehir: { raw: '~888', value: 888 },
    adana: { raw: '~936', value: 936 },
    izmir: { raw: '~472', value: 472 },
  },
  eskisehir: {
    acibadem: { raw: '~885', value: 885 },
    maltepe: { raw: '~890', value: 890 },
    merter: { raw: '~882', value: 882 },
    istinye: { raw: '~900', value: 900 },
    bayrampasa: { raw: '~888', value: 888 },
    eskisehir: { raw: '-', value: null },
    adana: { raw: '~480', value: 480 },
    izmir: { raw: '~457', value: 457 },
  },
  adana: {
    acibadem: { raw: '~940', value: 940 },
    maltepe: { raw: '~945', value: 945 },
    merter: { raw: '~938', value: 938 },
    istinye: { raw: '~960', value: 960 },
    bayrampasa: { raw: '~936', value: 936 },
    eskisehir: { raw: '~480', value: 480 },
    adana: { raw: '-', value: null },
    izmir: { raw: '~900', value: 900 },
  },
  izmir: {
    acibadem: { raw: '~470', value: 470 },
    maltepe: { raw: '~475', value: 475 },
    merter: { raw: '~468', value: 468 },
    istinye: { raw: '~480', value: 480 },
    bayrampasa: { raw: '~472', value: 472 },
    eskisehir: { raw: '~457', value: 457 },
    adana: { raw: '~900', value: 900 },
    izmir: { raw: '-', value: null },
  },
};

export const STORE_DISTANCE_MATRIX: StoreDistance[] = (
  Object.keys(DISTANCE_BY_NODE) as StoreNode[]
).map((fromNode) => ({
  from: STORE_LABEL_BY_NODE[fromNode],
  to: Object.fromEntries(
    (Object.keys(DISTANCE_BY_NODE[fromNode]) as StoreNode[]).map((toNode) => [
      STORE_LABEL_BY_NODE[toNode],
      DISTANCE_BY_NODE[fromNode][toNode],
    ]),
  ),
}));

export function getDistance(fromStore: string, toStore: string): number | null {
  const fromNode = resolveNode(fromStore);
  const toNode = resolveNode(toStore);
  if (!fromNode || !toNode) {
    return null;
  }
  return DISTANCE_BY_NODE[fromNode][toNode].value;
}

export function getDistanceDisplay(fromStore: string, toStore: string): string {
  const fromNode = resolveNode(fromStore);
  const toNode = resolveNode(toStore);
  if (!fromNode || !toNode) {
    return '?';
  }
  const distance = DISTANCE_BY_NODE[fromNode][toNode];
  if (distance.value === null) {
    return distance.raw;
  }
  return `${distance.raw} km`;
}

export function getAllStoreNames(): string[] {
  return (Object.keys(STORE_LABEL_BY_NODE) as StoreNode[]).map(
    (node) => STORE_LABEL_BY_NODE[node],
  );
}
