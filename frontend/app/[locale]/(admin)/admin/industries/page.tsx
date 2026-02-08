"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/useToast";
import { formatDate } from "@/lib/utils/formatDate";
import type { Industry } from "@/lib/types";

interface CreateIndustryInput {
  industryName: string;
  industrySlug: string;
  adminEmail: string;
  adminPassword: string;
}

export default function IndustriesPage() {
  const t = useTranslations();
  const { success, error } = useToast();

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateIndustryInput>({
    industryName: "",
    industrySlug: "",
    adminEmail: "",
    adminPassword: "",
  });

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Industry[]>("/admin/industries");
      setIndustries(data);
    } catch (err) {
      error("Erro ao carregar empresas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiClient.post("/admin/industries", formData);
      success("Empresa criada com sucesso!");
      setIsModalOpen(false);
      setFormData({
        industryName: "",
        industrySlug: "",
        adminEmail: "",
        adminPassword: "",
      });
      fetchIndustries();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar empresa";
      error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSlugChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData((prev) => ({ ...prev, industrySlug: slug }));
  };

  const filteredIndustries = industries.filter(
    (industry) =>
      industry.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      industry.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      industry.cnpj?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t("navigation.industries")}
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie as empresas cadastradas na plataforma
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, slug ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={5} columns={5} />
        ) : filteredIndustries.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa encontrada"
            description={
              searchQuery
                ? "Tente ajustar sua busca"
                : "Crie sua primeira empresa para começar"
            }
            actionLabel={!searchQuery ? "Nova Empresa" : undefined}
            onAction={!searchQuery ? () => setIsModalOpen(true) : undefined}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndustries.map((industry) => (
                  <TableRow key={industry.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-sm flex items-center justify-center">
                          {industry.logoUrl ? (
                            <img
                              src={industry.logoUrl}
                              alt={industry.name}
                              className="w-8 h-8 object-contain"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-obsidian">{industry.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{industry.slug}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {industry.cnpj || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm text-slate-500">
                        {industry.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {industry.contactEmail}
                          </span>
                        )}
                        {industry.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {industry.contactPhone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(industry.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(`/${industry.slug}/dashboard`, "_blank")
                          }
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>Nova Empresa</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <form onSubmit={handleCreateIndustry} className="space-y-6">
            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300 border-b border-white/10 pb-2">
                Dados da Empresa
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Nome da Empresa *
                </label>
                <Input
                  value={formData.industryName}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      industryName: e.target.value,
                    }));
                    handleSlugChange(e.target.value);
                  }}
                  placeholder="Ex: Hakutaku Marbles"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Slug (URL) *
                </label>
                <Input
                  value={formData.industrySlug}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      industrySlug: e.target.value,
                    }))
                  }
                  placeholder="Ex: hakutaku"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  A empresa será acessível em: /{formData.industrySlug}/dashboard
                </p>
              </div>
            </div>

            {/* Dados do Admin */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300 border-b border-white/10 pb-2">
                Primeiro Administrador
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email do Admin *
                </label>
                <Input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      adminEmail: e.target.value,
                    }))
                  }
                  placeholder="admin@empresa.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Senha do Admin *
                </label>
                <Input
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      adminPassword: e.target.value,
                    }))
                  }
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Informe esta senha ao administrador da empresa
                </p>
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                Criar Empresa
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
