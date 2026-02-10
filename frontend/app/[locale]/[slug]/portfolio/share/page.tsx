"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Share2,
  Users,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  useSharedBrokers,
  useSharePortfolio,
  useUnsharePortfolio,
  type SharedCatalogPermission,
} from "@/lib/api/queries/usePortfolio";
import { useToast } from "@/lib/hooks/useToast";
import { formatDate } from "@/lib/utils/formatDate";
import { apiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types";

interface BrokerOption {
  id: string;
  name: string;
  email: string;
  isAlreadyShared: boolean;
}

export default function PortfolioSharePage() {
  const t = useTranslations("portfolio.share");
  const tCommon = useTranslations("common");
  const { success, error } = useToast();

  const [showShareModal, setShowShareModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedBroker, setSelectedBroker] =
    useState<SharedCatalogPermission | null>(null);
  const [selectedBrokerIds, setSelectedBrokerIds] = useState<string[]>([]);
  const [canShowPrices, setCanShowPrices] = useState(false);

  // Fetch shared brokers
  const {
    data: sharedBrokers,
    isLoading,
    refetch,
    isFetching,
  } = useSharedBrokers();

  // Fetch all available brokers
  const { data: allBrokersData } = useQuery({
    queryKey: ["brokers-list"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: User[]; total: number }>(
        "/brokers",
        {
          params: { limit: 100 },
        },
      );
      return response;
    },
  });

  const sharePortfolio = useSharePortfolio();
  const unsharePortfolio = useUnsharePortfolio();

  // Build list of brokers available to share (not already shared)
  const availableBrokers = useMemo((): BrokerOption[] => {
    const allBrokers = allBrokersData?.data ?? [];
    const sharedIds = new Set(
      (sharedBrokers ?? []).map((s) => s.sharedWithUserId),
    );

    return allBrokers.map((broker) => ({
      id: broker.id,
      name: broker.name,
      email: broker.email,
      isAlreadyShared: sharedIds.has(broker.id),
    }));
  }, [allBrokersData, sharedBrokers]);

  const unsharedBrokers = availableBrokers.filter((b) => !b.isAlreadyShared);

  const handleOpenShareModal = () => {
    setSelectedBrokerIds([]);
    setCanShowPrices(false);
    setShowShareModal(true);
  };

  const handleShare = async () => {
    if (selectedBrokerIds.length === 0) {
      error(t("noBrokersSelected"));
      return;
    }

    try {
      const result = await sharePortfolio.mutateAsync({
        brokerIds: selectedBrokerIds,
        canShowPrices,
      });
      success(t("shareSuccess", { count: result.sharedCount }));
      setShowShareModal(false);
    } catch (err) {
      error(t("shareError"));
    }
  };

  const handleOpenRemoveModal = (broker: SharedCatalogPermission) => {
    setSelectedBroker(broker);
    setShowRemoveModal(true);
  };

  const handleRemove = async () => {
    if (!selectedBroker) return;

    try {
      await unsharePortfolio.mutateAsync(selectedBroker.sharedWithUserId);
      success(t("removeSuccess"));
      setShowRemoveModal(false);
      setSelectedBroker(null);
    } catch (err) {
      error(t("removeError"));
    }
  };

  const toggleBrokerSelection = (brokerId: string) => {
    setSelectedBrokerIds((prev) =>
      prev.includes(brokerId)
        ? prev.filter((id) => id !== brokerId)
        : [...prev, brokerId],
    );
  };

  const isEmpty = !sharedBrokers?.length;

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
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => refetch()}
              loading={isFetching}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {tCommon("refresh")}
            </Button>
            <Button
              onClick={handleOpenShareModal}
              disabled={unsharedBrokers.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t("shareBroker")}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <LoadingState variant="table" rows={5} columns={5} />
        ) : isEmpty ? (
          <EmptyState
            icon={Share2}
            title={t("noShares")}
            description={t("noSharesDescription")}
            actionLabel={t("shareBroker")}
            onAction={handleOpenShareModal}
          />
        ) : (
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("name")}</TableHead>
                  <TableHead>{tCommon("email")}</TableHead>
                  <TableHead>{t("sharedSince")}</TableHead>
                  <TableHead className="text-center">
                    {tCommon("prices")}
                  </TableHead>
                  <TableHead className="text-center">
                    {tCommon("status")}
                  </TableHead>
                  <TableHead className="text-right">
                    {tCommon("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedBrokers?.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">
                      {permission.sharedWithUserName ?? "-"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {permission.sharedWithUserEmail ?? "-"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(permission.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {permission.canShowPrices ? (
                        <Badge variant="success" className="gap-1">
                          <Eye className="w-3 h-3" />
                          {t("pricesVisible")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="w-3 h-3" />
                          {t("pricesHidden")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={permission.isActive ? "success" : "secondary"}
                      >
                        {permission.isActive
                          ? tCommon("active")
                          : tCommon("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenRemoveModal(permission)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <Modal open={showShareModal} onClose={() => setShowShareModal(false)}>
        <ModalHeader>
          <ModalTitle>{t("shareBroker")}</ModalTitle>
        </ModalHeader>
        <ModalContent className="max-h-96 overflow-y-auto">
          {unsharedBrokers.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {t("allBrokersShared")}
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                {t("selectBrokers")}
              </p>
              <div className="space-y-2">
                {unsharedBrokers.map((broker) => (
                  <label
                    key={broker.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedBrokerIds.includes(broker.id)}
                      onChange={() => toggleBrokerSelection(broker.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-obsidian">{broker.name}</p>
                      <p className="text-sm text-slate-500">{broker.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={canShowPrices}
                    onChange={(e) => setCanShowPrices(e.target.checked)}
                  />
                  <div>
                    <p className="font-medium text-obsidian">
                      {t("canShowPrices")}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t("canShowPricesHint")}
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowShareModal(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleShare}
            loading={sharePortfolio.isPending}
            disabled={selectedBrokerIds.length === 0}
          >
            <Share2 className="w-4 h-4 mr-2" />
            {t("shareBroker")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal open={showRemoveModal} onClose={() => setShowRemoveModal(false)}>
        <ModalHeader>
          <ModalTitle>{t("removeAccess")}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            {t("confirmRemove", {
              name: selectedBroker?.sharedWithUserName ?? "",
            })}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            loading={unsharePortfolio.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("removeAccess")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
