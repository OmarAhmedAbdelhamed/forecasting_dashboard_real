'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shared/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/shared/collapsible';
import { Building2, Package, Check, X, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Category, Product, StoreProduct } from '@/types/auth';
import { useAdministrationStore } from '@/lib/store/administration-store';
import { cn } from '@/lib/utils';

interface StoreManagementViewProps {
  storeId: string;
  storeName: string;
}

interface StoreCategory {
  id: string;
  storeId: string;
  categoryId: string;
  category: Category;
}

interface CategorySummary {
  category_id: string;
  category_name: string;
  total_products: number;
  enabled_products: number;
}

interface ProductWithCategory extends Product {
  categoryName?: string;
}

export function StoreManagementView({ storeId, storeName }: StoreManagementViewProps) {
  const { drillDownState } = useAdministrationStore();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Categories state
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);

  // Products state
  const [storeProducts, setStoreProducts] = useState<(StoreProduct & { product: Product })[]>([]);
  const [allProducts, setAllProducts] = useState<ProductWithCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesData) {
        setAllCategories(categoriesData);
      }

      // Fetch store categories
      const { data: storeCategoriesData } = await supabase
        .from('store_categories')
        .select('*, category:categories(*)')
        .eq('store_id', storeId);

      if (storeCategoriesData) {
        setStoreCategories(storeCategoriesData);
      }

      // Fetch all products
      const { data: productsData } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .order('name');

      if (productsData) {
        const productsWithCategory = productsData.map((p: any) => ({
          ...p,
          categoryName: p.category?.name,
        }));
        setAllProducts(productsWithCategory);
      }

      // Fetch store products
      const { data: storeProductsData } = await supabase
        .from('store_products')
        .select('*, product:products(*)')
        .eq('store_id', storeId);

      if (storeProductsData) {
        setStoreProducts(storeProductsData as (StoreProduct & { product: Product })[]);
      }

      // Fetch category summary
      const { data: summaryData } = await fetch(`/api/stores/${storeId}/categories/summary`)
        .then((res) => res.json())
        .then((data) => data.summary || []);

      if (summaryData) {
        setCategorySummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('store_categories')
        .insert({ store_id: storeId, category_id: categoryId });

      if (error) {throw error;}

      // Ask if user wants to enable all products
      const category = allCategories.find((c) => c.id === categoryId);
      const shouldEnableAll = confirm(
        `Category "${category?.name}" has been added to the store.\n\nDo you want to enable all products in this category?`
      );

      if (shouldEnableAll) {
        await fetch(`/api/stores/${storeId}/categories/${categoryId}/enable-all-products`, {
          method: 'POST',
        });
      }

      setAddCategoryDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    // Check if any products from this category are enabled for this store
    const summary = categorySummary.find((s) => s.category_id === categoryId);

    if (summary && summary.enabled_products > 0) {
      alert(
        `Cannot remove category with ${summary.enabled_products} enabled product(s). Please disable them first.`
      );
      return;
    }

    if (!confirm('Are you sure you want to remove this category from the store?')) {return;}

    try {
      const { error } = await supabase
        .from('store_categories')
        .delete()
        .match({ store_id: storeId, category_id: categoryId });

      if (error) {throw error;}
      fetchData();
    } catch (error) {
      console.error('Error removing category:', error);
    }
  };

  const handleToggleProduct = async (productId: string, isActive: boolean) => {
    try {
      if (isActive) {
        // Enable product for store
        const { error } = await supabase
          .from('store_products')
          .insert({ store_id: storeId, product_id: productId, is_active: true });

        if (error) {throw error;}
      } else {
        // Disable product for store
        const { error } = await supabase
          .from('store_products')
          .delete()
          .match({ store_id: storeId, product_id: productId });

        if (error) {throw error;}
      }
      fetchData();
    } catch (error) {
      console.error('Error toggling product:', error);
    }
  };

  const handleEnableAllCategoryProducts = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/categories/${categoryId}/enable-all-products`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enable products');
      }

      fetchData();
    } catch (error) {
      console.error('Error enabling all products:', error);
    }
  };

  const handleBulkToggleProducts = async (enable: boolean) => {
    if (selectedProducts.size === 0) {return;}

    try {
      const response = await fetch(`/api/stores/${storeId}/products/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts),
          enable,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle products');
      }

      setSelectedProducts(new Set());
      fetchData();
    } catch (error) {
      console.error('Error bulk toggling products:', error);
    }
  };

  const handleSelectAllInCategory = (categoryId: string, products: ProductWithCategory[]) => {
    const productIds = products.map((p) => p.id);
    const newSelected = new Set(selectedProducts);

    const allSelected = productIds.every((id) => newSelected.has(id));

    if (allSelected) {
      // Deselect all
      productIds.forEach((id) => newSelected.delete(id));
    } else {
      // Select all
      productIds.forEach((id) => newSelected.add(id));
    }

    setSelectedProducts(newSelected);
  };

  const handleToggleCategoryCollapse = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Group products by category
  const productsByCategory = allProducts.reduce<Record<string, ProductWithCategory[]>>((acc, product) => {
    if (!acc[product.categoryId]) {
      acc[product.categoryId] = [];
    }
    acc[product.categoryId].push(product);
    return acc;
  }, {});

  // Filter products by category and search term
  const filteredProductsByCategory = Object.entries(productsByCategory).reduce<Record<string, ProductWithCategory[]>>(
    (acc, [categoryId, products]) => {
      const filtered = products.filter((product) => {
        const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      });

      if (filtered.length > 0) {
        acc[categoryId] = filtered;
      }
      return acc;
    },
    {}
  );

  // Get categories that are not assigned to this store
  const availableCategories = allCategories.filter(
    (cat) => !storeCategories.some((sc) => sc.categoryId === cat.id)
  );

  // Check if a product is enabled for this store
  const isProductEnabled = (productId: string) => {
    return storeProducts.some((sp) => sp.productId === productId && sp.isActive);
  };

  // Get category summary helper
  const getCategorySummary = (categoryId: string) => {
    return categorySummary.find((s) => s.category_id === categoryId);
  };

  // Check if all products in a category are selected
  const areAllInCategorySelected = (categoryId: string) => {
    const products = filteredProductsByCategory[categoryId] || [];
    if (products.length === 0) {return false;}
    return products.every((p) => selectedProducts.has(p.id));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Store info header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{storeName}</CardTitle>
              <CardDescription>Store Management</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for Categories and Products */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">
            <Package className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="products">
            <Building2 className="h-4 w-4 mr-2" />
            Products
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store Categories</CardTitle>
                  <CardDescription>
                    Manage which product categories are available in this store
                  </CardDescription>
                </div>
                <Button onClick={() => { setAddCategoryDialogOpen(true); }} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {storeCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No categories assigned to this store yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeCategories.map((sc) => {
                      const summary = getCategorySummary(sc.categoryId);
                      return (
                        <TableRow key={sc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{sc.category.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {summary ? `${summary.enabled_products}/${summary.total_products} enabled` : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {summary && summary.enabled_products < summary.total_products && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEnableAllCategoryProducts(sc.categoryId)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Enable All
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCategory(sc.categoryId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store Products</CardTitle>
                  <CardDescription>
                    Enable or disable products for this store (organized by category)
                  </CardDescription>
                </div>
                {selectedProducts.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkToggleProducts(false)}
                    >
                      Disable Selected ({selectedProducts.size})
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleBulkToggleProducts(true)}
                    >
                      Enable Selected ({selectedProducts.size})
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category filter */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); }}
                    className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="all">All Categories</option>
                    {storeCategories.map((sc) => (
                      <option key={sc.category.id} value={sc.category.id}>
                        {sc.category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Products grouped by category */}
              {Object.keys(filteredProductsByCategory).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No products found' : 'No products available'}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(filteredProductsByCategory).map(([categoryId, products]) => {
                    const category = allCategories.find((c) => c.id === categoryId);
                    const isCollapsed = collapsedCategories.has(categoryId);
                    const allSelected = areAllInCategorySelected(categoryId);

                    return (
                      <Collapsible
                        key={categoryId}
                        open={!isCollapsed}
                        onOpenChange={() => { handleToggleCategoryCollapse(categoryId); }}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{category?.name}</span>
                            <span className="text-sm text-muted-foreground">({products.length} products)</span>
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAllInCategory(categoryId, products);
                              }}
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={() => { handleSelectAllInCategory(categoryId, products); }}
                                  />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map((product) => {
                                const isEnabled = isProductEnabled(product.id);
                                const isSelected = selectedProducts.has(product.id);
                                return (
                                  <TableRow
                                    key={product.id}
                                    className={cn(
                                      !isEnabled && 'opacity-50',
                                      isSelected && 'bg-muted/50'
                                    )}
                                  >
                                    <TableCell>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const newSelected = new Set(selectedProducts);
                                          if (e.target.checked) {
                                            newSelected.add(product.id);
                                          } else {
                                            newSelected.delete(product.id);
                                          }
                                          setSelectedProducts(newSelected);
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <span className="font-medium">{product.name}</span>
                                    </TableCell>
                                    <TableCell>₺{product.sellingPrice?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant={isEnabled ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleToggleProduct(product.id, !isEnabled)}
                                      >
                                        {isEnabled ? (
                                          <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Enabled
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Enable
                                          </>
                                        )}
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category to Store</DialogTitle>
            <DialogDescription>
              Select a category to add to this store
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {availableCategories.length === 0 ? (
              <div className="text-center text-muted-foreground">
                All categories are already assigned to this store.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleAddCategory(category.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="p-2 bg-primary/10 rounded">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="font-medium">{category.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAddCategoryDialogOpen(false); }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
