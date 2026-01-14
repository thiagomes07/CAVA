import { redirect } from 'next/navigation';

export default function Home() {
  // With localePrefix: 'as-needed', default locale (pt) doesn't need prefix
  redirect('/dashboard');
}
