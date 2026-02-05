'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  section: string;
  filters: {
    regions?: string[];
    stores?: string[];
    categories?: string[];
    products?: string[];
  };
  metrics?: Record<string, any>;
  setSection: (section: string) => void;
  setFilters: (filters: any) => void;
  setMetrics: (metrics: Record<string, any>) => void;
  getContext: () => string;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState('Overview');
  const [filters, setFilters] = useState<any>({});
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  const getContext = () => {
    const currentDate = new Date().toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let contextStr = `Tarih: ${currentDate}\n`;
    contextStr += `Aktif Sayfa: ${section}\n`;

    if (Object.keys(filters).length > 0) {
      contextStr += `\nFiltreler:\n`;
      if (filters.regions?.length > 0) {
        contextStr += `- Bölgeler: ${filters.regions.join(', ')}\n`;
      }
      if (filters.stores?.length > 0) {
        contextStr += `- Mağazalar: ${filters.stores.join(', ')}\n`;
      }
      if (filters.categories?.length > 0) {
        contextStr += `- Kategoriler: ${filters.categories.join(', ')}\n`;
      }
      if (filters.products?.length > 0) {
        contextStr += `- Ürünler: ${filters.products.join(', ')}\n`;
      }
    }

    if (Object.keys(metrics).length > 0) {
      contextStr += `\nÖnemli Metrikler:\n`;
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          contextStr += `- ${key}: ${typeof value === 'number' ? value.toLocaleString('tr-TR') : value}\n`;
        }
      });
    }

    return contextStr;
  };

  return (
    <DashboardContext.Provider
      value={{
        section,
        filters,
        metrics,
        setSection,
        setFilters,
        setMetrics,
        getContext,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      'useDashboardContext must be used within DashboardProvider',
    );
  }
  return context;
}
