'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomProductList } from '@/types/inventory';
import { mockCustomLists as initialLists } from '@/data/mock-data';

interface CustomListsContextType {
  lists: CustomProductList[];
  addList: (list: CustomProductList) => void;
  updateList: (list: CustomProductList) => void;
  deleteList: (id: string) => void;
}

const CustomListsContext = createContext<CustomListsContextType | undefined>(
  undefined,
);

export function CustomListsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lists, setLists] = useState<CustomProductList[]>(initialLists);

  const addList = (list: CustomProductList) => {
    setLists((prev) => [list, ...prev]);
  };

  const updateList = (updatedList: CustomProductList) => {
    setLists((prev) =>
      prev.map((list) => (list.id === updatedList.id ? updatedList : list)),
    );
  };

  const deleteList = (id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
  };

  return (
    <CustomListsContext.Provider
      value={{ lists, addList, updateList, deleteList }}
    >
      {children}
    </CustomListsContext.Provider>
  );
}

export function useCustomLists() {
  const context = useContext(CustomListsContext);
  if (context === undefined) {
    throw new Error('useCustomLists must be used within a CustomListsProvider');
  }
  return context;
}
