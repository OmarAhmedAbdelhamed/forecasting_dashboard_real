import { describe, it, expect } from '@jest/globals';
import {
  groupStockByStore,
  findClosestStoresWithStock,
} from '../proximity-utils';

// Mock item types for testing
interface MockItem {
  sku: string;
  storeCode?: string;
  productKey?: string;
  currentStock: number;
  threshold: number;
}

describe('Proximity Utils', () => {
  describe('groupStockByStore', () => {
    const mockItems: MockItem[] = [
      {
        sku: 'PROD1',
        storeCode: 'Acıbadem',
        currentStock: 50,
        threshold: 10,
      },
      {
        sku: 'PROD1',
        storeCode: 'Maltepe',
        currentStock: 5,
        threshold: 10,
      },
      {
        sku: 'PROD1',
        storeCode: 'Merter',
        currentStock: 25,
        threshold: 10,
      },
      {
        sku: 'PROD2',
        storeCode: 'Acıbadem',
        currentStock: 100,
        threshold: 20,
      },
    ];

    it('should group items by store for a given SKU', () => {
      const result = groupStockByStore('PROD1', mockItems);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        storeName: 'Acıbadem',
        currentStock: 50,
        threshold: 10,
      });
      expect(result).toContainEqual({
        storeName: 'Maltepe',
        currentStock: 5,
        threshold: 10,
      });
      expect(result).toContainEqual({
        storeName: 'Merter',
        currentStock: 25,
        threshold: 10,
      });
    });

    it('should filter items by SKU', () => {
      const result = groupStockByStore('PROD2', mockItems);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        storeName: 'Acıbadem',
        currentStock: 100,
        threshold: 20,
      });
    });

    it('should return empty array for non-existent SKU', () => {
      const result = groupStockByStore('PROD999', mockItems);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty items', () => {
      const result = groupStockByStore('PROD1', []);

      expect(result).toEqual([]);
    });

    it('should extract storeCode from productKey when storeCode is missing', () => {
      const itemsWithoutStoreCode: MockItem[] = [
        {
          sku: 'PROD1',
          productKey: 'store-1-product',
          currentStock: 30,
          threshold: 10,
        },
      ];

      const result = groupStockByStore('PROD1', itemsWithoutStoreCode);

      expect(result).toHaveLength(1);
      expect(result[0].storeName).toBe('store-1');
    });
  });

  describe('findClosestStoresWithStock', () => {
    const mockAllStoresStock = [
      {
        storeName: 'Acıbadem',
        currentStock: 5,
        threshold: 10,
      },
      {
        storeName: 'Maltepe',
        currentStock: 50,
        threshold: 10,
      },
      {
        storeName: 'Merter',
        currentStock: 4,
        threshold: 10,
      },
      {
        storeName: 'İstinye',
        currentStock: 100,
        threshold: 10,
      },
      {
        storeName: 'Bayrampaşa',
        currentStock: 25,
        threshold: 10,
      },
      {
        storeName: 'Eskişehir',
        currentStock: 0,
        threshold: 10,
      },
    ];

    it('should return top 3 closest stores with surplus stock', () => {
      const result = findClosestStoresWithStock('Acıbadem', mockAllStoresStock);

      expect(result).toHaveLength(3);

      // Maltepe is 14km away with surplus
      expect(result[0]).toEqual({
        storeName: 'Maltepe',
        distance: 14,
        distanceDisplay: '~14',
        availableStock: 50,
        isSurplus: true,
      });

      // İstinye is 28km away with surplus (closer than Bayrampaşa)
      expect(result[1]).toEqual({
        storeName: 'İstinye',
        distance: 28,
        distanceDisplay: '~28',
        availableStock: 100,
        isSurplus: true,
      });

      // Bayrampaşa is 30km away with surplus
      expect(result[2]).toEqual({
        storeName: 'Bayrampaşa',
        distance: 30,
        distanceDisplay: '~30',
        availableStock: 25,
        isSurplus: true,
      });
    });

    it('should exclude stores with stock at or below threshold', () => {
      const result = findClosestStoresWithStock('Acıbadem', mockAllStoresStock);

      // All returned stores should have isSurplus: true
      expect(result.every(r => r.isSurplus)).toBe(true);

      // Merter has 4 stock (threshold 10) - should not be in results
      expect(result.some(r => r.storeName === 'Merter')).toBe(false);

      // Eskişehir has 0 stock - should not be in results
      expect(result.some(r => r.storeName === 'Eskişehir')).toBe(false);
    });

    it('should exclude the alert store itself', () => {
      const result = findClosestStoresWithStock('Acıbadem', mockAllStoresStock);

      // Acıbadem should not be in results even though it's in the input
      expect(result.some(r => r.storeName === 'Acıbadem')).toBe(false);
    });

    it('should return empty array when no surplus stores found', () => {
      const noSurplusStock = [
        {
          storeName: 'Maltepe',
          currentStock: 5,
          threshold: 10,
        },
        {
          storeName: 'Merter',
          currentStock: 10,
          threshold: 10,
        },
      ];

      const result = findClosestStoresWithStock('Acıbadem', noSurplusStock);

      expect(result).toEqual([]);
    });

    it('should return fewer than N stores when fewer have surplus', () => {
      const limitedSurplus = [
        {
          storeName: 'Maltepe',
          currentStock: 50,
          threshold: 10,
        },
        {
          storeName: 'Merter',
          currentStock: 5,
          threshold: 10,
        },
      ];

      const result = findClosestStoresWithStock('Acıbadem', limitedSurplus);

      // Only Maltepe has surplus
      expect(result).toHaveLength(1);
      expect(result[0].storeName).toBe('Maltepe');
      expect(result[0].isSurplus).toBe(true);
    });

    it('should respect custom topN parameter', () => {
      const result = findClosestStoresWithStock('Acıbadem', mockAllStoresStock, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should sort results by distance ascending', () => {
      const result = findClosestStoresWithStock('Acıbadem', mockAllStoresStock);

      const distances = result.map(r => r.distance);
      const sortedDistances = [...distances].sort((a, b) => a - b);

      expect(distances).toEqual(sortedDistances);
    });

    it('should return empty array for empty input', () => {
      const result = findClosestStoresWithStock('Acıbadem', []);

      expect(result).toEqual([]);
    });
  });
});
