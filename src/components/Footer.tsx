import React from 'react';
import Link from 'next/link';
import { Cake, ShieldCheck, Clock, CalendarDays, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-cocoa-950 text-cream-100 pt-16 pb-12 border-t border-cocoa-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-cocoa-800/60">
          {/* Brand info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-honey-500/20 text-honey-400 flex items-center justify-center">
                <Cake className="w-5 h-5 text-honey-400" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-cream-50">
                CakeCart
              </span>
            </div>
            <p className="text-cocoa-400 text-sm leading-relaxed">
              Bespoke micro-bakery crafting small-batch celebration cakes, tiered showstoppers, and artisanal treats with strict daily oven limits.
            </p>
          </div>

          {/* Bakery Commitments */}
          <div className="space-y-3">
            <h4 className="text-honey-400 font-serif text-base font-semibold tracking-wide uppercase text-xs">
              Bakery Standards
            </h4>
            <ul className="space-y-2.5 text-sm text-cocoa-300">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
                <span><strong>48h Minimum Lead Time</strong> for proper crumb maturation & hand piping.</span>
              </li>
              <li className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
                <span><strong>Daily Capacity Caps</strong> ensure each cake receives undivided artisan attention.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
                <span><strong>24h Cancellation Cut-Off</strong> allows ingredient rescue & slot reallocation.</span>
              </li>
            </ul>
          </div>

          {/* Quick links */}
          <div className="space-y-3">
            <h4 className="text-honey-400 font-serif text-base font-semibold tracking-wide uppercase text-xs">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-cocoa-300">
              <li>
                <Link href="/menu" className="hover:text-honey-400 transition-colors">
                  Artisanal Cake Menu
                </Link>
              </li>
              <li>
                <Link href="/#capacity" className="hover:text-honey-400 transition-colors">
                  Daily Capacity & Slots
                </Link>
              </li>
              <li>
                <Link href="/my-orders" className="hover:text-honey-400 transition-colors">
                  Track or Manage Order
                </Link>
              </li>
              <li>
                <Link href="/baker" className="hover:text-honey-400 transition-colors text-honey-400/80">
                  Baker Staff Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Workshop & Pickup Hours */}
          <div className="space-y-3">
            <h4 className="text-honey-400 font-serif text-base font-semibold tracking-wide uppercase text-xs">
              Kitchen & Collection
            </h4>
            <p className="text-sm text-cocoa-300">
              Collection Kitchen: <br />
              <span className="text-cream-100">42 Patisserie Lane, Suite B</span>
            </p>
            <div className="text-xs text-cocoa-400 space-y-1">
              <p>Pickup Windows: 10:00 AM – 6:00 PM</p>
              <p>Oven Schedule: Wednesday – Sunday</p>
              <p className="text-terracotta-400">Strict hygiene & allergen segregation practiced.</p>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-cocoa-400">
          <p>© {new Date().getFullYear()} CakeCart Micro-Patisserie. Built with Next.js, Neon PostgreSQL & Drizzle ORM.</p>
          <p className="flex items-center gap-1 mt-4 sm:mt-0 text-cocoa-500">
            Hand-baked with love <Heart className="w-3.5 h-3.5 text-terracotta-500 fill-terracotta-500" />
          </p>
        </div>
      </div>
    </footer>
  );
}
