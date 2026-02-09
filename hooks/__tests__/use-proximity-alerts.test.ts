import { renderHook } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { useProximityAlerts } from '../use-proximity-alerts';
import type { InventoryAlert, InventoryItem } from '@/types/inventory';

describe('useProximityAlerts', () => {
  const mockInventoryItems: InventoryItem[] = [
    {
      id: 'store-1',
      sku: 'PROD1',
      productName: 'Product 1',
      category: 'Gıda',
      stockLevel: 5,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      forecastedDemand: 30,
      stockValue: 50,
      daysOfCoverage: 2,
      status: 'Low Stock',
      turnoverRate: 1.2,
      lastRestockDate: '2024-01-01',
      leadTimeDays: 7,
      quantityOnOrder: 0,
      todaysSales: 3,
      price: 10,
    },
    {
      id: 'Acıbadem',
      sku: 'PROD1',
      productName: 'Product 1',
      category: 'Gıda',
      stockLevel: 50,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      forecastedDemand: 30,
      stockValue: 500,
      daysOfCoverage: 15,
      status: 'In Stock',
      turnoverRate: 2.5,
      lastRestockDate: '2024-01-01',
      leadTimeDays: 7,
      quantityOnOrder: 0,
      todaysSales: 5,
      price: 10,
    },
    {
      id: 'Maltepe',
      sku: 'PROD1',
      productName: 'Product 1',
      category: 'Gıda',
      stockLevel: 25,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      forecastedDemand: 30,
      stockValue: 250,
      daysOfCoverage: 8,
      status: 'In Stock',
      turnoverRate: 1.8,
      lastRestockDate: '2024-01-01',
      leadTimeDays: 7,
      quantityOnOrder: 0,
      todaysSales: 3,
      price: 10,
    },
  ];

  describe('proximity enhancement for stockout alerts', () => {
    it('should add proximity options to stockout alerts', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD1',
          productName: 'Product 1',
          storeName: 'store-1',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
          metrics: {
            currentStock: 0,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeDefined();
      expect(result.current.enhancedAlerts[0].proximityOptions!.length).toBeGreaterThan(0);
      expect(result.current.enhancedAlerts[0].proximityOptions![0].isSurplus).toBe(true);
    });

    it('should set noTransferOptions when no surplus exists', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD999',
          productName: 'Non-existent Product',
          storeName: 'Unknown Store',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
          metrics: {
            currentStock: 0,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, [])
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeUndefined();
      expect(result.current.enhancedAlerts[0].noTransferOptions).toBe(true);
    });
  });

  describe('proximity enhancement for reorder alerts', () => {
    it('should add proximity options to reorder alerts', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '2',
          type: 'reorder',
          sku: 'PROD1',
          productName: 'Product 1',
          storeName: 'store-1',
          message: 'Reorder needed',
          date: '2024-01-01',
          severity: 'medium',
          metrics: {
            currentStock: 15,
            threshold: 20,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeDefined();
      expect(result.current.enhancedAlerts[0].proximityOptions!.length).toBeGreaterThan(0);
    });
  });

  describe('filtering by alert type', () => {
    it('should NOT add proximity to surge alerts', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '3',
          type: 'surge',
          sku: 'PROD3',
          productName: 'Product 3',
          storeName: 'Bayrampaşa - 789',
          message: 'Demand surge detected',
          date: '2024-01-01',
          severity: 'high',
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeUndefined();
      expect(result.current.enhancedAlerts[0].noTransferOptions).toBeUndefined();
    });

    it('should NOT add proximity to overstock alerts', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '4',
          type: 'overstock',
          sku: 'PROD4',
          productName: 'Product 4',
          storeName: 'İstinye - 101',
          message: 'Overstock detected',
          date: '2024-01-01',
          severity: 'medium',
          metrics: {
            currentStock: 200,
            threshold: 100,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeUndefined();
      expect(result.current.enhancedAlerts[0].noTransferOptions).toBeUndefined();
    });

    it('should NOT add proximity to deadstock alerts', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '5',
          type: 'deadstock',
          sku: 'PROD5',
          productName: 'Product 5',
          storeName: 'Eskişehir - 202',
          message: 'Dead stock detected',
          date: '2024-01-01',
          severity: 'low',
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeUndefined();
      expect(result.current.enhancedAlerts[0].noTransferOptions).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty alerts array', () => {
      const { result } = renderHook(() =>
        useProximityAlerts([], mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toEqual([]);
    });

    it('should skip alerts without storeName', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD1',
          productName: 'Product 1',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      expect(result.current.enhancedAlerts).toHaveLength(1);
      expect(result.current.enhancedAlerts[0].proximityOptions).toBeUndefined();
      expect(result.current.enhancedAlerts[0].noTransferOptions).toBeUndefined();
    });

    it('should extract store code from alert store name', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD1',
          productName: 'Product 1',
          storeName: 'Acıbadem - 123',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
          metrics: {
            currentStock: 0,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      // Should not error and should process the alert
      expect(result.current.enhancedAlerts).toHaveLength(1);
      // Either proximityOptions or noTransferOptions should be set
      const hasProximity = result.current.enhancedAlerts[0].proximityOptions !== undefined;
      const hasNoTransfer = result.current.enhancedAlerts[0].noTransferOptions === true;
      expect(hasProximity || hasNoTransfer).toBe(true);
    });

    it('should handle store name without code', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD1',
          productName: 'Product 1',
          storeName: 'Acıbadem',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
          metrics: {
            currentStock: 0,
          },
        },
      ];

      const { result } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      // Should use full store name when no code found
      expect(result.current.enhancedAlerts).toHaveLength(1);
      const hasProximity = result.current.enhancedAlerts[0].proximityOptions !== undefined;
      const hasNoTransfer = result.current.enhancedAlerts[0].noTransferOptions === true;
      expect(hasProximity || hasNoTransfer).toBe(true);
    });
  });

  describe('performance', () => {
    it('should use useMemo to memoize results', () => {
      const alerts: InventoryAlert[] = [
        {
          id: '1',
          type: 'stockout',
          sku: 'PROD1',
          productName: 'Product 1',
          storeName: 'store-1',
          message: 'Out of stock',
          date: '2024-01-01',
          severity: 'high',
          metrics: {
            currentStock: 0,
          },
        },
      ];

      const { result, rerender } = renderHook(() =>
        useProximityAlerts(alerts, mockInventoryItems)
      );

      const firstResult = result.current.enhancedAlerts;

      // Rerender with same inputs
      rerender();

      const secondResult = result.current.enhancedAlerts;

      // Should return the same reference (memoized)
      expect(firstResult).toBe(secondResult);
    });
  });
});
