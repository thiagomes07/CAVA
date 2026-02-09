import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { headers } from "next/headers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: "CAVA",
    description: t("description"),
  };
}

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "common" });

  // Check if we're on the landing page (it has its own footer)
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isLandingPage = pathname.includes("/landing");

  return (
    <div className="min-h-screen bg-porcelain">
      {children}

      {/* Footer minimalista - hidden on landing page which has its own footer */}
      {!isLandingPage && (
        <footer className="border-t border-slate-100 py-4">
          <div className="container mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-obsidian rounded-sm" />
              <span className="font-serif text-sm text-slate-400">CAVA</span>
            </div>

            <p className="text-[11px] text-slate-400">{t("poweredBy")}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
