"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Building2,
  ExternalLink,
  RefreshCw,
  Package,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useSharedPortfolios } from "@/lib/api/queries/usePortfolio";
import { cn } from "@/lib/utils/cn";

export default function SharedPortfoliosPage() {
  const t = useTranslations("sharedPortfolios");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const {
    data: portfolios,
    isLoading,
    refetch,
    isFetching,
  } = useSharedPortfolios();

  const isEmpty = !portfolios?.length;

  const handleViewPortfolio = (slug: string) => {
    // Open in new tab
    window.open(`/${slug}/public-portfolio`, "_blank");
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {tCommon("refresh")}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <LoadingState variant="cards" rows={4} />
        ) : isEmpty ? (
          <EmptyState
            icon={Building2}
            title={t("noPortfolios")}
            description={t("noPortfoliosDescription")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {portfolios?.map((portfolio) => (
              <div
                key={portfolio.industryId}
                className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Logo/Header */}
                <div className="h-32 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                  {portfolio.logoUrl ? (
                    <img
                      src={portfolio.logoUrl}
                      alt={portfolio.industryName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium text-obsidian text-lg">
                    {portfolio.industryName}
                  </h3>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      <Package className="w-3 h-3 mr-1" />
                      {portfolio.productCount} {t("products")}
                    </Badge>

                    {portfolio.canShowPrices ? (
                      <Badge variant="success" className="gap-1">
                        <Eye className="w-3 h-3" />
                        {t("pricesVisible")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <EyeOff className="w-3 h-3" />
                        {t("pricesHidden")}
                      </Badge>
                    )}
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant="secondary"
                    onClick={() => handleViewPortfolio(portfolio.industrySlug)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("viewPortfolio")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
