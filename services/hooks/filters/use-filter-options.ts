import { useRegionsHierarchy } from './use-regions-hierarchy';
import { useStores } from './use-stores';
import { useCategories } from './use-categories';
import { useProducts } from './use-products';
import { useMemo } from 'react';

interface UseFilterOptionsParams {
  selectedRegions?: string[];
  selectedStores?: string[];
  selectedCategories?: string[];
}

interface FilterOption {
  value: string;
  label: string;
}

export function useFilterOptions(params: UseFilterOptionsParams = {}) {
  const {
    selectedRegions = [],
    selectedStores = [],
    selectedCategories = [],
  } = params;

  // Fetch regions (always available)
  const { data: regionsData, isLoading: regionsLoading } =
    useRegionsHierarchy();

  // Fetch stores based on selected regions
  const { data: storesData, isLoading: storesLoading } = useStores({
    regionIds: selectedRegions.length > 0 ? selectedRegions : undefined,
  });

  // Fetch categories based on selected regions/stores
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    regionIds: selectedRegions.length > 0 ? selectedRegions : undefined,
    storeIds: selectedStores.length > 0 ? selectedStores : undefined,
  });

  // Fetch products based on all filters
  const { data: productsData, isLoading: productsLoading } = useProducts({
    regionIds: selectedRegions.length > 0 ? selectedRegions : undefined,
    storeIds: selectedStores.length > 0 ? selectedStores : undefined,
    categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
  });

  // Transform API data to filter options format with safety checks
  const regionOptions: FilterOption[] = useMemo(() => {
    return (regionsData?.regions ?? [])
      .filter((region) => region?.value && region?.label) // Filter out invalid entries
      .map((region) => ({
        value: region.value,
        label: region.label,
      }));
  }, [regionsData]);

  const storeOptions: FilterOption[] = useMemo(() => {
    return (storesData?.stores ?? [])
      .filter((store) => {
        const isValid = store?.value && store?.label;
        if (!isValid) {
          console.warn('⚠️ Invalid store entry:', store);
        }
        return isValid;
      })
      .map((store) => ({
        value: store.value,
        label: store.label,
      }));
  }, [storesData]);

  const categoryOptions: FilterOption[] = useMemo(() => {
    const categories = (categoriesData?.categories ?? []).filter(
      (category) => category?.value && category?.label,
    ); // Filter out invalid entries

    // Deduplicate by extracting unique category codes
    // Format is "storeId_categoryId", we want unique categoryIds
    const uniqueCategories = new Map<string, FilterOption>();

    categories.forEach((category) => {
      // Extract category code from "storeId_categoryId" format
      const categoryCode = category.value.includes('_')
        ? category.value.split('_')[1]
        : category.value;

      // Only add if we haven't seen this category code before
      if (!uniqueCategories.has(categoryCode)) {
        uniqueCategories.set(categoryCode, {
          value: categoryCode,
          label: category.label,
        });
      }
    });

    return Array.from(uniqueCategories.values());
  }, [categoriesData]);

  const productOptions: FilterOption[] = useMemo(() => {
    const products = (productsData?.products ?? []).filter(
      (product) => product?.value && product?.label,
    ); // Filter out invalid entries

    // Deduplicate by extracting unique product codes
    // Format is "storeId_categoryId_productId", we want unique productIds
    const uniqueProducts = new Map<string, FilterOption>();

    products.forEach((product) => {
      // Extract product code (last part after underscore)
      // e.g., "1055_101_3001" -> "3001"
      const productCode = product.value.includes('_')
        ? product.value.split('_').pop()!
        : product.value;

      // Only add if we haven't seen this product code before
      if (!uniqueProducts.has(productCode)) {
        uniqueProducts.set(productCode, {
          value: productCode,
          label: product.label,
        });
      }
    });

    return Array.from(uniqueProducts.values());
  }, [productsData]);

  const isLoading =
    regionsLoading || storesLoading || categoriesLoading || productsLoading;

  return {
    regionOptions,
    storeOptions,
    categoryOptions,
    productOptions,
    isLoading,
  };
}
