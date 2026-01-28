// Root layout - minimal wrapper
// The [locale] layout provides html/body tags

import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
