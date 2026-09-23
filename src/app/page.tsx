'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/components/FormatPrice';
import {
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Cake,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Star,
} from 'lucide-react';

interface CapacityDay {
  id: string;
  bakeryDate: string;
  maxCakes: number;
  reservedCakes: number;
  remainingCakes: number;
  isClosed: boolean;
  isLeadTimeMet: boolean;
  isAvailable: boolean;
  slots: Array<{
    id: string;
    startTime: string;
    endTime: string;
    remainingOrders: number;
    isAvailable: boolean;
  }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePriceCents: number;
  imageUrl: string;
  sizes: any[];
  flavours: any[];
}

export default function HomePage() {
  const [capacityDays, setCapacityDays] = useState<CapacityDay[]>([]);
  const [featuredCakes, setFeaturedCakes] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [capRes, menuRes] = await Promise.all([
          fetch('/api/capacity'),
          fetch('/api/menu'),
        ]);

        const capData = await capRes.json();
        const menuData = await menuRes.json();

        if (capData.days) setCapacityDays(capData.days);
        if (menuData.products) setFeaturedCakes(menuData.products.slice(0, 4));
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    };
  };

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 bg-gradient-to-b from-cream-100/80 via-cream-50 to-cream-50 border-b border-cream-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream-200/80 border border-honey-300 text-cocoa-800 text-xs font-semibold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-honey-500" />
                <span>Strict Daily Capacity: Capped at 12–15 Cakes / Day</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-cocoa-950 leading-[1.12]">
                Bespoke Celebrations, <br />
                <span className="italic font-normal text-terracotta-500">Baked to Perfection.</span>
              </h1>

              <p className="text-cocoa-700 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Handcrafted micro-patisserie cakes layered with Valrhona ganache, organic berry compotes, and silky buttercream. Reserve your pickup date and exclusive collection slot early.
              </p>

              {/* Guarantees Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-medium text-cocoa-700">
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-lg border border-cream-200 shadow-soft">
                  <Clock className="w-3.5 h-3.5 text-honey-500" /> Min. 48h Lead Time
                </span>
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-lg border border-cream-200 shadow-soft">
                  <Calendar className="w-3.5 h-3.5 text-honey-500" /> Scheduled 2h Pickup Slots
                </span>
                <span className="flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-lg border border-cream-200 shadow-soft">
                  <ShieldCheck className="w-3.5 h-3.5 text-honey-500" /> 24h Free Cancellation
                </span>
              </div>

              {/* CTAs */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/menu"
                  className="w-full sm:w-auto px-8 py-4 bg-cocoa-900 hover:bg-cocoa-800 text-cream-50 rounded-xl font-semibold text-base shadow-warm hover:shadow-elevated transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Browse Artisanal Menu</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#capacity"
                  className="w-full sm:w-auto px-7 py-4 bg-cream-100 hover:bg-cream-200 border border-cream-300 text-cocoa-900 rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-honey-600" />
                  <span>View Live Calendar</span>
                </a>
              </div>
            </div>

            {/* Right Visual Card Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-elevated border-4 border-white bg-cream-200 aspect-[4/3]">
                  <img
                    src="/cakes/chocolate-fudge.jpg"
                    alt="Belgian Dark Chocolate Ganache"
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-cocoa-950/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                    <span className="text-honey-300 text-xs font-semibold uppercase tracking-wider">
                      Chef&apos;s Signature
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold">
                      Belgian Dark Chocolate Ganache
                    </h3>
                    <p className="text-xs text-cream-200 mt-1">
                      Starting at $48.00 • Customizable Piped Message Included
                    </p>
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-elevated border border-cream-200 hidden sm:flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-honey-100 flex items-center justify-center text-honey-600">
                    <Star className="w-6 h-6 fill-honey-500 text-honey-500" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-cocoa-900">4.9 / 5.0 Rating</span>
                    <span className="text-[11px] text-cocoa-500">Over 350+ Celebrations Baked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Capacity Calendar Glance (#capacity) */}
      <section id="capacity" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-cream-100/90 rounded-3xl p-6 sm:p-10 border border-cream-200 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 text-terracotta-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Calendar className="w-4 h-4" />
                <span>Real-Time Oven Schedule</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa-950">
                Daily Capacity & Available Pickup Windows
              </h2>
              <p className="text-cocoa-600 text-sm mt-1 max-w-2xl">
                We bake a strict maximum of cakes each day to preserve artisanal quality. Dates marked &quot;Sold Out&quot; or within the 48-hour lead time cannot accept new orders.
              </p>
            </div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa-900 hover:text-terracotta-500 shrink-0"
            >
              <span>Choose a Cake</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="text-center py-12 text-cocoa-500 text-sm">
              Checking bakery schedule...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {capacityDays.map((day) => {
                const dateInfo = formatDateDisplay(day.bakeryDate);
                const isAvail = day.isAvailable;
                const isSoldOut = !day.isClosed && day.remainingCakes === 0;

                return (
                  <div
                    key={day.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      day.isClosed
                        ? 'bg-cream-200/50 border-cream-300 opacity-60'
                        : !day.isLeadTimeMet
                        ? 'bg-cream-200/40 border-cream-300'
                        : isSoldOut
                        ? 'bg-red-50 border-red-200'
                        : day.remainingCakes <= 3
                        ? 'bg-amber-50 border-amber-200 shadow-sm'
                        : 'bg-white border-cream-200 hover:border-honey-400 shadow-soft'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cocoa-500">
                          {dateInfo.weekday}
                        </span>
                        <span className="text-xs font-semibold text-cocoa-800">
                          {dateInfo.day}
                        </span>
                      </div>

                      {/* Status pill */}
                      {day.isClosed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa-600 bg-cream-300/80 px-2 py-0.5 rounded">
                          Closed
                        </span>
                      ) : !day.isLeadTimeMet ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cocoa-600 bg-cream-200 px-2 py-0.5 rounded">
                          &lt; 48h Lead
                        </span>
                      ) : isSoldOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                          Sold Out
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                            day.remainingCakes <= 3
                              ? 'text-amber-800 bg-amber-100'
                              : 'text-emerald-800 bg-emerald-100'
                          }`}
                        >
                          {day.remainingCakes} left
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-cream-200/60 text-[11px] text-cocoa-500 flex justify-between items-center">
                      <span>
                        {day.slots.filter((s) => s.isAvailable).length} slots open
                      </span>
                      {isAvail ? (
                        <Link
                          href={`/menu?pickup=${day.bakeryDate}`}
                          className="font-bold text-terracotta-600 hover:text-terracotta-700 hover:underline"
                        >
                          Book &rarr;
                        </Link>
                      ) : (
                        <span className="text-cocoa-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Featured Signature Cakes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-terracotta-500">
            Artisan Selection
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-cocoa-950">
            Signature Patisserie Creations
          </h2>
          <p className="text-cocoa-600 text-sm">
            Every cake is baked from scratch with pure Belgian butter, cage-free eggs or eggless dacquoise, and hand-piped customized inscriptions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredCakes.map((cake) => (
            <div
              key={cake.id}
              className="bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-soft hover:shadow-warm transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] bg-cream-200 overflow-hidden">
                  <img
                    src={cake.imageUrl}
                    alt={cake.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-cocoa-900 shadow-soft">
                    From {formatPrice(cake.basePriceCents)}
                  </div>
                </div>

                <div className="p-6 space-y-2">
                  <h3 className="font-serif text-lg font-bold text-cocoa-950 group-hover:text-terracotta-600 transition-colors">
                    {cake.name}
                  </h3>
                  <p className="text-cocoa-600 text-xs line-clamp-2 leading-relaxed">
                    {cake.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  href={`/cake/${cake.slug}`}
                  className="w-full py-2.5 px-4 bg-cream-100 hover:bg-cocoa-900 hover:text-cream-50 text-cocoa-900 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Customise & Order</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-cocoa-900 text-cream-50 rounded-xl font-semibold text-sm hover:bg-cocoa-800 transition-colors shadow-soft"
          >
            <span>View Full Menu & Dietary Options</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* The Bakery Code of Quality */}
      <section className="bg-cocoa-900 text-cream-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-cocoa-800/80 p-8 rounded-3xl border border-cocoa-700/60 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-honey-400/20 text-honey-400 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-cream-100">
                48-Hour Precision Proofing
              </h3>
              <p className="text-cocoa-300 text-sm leading-relaxed">
                Great cakes cannot be rushed. Our sponges and fruit compotes mature for 48 hours to develop rich depth of flavor and tender crumb structures.
              </p>
            </div>

            <div className="bg-cocoa-800/80 p-8 rounded-3xl border border-cocoa-700/60 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-honey-400/20 text-honey-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-cream-100">
                Guaranteed Oven Capacity
              </h3>
              <p className="text-cocoa-300 text-sm leading-relaxed">
                When you reserve your pickup date, your slot is atomically locked. We never overbook our ovens or compromise on individual cake decoration.
              </p>
            </div>

            <div className="bg-cocoa-800/80 p-8 rounded-3xl border border-cocoa-700/60 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-honey-400/20 text-honey-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-cream-100">
                Custom Piped Messages
              </h3>
              <p className="text-cocoa-300 text-sm leading-relaxed">
                Personalize your cake with up to 40 characters hand-piped in dark or white chocolate lettering by our head pastry chef.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 space-y-2">
          <h2 className="font-serif text-3xl font-bold text-cocoa-950">
            Frequently Asked Questions
          </h2>
          <p className="text-cocoa-600 text-sm">
            Everything you need to know about our reservation policy, pickup windows, and custom cake options.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-6 bg-white rounded-2xl border border-cream-200 space-y-2">
            <h4 className="font-serif font-bold text-cocoa-900 text-base">
              Why is there a minimum 48-hour lead time?
            </h4>
            <p className="text-cocoa-600 text-sm leading-relaxed">
              Every CakeCart cake is baked fresh to order using artisan small-batch methods. Sponges require resting, compotes require gentle reduction, and hand piping demands precision that mass commercial bakeries bypass.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-cream-200 space-y-2">
            <h4 className="font-serif font-bold text-cocoa-900 text-base">
              How does the 24-hour cancellation cut-off work?
            </h4>
            <p className="text-cocoa-600 text-sm leading-relaxed">
              Customers can cancel eligible orders directly from the &quot;My Orders&quot; page up to 24 hours prior to the chosen pickup date. Within 24 hours, the baking process has commenced, and cancellations cannot be accepted.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-cream-200 space-y-2">
            <h4 className="font-serif font-bold text-cocoa-900 text-base">
              How do I collect my cake at the bakery?
            </h4>
            <p className="text-cocoa-600 text-sm leading-relaxed">
              Upon confirmed payment, you receive an instant Order Confirmation with a scannable Collection QR Code. Present this QR code or your order reference (e.g. CC-2026-XXXX) at our kitchen during your scheduled 2-hour window.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
