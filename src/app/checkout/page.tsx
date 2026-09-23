'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/components/FormatPrice';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Lock,
} from 'lucide-react';

interface CapacitySlot {
  id: string;
  startTime: string;
  endTime: string;
  maxOrders: number;
  reservedOrders: number;
  remainingOrders: number;
  isAvailable: boolean;
}

interface CapacityDay {
  id: string;
  bakeryDate: string;
  maxCakes: number;
  reservedCakes: number;
  remainingCakes: number;
  isClosed: boolean;
  isLeadTimeMet: boolean;
  isAvailable: boolean;
  slots: CapacitySlot[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, subtotalCents, totalMessageFeeCents, totalCents, totalCakeCount } = useCart();
  const { user } = useAuth();

  const [capacityDays, setCapacityDays] = useState<CapacityDay[]>([]);
  const [loadingCapacity, setLoadingCapacity] = useState(true);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Pending order / hold state
  const [pendingOrder, setPendingOrder] = useState<any | null>(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(600); // 10 minutes
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Capacity
  useEffect(() => {
    async function loadCapacity() {
      try {
        const res = await fetch('/api/capacity');
        const data = await res.json();
        if (data.days) {
          setCapacityDays(data.days);
          // Auto-select first available date
          const firstAvail = data.days.find((d: CapacityDay) => d.isAvailable && d.remainingCakes >= totalCakeCount);
          if (firstAvail) {
            setSelectedDate(firstAvail.bakeryDate);
            const firstSlot = firstAvail.slots.find((s: CapacitySlot) => s.isAvailable);
            if (firstSlot) setSelectedSlotId(firstSlot.id);
          }
        }
      } catch (err) {
        console.error('Failed to load capacity:', err);
      } finally {
        setLoadingCapacity(false);
      }
    }
    loadCapacity();
  }, [totalCakeCount]);

  // Update selected slot when selected date changes
  const currentDay = useMemo(() => {
    return capacityDays.find((d) => d.bakeryDate === selectedDate);
  }, [capacityDays, selectedDate]);

  useEffect(() => {
    if (currentDay && (!selectedSlotId || !currentDay.slots.some((s) => s.id === selectedSlotId))) {
      const firstOpenSlot = currentDay.slots.find((s) => s.isAvailable);
      if (firstOpenSlot) setSelectedSlotId(firstOpenSlot.id);
    }
  }, [currentDay, selectedSlotId]);

  // Hold Timer countdown
  useEffect(() => {
    if (!pendingOrder) return;

    const interval = setInterval(() => {
      setHoldSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage('Your 10-minute temporary capacity hold has expired. Please recreate your reservation.');
          setPendingOrder(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingOrder]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Create Pending Order (Atomic DB Transaction & Hold)
  const handleReserveHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDate || !selectedSlotId) {
      setErrorMessage('Please select an available pickup date and pickup slot.');
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      setErrorMessage('Please complete all contact details (Name, Email, Phone).');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        pickupDate: selectedDate,
        pickupSlotId: selectedSlotId,
        notes: orderNotes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          sizeOptionId: i.sizeOptionId,
          flavourOptionId: i.flavourOptionId,
          customMessage: i.customMessage,
          referenceImageUrl: i.referenceImageUrl,
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reserve order capacity.');
      }

      setPendingOrder(data);
      setHoldSecondsRemaining(600); // 10 minutes
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Step 2: Confirm Payment (Idempotent)
  const handleCompletePayment = async () => {
    if (!pendingOrder) return;

    setProcessingPayment(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = `pay_${pendingOrder.orderReference}_${Date.now()}`;
      const res = await fetch(`/api/orders/${pendingOrder.orderReference}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          providerPaymentId: `test_stripe_ch_${Math.random().toString(36).substring(2, 10)}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed.');
      }

      // Success! Clear basket and navigate to confirmation
      clearCart();
      router.push(`/order-confirmation/${pendingOrder.orderReference}`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (items.length === 0 && !pendingOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-cream-200 text-cocoa-400 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-cocoa-400" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-cocoa-900">Your Basket is Empty</h1>
        <p className="text-cocoa-600 text-sm max-w-sm mx-auto">
          Please select a signature cake and customize your order before proceeding to checkout.
        </p>
        <Link
          href="/menu"
          className="inline-block px-8 py-3.5 bg-cocoa-900 text-white rounded-xl text-sm font-semibold hover:bg-cocoa-800 transition-colors shadow-soft"
        >
          Browse Bakery Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="max-w-3xl mx-auto text-center space-y-2">
        <span className="text-xs uppercase font-bold tracking-widest text-terracotta-500">
          Step 2 of 2: Reservation & Pickup
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-cocoa-950">
          Reserve Pickup Slot & Checkout
        </h1>
        <p className="text-cocoa-600 text-sm">
          Guaranteed oven slot allocation with 48h lead time and live capacity limits.
        </p>
      </div>

      {errorMessage && (
        <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Form: Date, Slot & Contact */}
        <div className="lg:col-span-7 space-y-8">
          {/* Active Hold Banner if Pending */}
          {pendingOrder && (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-soft space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-amber-950 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  Capacity Reserved • Hold Active
                </span>
                <span className="text-base font-mono font-bold text-amber-900 bg-amber-200/80 px-3 py-1 rounded-lg">
                  {formatTimer(holdSecondsRemaining)}
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Order reference <strong>{pendingOrder.orderReference}</strong> is temporarily holding oven capacity. Complete the test payment below to confirm your order.
              </p>
            </div>
          )}

          {/* 1. Pickup Date Picker with Live Daily Capacity */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-serif text-lg font-bold text-cocoa-950 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-honey-600" />
                <span>1. Select Collection Date</span>
              </label>
              <span className="text-xs text-cocoa-500 font-medium">Min. 48h lead time</span>
            </div>

            {loadingCapacity ? (
              <div className="text-center py-6 text-xs text-cocoa-500">Checking daily capacity...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {capacityDays.map((day) => {
                  const d = new Date(`${day.bakeryDate}T00:00:00`);
                  const dateLabel = d.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const isSelected = selectedDate === day.bakeryDate;
                  const hasEnoughRoom = day.remainingCakes >= totalCakeCount;
                  const isEligible = day.isAvailable && hasEnoughRoom;

                  return (
                    <button
                      key={day.id}
                      type="button"
                      disabled={!isEligible || !!pendingOrder}
                      onClick={() => setSelectedDate(day.bakeryDate)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-cocoa-900 bg-cream-100 ring-2 ring-cocoa-900 shadow-sm'
                          : isEligible
                          ? 'border-cream-300 hover:border-honey-400 bg-white'
                          : 'border-cream-200 bg-cream-100/50 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-xs font-bold text-cocoa-900 block leading-tight">
                        {dateLabel}
                      </span>
                      <div className="mt-2">
                        {day.isClosed ? (
                          <span className="text-[10px] font-semibold text-cocoa-500">Closed</span>
                        ) : !day.isLeadTimeMet ? (
                          <span className="text-[10px] font-semibold text-cocoa-500">&lt; 48h Lead</span>
                        ) : day.remainingCakes === 0 ? (
                          <span className="text-[10px] font-semibold text-red-600">Sold Out</span>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold ${
                              day.remainingCakes <= 3 ? 'text-amber-700' : 'text-emerald-700'
                            }`}
                          >
                            {day.remainingCakes} cakes left
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Pickup Slot Picker */}
          {selectedDate && currentDay && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft space-y-4">
              <label className="font-serif text-lg font-bold text-cocoa-950 flex items-center gap-2">
                <Clock className="w-5 h-5 text-honey-600" />
                <span>2. Select 2-Hour Pickup Window</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentDay.slots.map((slot) => {
                  const isSelected = selectedSlotId === slot.id;
                  const isSlotOpen = slot.isAvailable;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!isSlotOpen || !!pendingOrder}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-cocoa-900 bg-cream-100 ring-2 ring-cocoa-900 shadow-sm'
                          : isSlotOpen
                          ? 'border-cream-300 hover:border-honey-400 bg-white'
                          : 'border-cream-200 bg-cream-100/50 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-xs text-cocoa-900 block">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span className="text-[10px] text-cocoa-500">
                          {slot.remainingOrders > 0
                            ? `${slot.remainingOrders} slot${slot.remainingOrders > 1 ? 's' : ''} available`
                            : 'Slot fully booked'}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cocoa-900" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Customer Contact Details */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft space-y-4">
            <h3 className="font-serif text-lg font-bold text-cocoa-950">
              3. Contact & Pickup Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-cocoa-800 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!pendingOrder}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ayushi Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cocoa-800 mb-1">
                  Email Address * (For Confirmation & QR Code)
                </label>
                <input
                  type="email"
                  required
                  disabled={!!pendingOrder}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ayushi@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cocoa-800 mb-1">
                  Mobile Phone * (For Collection SMS)
                </label>
                <input
                  type="tel"
                  required
                  disabled={!!pendingOrder}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cocoa-800 mb-1">
                  Pickup Instructions / Dietary Notes (Optional)
                </label>
                <input
                  type="text"
                  disabled={!!pendingOrder}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Please box separately"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs focus:outline-none focus:ring-2 focus:ring-honey-400 text-cocoa-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary & Payment Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-soft space-y-6 sticky top-28">
            <h3 className="font-serif text-lg font-bold text-cocoa-950 pb-4 border-b border-cream-200">
              Order Summary ({totalCakeCount} {totalCakeCount === 1 ? 'Cake' : 'Cakes'})
            </h3>

            {/* Line items list */}
            <div className="space-y-4 max-h-60 overflow-y-auto divide-y divide-cream-100 pr-1">
              {items.map((item) => (
                <div key={item.cartItemId} className="pt-3 first:pt-0 flex justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-cocoa-900 block">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.sizeName && <span className="text-cocoa-500 block">{item.sizeName}</span>}
                    {item.flavourName && <span className="text-cocoa-500 block">{item.flavourName}</span>}
                    {item.customMessage && (
                      <span className="text-terracotta-600 block italic">
                        Piped: &quot;{item.customMessage}&quot; (+{formatPrice(item.messageFeeCents)})
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-cocoa-900 shrink-0">
                    {formatPrice(item.totalPriceCents)}
                  </span>
                </div>
              ))}
            </div>

            {/* Fee breakdown */}
            <div className="pt-4 border-t border-cream-200 space-y-2 text-xs text-cocoa-600">
              <div className="flex justify-between">
                <span>Cakes Subtotal</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>
              {totalMessageFeeCents > 0 && (
                <div className="flex justify-between text-terracotta-600">
                  <span>Custom Message Piping Fees</span>
                  <span>+{formatPrice(totalMessageFeeCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-cocoa-500">
                <span>Bakery Packaging & Cake Box</span>
                <span className="text-emerald-700 font-medium">Complimentary</span>
              </div>
              <div className="pt-3 border-t border-cream-200 flex justify-between items-baseline">
                <span className="font-bold text-sm text-cocoa-950">Total Payable</span>
                <span className="font-serif text-2xl font-bold text-cocoa-950">
                  {formatPrice(totalCents)}
                </span>
              </div>
            </div>

            {/* Step Action Buttons */}
            {!pendingOrder ? (
              <button
                type="button"
                onClick={handleReserveHold}
                disabled={submittingOrder || !selectedDate || !selectedSlotId}
                className="w-full py-4 px-6 bg-cocoa-900 hover:bg-cocoa-800 disabled:opacity-50 text-cream-50 rounded-xl font-semibold text-sm shadow-warm hover:shadow-elevated transition-all flex items-center justify-center gap-2 group"
              >
                <Lock className="w-4 h-4 text-honey-400" />
                <span>
                  {submittingOrder ? 'Locking Capacity...' : 'Lock Slot & Proceed to Payment'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-cream-100 rounded-xl border border-cream-200 text-xs text-cocoa-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-honey-600 shrink-0" />
                  <span>Test Mode: Instant Simulated Payment Verification</span>
                </div>

                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={processingPayment || holdSecondsRemaining <= 0}
                  className="w-full py-4 px-6 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-warm hover:shadow-elevated transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>
                    {processingPayment
                      ? 'Verifying Payment...'
                      : `Complete Payment (${formatPrice(totalCents)})`}
                  </span>
                </button>
              </div>
            )}

            {/* Cancellation Rule Badge */}
            <div className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-[11px] text-cocoa-600 space-y-1">
              <span className="font-semibold text-cocoa-900 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-honey-600" />
                24-Hour Free Cancellation Policy
              </span>
              <span>
                Cancellations can be made online via &quot;My Orders&quot; up to 24 hours prior to scheduled collection.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
