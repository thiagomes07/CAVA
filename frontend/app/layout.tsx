// Root layout is minimal - main layout is in [locale]/layout.tsx
// This file exists only to provide required html/body structure for non-locale routes

import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The actual html/body with providers is in [locale]/layout.tsx
  // This layout just passes through children for any non-matched routes
  return children;
}
