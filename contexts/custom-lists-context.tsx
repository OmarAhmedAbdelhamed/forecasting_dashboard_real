'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CustomProductList } from '@/types/inventory';

interface CustomListsContextType {
  lists: CustomProductList[];
  addList: (list: CustomProductList) => void;
  updateList: (list: CustomProductList) => void;
  deleteList: (id: string) => void;
  replaceLists: (lists: CustomProductList[]) => void;
  replaceAutoLists: (lists: CustomProductList[]) => void;
}

const CustomListsContext = createContext<CustomListsContextType | undefined>(
  undefined,
);

export function CustomListsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lists, setLists] = useState<CustomProductList[]>([]);

  const addList = useCallback((list: CustomProductList) => {
    setLists((prev) => [list, ...prev]);
  }, []);

  const updateList = useCallback((updatedList: CustomProductList) => {
    setLists((prev) =>
      prev.map((list) => (list.id === updatedList.id ? updatedList : list)),
    );
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
  }, []);

  const replaceLists = useCallback((nextLists: CustomProductList[]) => {
    setLists(nextLists);
  }, []);

  const replaceAutoLists = useCallback((autoLists: CustomProductList[]) => {
    setLists((prev) => {
      const customLists = prev.filter((list) => !list.id.startsWith('AUTO_LIST_'));
      return [...customLists, ...autoLists];
    });
  }, []);

  return (
    <CustomListsContext.Provider
      value={{
        lists,
        addList,
        updateList,
        deleteList,
        replaceLists,
        replaceAutoLists,
      }}
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
