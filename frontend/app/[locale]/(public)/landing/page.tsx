'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  Package,
  Users,
  Link2,
  BarChart3,
  Share2,
  Shield,
  Zap,
  Globe,
  ChevronRight,
  Star,
  CheckCircle2,
  ArrowRight,
  Layers,
  Briefcase,
  Building2,
  Handshake,
  TrendingUp,
  Clock,
  FileText,
  QrCode,
  Smartphone,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

// Stats data
const stats = [
  { value: '2024', label: 'founded' },
  { value: '500+', label: 'batches' },
  { value: '50+', label: 'companies' },
  { value: '3', label: 'countries' },
];

// Features data
const features = [
  {
    icon: Package,
    key: 'inventory',
  },
  {
    icon: Layers,
    key: 'portfolio',
  },
  {
    icon: Link2,
    key: 'links',
  },
  {
    icon: BarChart3,
    key: 'dashboard',
  },
  {
    icon: Users,
    key: 'clients',
  },
  {
    icon: Share2,
    key: 'sharing',
  },
  {
    icon: QrCode,
    key: 'qrcode',
  },
  {
    icon: Globe,
    key: 'multilang',
  },
  {
    icon: Smartphone,
    key: 'responsive',
  },
];

// User types
const userTypes = [
  {
    icon: Building2,
    key: 'industry',
  },
  {
    icon: Briefcase,
    key: 'seller',
  },
  {
    icon: Handshake,
    key: 'broker',
  },
];

// Pain points
const painPoints = [
  {
    icon: Package,
    key: 'stockControl',
  },
  {
    icon: FileText,
    key: 'spreadsheets',
  },
  {
    icon: Clock,
    key: 'time',
  },
  {
    icon: TrendingUp,
    key: 'sales',
  },
];

// Testimonials
const testimonials = [
  {
    key: 'testimonial1',
    company: 'Mármores Premium',
    role: 'industry',
    rating: 5,
  },
  {
    key: 'testimonial2',
    company: 'Stone Brokers BR',
    role: 'broker',
    rating: 5,
  },
  {
    key: 'testimonial3',
    company: 'Granitos Express',
    role: 'industry',
    rating: 5,
  },
];

