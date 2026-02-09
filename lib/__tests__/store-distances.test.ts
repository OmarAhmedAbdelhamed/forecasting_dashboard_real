import { describe, it, expect } from '@jest/globals';
import { STORE_DISTANCE_MATRIX, getDistance, getDistanceDisplay, getAllStoreNames } from '../store-distances';

describe('Store Distances', () => {
  describe('STORE_DISTANCE_MATRIX', () => {
    it('should contain all 8 stores', () => {
      const storeNames = STORE_DISTANCE_MATRIX.map(d => d.from);
      expect(storeNames).toContain('Acıbadem');
      expect(storeNames).toContain('Maltepe');
      expect(storeNames).toContain('Merter');
      expect(storeNames).toContain('İstinye');
      expect(storeNames).toContain('Bayrampaşa');
      expect(storeNames).toContain('Eskişehir');
      expect(storeNames).toContain('Adana');
      expect(storeNames).toContain('İzmir');
      expect(storeNames.length).toBe(8);
    });

    it('should have symmetric distances', () => {
      const acibademToMaltepe = STORE_DISTANCE_MATRIX
        .find(d => d.from === 'Acıbadem')!
        .to['Maltepe'].value;

      const maltepeToAcibadem = STORE_DISTANCE_MATRIX
        .find(d => d.from === 'Maltepe')!
        .to['Acıbadem'].value;

      expect(acibademToMaltepe).toBe(maltepeToAcibadem);
    });

    it('should return null for same store distance', () => {
      const acibademToAcibadem = STORE_DISTANCE_MATRIX
        .find(d => d.from === 'Acıbadem')!
        .to['Acıbadem'].value;

      expect(acibademToAcibadem).toBeNull();
    });
  });

  describe('getDistance', () => {
    it('should return distance in km between two stores', () => {
      expect(getDistance('Acıbadem', 'Maltepe')).toBe(14);
      expect(getDistance('Merter', 'Bayrampaşa')).toBe(4);
      expect(getDistance('Eskişehir', 'Adana')).toBe(480);
    });

    it('should return null for same store', () => {
      expect(getDistance('Acıbadem', 'Acıbadem')).toBeNull();
    });

    it('should return null for unknown store', () => {
      expect(getDistance('Unknown', 'Acıbadem')).toBeNull();
    });
  });

  describe('getDistanceDisplay', () => {
    it('should return formatted distance string', () => {
      expect(getDistanceDisplay('Acıbadem', 'Maltepe')).toBe('~14');
      expect(getDistanceDisplay('Merter', 'Bayrampaşa')).toBe('~4');
    });

    it('should return dash for same store', () => {
      expect(getDistanceDisplay('Acıbadem', 'Acıbadem')).toBe('—');
    });
  });

  describe('getAllStoreNames', () => {
    it('should return all store names', () => {
      const storeNames = getAllStoreNames();
      expect(storeNames).toHaveLength(8);
      expect(storeNames).toContain('Acıbadem');
      expect(storeNames).toContain('İzmir');
    });
  });
});
