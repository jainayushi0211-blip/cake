'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/components/FormatPrice';
import {
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Search,
  ChevronRight,
  QrCode,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface OrderItem {
  id: string;
  order_reference: string;
  customer_name: string;
  customer_email: string;
  pickup_date: string;
  status: string;
  subtotal_cents: number;
  message_fee_cents: number;
  total_cents: number;
  start_time: string;
  end_time: string;
  item_count: number;
  qr_code_data: string;
  created_at: string;
}

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [lookupEmail, setLookupEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<OrderItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOrders = async (email?: string) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const url = email ? `/api/orders?email=${encodeURIComponent(email)}` : '/api/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const handleEmailLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupEmail.trim()) {
      fetchOrders(lookupEmail.trim());
    }
  };

  // 24-hour Cut-Off calculation
  const getCancellationEligibility = (order: OrderItem) => {
    if (['CANCELLED', 'EXPIRED', 'COLLECTED', 'REFUNDED'].includes(order.status)) {
      return { eligible: false, reason: `Order is already ${order.status.toLowerCase()}` };
    }

    const now = new Date();
    const pickupDateTime = new Date(`${order.pickup_date}T10:00:00Z`);
    const hoursUntil = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 24) {
      return {
        eligible: false,
        reason: 'Within 24-hour cut-off window. Ingredients are in oven prep.',
        hoursRemaining: Math.max(0, Math.round(hoursUntil)),
      };
    }

    return {
      eligible: true,
      reason: 'Eligible for online cancellation and immediate capacity release.',
      hoursRemaining: Math.round(hoursUntil),
    };
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrderForCancel) return;

    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/orders/${selectedOrderForCancel.order_reference}/cancel`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order.');
      }

      setActionMessage({
        type: 'success',
        text: `Order ${selectedOrderForCancel.order_reference} has been cancelled and oven capacity was released.`,
      });

      // Refresh orders list
      if (user) {
        fetchOrders();
      } else if (lookupEmail) {
        fetchOrders(lookupEmail);
      }
      setSelectedOrderForCancel(null);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold text-cocoa-950">
          My Bakery Orders
        </h1>
        <p className="text-cocoa-600 text-sm">
          Track upcoming celebration pickups, view scannable collection QR passes, and manage bookings.
        </p>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Guest Email Lookup Bar if not logged in */}
      {!user && (
        <div className="bg-cream-100 p-6 rounded-3xl border border-cream-200 space-y-3">
          <h2 className="font-serif text-base font-bold text-cocoa-900">
            Guest Order Lookup
          </h2>
          <p className="text-xs text-cocoa-600">
            Enter the email address used during checkout to retrieve your collection pass and status:
          </p>
          <form onSubmit={handleEmailLookup} className="flex gap-2 max-w-md">
            <input
              type="email"
              required
              placeholder="customer@example.com"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 bg-white"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-cocoa-900 text-white rounded-xl text-xs font-semibold hover:bg-cocoa-800 transition-colors shrink-0"
            >
              Lookup
            </button>
          </form>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-cocoa-500">Searching orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-cream-200 p-8 space-y-4">
            <Calendar className="w-12 h-12 text-cocoa-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-cocoa-900">
              No orders found
            </h3>
            <p className="text-xs text-cocoa-500 max-w-sm mx-auto">
              You do not have any active or past orders. Browse our artisanal menu to plan your next celebration.
            </p>
            <Link
              href="/menu"
              className="inline-block px-6 py-2.5 bg-cocoa-900 text-white rounded-xl text-xs font-semibold"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const eligibility = getCancellationEligibility(order);
            const dateLabel = new Date(`${order.pickup_date}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft space-y-4 hover:shadow-warm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cream-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-cocoa-900">
                        {order.order_reference}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          order.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'BAKING'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'READY'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'COLLECTED'
                            ? 'bg-purple-100 text-purple-800'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-cream-200 text-cocoa-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xs text-cocoa-500">
                      Booked for {order.customer_name} ({order.customer_email})
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-serif text-xl font-bold text-cocoa-950 block">
                      {formatPrice(order.total_cents)}
                    </span>
                    <span className="text-xs text-cocoa-500">
                      {order.item_count} item{order.item_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Pickup Window Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-cocoa-700 py-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-honey-600" />
                    <span>Collection Date: <strong>{dateLabel}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-honey-600" />
                    <span>Window: <strong>{order.start_time} – {order.end_time}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Link
                      href={`/order-confirmation/${order.order_reference}`}
                      className="text-terracotta-600 hover:text-terracotta-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>View Collection Pass</span>
                    </Link>
                  </div>
                </div>

                {/* Cancellation Section */}
                <div className="pt-3 border-t border-cream-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="text-cocoa-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-honey-500 shrink-0" />
                    <span>{eligibility.reason}</span>
                  </div>

                  {eligibility.eligible && (
                    <button
                      onClick={() => setSelectedOrderForCancel(order)}
                      className="px-4 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {selectedOrderForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-cocoa-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-elevated space-y-5 border border-cream-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl font-bold text-cocoa-950">
                Cancel Order {selectedOrderForCancel.order_reference}?
              </h3>
              <p className="text-xs text-cocoa-600 leading-relaxed">
                You are cancelling this order more than 24 hours prior to pickup. Your reserved oven capacity and pickup slot will be released immediately back to the bakery schedule.
              </p>
            </div>

            <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total to be refunded:</span>
                <span className="font-bold text-cocoa-900">
                  {formatPrice(selectedOrderForCancel.total_cents)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForCancel(null)}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-cream-100 hover:bg-cream-200 text-cocoa-800 font-semibold rounded-xl text-xs transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                {cancelling ? 'Releasing Slot...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