export default function LandingPage() {
  const t = useTranslations('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  const { isAuthenticated, isLoading, getDashboardRoute } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get dashboard route for authenticated users
  const dashboardRoute = isAuthenticated ? getDashboardRoute() : '/login';

  return (
    <div className="min-h-screen bg-porcelain">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-porcelain/95 backdrop-blur-md shadow-premium'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-obsidian">CAVA</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-600 hover:text-obsidian transition-colors">
                {t('nav.features')}
              </a>
              <a href="#for-who" className="text-sm text-slate-600 hover:text-obsidian transition-colors">
                {t('nav.forWho')}
              </a>
              <a href="#testimonials" className="text-sm text-slate-600 hover:text-obsidian transition-colors">
                {t('nav.testimonials')}
              </a>
            </div>

            <div className="flex items-center gap-4">
              {!isLoading && isAuthenticated ? (
                <Link href={dashboardRoute}>
                  <Button size="sm">
                    {t('nav.dashboard')}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="sm">
                      {t('nav.getStarted')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-mineral to-porcelain" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-obsidian/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-obsidian/3 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-obsidian/5 rounded-full mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-obsidian">
                {t('hero.badge')}
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-obsidian mb-6 leading-tight">
              {t('hero.title')}
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href={isAuthenticated ? dashboardRoute : '/login'}>
                <Button size="lg" className="group">
                  {isAuthenticated ? t('nav.dashboard') : t('hero.cta')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="secondary" size="lg">
                  {t('hero.learnMore')}
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-200">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-serif text-3xl md:text-4xl font-bold text-obsidian mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    {t(`stats.${stat.label}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-porcelain">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">
              {t('features.badge')}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-obsidian mb-6">
              {t('features.title')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.key}
                className="group bg-white rounded-sm p-8 border border-slate-100 hover:shadow-premium-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-obsidian/5 rounded-sm flex items-center justify-center mb-6 group-hover:bg-obsidian group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-obsidian mb-3">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who Section */}
      <section id="for-who" className="py-20 md:py-32 bg-mineral">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">
              {t('forWho.badge')}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-obsidian mb-6">
              {t('forWho.title')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('forWho.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {userTypes.map((type) => (
              <div
                key={type.key}
                className="bg-white rounded-sm p-10 border border-slate-100 hover:shadow-premium-lg transition-all duration-300"
              >
                <div className="w-16 h-16 bg-obsidian rounded-sm flex items-center justify-center mb-8">
                  <type.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-serif text-2xl font-semibold text-obsidian mb-4">
                  {t(`forWho.types.${type.key}.title`)}
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {t(`forWho.types.${type.key}.description`)}
                </p>
                <ul className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600">
                        {t(`forWho.types.${type.key}.benefits.${i}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 md:py-32 bg-obsidian text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 block">
              {t('painPoints.badge')}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold mb-6">
              {t('painPoints.title')}
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              {t('painPoints.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {painPoints.map((point) => (
              <div
                key={point.key}
                className="bg-white/5 rounded-sm p-8 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center mb-6">
                  <point.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">
                  {t(`painPoints.items.${point.key}.title`)}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {t(`painPoints.items.${point.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32 bg-porcelain">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">
              {t('testimonials.badge')}
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-obsidian mb-6">
              {t('testimonials.title')}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.key}
                className="bg-white rounded-sm p-8 border border-slate-100 hover:shadow-premium-lg transition-all duration-300"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-slate-600 mb-6 leading-relaxed italic">
                  "{t(`testimonials.items.${testimonial.key}.quote`)}"
                </blockquote>
                <div className="flex items-center gap-4 pt-6 border-t border-slate-100">
                  <div className="w-12 h-12 bg-obsidian/10 rounded-full flex items-center justify-center">
                    <span className="font-serif text-lg font-bold text-obsidian">
                      {t(`testimonials.items.${testimonial.key}.author`).charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-obsidian">
                      {t(`testimonials.items.${testimonial.key}.author`)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 md:py-32 bg-mineral">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 block">
                {t('security.badge')}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-obsidian mb-6">
                {t('security.title')}
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('security.description')}
              </p>
              <ul className="space-y-4">
                {['jwt', 'encryption', 'csrf', 'rateLimit'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-600">{t(`security.items.${item}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-white rounded-sm p-12 shadow-premium-lg border border-slate-100">
                <div className="flex items-center justify-center">
                  <div className="w-32 h-32 bg-obsidian/5 rounded-full flex items-center justify-center">
                    <Shield className="w-16 h-16 text-obsidian" />
                  </div>
                </div>
                <div className="text-center mt-8">
                  <div className="font-serif text-2xl font-bold text-obsidian mb-2">
                    {t('security.trust.title')}
                  </div>
                  <p className="text-slate-600">
                    {t('security.trust.subtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-obsidian">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={isAuthenticated ? dashboardRoute : '/login'}>
              <Button
                size="lg"
                className="bg-white text-obsidian hover:bg-slate-100 group"
              >
                {isAuthenticated ? t('nav.dashboard') : t('cta.button')}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            {t('cta.notice')}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-obsidian border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <span className="font-serif text-2xl font-bold text-white">CAVA</span>
              <p className="text-slate-400 mt-4 max-w-md leading-relaxed">
                {t('footer.description')}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                {t('footer.product')}
              </h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-slate-400 hover:text-white transition-colors">
                    {t('nav.features')}
                  </a>
                </li>
                <li>
                  <a href="#for-who" className="text-slate-400 hover:text-white transition-colors">
                    {t('nav.forWho')}
                  </a>
                </li>
                <li>
                  <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">
                    {t('nav.testimonials')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                {t('footer.legal')}
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li>
                  <a href="mailto:contato@cava.stone" className="text-slate-400 hover:text-white transition-colors">
                    {t('footer.contact')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} CAVA. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-6">
              <span className="text-slate-500 text-sm">
                {t('footer.madeWith')}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
