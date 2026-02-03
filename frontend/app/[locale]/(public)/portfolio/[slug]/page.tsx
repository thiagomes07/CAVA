"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Package,
  Search,
  X,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Grid3X3,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
import { PhoneInput } from "@/components/ui/masked-input";
import {
  usePublicPortfolio,
  useCapturePortfolioLead,
  type PublicProduct,
} from "@/lib/api/queries/usePortfolio";
import { useToast } from "@/lib/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { isPlaceholderUrl } from "@/lib/utils/media";
import {
  truncateSingleLine,
  truncateTextByWord,
} from "@/lib/utils/truncateText";

type ViewMode = "grid" | "compact";
type SortOption = "name-asc" | "name-desc" | "material" | "recent";

const ITEMS_PER_PAGE = 12;

export default function PublicPortfolioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations("publicPortfolio");
  const tCommon = useTranslations("common");
  const { success, error: showError } = useToast();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string[]>([]);
  const [finishFilter, setFinishFilter] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(
    null,
  );
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    marketingOptIn: false,
  });

  const { data: portfolio, isLoading, isError } = usePublicPortfolio(slug);
  const captureLeadMutation = useCapturePortfolioLead(slug);

  // Reset page when filters change - using key to store previous values
  const filterKey = `${searchQuery}-${materialFilter.join(",")}-${finishFilter.join(",")}-${onlyInStock}-${sortBy}`;
  const prevFilterKeyRef = React.useRef(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setCurrentPage(1);
    }
  }, [filterKey]);

  // Get unique materials and finishes for filter
  const portfolioProducts = portfolio?.products;
  const { materials, finishes } = useMemo(() => {
    if (!portfolioProducts) return { materials: [], finishes: [] };
    const mats = [...new Set(portfolioProducts.map((p) => p.material))].filter(
      Boolean,
    );
    const fins = [...new Set(portfolioProducts.map((p) => p.finish))].filter(
      Boolean,
    ) as string[];
    return { materials: mats, finishes: fins };
  }, [portfolioProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!portfolioProducts) return [];

    const result = portfolioProducts.filter((product) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.material.toLowerCase().includes(searchLower) ||
        (product.finish?.toLowerCase().includes(searchLower) ?? false);

      const matchesMaterial =
        materialFilter.length === 0 ||
        materialFilter.includes(product.material);

      const matchesFinish =
        finishFilter.length === 0 ||
        (product.finish && finishFilter.includes(product.finish));

      const matchesStock = !onlyInStock || product.hasAvailable;

      return matchesSearch && matchesMaterial && matchesFinish && matchesStock;
    });

    const sorted = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "material":
          return a.material.localeCompare(b.material);
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    portfolioProducts,
    searchQuery,
    materialFilter,
    finishFilter,
    onlyInStock,
    sortBy,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactForm.name || (!contactForm.email && !contactForm.phone)) {
      showError(t("contactRequired"));
      return;
    }

    try {
      await captureLeadMutation.mutateAsync({
        name: contactForm.name,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        message: contactForm.message || undefined,
        marketingOptIn: contactForm.marketingOptIn,
        productId: selectedProduct?.id,
      });

      success(t("contactSuccess"));
      setShowContactModal(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        message: "",
        marketingOptIn: false,
      });
    } catch {
      showError(t("contactError"));
    }
  };

  const toggleMaterialFilter = (material: string) => {
    setMaterialFilter((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material],
    );
  };

  const toggleFinishFilter = (finish: string) => {
    setFinishFilter((prev) =>
      prev.includes(finish)
        ? prev.filter((f) => f !== finish)
        : [...prev, finish],
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setMaterialFilter([]);
    setFinishFilter([]);
    setOnlyInStock(false);
  };

  const hasActiveFilters =
    searchQuery ||
    materialFilter.length > 0 ||
    finishFilter.length > 0 ||
    onlyInStock;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          <p className="text-slate-500 animate-pulse">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (isError || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-700 mb-2">
            {t("notFound")}
          </h1>
          <p className="text-slate-500">{t("notFoundDescription")}</p>
        </div>
      </div>
    );
  }

  const { industry, products } = portfolio;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Header */}
      <header className="relative bg-white border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {industry.logoUrl && (
              <div className="shrink-0">
                <div className="w-24 h-24 md:w-36 md:h-36 lg:w-48 lg:h-48 rounded-2xl bg-white shadow-lg border border-slate-100 p-2 overflow-hidden">
                  <img
                    src={industry.logoUrl}
                    alt={industry.name || ""}
                    className="w-full h-full object-contain rounded-md"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {industry.name && (
                <h1 className="font-serif text-3xl md:text-4xl text-slate-900 mb-2">
                  {truncateSingleLine(industry.name, 60)}
                </h1>
              )}
              {industry.description && (
                <p className="text-slate-600 text-lg leading-relaxed max-w-2xl">
                  {truncateTextByWord(industry.description, 160)}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-4">
                {industry.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {truncateSingleLine(
                        [
                          industry.location.city,
                          industry.location.state,
                          industry.location.country,
                        ]
                          .filter(Boolean)
                          .join(", "),
                        60,
                      )}
                    </span>
                  </div>
                )}
                {industry.contact?.email && (
                  <a
                    href={`mailto:${industry.contact.email}`}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{truncateSingleLine(industry.contact.email, 40)}</span>
                  </a>
                )}
                {industry.contact?.phone && (
                  <a
                    href={`tel:${industry.contact.phone}`}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{truncateSingleLine(industry.contact.phone, 30)}</span>
                  </a>
                )}
              </div>

              {industry.socialLinks && industry.socialLinks.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                  {industry.socialLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-2 transition-colors cursor-pointer"
                      title={link.name}
                    >
                      <SocialIcon url={link.url} name={link.name} />
                      <span className="text-sm text-slate-600">
                        {truncateSingleLine(getSocialNetworkName(link.url, link.name), 20)}
                      <a
                        href={`mailto:${industry.contact.email}`}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      >
              )}
            </div>

            <div className="shrink-0">
              <Button
                      <a
                        href={`tel:${industry.contact.phone}`}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{truncateSingleLine(industry.contact.phone, 30)}</span>
                      </a>
                <MessageCircle className="w-5 h-5 mr-2" />
                {t("contactUs")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer",
                  showFilters || hasActiveFilters
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t("filters")}
                {hasActiveFilters && (
                  <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
                    {materialFilter.length +
                      finishFilter.length +
                      (onlyInStock ? 1 : 0)}
                  </span>
                )}
              </button>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
                >
                  <option value="name-asc">{t("sortNameAsc")}</option>
                  <option value="name-desc">{t("sortNameDesc")}</option>
                  <option value="material">{t("sortMaterial")}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-all cursor-pointer",
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={cn(
                    "p-2 rounded-lg transition-all cursor-pointer",
                    viewMode === "compact"
                      ? "bg-white shadow-sm text-slate-900"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-6">
                {materials.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {t("material")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {materials.map((material) => (
                        <button
                          key={material}
                          onClick={() => toggleMaterialFilter(material)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                            materialFilter.includes(material)
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                          )}
                        >
                          {material}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {finishes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {t("finish")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {finishes.map((finish) => (
                        <button
                          key={finish}
                          onClick={() => toggleFinishFilter(finish)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                            finishFilter.includes(finish)
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                          )}
                        >
                          {finish}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {t("availability")}
                  </p>
                  <button
                    onClick={() => setOnlyInStock(!onlyInStock)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer",
                      onlyInStock
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {t("inStockOnly")}
                  </button>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-slate-500 hover:text-slate-700 underline cursor-pointer"
                    >
                      {t("clearFilters")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-sm text-slate-500">
          {filteredProducts.length === products.length ? (
            <span>{t("showingAll", { count: products.length })}</span>
          ) : (
            <span>
              {t("showingFiltered", {
                count: filteredProducts.length,
                total: products.length,
              })}
            </span>
          )}
        </p>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              {t("noProducts")}
            </h2>
            <p className="text-slate-500 mb-6">{t("noProductsDescription")}</p>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearAllFilters}>
                {t("clearFilters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "grid gap-6",
                viewMode === "grid"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
              )}
            >
              {paginatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onViewDetails={() => {
                    setSelectedProduct(product);
                    setSelectedImageIndex(0);
                  }}
                  onContact={() => {
                    setSelectedProduct(product);
                    setShowContactModal(true);
                  }}
                  t={t}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-10 h-10 rounded-lg font-medium transition-colors cursor-pointer",
                            page === currentPage
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="text-slate-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  },
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && !showContactModal && (
        <Modal
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        >
          <ModalContent className="max-w-4xl p-0 overflow-hidden">
            <div className="grid md:grid-cols-2">
              <div className="bg-slate-100 p-6">
                {selectedProduct.medias && selectedProduct.medias.length > 0 ? (
                  <div>
                    <div className="aspect-square rounded-xl overflow-hidden bg-white shadow-inner">
                      <img
                        src={
                          selectedProduct.medias[selectedImageIndex]?.url || ""
                        }
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedProduct.medias.length > 1 && (
                      <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                        {selectedProduct.medias.map((media, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={cn(
                              "w-16 h-16 rounded-lg overflow-hidden shrink-0 ring-2 ring-offset-2 transition-all cursor-pointer",
                              idx === selectedImageIndex
                                ? "ring-slate-900"
                                : "ring-transparent hover:ring-slate-300",
                            )}
                          >
                            <img
                              src={media.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl bg-white flex items-center justify-center">
                    <Package className="w-20 h-20 text-slate-200" />
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">
                        {truncateSingleLine(selectedProduct.sku, 30)}
                      </p>
                      <h2 className="font-serif text-2xl text-slate-900">
                        {truncateSingleLine(selectedProduct.name, 80)}
                      </h2>
                    </div>
                    {selectedProduct.hasAvailable && (
                      <Badge variant="success">{t("inStock")}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary">
                      {truncateSingleLine(selectedProduct.material, 30)}
                    </Badge>
                    {selectedProduct.finish && (
                      <Badge variant="outline">{truncateSingleLine(selectedProduct.finish, 30)}</Badge>
                    )}
                  </div>

                  {selectedProduct.description && (
                    <p className="text-slate-600 leading-relaxed">
                      {truncateTextByWord(selectedProduct.description, 300)}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setShowContactModal(true)}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {t("requestInfo")}
                  </Button>
                </div>
              </div>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Contact Modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)}>
        <ModalHeader>
          <ModalTitle>
            {selectedProduct
              ? t("requestInfoFor", { product: selectedProduct.name })
              : t("contactUs")}
          </ModalTitle>
        </ModalHeader>
        <ModalContent>
          <form onSubmit={handleContactSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("yourName")} <span className="text-rose-500">*</span>
              </label>
              <Input
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("yourNamePlaceholder")}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {tCommon("email")}
              </label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {tCommon("phone")}
              </label>
              <PhoneInput
                value={contactForm.phone}
                onChange={(val) =>
                  setContactForm((prev) => ({ ...prev, phone: val }))
                }
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("message")}
              </label>
              <textarea
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 resize-none"
                rows={4}
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                placeholder={t("messagePlaceholder")}
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="marketingOptIn"
                checked={contactForm.marketingOptIn}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    marketingOptIn: e.target.checked,
                  }))
                }
                className="mt-1 rounded border-slate-300"
              />
              <label
                htmlFor="marketingOptIn"
                className="text-sm text-slate-600"
              >
                {t("marketingOptIn")}
              </label>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              {t("contactNote")}
            </p>
          </form>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowContactModal(false)}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleContactSubmit}
            loading={captureLeadMutation.isPending}
          >
            {t("send")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Page footer removed to avoid duplication with global footer */}
    </div>
  );
}

function ProductCard({
  product,
  viewMode,
  onViewDetails,
  onContact,
  t,
}: {
  product: PublicProduct;
  viewMode: ViewMode;
  onViewDetails: () => void;
  onContact: () => void;
  t: (key: string) => string;
}) {
  const primaryImage = product.medias?.[0];
  const hasValidImage = primaryImage && !isPlaceholderUrl(primaryImage.url);

  if (viewMode === "compact") {
    return (
      <button
        onClick={onViewDetails}
        className="group bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-200 transition-all text-left cursor-pointer"
      >
        <div className="aspect-square bg-slate-50 overflow-hidden">
          {hasValidImage ? (
            <img
              src={primaryImage.url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-200" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-slate-900 text-sm">
            {truncateSingleLine(product.name, 50)}
          </h3>
          <p className="text-xs text-slate-500">{truncateSingleLine(product.material, 30)}</p>
        </div>
      </button>
    );
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300">
      <button
        onClick={onViewDetails}
        className="w-full aspect-[4/3] bg-slate-50 overflow-hidden relative cursor-pointer"
      >
        {hasValidImage ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-200" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-4 left-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-slate-700">
              <Eye className="w-3 h-3" />
              {t("viewDetails")}
            </span>
          </div>
        </div>

        {product.hasAvailable && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
              {t("inStock")}
            </span>
          </div>
        )}
      </button>

        <div className="p-4">
        <p className="text-xs text-slate-400 mb-1">{truncateSingleLine(product.sku, 30)}</p>
        <h3 className="font-semibold text-slate-900 mb-2">
          {truncateSingleLine(product.name, 60)}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
            {truncateSingleLine(product.material, 30)}
          </span>
          {product.finish && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
              {truncateSingleLine(product.finish, 30)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={onViewDetails}
          >
            {t("details")}
          </Button>
          <Button size="sm" className="flex-1" onClick={onContact}>
            {t("contact")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocialIcon({ url, name }: { url: string; name: string }) {
  const lowerUrl = url.toLowerCase();
  const lowerName = name.toLowerCase();
  const iconClass = "w-4 h-4 text-slate-600";

  if (lowerUrl.includes("instagram") || lowerName.includes("instagram"))
    return <Instagram className={iconClass} />;
  if (lowerUrl.includes("facebook") || lowerName.includes("facebook"))
    return <Facebook className={iconClass} />;
  if (lowerUrl.includes("linkedin") || lowerName.includes("linkedin"))
    return <Linkedin className={iconClass} />;
  if (
    lowerUrl.includes("twitter") ||
    lowerUrl.includes("x.com") ||
    lowerName.includes("twitter")
  )
    return <Twitter className={iconClass} />;
  if (lowerUrl.includes("youtube") || lowerName.includes("youtube"))
    return <Youtube className={iconClass} />;

  return <Globe className={iconClass} />;
}

function getSocialNetworkName(url: string, name: string) {
  const lowerUrl = (url || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  if (lowerUrl.includes('instagram') || lowerName.includes('instagram')) return 'Instagram';
  if (lowerUrl.includes('facebook') || lowerName.includes('facebook')) return 'Facebook';
  if (lowerUrl.includes('linkedin') || lowerName.includes('linkedin')) return 'LinkedIn';
  if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com') || lowerName.includes('twitter')) return 'Twitter';
  if (lowerUrl.includes('youtube') || lowerName.includes('youtube')) return 'YouTube';
  if (lowerUrl.includes('tiktok') || lowerName.includes('tiktok')) return 'TikTok';

  // fallback to provided name or derive from url hostname
  if (name && name.trim().length > 0) return name;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return hostname;
  } catch {
    return url;
  }
}
