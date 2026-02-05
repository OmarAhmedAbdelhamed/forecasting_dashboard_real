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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shared/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/shared/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shared/card';
import { FolderTree, Package, Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Category, Product } from '@/types/auth';

interface CategoryWithStoreCount extends Category {
  storeCount?: number;
}

interface ProductWithStoreCount extends Product {
  store_count?: number;
}

export function CategoryManagementSection() {
  // Categories state
  const [categories, setCategories] = useState<CategoryWithStoreCount[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  // Products state
  const [products, setProducts] = useState<ProductWithStoreCount[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    categoryId: '',
    barcode: '',
    description: '',
    unit: '',
    costPrice: '',
    sellingPrice: '',
    vatRate: '',
    isActive: true,
  });
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoryLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) {throw error;}

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoryLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('name');

      if (error) {throw error;}

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setProductLoading(false);
    }
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategorySubmitting(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryFormData)
          .eq('id', editingCategory.id);

        if (error) {throw error;}
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(categoryFormData);

        if (error) {throw error;}
      }

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleEditCategory = (category: CategoryWithStoreCount) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {return;}

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Product handlers
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSubmitting(true);

    try {
      const submitData = {
        name: productFormData.name,
        category_id: productFormData.categoryId,
        barcode: productFormData.barcode || null,
        description: productFormData.description || null,
        unit: productFormData.unit || null,
        cost_price: productFormData.costPrice ? parseFloat(productFormData.costPrice) : null,
        selling_price: productFormData.sellingPrice ? parseFloat(productFormData.sellingPrice) : null,
        vat_rate: productFormData.vatRate ? parseFloat(productFormData.vatRate) : null,
        is_active: productFormData.isActive,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(submitData)
          .eq('id', editingProduct.id);

        if (error) {throw error;}
      } else {
        const { error } = await supabase
          .from('products')
          .insert(submitData);

        if (error) {throw error;}
      }

      setProductDialogOpen(false);
      setEditingProduct(null);
      setProductFormData({
        name: '',
        categoryId: '',
        barcode: '',
        description: '',
        unit: '',
        costPrice: '',
        sellingPrice: '',
        vatRate: '',
        isActive: true,
      });
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleEditProduct = (product: ProductWithStoreCount) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      categoryId: product.categoryId,
      barcode: product.barcode || '',
      description: product.description || '',
      unit: product.unit || '',
      costPrice: product.costPrice?.toString() || '',
      sellingPrice: product.sellingPrice?.toString() || '',
      vatRate: product.vatRate?.toString() || '',
      isActive: product.isActive ?? true,
    });
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {return;}

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {throw error;}
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Filter functions
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      (category.description?.toLowerCase().includes(categorySearchTerm.toLowerCase()) ?? false)
  );

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedProductCategory === 'all' || product.categoryId === selectedProductCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (product.barcode?.toLowerCase().includes(productSearchTerm.toLowerCase()) ?? false) ||
      (product.description?.toLowerCase().includes(productSearchTerm.toLowerCase()) ?? false);
    return matchesCategory && matchesSearch;
  });

  const isLoading = categoryLoading || productLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FolderTree className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Catalog Management</CardTitle>
              <CardDescription>Manage product categories and products</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">
              <FolderTree className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Manage product categories</CardDescription>
                  </div>
                  <Button onClick={() => { setCategoryDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={categorySearchTerm}
                      onChange={(e) => { setCategorySearchTerm(e.target.value); }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {categorySearchTerm ? 'No categories found' : 'No categories yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-mono text-xs">{category.id.slice(0, 8)}...</TableCell>
                          <TableCell>{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { handleEditCategory(category); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>Manage product catalog</CardDescription>
                  </div>
                  <Button onClick={() => { setProductDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                {/* Filters */}
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Category:</label>
                      <select
                        value={selectedProductCategory}
                        onChange={(e) => { setSelectedProductCategory(e.target.value); }}
                        className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={productSearchTerm}
                          onChange={(e) => { setProductSearchTerm(e.target.value); }}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>VAT %</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          {productSearchTerm ? 'No products found' : 'No products yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono text-xs">{product.id.slice(0, 8)}...</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.category?.name || '-'}</TableCell>
                          <TableCell>{product.unit || '-'}</TableCell>
                          <TableCell>₺{product.costPrice?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>₺{product.sellingPrice?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>{product.vatRate ?? '-'}%</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                product.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {product.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { handleEditProduct(product); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details'
                : 'Add a new product category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={categoryFormData.name}
                  onChange={(e) => { setCategoryFormData({ ...categoryFormData, name: e.target.value }); }}
                  placeholder="e.g., Gıda"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => { setCategoryFormData({ ...categoryFormData, description: e.target.value }); }}
                  placeholder="Category description..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCategoryDialogOpen(false);
                  setEditingCategory(null);
                  setCategoryFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={categorySubmitting}>
                {categorySubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details'
                : 'Add a new product to the catalog'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProductSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={productFormData.name}
                  onChange={(e) => { setProductFormData({ ...productFormData, name: e.target.value }); }}
                  placeholder="e.g., Süt"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  value={productFormData.categoryId}
                  onChange={(e) => { setProductFormData({ ...productFormData, categoryId: e.target.value }); }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Barcode</label>
                <Input
                  value={productFormData.barcode}
                  onChange={(e) => { setProductFormData({ ...productFormData, barcode: e.target.value }); }}
                  placeholder="e.g., 869000000001"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={productFormData.unit}
                  onChange={(e) => { setProductFormData({ ...productFormData, unit: e.target.value }); }}
                  placeholder="e.g., adet, kg, litre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={productFormData.costPrice}
                  onChange={(e) => { setProductFormData({ ...productFormData, costPrice: e.target.value }); }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Selling Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={productFormData.sellingPrice}
                  onChange={(e) => { setProductFormData({ ...productFormData, sellingPrice: e.target.value }); }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">VAT Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={productFormData.vatRate}
                  onChange={(e) => { setProductFormData({ ...productFormData, vatRate: e.target.value }); }}
                  placeholder="8.00"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={productFormData.description}
                  onChange={(e) => { setProductFormData({ ...productFormData, description: e.target.value }); }}
                  placeholder="Product description..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={productFormData.isActive}
                  onChange={(e) => { setProductFormData({ ...productFormData, isActive: e.target.checked }); }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  Active
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProductDialogOpen(false);
                  setEditingProduct(null);
                  setProductFormData({
                    name: '',
                    categoryId: '',
                    barcode: '',
                    description: '',
                    unit: '',
                    costPrice: '',
                    sellingPrice: '',
                    vatRate: '',
                    isActive: true,
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={productSubmitting}>
                {productSubmitting ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
