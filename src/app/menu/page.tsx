'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/components/FormatPrice';
import {
  Search,
  Filter,
  Cake,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface DietaryTag {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  imageUrl: string;
  categoryIds: string[];
  dietaryTagIds: string[];
  sizes: Array<{ id: string; name: string; price_modifier_cents: number }>;
  flavours: Array<{ id: string; name: string; price_modifier_cents: number }>;
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);
  const [selectedFlavour, setSelectedFlavour] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
        if (data.dietaryTags) setDietaryTags(data.dietaryTags);
      } catch (err) {
        console.error('Menu load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  // Collect all unique flavours and sizes across products
  const availableFlavours = useMemo(() => {
    const flavSet = new Set<string>();
    products.forEach((p) => p.flavours?.forEach((f) => flavSet.add(f.name)));
    return Array.from(flavSet);
  }, [products]);

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => p.sizes?.forEach((s) => sizeSet.add(s.name)));
    return Array.from(sizeSet);
  }, [products]);

  const toggleDietaryTag = (tagId: string) => {
    setSelectedDietaryTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Search
        if (
          searchQuery &&
          !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !product.description.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Category
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory);
          if (cat && !product.categoryIds.includes(cat.id)) return false;
        }

        // Dietary tags
        if (selectedDietaryTags.length > 0) {
          const hasAllSelected = selectedDietaryTags.every((tagId) =>
            product.dietaryTagIds.includes(tagId)
          );
          if (!hasAllSelected) return false;
        }

        // Flavour
        if (selectedFlavour !== 'all') {
          const hasFlavour = product.flavours?.some((f) => f.name === selectedFlavour);
          if (!hasFlavour) return false;
        }

        // Size
        if (selectedSize !== 'all') {
          const hasSize = product.sizes?.some((s) => s.name === selectedSize);
          if (!hasSize) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.basePriceCents - b.basePriceCents;
        if (sortBy === 'price-desc') return b.basePriceCents - a.basePriceCents;
        return 0;
      });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedDietaryTags,
    selectedFlavour,
    selectedSize,
    sortBy,
    categories,
  ]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDietaryTags([]);
    setSelectedFlavour('all');
    setSelectedSize('all');
    setSortBy('featured');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-terracotta-500">
          The Patisserie Collection
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-cocoa-950">
          Handcrafted Bespoke Cakes
        </h1>
        <p className="text-cocoa-600 text-sm sm:text-base leading-relaxed">
          Filter by category, dietary preferences, bespoke flavours, or portion sizes. Each cake is baked fresh with guaranteed daily oven allocation.
        </p>
      </div>

      {/* Search and Category Pills Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chocolate, vanilla, lemon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-cream-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cocoa-400 hover:text-cocoa-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-cocoa-900 text-white shadow-soft'
                  : 'bg-white border border-cream-300 text-cocoa-700 hover:bg-cream-100'
              }`}
            >
              All Cakes ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.slug
                    ? 'bg-cocoa-900 text-white shadow-soft'
                    : 'bg-white border border-cream-300 text-cocoa-700 hover:bg-cream-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-cocoa-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-cream-300 rounded-lg px-3 py-2 text-xs font-medium text-cocoa-800 focus:outline-none focus:ring-2 focus:ring-honey-400"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Detailed Secondary Filters: Dietary, Flavour, Size */}
        <div className="bg-cream-100/70 p-4 rounded-2xl border border-cream-200 flex flex-wrap items-center gap-6 text-xs">
          {/* Dietary Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-cocoa-800 uppercase tracking-wider text-[11px]">
              Dietary:
            </span>
            {dietaryTags.map((tag) => {
              const isSelected = selectedDietaryTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleDietaryTag(tag.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                    isSelected
                      ? 'bg-terracotta-500 border-terracotta-600 text-white font-semibold shadow-sm'
                      : 'bg-white border-cream-300 text-cocoa-700 hover:border-terracotta-400'
                  }`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.name}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Flavour Filter */}
          {availableFlavours.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-cocoa-800 uppercase tracking-wider text-[11px]">
                Flavour:
              </span>
              <select
                value={selectedFlavour}
                onChange={(e) => setSelectedFlavour(e.target.value)}
                className="bg-white border border-cream-300 rounded-lg px-2.5 py-1 text-xs text-cocoa-800 focus:outline-none"
              >
                <option value="all">All Flavours</option>
                {availableFlavours.map((flav) => (
                  <option key={flav} value={flav}>
                    {flav}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Size Filter */}
          {availableSizes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-cocoa-800 uppercase tracking-wider text-[11px]">
                Size:
              </span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="bg-white border border-cream-300 rounded-lg px-2.5 py-1 text-xs text-cocoa-800 focus:outline-none"
              >
                <option value="all">All Sizes</option>
                {availableSizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Active filter count / Clear button */}
          {(selectedDietaryTags.length > 0 ||
            selectedCategory !== 'all' ||
            selectedFlavour !== 'all' ||
            selectedSize !== 'all' ||
            searchQuery) && (
            <button
              onClick={clearAllFilters}
              className="text-terracotta-600 hover:text-terracotta-700 font-semibold underline text-xs ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-cocoa-500 text-sm">
          Loading artisanal bakery menu...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-cream-200 p-10">
          <div className="w-16 h-16 rounded-full bg-cream-100 mx-auto flex items-center justify-center text-cocoa-400">
            <Cake className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-cocoa-900">
            No cakes match your active filters
          </h3>
          <p className="text-cocoa-600 text-sm max-w-md mx-auto">
            Try resetting your dietary tag or size selections to see our complete range of handcrafted celebration cakes.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-6 py-2.5 bg-cocoa-900 text-white rounded-full text-xs font-semibold hover:bg-cocoa-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
            const productTags = dietaryTags.filter((t) =>
              product.dietaryTagIds.includes(t.id)
            );

            return (
              <div
                key={product.id}
                className="bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-soft hover:shadow-warm transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-cream-200 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cocoa-950 shadow-soft">
                      From {formatPrice(product.basePriceCents)}
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    {/* Dietary Badges */}
                    {productTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {productTags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-cream-100 text-cocoa-700 px-2 py-0.5 rounded-full border border-cream-200"
                          >
                            <span>{t.icon}</span>
                            <span>{t.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="font-serif text-xl font-bold text-cocoa-950 group-hover:text-terracotta-600 transition-colors">
                      {product.name}
                    </h2>

                    <p className="text-cocoa-600 text-xs sm:text-sm leading-relaxed line-clamp-2">
                      {product.description}
                    </p>

                    {/* Options snippet */}
                    <div className="pt-2 text-[11px] text-cocoa-500 flex items-center gap-3">
                      <span>{product.sizes?.length || 4} Portion Sizes</span>
                      <span>•</span>
                      <span>{product.flavours?.length || 4} Gourmet Flavours</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <Link
                    href={`/cake/${product.slug}`}
                    className="w-full py-3 px-4 bg-cocoa-900 hover:bg-cocoa-800 text-cream-50 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-soft"
                  >
                    <span>Customise & Order</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
