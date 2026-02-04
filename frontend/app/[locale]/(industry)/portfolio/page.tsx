"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Search, Eye, Edit2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Pagination } from "@/components/shared/Pagination";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/useToast";
import { truncateText } from "@/lib/utils/truncateText";
import { TRUNCATION_LIMITS } from "@/lib/config/truncationLimits";
import type { Product } from "@/lib/types";
import type { ProductFilter } from "@/lib/schemas/product.schema";
import { materialTypes } from "@/lib/schemas/product.schema";
import { cn } from "@/lib/utils/cn";
import { isPlaceholderUrl } from "@/lib/utils/media";

export default function PortfolioPage() {
  const router = useRouter();
  const { error } = useToast();
  const t = useTranslations("portfolio");
  const tCommon = useTranslations("common");

  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<ProductFilter>({
    search: "",
    material: "",
    includeInactive: false,
    page: 1,
    limit: 24,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{ products: Product[]; total: number }>(
        "/products",
        { params: filters },
      );
      setProducts(data.products);
      setTotalProducts(data.total);
    } catch (err) {
      error(t("loadError"));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasFilters =
    filters.search || filters.material || filters.includeInactive;
  const isEmpty = products.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t("title")}
            </h1>
            <p className="text-sm text-slate-500">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push("/portfolio/share")}
            >
              <Share2 className="w-4 h-4 mr-2" />
              {tCommon("share")}
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push("/portfolio/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("newProduct")}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.material}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  material: e.target.value as ProductFilter["material"],
                  page: 1,
                })
              }
            >
              <option value="">{t("allMaterials")}</option>
              {materialTypes.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </Select>

            <div className="flex items-center">
              <Toggle
                checked={filters.includeInactive}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    includeInactive: e.target.checked,
                    page: 1,
                  })
                }
                label={t("showInactive")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? t("noResults", { search: filters.search || "" })
                : t("emptyTitle")
            }
            description={
              hasFilters ? t("adjustFilters") : t("emptyDescription")
            }
            actionLabel={hasFilters ? tCommon("clearFilters") : t("newProduct")}
            onAction={() => {
              if (hasFilters) {
                setFilters({
                  search: "",
                  material: "",
                  includeInactive: false,
                  page: 1,
                  limit: 24,
                });
              } else {
                router.push("/portfolio/new");
              }
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() =>
                    router.push(`/inventory?productId=${product.id}`)
                  }
                  onEdit={() => router.push(`/portfolio/edit/${product.id}`)}
                  translations={{
                    noPhoto: t("noPhoto"),
                    edit: t("edit"),
                    viewBatches: t("viewBatches"),
                    active: t("active"),
                    inactive: t("inactive"),
                    batches: (count: number) =>
                      `${count} ${count === 1 ? t("batch") : t("batchesPlural")}`,
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={filters.page || 1}
              totalPages={Math.ceil(totalProducts / (filters.limit || 24))}
              totalItems={totalProducts}
              itemsPerPage={filters.limit || 24}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onEdit: () => void;
  translations: {
    noPhoto: string;
    edit: string;
    viewBatches: string;
    active: string;
    inactive: string;
    batches: (count: number) => string;
  };
}

function ProductCard({
  product,
  onView,
  onEdit,
  translations,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  // A capa é a primeira mídia (já ordenada por displayOrder no backend)
  const coverImage = product.medias?.[0];
  const coverUrl = coverImage?.url;
  const shouldRenderCover = !!coverUrl && !isPlaceholderUrl(coverUrl);

  return (
    <div
      className="bg-porcelain border border-slate-100 rounded-sm overflow-hidden group transition-all duration-200 hover:shadow-premium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
        {shouldRenderCover ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-400 text-sm">
              {translations.noPhoto}
            </span>
          </div>
        )}

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 animate-in fade-in-0 duration-200">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              {translations.edit}
            </Button>
            <Button variant="secondary" size="sm" onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              {translations.viewBatches}
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-xl text-obsidian" title={product.name}>
            {truncateText(product.name, TRUNCATION_LIMITS.PRODUCT_NAME_SHORT)}
          </h3>
          <Badge variant={product.isActive ? "DISPONIVEL" : "INATIVO"}>
            {product.isActive ? translations.active : translations.inactive}
          </Badge>
        </div>

        {product.sku && (
          <p
            className="font-mono text-xs text-slate-400 mb-3"
            title={product.sku}
          >
            {truncateText(product.sku, TRUNCATION_LIMITS.SKU)}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600" title={product.material}>
            {truncateText(product.material, TRUNCATION_LIMITS.MATERIAL_NAME)}
          </span>
          <span className="text-slate-500">
            {translations.batches(product.batchCount || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
