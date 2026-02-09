import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  params: Promise<{ locale: string }>;
};

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    if (!parsed?.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const SKEW_SECONDS = 5;
    return parsed.exp <= nowSeconds + SKEW_SECONDS;
  } catch {
    return true;
  }
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user is authenticated with a valid token
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  const userRole = cookieStore.get('user_role');
  const industrySlug = cookieStore.get('industry_slug');

  const localePrefix = locale === 'pt' ? '' : `${locale}/`;

  // Check if token exists and is not expired
  const hasValidToken = accessToken?.value && !isTokenExpired(accessToken.value);

  // If authenticated with valid token, go to dashboard; otherwise, go to landing page
  if (hasValidToken && userRole?.value) {
    // Build dashboard URL based on role
    const role = userRole.value;
    if (role === 'SUPER_ADMIN') {
      redirect(`/${localePrefix}admin`);
    } else if ((role === 'ADMIN_INDUSTRIA' || role === 'VENDEDOR_INTERNO') && industrySlug?.value) {
      redirect(`/${localePrefix}${industrySlug.value}/dashboard`);
    } else if (role === 'BROKER') {
      redirect(`/${localePrefix}dashboard`);
    } else {
      // Missing required data (e.g., industrySlug for ADMIN/VENDEDOR), go to landing
      redirect(`/${localePrefix}landing`);
    }
  } else {
    redirect(`/${localePrefix}landing`);
  }
}
