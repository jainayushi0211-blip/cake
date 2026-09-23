'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/components/FormatPrice';
import { useCart } from '@/context/CartContext';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ShoppingBag,
  Upload,
  Check,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  priceModifierCents: number;
  isDefault: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  imageUrl: string;
  sizes: Array<{ id: string; name: string; price_modifier_cents: number; is_default: boolean }>;
  flavours: Array<{ id: string; name: string; price_modifier_cents: number; is_default: boolean }>;
  dietaryTagIds: string[];
}

export default function CakeCustomizerPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [dietaryTags, setDietaryTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Customization State
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [selectedFlavourId, setSelectedFlavourId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    async function loadCake() {
      try {
        const res = await fetch('/api/menu');
        const data = await res.json();
        const found = data.products?.find((p: any) => p.slug === params.slug);
        if (found) {
          setProduct(found);
          const defaultSize = found.sizes.find((s: any) => s.is_default) || found.sizes[0];
          const defaultFlavour = found.flavours.find((f: any) => f.is_default) || found.flavours[0];
          if (defaultSize) setSelectedSizeId(defaultSize.id);
          if (defaultFlavour) setSelectedFlavourId(defaultFlavour.id);
        }
        if (data.dietaryTags) setDietaryTags(data.dietaryTags);
      } catch (err) {
        console.error('Error fetching cake:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCake();
  }, [params.slug]);

  // Selected size and flavour objects
  const selectedSize = useMemo(() => {
    return product?.sizes.find((s) => s.id === selectedSizeId);
  }, [product, selectedSizeId]);

  const selectedFlavour = useMemo(() => {
    return product?.flavours.find((f) => f.id === selectedFlavourId);
  }, [product, selectedFlavourId]);

  // Pricing calculations
  const basePrice = product?.basePriceCents || 0;
  const sizeModifier = selectedSize?.price_modifier_cents || 0;
  const flavourModifier = selectedFlavour?.price_modifier_cents || 0;
  const messageFee = customMessage.trim().length > 0 ? 300 : 0; // $3.00 = 300 cents
  const unitPrice = basePrice + sizeModifier + flavourModifier;
  const totalItemPrice = unitPrice * quantity + messageFee;

  // 40 Character limit handler
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 40) {
      setCustomMessage(val);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        setReferenceImageUrl(data.url);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.imageUrl,
      quantity,
      sizeOptionId: selectedSize?.id,
      sizeName: selectedSize?.name,
      sizePriceCents: sizeModifier,
      flavourOptionId: selectedFlavour?.id,
      flavourName: selectedFlavour?.name,
      flavourPriceCents: flavourModifier,
      customMessage: customMessage.trim() || undefined,
      messageFeeCents: messageFee,
      unitPriceCents: unitPrice,
      referenceImageUrl: referenceImageUrl || undefined,
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-cocoa-500 text-sm">
        Preparing customizer atelier...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-cocoa-900">Cake Not Found</h2>
        <Link href="/menu" className="text-terracotta-600 underline font-semibold">
          Return to Menu
        </Link>
      </div>
    );
  }

  const cakeDietary = dietaryTags.filter((t) => product.dietaryTagIds.includes(t.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button */}
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cocoa-600 hover:text-cocoa-900 transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Bakery Menu</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Visual Showcase & Piped Message Preview */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative rounded-3xl overflow-hidden shadow-warm border-4 border-white bg-cream-200 aspect-[4/3]">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />

            {/* Live Piped Message Overlay Ribbon */}
            {customMessage.trim().length > 0 && (
              <div className="absolute bottom-6 inset-x-6">
                <div className="bg-cocoa-950/85 backdrop-blur-md text-honey-300 py-2.5 px-4 rounded-xl text-center shadow-elevated border border-honey-400/40">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-honey-400 block mb-0.5">
                    Live Piped Inscription Preview
                  </span>
                  <span className="font-serif text-base sm:text-lg italic font-semibold text-white tracking-wide">
                    &quot;{customMessage}&quot;
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reference Image Preview if uploaded */}
          {referenceImageUrl && (
            <div className="p-4 bg-white rounded-2xl border border-cream-200 flex items-center gap-4">
              <img
                src={referenceImageUrl}
                alt="Reference design"
                className="w-16 h-16 rounded-xl object-cover border border-cream-300"
              />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-cocoa-900 block">Customer Reference Photo Attached</span>
                <span className="text-cocoa-500">Chef will review your decorative reference during baking.</span>
              </div>
              <button
                onClick={() => setReferenceImageUrl('')}
                className="text-xs text-terracotta-600 hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {/* Bakery Lead Time Reminder */}
          <div className="p-4 rounded-2xl bg-cream-100/90 border border-cream-200 flex items-start gap-3 text-xs text-cocoa-700">
            <Clock className="w-5 h-5 text-honey-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cocoa-900 block">
                Minimum 48-Hour Advance Notice Required
              </span>
              <span>
                To ensure flavor depth and structural integrity, all cakes require at least 48 hours notice. You will select your pickup date and 2-hour collection slot at checkout.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Customizer Controls */}
        <div className="lg:col-span-6 space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-cream-200 shadow-soft">
          {/* Title & Description */}
          <div className="space-y-3 pb-6 border-b border-cream-200">
            {cakeDietary.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cakeDietary.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-cream-100 text-cocoa-700 px-2.5 py-1 rounded-full border border-cream-200"
                  >
                    <span>{t.icon}</span>
                    <span>{t.name}</span>
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-serif text-3xl font-bold text-cocoa-950">
              {product.name}
            </h1>
            <p className="text-cocoa-600 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* 1. Size Selection */}
          <div className="space-y-3">
            <label className="block text-xs uppercase font-bold tracking-wider text-cocoa-800">
              1. Select Portion Size
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.sizes.map((size) => {
                const isSelected = size.id === selectedSizeId;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSizeId(size.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex justify-between items-center ${
                      isSelected
                        ? 'border-cocoa-900 bg-cream-100/90 ring-1 ring-cocoa-900 shadow-sm'
                        : 'border-cream-300 hover:border-cream-400 bg-white'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-xs text-cocoa-900 block">
                        {size.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-cocoa-700 shrink-0">
                      {size.price_modifier_cents > 0
                        ? `+${formatPrice(size.price_modifier_cents)}`
                        : 'Base'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Flavour Selection */}
          <div className="space-y-3">
            <label className="block text-xs uppercase font-bold tracking-wider text-cocoa-800">
              2. Select Gourmet Sponge & Core Flavour
            </label>
            <div className="space-y-2">
              {product.flavours.map((flav) => {
                const isSelected = flav.id === selectedFlavourId;
                return (
                  <button
                    key={flav.id}
                    type="button"
                    onClick={() => setSelectedFlavourId(flav.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex justify-between items-center ${
                      isSelected
                        ? 'border-cocoa-900 bg-cream-100/90 ring-1 ring-cocoa-900 shadow-sm'
                        : 'border-cream-300 hover:border-cream-400 bg-white'
                    }`}
                  >
                    <span className="font-semibold text-xs text-cocoa-900">
                      {flav.name}
                    </span>
                    <span className="text-xs font-bold text-cocoa-700">
                      {flav.price_modifier_cents > 0
                        ? `+${formatPrice(flav.price_modifier_cents)}`
                        : 'Included'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Custom Piped Message (Strict 40 chars limit) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs uppercase font-bold tracking-wider text-cocoa-800">
                3. Piped Cake Inscription (Optional)
              </label>
              <span
                className={`text-[11px] font-bold ${
                  customMessage.length >= 38
                    ? 'text-red-600'
                    : customMessage.length > 0
                    ? 'text-terracotta-600'
                    : 'text-cocoa-400'
                }`}
              >
                {customMessage.length} / 40 chars
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={40}
                placeholder="e.g. Happy 30th Birthday Ayushi!"
                value={customMessage}
                onChange={handleMessageChange}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-cocoa-500 pt-0.5">
              <span>Hand-piped in dark or white chocolate lettering.</span>
              <span className="font-semibold text-terracotta-600">
                {customMessage.trim().length > 0 ? '+$3.00 Artisan Piping Fee' : 'No fee if blank'}
              </span>
            </div>
          </div>

          {/* 4. Customer Reference Image Upload */}
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold tracking-wider text-cocoa-800">
              4. Decorative Reference Photo (Optional)
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-cream-300 hover:border-cocoa-700 bg-cream-50 text-xs font-semibold text-cocoa-800 flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-cocoa-500" />
                <span>{uploadingImage ? 'Uploading photo...' : 'Upload Inspiration Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
              {referenceImageUrl && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Photo attached
                </span>
              )}
            </div>
          </div>

          {/* Pricing & Add to Cart Section */}
          <div className="pt-6 border-t border-cream-200 space-y-4">
            <div className="space-y-1.5 text-xs text-cocoa-600">
              <div className="flex justify-between">
                <span>Base Cake</span>
                <span>{formatPrice(basePrice)}</span>
              </div>
              {sizeModifier > 0 && (
                <div className="flex justify-between">
                  <span>Size Upgrade ({selectedSize?.name})</span>
                  <span>+{formatPrice(sizeModifier)}</span>
                </div>
              )}
              {flavourModifier > 0 && (
                <div className="flex justify-between">
                  <span>Flavour Infusion ({selectedFlavour?.name})</span>
                  <span>+{formatPrice(flavourModifier)}</span>
                </div>
              )}
              {messageFee > 0 && (
                <div className="flex justify-between text-terracotta-600">
                  <span>Piped Message Fee</span>
                  <span>+{formatPrice(messageFee)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-cream-200 flex justify-between items-baseline">
                <span className="font-bold text-sm text-cocoa-900">Total Price</span>
                <span className="font-serif text-2xl font-bold text-cocoa-950">
                  {formatPrice(totalItemPrice)}
                </span>
              </div>
            </div>

            {/* Quantity and Add to Cart Button */}
            <div className="flex gap-4">
              <div className="flex items-center border border-cream-300 rounded-xl bg-cream-50 px-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="text-cocoa-600 hover:text-cocoa-900 font-bold px-2 py-1 text-sm"
                >
                  -
                </button>
                <span className="font-bold text-sm text-cocoa-900 px-3">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="text-cocoa-600 hover:text-cocoa-900 font-bold px-2 py-1 text-sm"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-4 px-6 bg-cocoa-900 hover:bg-cocoa-800 text-cream-50 rounded-xl font-semibold text-sm shadow-warm hover:shadow-elevated transition-all flex items-center justify-center gap-2 group"
              >
                <ShoppingBag className="w-4 h-4 text-honey-400 group-hover:scale-110 transition-transform" />
                <span>Add to Basket • {formatPrice(totalItemPrice)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
