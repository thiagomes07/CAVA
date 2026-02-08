"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Maximize2,
  Layers,
  Ruler,
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
  usePublicProductBatches,
  type PublicProduct,
  type PublicBatch,
} from "@/lib/api/queries/usePortfolio";
import { useToast } from "@/lib/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { isPlaceholderUrl } from "@/lib/utils/media";
import {
  truncateSingleLine,
  truncateTextByWord,
} from "@/lib/utils/truncateText";
import { formatArea } from "@/lib/utils/formatDimensions";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Expanded product state (replaces modal)
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  );

  // Lightbox state for images
  const [lightboxImages, setLightboxImages] = useState<Array<{ url: string }>>(
    [],
  );
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Contact Modal State
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactProductId, setContactProductId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    marketingOptIn: false,
  });

  const { data: portfolio, isLoading, isError } = usePublicPortfolio(slug);
  const captureLeadMutation = useCapturePortfolioLead(slug);

  // Reset page when filters change
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
        productId: contactProductId || undefined,
      });

      success(t("contactSuccess"));
      setShowContactModal(false);
      setContactProductId(null);
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

  const openLightbox = useCallback(
    (images: Array<{ url: string }>, index: number) => {
      setLightboxImages(images);
      setLightboxIndex(index);
      setShowLightbox(true);
    },
    [],
  );

  const closeLightbox = useCallback(() => {
    setShowLightbox(false);
    setLightboxImages([]);
    setLightboxIndex(0);
  }, []);

  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      setLightboxIndex((prev) => {
        if (direction === "prev") {
          return prev === 0 ? lightboxImages.length - 1 : prev - 1;
        }
        return prev === lightboxImages.length - 1 ? 0 : prev + 1;
      });
    },
    [lightboxImages.length],
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!showLightbox) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox("prev");
      if (e.key === "ArrowRight") navigateLightbox("next");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLightbox, closeLightbox, navigateLightbox]);

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

  // Compute whether we have visible data to control layout
  const hasIndustryInfo = Boolean(
    industry.name ||
    industry.description ||
    industry.logoUrl ||
    industry.cnpj ||
    industry.location ||
    industry.contact ||
    (industry.socialLinks && industry.socialLinks.length > 0),
  );

  const hasHeaderContent = Boolean(industry.name || industry.description);

  const hasMetaInfo = Boolean(
    industry.cnpj ||
    industry.location ||
    industry.contact?.email ||
    industry.contact?.phone ||
    industry.contact?.whatsapp,
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Header */}
      <header className="relative bg-white border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50" />
        <div
          className={cn(
            "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
            hasIndustryInfo ? "py-12" : "py-6",
          )}
        >
          <div
            className={cn(
              "flex flex-col md:flex-row items-start gap-6",
              industry.logoUrl ? "md:items-center" : "md:items-start",
            )}
          >
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
                <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mb-4">
                  {truncateTextByWord(industry.description, 160)}
                </p>
              )}

              {hasMetaInfo && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                  {industry.cnpj && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">CNPJ:</span>
                      <span className="font-mono">{industry.cnpj}</span>
                    </div>
                  )}

                  {industry.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {truncateSingleLine(
                          [
                            industry.location.street && industry.location.number
                              ? `${industry.location.street}, ${industry.location.number}`
                              : null,
                            industry.location.city,
                            industry.location.state,
                            industry.location.country,
                          ]
                            .filter(Boolean)
                            .join(", "),
                          80,
                        )}
                      </span>
                    </div>
                  )}

                  {industry.contact?.email && (
                    <a
                      href={`mailto:${industry.contact.email}`}
                      className="flex items-center gap-2 hover:text-slate-700 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>
                        {truncateSingleLine(industry.contact.email, 40)}
                      </span>
                    </a>
                  )}

                  {industry.contact?.phone && (
                    <a
                      href={`tel:${industry.contact.phone}`}
                      className="flex items-center gap-2 hover:text-slate-700 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>
                        {truncateSingleLine(industry.contact.phone, 30)}
                      </span>
                    </a>
                  )}

                  {industry.contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${industry.contact.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-slate-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>
                        {truncateSingleLine(industry.contact.whatsapp, 30)}
                      </span>
                    </a>
                  )}
                </div>
              )}

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
                        {truncateSingleLine(
                          getSocialNetworkName(link.url, link.name),
                          20,
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0">
              <Button
                size="lg"
                onClick={() => {
                  setContactProductId(null);
                  setShowContactModal(true);
                }}
                className="shadow-lg"
              >
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
            <div className="space-y-6">
              {paginatedProducts.map((product) => (
                <ProductSection
                  key={product.id}
                  product={product}
                  slug={slug}
                  isExpanded={expandedProductId === product.id}
                  onToggleExpand={() => {
                    setExpandedProductId(
                      expandedProductId === product.id ? null : product.id,
                    );
                  }}
                  onOpenLightbox={openLightbox}
                  onContact={() => {
                    setContactProductId(product.id);
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

      {/* Lightbox Modal for Images */}
      {showLightbox && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]?.url}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {lightboxImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {lightboxImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === lightboxIndex
                      ? "bg-white w-4"
                      : "bg-white/40 hover:bg-white/60",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contact Modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)}>
        <ModalHeader>
          <ModalTitle>
            {contactProductId
              ? t("requestInfoFor", {
                  product:
                    products.find((p) => p.id === contactProductId)?.name || "",
                })
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
    </div>
  );
}

// ============================================================================
// Product Section Component (Expandable)
// ============================================================================

interface ProductSectionProps {
  product: PublicProduct;
  slug: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenLightbox: (images: Array<{ url: string }>, index: number) => void;
  onContact: () => void;
  t: (key: string) => string;
}

function ProductSection({
  product,
  slug,
  isExpanded,
  onToggleExpand,
  onOpenLightbox,
  onContact,
  t,
}: ProductSectionProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const productImages =
    product.medias?.filter((m) => m.url && !isPlaceholderUrl(m.url)) || [];
  const hasImages = productImages.length > 0;

  // Reset selected image when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product.id]);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300",
        isExpanded
          ? "shadow-xl ring-1 ring-slate-200"
          : "shadow-sm hover:shadow-md",
      )}
    >
      {/* Product Header - Always Visible */}
      <div
        className={cn(
          "grid gap-6 p-6",
          isExpanded
            ? "lg:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-[45%_1fr]",
        )}
      >
        {/* Image Gallery */}
        <div className={cn("relative", isExpanded ? "order-1" : "")}>
          {/* Main Image */}
          <div
            className={cn(
              "relative overflow-hidden rounded-xl bg-slate-100 group cursor-pointer",
              isExpanded
                ? "aspect-[4/3] lg:aspect-[3/2]"
                : "aspect-[4/3] md:aspect-[3/2]",
            )}
            onClick={() =>
              hasImages && onOpenLightbox(productImages, selectedImageIndex)
            }
          >
            {hasImages ? (
              <>
                <img
                  src={productImages[selectedImageIndex]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                      <Maximize2 className="w-5 h-5 text-slate-700" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-slate-200" />
              </div>
            )}

            {/* In Stock Badge */}
            {product.hasAvailable && (
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full shadow-sm">
                  {t("inStock")}
                </span>
              </div>
            )}

            {/* Image Counter */}
            {productImages.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                {selectedImageIndex + 1} / {productImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {productImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {productImages.map((media, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={cn(
                    "shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                    idx === selectedImageIndex
                      ? "border-slate-900 ring-1 ring-slate-900"
                      : "border-transparent hover:border-slate-300",
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

        {/* Product Info */}
        <div className={cn("flex flex-col", isExpanded ? "order-2" : "")}>
          <div className="flex-1">
            {/* SKU */}
            <p className="text-xs text-slate-400 font-medium tracking-wider mb-1">
              {truncateSingleLine(product.sku, 40)}
            </p>

            {/* Name */}
            <h2
              className={cn(
                "font-serif text-slate-900 mb-3",
                isExpanded ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl",
              )}
            >
              {truncateSingleLine(product.name, isExpanded ? 100 : 60)}
            </h2>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="text-sm">
                {product.material}
              </Badge>
              {product.finish && (
                <Badge variant="outline" className="text-sm">
                  {product.finish}
                </Badge>
              )}
              {product.batchCount !== undefined && product.batchCount > 0 && (
                <Badge variant="outline" className="text-sm">
                  <Layers className="w-3 h-3 mr-1" />
                  {product.batchCount}{" "}
                  {product.batchCount === 1 ? "lote" : "lotes"}
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p
                className={cn(
                  "text-slate-600 leading-relaxed",
                  isExpanded ? "" : "line-clamp-2",
                )}
              >
                {isExpanded
                  ? product.description
                  : truncateTextByWord(product.description, 120)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
            <Button
              variant={isExpanded ? "primary" : "secondary"}
              onClick={onToggleExpand}
              className="flex-1 sm:flex-none"
            >
              {isExpanded ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  {t("close") || "Fechar"}
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  {t("viewBatches") || "Ver Lotes"}
                </>
              )}
            </Button>
            <Button onClick={onContact} className="flex-1 sm:flex-none">
              <MessageCircle className="w-4 h-4 mr-2" />
              {t("contact")}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Section - Batches */}
      {isExpanded && (
        <BatchesSection
          slug={slug}
          productId={product.id}
          onOpenLightbox={onOpenLightbox}
          t={t}
        />
      )}
    </div>
  );
}

// ============================================================================
// Batches Section Component
// ============================================================================

interface BatchesSectionProps {
  slug: string;
  productId: string;
  onOpenLightbox: (images: Array<{ url: string }>, index: number) => void;
  t: (key: string) => string;
}

function BatchesSection({
  slug,
  productId,
  onOpenLightbox,
  t,
}: BatchesSectionProps) {
  const { data: batches, isLoading } = usePublicProductBatches(
    slug,
    productId,
    { limit: 10 },
  );

  if (isLoading) {
    return (
      <div className="border-t border-slate-100 p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-500">Carregando lotes...</span>
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="border-t border-slate-100 p-8 text-center">
        <p className="text-slate-500">
          {t("noBatches") || "Nenhum lote disponível no momento."}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100">
      <div className="p-6 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          {t("availableBatches") || "Lotes Disponíveis"} ({batches.length})
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.batchCode}
              batch={batch}
              onOpenLightbox={onOpenLightbox}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Batch Card Component
// ============================================================================

interface BatchCardProps {
  batch: PublicBatch;
  onOpenLightbox: (images: Array<{ url: string }>, index: number) => void;
}

function BatchCard({ batch, onOpenLightbox }: BatchCardProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const batchImages =
    batch.medias?.filter((m) => m.url && !isPlaceholderUrl(m.url)) || [];
  const hasImages = batchImages.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Batch Image */}
      <div
        className={cn(
          "relative aspect-[3/2] bg-slate-100",
          hasImages && "cursor-pointer group",
        )}
        onClick={() =>
          hasImages && onOpenLightbox(batchImages, selectedImageIndex)
        }
      >
        {hasImages ? (
          <>
            <img
              src={batchImages[selectedImageIndex]?.url}
              alt={batch.batchCode}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

            {/* Navigation arrows for multiple images */}
            {batchImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) =>
                      prev === 0 ? batchImages.length - 1 : prev - 1,
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((prev) =>
                      prev === batchImages.length - 1 ? 0 : prev + 1,
                    );
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>

                {/* Image counter */}
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedImageIndex + 1}/{batchImages.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-200" />
          </div>
        )}
      </div>

      {/* Batch Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-slate-900 mb-1">
          {batch.batchCode}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            {batch.height.toFixed(0)} × {batch.width.toFixed(0)} cm
          </span>
          <span>{formatArea(batch.totalArea)} m²</span>
          {batch.availableSlabs > 0 && (
            <span className="text-emerald-600 font-medium">
              {batch.availableSlabs}{" "}
              {batch.availableSlabs === 1 ? "chapa" : "chapas"}
            </span>
          )}
        </div>

        {batch.originQuarry && (
          <p className="text-xs text-slate-400 mt-1 truncate">
            {batch.originQuarry}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

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
  const lowerUrl = (url || "").toLowerCase();
  const lowerName = (name || "").toLowerCase();

  if (lowerUrl.includes("instagram") || lowerName.includes("instagram"))
    return "Instagram";
  if (lowerUrl.includes("facebook") || lowerName.includes("facebook"))
    return "Facebook";
  if (lowerUrl.includes("linkedin") || lowerName.includes("linkedin"))
    return "LinkedIn";
  if (
    lowerUrl.includes("twitter") ||
    lowerUrl.includes("x.com") ||
    lowerName.includes("twitter")
  )
    return "Twitter";
  if (lowerUrl.includes("youtube") || lowerName.includes("youtube"))
    return "YouTube";
  if (lowerUrl.includes("tiktok") || lowerName.includes("tiktok"))
    return "TikTok";

  if (name && name.trim().length > 0) return name;
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return hostname;
  } catch {
    return url;
  }
}
