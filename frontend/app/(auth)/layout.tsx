import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | CAVA Stone Platform',
  description: 'Acesse sua conta na CAVA Stone Platform',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-mineral">
      {children}
    </div>
  );
}