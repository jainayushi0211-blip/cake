'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ShoppingBag, User as UserIcon, Cake, Menu as MenuIcon, X, ChefHat, Calendar } from 'lucide-react';

export default function Header() {
  const { totalCakeCount, setIsCartOpen } = useCart();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur-md border-b border-cream-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-full bg-cocoa-900 text-honey-400 flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-cocoa-900 block leading-tight">
                CakeCart
              </span>
              <span className="text-[10px] uppercase tracking-widest text-terracotta-500 font-semibold block">
                Artisanal Patisserie
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/menu"
              className="text-cocoa-800 hover:text-terracotta-500 font-medium text-sm transition-colors"
            >
              Browse Menu
            </Link>
            <Link
              href="/#capacity"
              className="text-cocoa-800 hover:text-terracotta-500 font-medium text-sm transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-honey-500" />
              Pickup Calendar
            </Link>
            <Link
              href="/my-orders"
              className="text-cocoa-800 hover:text-terracotta-500 font-medium text-sm transition-colors"
            >
              My Orders
            </Link>
            {user?.role === 'baker' && (
              <Link
                href="/baker"
                className="bg-cocoa-800 text-honey-300 hover:bg-cocoa-900 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <ChefHat className="w-3.5 h-3.5 text-honey-400" />
                Baker Dashboard
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* User Auth Info */}
            <div className="hidden sm:flex items-center">
              {user ? (
                <div className="flex items-center space-x-3 text-sm">
                  <div className="text-right">
                    <span className="block font-medium text-cocoa-900 text-xs">{user.name}</span>
                    <span className="text-[11px] text-cocoa-500 capitalize">{user.role}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="text-xs text-terracotta-600 hover:text-terracotta-700 underline font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="flex items-center space-x-1.5 text-sm font-medium text-cocoa-800 hover:text-terracotta-500 px-3 py-1.5 rounded-lg hover:bg-cream-100 transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-cream-100 hover:bg-cream-200 text-cocoa-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-honey-400"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5 text-cocoa-800" />
              {totalCakeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-terracotta-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {totalCakeCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-cocoa-800 hover:bg-cream-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-cream-200 space-y-3">
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-cocoa-900 hover:bg-cream-100"
            >
              Browse Menu
            </Link>
            <Link
              href="/#capacity"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-cocoa-900 hover:bg-cream-100"
            >
              Pickup Calendar
            </Link>
            <Link
              href="/my-orders"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md font-medium text-cocoa-900 hover:bg-cream-100"
            >
              My Orders
            </Link>
            {user?.role === 'baker' && (
              <Link
                href="/baker"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md font-medium text-honey-600 bg-cocoa-900 text-white"
              >
                Baker Dashboard
              </Link>
            )}
            <div className="pt-2 border-t border-cream-200 px-3">
              {user ? (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-cocoa-800">{user.name}</span>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-terracotta-600 font-semibold"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-sm font-medium text-cocoa-900 bg-cream-200 rounded-lg"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
