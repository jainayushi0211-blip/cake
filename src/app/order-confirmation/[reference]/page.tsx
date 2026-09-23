'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/components/FormatPrice';
import {
  CheckCircle2,
  Calendar,
  Clock,
  QrCode,
  Printer,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Share2,
} from 'lucide-react';

export default function OrderConfirmationPage({ params }: { params: { reference: string } }) {
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/orders/${params.reference}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load order confirmation');
        }
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [params.reference]);

  if (loading) {
    return (
      <div className="py-24 text-center text-cocoa-500 text-sm">
        Retrieving order receipt and collection pass...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4 px-4">
        <h2 className="font-serif text-2xl font-bold text-cocoa-900">Order Not Found</h2>
        <p className="text-cocoa-600 text-sm">
          Could not locate an order matching reference {params.reference}.
        </p>
        <Link href="/menu" className="text-terracotta-600 font-semibold underline text-sm">
          Return to Menu
        </Link>
      </div>
    );
  }

  const pickupDateFormatted = new Date(`${order.pickup_date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Top Success Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-soft">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="text-xs uppercase font-bold tracking-widest text-emerald-800 bg-emerald-100/80 px-3.5 py-1 rounded-full inline-block">
          Order Verified & Confirmed
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-cocoa-950">
          We&apos;re Ready for Your Celebration!
        </h1>
        <p className="text-cocoa-600 text-sm max-w-lg mx-auto">
          Your oven reservation has been locked into the schedule. A collection receipt has been sent to <strong>{order.customer_email}</strong>.
        </p>
      </div>

      {/* Collection Pass Card (QR Code & Reference) */}
      <div className="bg-cocoa-900 text-cream-50 rounded-3xl p-6 sm:p-10 shadow-elevated border border-cocoa-800 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Pass Details */}
        <div className="md:col-span-7 space-y-5">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-honey-400 font-semibold block">
              Official Bakery Collection Pass
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider text-white">
                {order.order_reference}
              </span>
              <span className="text-xs bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-cocoa-300 pt-2">
            <div className="space-y-1">
              <span className="text-cocoa-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-honey-400" /> Collection Date:
              </span>
              <span className="font-semibold text-white text-sm block">
                {pickupDateFormatted}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-cocoa-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-honey-400" /> Collection Window:
              </span>
              <span className="font-semibold text-white text-sm block">
                {order.start_time} – {order.end_time}
              </span>
            </div>
          </div>

          <div className="text-xs text-cocoa-400 pt-2 flex items-start gap-2 border-t border-cocoa-800">
            <MapPin className="w-4 h-4 text-honey-400 shrink-0 mt-0.5" />
            <span>
              Bakery Atelier: <strong>42 Patisserie Lane, Suite B</strong>. Please present this QR code to the baker upon arrival.
            </span>
          </div>
        </div>

        {/* Right QR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-soft text-cocoa-900 text-center space-y-2">
          {order.qr_code_data ? (
            <img
              src={order.qr_code_data}
              alt={`Collection QR for ${order.order_reference}`}
              className="w-44 h-44 object-contain"
            />
          ) : (
            <div className="w-44 h-44 bg-cream-100 flex items-center justify-center text-xs text-cocoa-400">
              QR Code Generated
            </div>
          )}
          <span className="text-[11px] font-mono font-bold text-cocoa-700 tracking-wider">
            SCAN AT COLLECTION
          </span>
        </div>
      </div>

      {/* Itemized Order Receipt */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-soft space-y-6">
        <div className="flex justify-between items-baseline pb-4 border-b border-cream-200">
          <h3 className="font-serif text-xl font-bold text-cocoa-950">
            Itemized Bakery Receipt
          </h3>
          <span className="text-xs text-cocoa-500">
            Payment Status: <strong className="text-emerald-700">{order.payment_status || 'SUCCEEDED'}</strong>
          </span>
        </div>

        {/* Items */}
        <div className="divide-y divide-cream-100 space-y-4">
          {order.items?.map((item: any) => (
            <div key={item.id} className="pt-4 first:pt-0 flex space-x-4">
              <div className="w-16 h-16 rounded-xl bg-cream-200 overflow-hidden shrink-0 border border-cream-300">
                <img
                  src={item.image_url || '/cakes/chocolate-fudge.jpg'}
                  alt={item.product_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-sm text-cocoa-900">
                  <span>{item.quantity}x {item.product_name}</span>
                  <span>{formatPrice(item.total_price_cents + (item.message_fee_cents || 0))}</span>
                </div>
                {item.size_name && <p className="text-cocoa-600">Size: {item.size_name}</p>}
                {item.flavour_name && <p className="text-cocoa-600">Flavour: {item.flavour_name}</p>}
                {item.custom_message && (
                  <div className="p-2 bg-cream-50 rounded border border-cream-200 text-cocoa-800 text-[11px]">
                    <span className="font-semibold text-terracotta-600">Piped Inscription:</span> &quot;{item.custom_message}&quot;
                    <span className="text-cocoa-500 block text-[10px] mt-0.5">
                      Includes +{formatPrice(item.message_fee_cents || 300)} artisan lettering fee
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cost breakdown */}
        <div className="pt-6 border-t border-cream-200 space-y-2 text-xs text-cocoa-600">
          <div className="flex justify-between">
            <span>Cakes Subtotal</span>
            <span>{formatPrice(order.subtotal_cents)}</span>
          </div>
          {order.message_fee_cents > 0 && (
            <div className="flex justify-between text-terracotta-600">
              <span>Custom Message Piping Fees</span>
              <span>+{formatPrice(order.message_fee_cents)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Bakery Presentation Box & Ribbon</span>
            <span className="text-emerald-700 font-medium">Free</span>
          </div>
          <div className="pt-3 border-t border-cream-200 flex justify-between items-baseline font-bold text-base text-cocoa-950">
            <span>Total Paid</span>
            <span className="font-serif text-2xl text-cocoa-950">
              {formatPrice(order.total_cents)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto px-6 py-3 bg-white border border-cream-300 hover:bg-cream-100 text-cocoa-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-soft"
        >
          <Printer className="w-4 h-4 text-cocoa-500" />
          <span>Print / Save Receipt</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/my-orders"
            className="flex-1 sm:flex-none px-6 py-3 bg-cream-200 hover:bg-cream-300 text-cocoa-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>View All My Orders</span>
          </Link>
          <Link
            href="/menu"
            className="flex-1 sm:flex-none px-6 py-3 bg-cocoa-900 hover:bg-cocoa-800 text-cream-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-soft"
          >
            <span>Browse More Cakes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
