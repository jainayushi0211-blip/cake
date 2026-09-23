'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/components/FormatPrice';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeItem,
    updateQuantity,
    subtotalCents,
    totalMessageFeeCents,
    totalCents,
    totalCakeCount,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cocoa-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-cream-50 shadow-elevated flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-cream-200 flex items-center justify-between bg-cream-100/60">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-cocoa-800" />
              <h2 className="font-serif text-lg font-bold text-cocoa-900">
                Your Bakery Basket ({totalCakeCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-cocoa-500 hover:text-cocoa-900 rounded-full hover:bg-cream-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 divide-y divide-cream-200/60">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-cream-200 text-cocoa-400 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-cocoa-400" />
                </div>
                <h3 className="font-serif text-lg font-medium text-cocoa-800">
                  Your basket is empty
                </h3>
                <p className="text-sm text-cocoa-500 max-w-xs mx-auto">
                  Browse our artisanal selection of signature cakes and handcrafted flavours.
                </p>
                <Link
                  href="/menu"
                  onClick={() => setIsCartOpen(false)}
                  className="inline-block px-5 py-2.5 bg-cocoa-900 text-cream-50 rounded-full text-sm font-semibold hover:bg-cocoa-800 transition-colors"
                >
                  Explore Menu
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.cartItemId} className="pt-4 first:pt-0 flex space-x-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-200 shrink-0 border border-cream-300">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-serif font-semibold text-cocoa-900 text-sm truncate">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => removeItem(item.cartItemId)}
                        className="text-cocoa-400 hover:text-terracotta-500 transition-colors ml-2"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-1 space-y-0.5 text-xs text-cocoa-600">
                      {item.sizeName && <p>Size: {item.sizeName}</p>}
                      {item.flavourName && <p>Flavour: {item.flavourName}</p>}
                      {item.customMessage && (
                        <div className="mt-1.5 p-1.5 bg-cream-100 rounded border border-cream-200 text-cocoa-800 text-[11px]">
                          <span className="font-semibold text-terracotta-600">Piped Message:</span> &quot;{item.customMessage}&quot;
                          <span className="block text-[10px] text-cocoa-500 mt-0.5">
                            (+{formatPrice(item.messageFeeCents)} piping fee)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 border border-cream-300 rounded-lg bg-cream-100 px-2 py-0.5">
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="text-cocoa-700 hover:text-cocoa-900 p-0.5"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold text-cocoa-900 px-1">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="text-cocoa-700 hover:text-cocoa-900 p-0.5"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="font-semibold text-sm text-cocoa-900">
                          {formatPrice(item.totalPriceCents)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-cream-200 bg-cream-100/60 space-y-4">
              <div className="space-y-1.5 text-xs text-cocoa-600">
                <div className="flex justify-between">
                  <span>Cakes Subtotal ({totalCakeCount} {totalCakeCount === 1 ? 'cake' : 'cakes'})</span>
                  <span className="font-medium text-cocoa-900">{formatPrice(subtotalCents)}</span>
                </div>
                {totalMessageFeeCents > 0 && (
                  <div className="flex justify-between text-terracotta-600">
                    <span>Custom Message Piping Fee</span>
                    <span className="font-medium">+{formatPrice(totalMessageFeeCents)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-cream-200 flex justify-between text-sm font-bold text-cocoa-950">
                  <span>Estimated Total</span>
                  <span className="text-base text-cocoa-950 font-serif">
                    {formatPrice(totalCents)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-cocoa-500 bg-cream-200/60 p-2.5 rounded-lg flex items-center gap-1.5">
                <span>⏱️ Requires min. 48h lead time. Choose pickup date on next step.</span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full py-3.5 px-4 bg-cocoa-900 hover:bg-cocoa-800 text-cream-50 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-soft hover:shadow-warm transition-all group"
              >
                <span>Proceed to Date & Slot Selection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
