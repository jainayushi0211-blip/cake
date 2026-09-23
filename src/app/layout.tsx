import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CakeCart — Artisanal Bespoke Bakery & Celebration Patisserie',
  description:
    'Order handcrafted celebration cakes with guaranteed daily capacity limits, scheduled pickup time slots, and personalized piped cake messages. 48-hour artisan lead time.',
  keywords: [
    'artisanal cakes',
    'custom bakery',
    'celebration cakes',
    'daily capacity limit',
    'pickup slots',
    'eggless cake',
    'gluten-free cake',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream-50 text-cocoa-900 selection:bg-honey-300 selection:text-cocoa-950">
        <AuthProvider>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <CartDrawer />
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
