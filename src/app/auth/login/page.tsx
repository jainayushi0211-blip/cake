'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Cake, Lock, Mail, ChefHat, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Failed to sign in');
      setLoading(false);
    } else {
      router.push('/menu');
    }
  };

  const quickFill = (userEmail: string, pass: string) => {
    setEmail(userEmail);
    setPassword(pass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-cream-200 shadow-warm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-cocoa-900 text-honey-400 mx-auto flex items-center justify-center">
            <Cake className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-cocoa-950">
            Welcome to CakeCart
          </h1>
          <p className="text-xs text-cocoa-600">
            Sign in to track orders, access your collection pass, or enter the bakery atelier.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-cocoa-800 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cocoa-800 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-cocoa-900 hover:bg-cocoa-800 disabled:opacity-50 text-cream-50 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-soft"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Quick-Fill Buttons */}
        <div className="pt-2 border-t border-cream-200 space-y-2">
          <span className="text-[11px] font-semibold text-cocoa-500 uppercase tracking-wider block text-center">
            Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickFill('baker@cakecart.com', 'BakerPass123!')}
              className="p-2 rounded-lg bg-cream-100 hover:bg-cream-200 border border-cream-200 text-cocoa-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ChefHat className="w-3.5 h-3.5 text-honey-600" />
              <span>Head Baker</span>
            </button>
            <button
              type="button"
              onClick={() => quickFill('customer@example.com', 'CustomerPass123!')}
              className="p-2 rounded-lg bg-cream-100 hover:bg-cream-200 border border-cream-200 text-cocoa-800 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-terracotta-500" />
              <span>Customer</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-cocoa-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-terracotta-600 font-semibold underline">
            Register Here
          </Link>
        </p>
      </div>
    </div>
  );
}
