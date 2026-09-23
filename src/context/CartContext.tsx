'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string;
  quantity: number;
  sizeOptionId?: string;
  sizeName?: string;
  sizePriceCents: number;
  flavourOptionId?: string;
  flavourName?: string;
  flavourPriceCents: number;
  customMessage?: string;
  messageFeeCents: number;
  unitPriceCents: number; // base + size + flavour
  totalPriceCents: number; // (unitPrice * qty) + messageFee
  referenceImageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'cartItemId' | 'totalPriceCents'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotalCents: number;
  totalMessageFeeCents: number;
  totalCents: number;
  totalCakeCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cakecart_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('cakecart_cart', JSON.stringify(items));
      } catch {
        // ignore
      }
    }
  }, [items, isLoaded]);

  const addItem = (itemInput: Omit<CartItem, 'cartItemId' | 'totalPriceCents'>) => {
    const cartItemId = `${itemInput.productId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const totalPriceCents = itemInput.unitPriceCents * itemInput.quantity + itemInput.messageFeeCents;

    const newItem: CartItem = {
      ...itemInput,
      cartItemId,
      totalPriceCents,
    };

    setItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const totalPriceCents = item.unitPriceCents * quantity + item.messageFeeCents;
          return { ...item, quantity, totalPriceCents };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const totalMessageFeeCents = items.reduce((sum, item) => sum + item.messageFeeCents, 0);
  const totalCents = subtotalCents + totalMessageFeeCents;
  const totalCakeCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotalCents,
        totalMessageFeeCents,
        totalCents,
        totalCakeCount,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
