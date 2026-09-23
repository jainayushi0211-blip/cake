'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Cake, Lock, Mail, User, Phone, AlertCircle, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await register(email, password, name, phone);
    if (!res.success) {
      setError(res.error || 'Failed to create account');
      setLoading(false);
    } else {
      router.push('/menu');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-cream-200 shadow-warm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-cocoa-900 text-honey-400 mx-auto flex items-center justify-center">
            <Cake className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-cocoa-950">
            Create Your Account
          </h1>
          <p className="text-xs text-cocoa-600">
            Join CakeCart to save past celebrations, manage collections, and receive custom cake updates.
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
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ayushi Sharma"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cocoa-800 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ayushi@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cocoa-800 mb-1">
              Mobile Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cocoa-800 mb-1">
              Password * (Min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cocoa-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
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
            <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <p className="text-center text-xs text-cocoa-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-terracotta-600 font-semibold underline">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
}
