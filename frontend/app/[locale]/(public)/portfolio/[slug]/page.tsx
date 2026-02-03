"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Package,
  Search,
  Filter,
  X,
  Mail,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
import {
  usePublicPortfolio,
  useCapturePortfolioLead,
  type PublicProduct,
} from "@/lib/api/queries/usePortfolio";
import { useToast } from "@/lib/hooks/useToast";
import { cn } from "@/lib/utils/cn";
import { isPlaceholderUrl } from "@/lib/utils/media";
import type { Media } from "@/lib/types";

export default function PublicPortfolioPage() {
  const params = useParams();
  const slug = params.slug as string;
  const t = useTranslations("publicPortfolio");
  const tCommon = useTranslations("common");
  const { success, error: showError } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
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

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!portfolio?.products) return [];

    return portfolio.products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMaterial =
        !materialFilter || product.material === materialFilter;

      return matchesSearch && matchesMaterial;
    });
  }, [portfolio?.products, searchQuery, materialFilter]);

  // Get unique materials for filter
  const materials = useMemo(() => {
    if (!portfolio?.products) return [];
    const uniqueMaterials = [
      ...new Set(portfolio.products.map((p) => p.material)),
    ];
    return uniqueMaterials.filter(Boolean);
  }, [portfolio?.products]);

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
    } catch (err) {
      showError(t("contactError"));
    }
  };

  const openProductDetail = (product: PublicProduct) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
  };

  const openContactForProduct = (product: PublicProduct) => {
    setSelectedProduct(product);
    setShowContactModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <div className="animate-pulse text-slate-400">{tCommon("loading")}</div>
      </div>
    );
  }

  if (isError || !portfolio) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h1 className="text-xl font-medium text-slate-600">
            {t("notFound")}
          </h1>
          <p className="text-slate-400 mt-2">{t("notFoundDescription")}</p>
        </div>
      </div>
    );
  }

  const { industry, products } = portfolio;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            {industry.logoUrl && (
              <img
                src={industry.logoUrl}
                alt={industry.name || ""}
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="font-serif text-3xl text-obsidian">
                {industry.name || t("portfolio")}
              </h1>
              {industry.description && (
                <p className="text-slate-500 mt-1">{industry.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Input
                placeholder={t("searchProducts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
            </div>

            {materials.length > 0 && (
              <Select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="min-w-[150px]"
              >
                <option value="">{t("allMaterials")}</option>
                {materials.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </Select>
            )}

            {(searchQuery || materialFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setMaterialFilter("");
                }}
              >
                <X className="w-4 h-4 mr-1" />
                {tCommon("clearFilters")}
              </Button>
            )}

            <div className="ml-auto text-sm text-slate-500">
              {filteredProducts.length} {t("products")}
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-medium text-slate-600">
              {t("noProducts")}
            </h2>
            <p className="text-slate-400 mt-2">{t("noProductsDescription")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={() => openProductDetail(product)}
                onContact={() => openContactForProduct(product)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Contact Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => {
            setSelectedProduct(null);
            setShowContactModal(true);
          }}
          className="shadow-lg"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {t("contactUs")}
        </Button>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && !showContactModal && (
        <Modal
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        >
          <ModalContent className="max-w-3xl">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Image Gallery */}
              <div>
                {selectedProduct.medias && selectedProduct.medias.length > 0 ? (
                  <div>
                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={
                          selectedProduct.medias[selectedImageIndex]?.url || ""
                        }
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {selectedProduct.medias.length > 1 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {selectedProduct.medias.map((media, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={cn(
                              "w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2",
                              idx === selectedImageIndex
                                ? "border-obsidian"
                                : "border-transparent",
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
                  <div className="aspect-square rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <h2 className="font-serif text-2xl text-obsidian mb-2">
                  {selectedProduct.name}
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge>{selectedProduct.material}</Badge>
                  {selectedProduct.finish && (
                    <Badge variant="secondary">{selectedProduct.finish}</Badge>
                  )}
                </div>
                {selectedProduct.description && (
                  <p className="text-slate-600 mb-6">
                    {selectedProduct.description}
                  </p>
                )}
                {selectedProduct.hasAvailable && (
                  <Badge variant="success" className="mb-4">
                    {t("inStock")}
                  </Badge>
                )}
                <Button
                  className="w-full mt-4"
                  onClick={() => {
                    setShowContactModal(true);
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {t("requestInfo")}
                </Button>
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
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("yourName")} *
              </label>
              <Input
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {tCommon("email")}
              </label>
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {tCommon("phone")}
              </label>
              <Input
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("message")}
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-obsidian/20"
                rows={3}
                value={contactForm.message}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-slate-500">{t("contactNote")}</p>
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

// Product Card Component
function ProductCard({
  product,
  onViewDetails,
  onContact,
  t,
}: {
  product: PublicProduct;
  onViewDetails: () => void;
  onContact: () => void;
  t: (key: string) => string;
}) {
  const primaryImage = product.medias?.[0];
  const hasValidImage = primaryImage && !isPlaceholderUrl(primaryImage.url);

  return (
    <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={onViewDetails}
        className="w-full aspect-square bg-slate-100 overflow-hidden"
      >
        {hasValidImage ? (
          <img
            src={primaryImage.url}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </button>
      <div className="p-4">
        <h3 className="font-medium text-obsidian truncate">{product.name}</h3>
        <p className="text-sm text-slate-500 truncate">{product.sku}</p>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {product.material}
          </Badge>
          {product.finish && (
            <Badge variant="outline" className="text-xs">
              {product.finish}
            </Badge>
          )}
        </div>
        {product.hasAvailable && (
          <Badge variant="success" className="mt-2 text-xs">
            {t("inStock")}
          </Badge>
        )}
        <div className="flex gap-2 mt-4">
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
