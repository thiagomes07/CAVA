import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    pt: 'CAVA Stone Platform',
    en: 'CAVA Stone Platform',
    es: 'CAVA Stone Platform',
  };

  const descriptions: Record<string, string> = {
    pt: 'Plataforma premium para gestão de pedras ornamentais',
    en: 'Premium platform for ornamental stone management',
    es: 'Plataforma premium para gestión de piedras ornamentales',
  };

  const keywords: Record<string, string[]> = {
    pt: ['pedras ornamentais', 'mármores', 'granitos', 'quartzitos', 'luxo'],
    en: ['ornamental stones', 'marble', 'granite', 'quartzite', 'luxury'],
    es: ['piedras ornamentales', 'mármoles', 'granitos', 'cuarcitas', 'lujo'],
  };

  return {
    title: {
      default: titles[locale] || titles.pt,
      template: "%s | CAVA",
    },
    description: descriptions[locale] || descriptions.pt,
    keywords: keywords[locale] || keywords.pt,
    authors: [{ name: "CAVA" }],
    robots: "index, follow",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();

  const langMap: Record<string, string> = {
    pt: 'pt-BR',
    en: 'en',
    es: 'es',
  };

  return (
    <html lang={langMap[locale] || 'pt-BR'} className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-porcelain text-obsidian h-full" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
