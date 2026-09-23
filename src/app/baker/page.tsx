'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/components/FormatPrice';
import {
  ChefHat,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldAlert,
  ArrowRight,
  Sliders,
  RefreshCw,
  Power,
  Search,
} from 'lucide-react';

export default function BakerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'capacity' | 'scanner'>('orders');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Capacity State
  const [capacityDays, setCapacityDays] = useState<any[]>([]);
  const [updatingCapacity, setUpdatingCapacity] = useState(false);

  // Scanner State
  const [scanRef, setScanRef] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Load orders for selected date
  const fetchOrders = async (dateStr?: string) => {
    setLoadingOrders(true);
    try {
      const url = dateStr ? `/api/baker/orders?date=${dateStr}` : '/api/baker/orders';
      const res = await fetch(url);
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error('Baker fetch orders failed:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load capacity days
  const fetchCapacity = async () => {
    try {
      const res = await fetch('/api/capacity');
      const data = await res.json();
      if (data.days) setCapacityDays(data.days);
    } catch (err) {
      console.error('Failed to fetch capacity:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'baker') {
      fetchOrders(selectedDate);
      fetchCapacity();
    }
  }, [user, selectedDate]);

  // Update order status: BAKING, READY, COLLECTED
  const handleUpdateStatus = async (orderReference: string, newStatus: string) => {
    setStatusUpdating(orderReference);
    try {
      const res = await fetch('/api/baker/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderReference, newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Update local orders
      setOrders((prev) =>
        prev.map((o) => (o.order_reference === orderReference ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(null);
    }
  };

  // Update max cakes or close date
  const handleCapacityChange = async (bakeryDate: string, maxCakes: number, isClosed: boolean) => {
    setUpdatingCapacity(true);
    try {
      const res = await fetch('/api/baker/capacity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bakeryDate, maxCakes, isClosed }),
      });
      if (res.ok) {
        await fetchCapacity();
      }
    } catch (err) {
      console.error('Failed to change capacity:', err);
    } finally {
      setUpdatingCapacity(false);
    }
  };

  // Verify and collect order via scan/reference lookup
  const handleScanLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanRef.trim()) return;

    try {
      const res = await fetch(`/api/orders/${scanRef.trim()}`);
      const data = await res.json();
      if (res.ok && data.order) {
        setScanResult(data.order);
      } else {
        setScanResult({ error: data.error || 'No order found with this reference' });
      }
    } catch (err: any) {
      setScanResult({ error: err.message });
    }
  };

  if (authLoading) {
    return (
      <div className="py-24 text-center text-xs text-cocoa-500">Checking baker credentials...</div>
    );
  }

  // Not authorized
  if (!user || user.role !== 'baker') {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
          <ChefHat className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-cocoa-950">
            Baker Control Center
          </h1>
          <p className="text-xs text-cocoa-600">
            This workspace is reserved for head bakery staff to manage oven baking schedules, set daily capacity, and process customer collections.
          </p>
        </div>

        <div className="p-4 bg-cream-100 rounded-2xl border border-cream-200 text-xs text-cocoa-700 text-left space-y-1">
          <span className="font-bold text-cocoa-900 block">Baker Demo Credentials:</span>
          <span>Email: <strong>baker@cakecart.com</strong></span>
          <br />
          <span>Password: <strong>BakerPass123!</strong></span>
        </div>

        <Link
          href="/auth/login"
          className="inline-block w-full py-3 bg-cocoa-900 text-white rounded-xl text-xs font-semibold hover:bg-cocoa-800 transition-colors shadow-soft"
        >
          Sign In as Head Baker
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Baker Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cream-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cocoa-900 text-honey-400 flex items-center justify-center">
              <ChefHat className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-cocoa-950">
              Baker Atelier Dashboard
            </h1>
          </div>
          <p className="text-xs text-cocoa-600">
            Welcome, <strong>{user.name}</strong> • Kitchen Station: Main Patisserie Oven
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-cream-200/80 p-1 rounded-xl gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'orders' ? 'bg-cocoa-900 text-white shadow-soft' : 'text-cocoa-700 hover:text-cocoa-950'
            }`}
          >
            Orders Schedule
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'capacity' ? 'bg-cocoa-900 text-white shadow-soft' : 'text-cocoa-700 hover:text-cocoa-950'
            }`}
          >
            Capacity & Closures
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'scanner' ? 'bg-cocoa-900 text-white shadow-soft' : 'text-cocoa-700 hover:text-cocoa-950'
            }`}
          >
            Collection Desk
          </button>
        </div>
      </div>

      {/* TAB 1: ORDERS SCHEDULE */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Date Filter & Refresh */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-cream-100/80 p-4 rounded-2xl border border-cream-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-cocoa-800">Filter Pickup Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-cream-300 text-xs bg-white text-cocoa-900"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="text-xs text-cocoa-500 hover:text-cocoa-800 underline"
                >
                  View All Dates
                </button>
              )}
            </div>

            <button
              onClick={() => fetchOrders(selectedDate)}
              className="px-3.5 py-1.5 bg-white border border-cream-300 rounded-lg text-xs font-semibold text-cocoa-800 hover:bg-cream-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Schedule</span>
            </button>
          </div>

          {/* Orders Grid */}
          {loadingOrders ? (
            <div className="py-12 text-center text-xs text-cocoa-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-cream-200 text-xs text-cocoa-500">
              No orders scheduled for this date.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-6 border border-cream-200 shadow-soft space-y-4 hover:shadow-warm transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cream-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold text-cocoa-950">
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

                    <div className="flex items-center gap-3 text-xs text-cocoa-600">
                      <span>Pickup: <strong>{order.pickup_date}</strong> ({order.start_time} – {order.end_time})</span>
                      <span>•</span>
                      <span>Customer: <strong>{order.customer_name}</strong> ({order.customer_phone})</span>
                    </div>
                  </div>

                  {/* Items Specification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <span className="font-semibold text-cocoa-800 uppercase tracking-wider text-[11px] block">
                        Cakes to Bake:
                      </span>
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-cream-50 rounded-xl border border-cream-200 space-y-1">
                          <div className="flex justify-between font-bold text-cocoa-900">
                            <span>{item.quantity}x {item.product_name}</span>
                          </div>
                          {item.size_name && <p className="text-cocoa-600">Size: {item.size_name}</p>}
                          {item.flavour_name && <p className="text-cocoa-600">Flavour: {item.flavour_name}</p>}
                          {item.custom_message && (
                            <div className="mt-1 p-2 bg-white rounded border border-honey-300 text-cocoa-900 font-serif italic text-xs">
                              &quot;{item.custom_message}&quot;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Status Workflow Action Buttons */}
                    <div className="space-y-3 md:pl-6 md:border-l md:border-cream-100 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="font-semibold text-cocoa-800 uppercase tracking-wider text-[11px] block">
                          Update Kitchen Status:
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => handleUpdateStatus(order.order_reference, 'BAKING')}
                            disabled={order.status === 'BAKING' || statusUpdating === order.order_reference}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              order.status === 'BAKING'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                : 'bg-white border-cream-300 text-cocoa-700 hover:bg-amber-50'
                            }`}
                          >
                            Mark Baking 🥣
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.order_reference, 'READY')}
                            disabled={order.status === 'READY' || statusUpdating === order.order_reference}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              order.status === 'READY'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                : 'bg-white border-cream-300 text-cocoa-700 hover:bg-blue-50'
                            }`}
                          >
                            Mark Ready For Pickup 🎂
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.order_reference, 'COLLECTED')}
                            disabled={order.status === 'COLLECTED' || statusUpdating === order.order_reference}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              order.status === 'COLLECTED'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                                : 'bg-white border-cream-300 text-cocoa-700 hover:bg-purple-50'
                            }`}
                          >
                            Mark Collected ✨
                          </button>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="p-2 bg-cream-100 rounded-lg text-cocoa-700 text-[11px]">
                          <strong>Customer Note:</strong> {order.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CAPACITY & CLOSURES */}
      {activeTab === 'capacity' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-soft space-y-6">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-cocoa-950">
              Daily Capacity & Date Closures (Next 14 Days)
            </h2>
            <p className="text-xs text-cocoa-600">
              Set the maximum number of cakes the bakery can produce per date. Closed dates reject new customer reservations immediately.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 text-cocoa-700 uppercase font-bold text-[10px] tracking-wider border-y border-cream-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reserved Cakes</th>
                  <th className="py-3 px-4">Daily Cap (Max Cakes)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 text-cocoa-900">
                {capacityDays.map((day) => (
                  <tr key={day.id} className="hover:bg-cream-50/50">
                    <td className="py-3 px-4 font-semibold">
                      {day.bakeryDate}
                    </td>
                    <td className="py-3 px-4 font-bold text-cocoa-800">
                      {day.reservedCakes} cakes booked
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={day.reservedCakes}
                        max={30}
                        defaultValue={day.maxCakes}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= day.reservedCakes) {
                            handleCapacityChange(day.bakeryDate, val, day.isClosed);
                          }
                        }}
                        className="w-20 px-2 py-1 border border-cream-300 rounded text-xs text-center font-bold"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {day.isClosed ? (
                        <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded font-semibold text-[11px]">
                          Closed
                        </span>
                      ) : (
                        <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold text-[11px]">
                          Open ({day.remainingCakes} left)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCapacityChange(day.bakeryDate, day.maxCakes, !day.isClosed)}
                        disabled={updatingCapacity}
                        className={`px-3 py-1 rounded text-[11px] font-semibold transition-colors ${
                          day.isClosed
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-cream-200 text-cocoa-800 hover:bg-red-100 hover:text-red-700'
                        }`}
                      >
                        {day.isClosed ? 'Reopen Date' : 'Close Date'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCANNER & COLLECTION DESK */}
      {activeTab === 'scanner' && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-cream-200 shadow-soft space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-honey-100 text-honey-600 mx-auto flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl font-bold text-cocoa-950">
              Collection Desk Check-In
            </h2>
            <p className="text-xs text-cocoa-600">
              Scan customer QR code or input order reference to verify receipt and hand over cake.
            </p>
          </div>

          <form onSubmit={handleScanLookup} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. CC-2026-X8F2"
              value={scanRef}
              onChange={(e) => setScanRef(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-honey-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-cocoa-900 text-white rounded-xl text-xs font-semibold hover:bg-cocoa-800 transition-colors"
            >
              Verify Pass
            </button>
          </form>

          {scanResult && (
            <div className="pt-4 border-t border-cream-200 space-y-4">
              {scanResult.error ? (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs">
                  {scanResult.error}
                </div>
              ) : (
                <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-base font-bold text-cocoa-950">
                      {scanResult.order_reference}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                      {scanResult.status}
                    </span>
                  </div>

                  <p>Customer: <strong>{scanResult.customer_name}</strong> ({scanResult.customer_phone})</p>
                  <p>Pickup Slot: <strong>{scanResult.pickup_date} ({scanResult.start_time} – {scanResult.end_time})</strong></p>

                  <div className="pt-2">
                    <button
                      onClick={() => handleUpdateStatus(scanResult.order_reference, 'COLLECTED')}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-xs transition-colors"
                    >
                      Confirm Collection & Handover ✨
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
