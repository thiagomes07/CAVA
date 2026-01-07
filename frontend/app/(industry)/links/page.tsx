'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Copy, Edit2, Archive, Eye, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { SalesLink, LinkType } from '@/lib/types';
import type { LinkFilter } from '@/lib/schemas/link.schema';
import { linkTypes } from '@/lib/schemas/link.schema';
import { cn } from '@/lib/utils/cn';

export default function LinksManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [links, setLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLink, setSelectedLink] = useState<SalesLink | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [filters, setFilters] = useState<LinkFilter>({
    type: '',
    status: '',
    search: '',
    page: 1,
    limit: 25,
  });

  useEffect(() => {
    fetchLinks();
  }, [filters]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        links: SalesLink[];
        total: number;
        page: number;
      }>('/sales-links', { params: filters });

      setLinks(data.links);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar links');
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (link: SalesLink) => {
    try {
      const fullUrl = `${window.location.origin}/${link.slugToken}`;
      await navigator.clipboard.writeText(fullUrl);
      success('Link copiado!');
    } catch (err) {
      error('Erro ao copiar link');
    }
  };

  const handleArchiveLink = async (linkId: string) => {
    try {
      await apiClient.patch(`/sales-links/${linkId}`, { isActive: false });
      success('Link arquivado com sucesso');
      fetchLinks();
    } catch (err) {
      error('Erro ao arquivar link');
    }
  };

  const handleViewStats = (link: SalesLink) => {
    setSelectedLink(link);
    setShowStatsModal(true);
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      status: '',
      search: '',
      page: 1,
      limit: 25,
    });
  };

  const hasFilters = filters.type || filters.status || filters.search;
  const isEmpty = links.length === 0;

  const getLinkTypeBadge = (type: LinkType) => {
    const variants = {
      LOTE_UNICO: { label: 'Lote', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      PRODUTO_GERAL: { label: 'Produto', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      CATALOGO_COMPLETO: { label: 'Catálogo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };
    const variant = variants[type];
    return (
      <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border', variant.color)}>
        {variant.label}
      </span>
    );
  };

  const getLinkStatus = (link: SalesLink) => {
    if (!link.isActive) return { label: 'Arquivado', variant: 'INATIVO' as const };
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return { label: 'Expirado', variant: 'INATIVO' as const };
    return { label: 'Ativo', variant: 'DISPONIVEL' as const };
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Meus Links de Venda
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie links compartilháveis com clientes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/links/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            NOVO LINK
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilters({ ...filters, type: e.target.value as LinkType | '', page: 1 })
              }
            >
              <option value="">Todos os Tipos</option>
              <option value="LOTE_UNICO">Lote Único</option>
              <option value="PRODUTO_GERAL">Produto Geral</option>
              <option value="CATALOGO_COMPLETO">Catálogo Completo</option>
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="EXPIRADO">Expirados</option>
            </Select>

            <div className="relative">
              <Input
                placeholder="Buscar por título ou slug"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={8} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? 'Nenhum link encontrado'
                : 'Nenhum link criado ainda'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Crie links personalizados para compartilhar com seus clientes'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : '+ Novo Link'}
            onAction={hasFilters ? handleClearFilters : () => router.push('/links/new')}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Título/Slug</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Visualizações</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const status = getLinkStatus(link);
                    const thumbnail = link.batch?.medias?.[0] || link.product?.medias?.[0];

                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="w-16 h-16 rounded-sm overflow-hidden bg-slate-200">
                            {thumbnail ? (
                              <img
                                src={thumbnail.url}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ExternalLink className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-obsidian mb-1">
                              {link.title || link.batch?.product?.name || link.product?.name || 'Link sem título'}
                            </p>
                            <button
                              onClick={() => window.open(`/${link.slugToken}`, '_blank')}
                              className="text-xs text-blue-600 hover:underline font-mono"
                            >
                              /{link.slugToken}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getLinkTypeBadge(link.linkType)}
                        </TableCell>
                        <TableCell>
                          {link.showPrice && link.displayPrice ? (
                            <span className="font-serif text-obsidian">
                              {formatCurrency(link.displayPrice)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">Sob consulta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleViewStats(link)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="font-mono">{link.viewsCount || 0}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => router.push(`/leads?linkId=${link.id}`)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <span className="font-mono">0</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(link.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyLink(link)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Copiar link"
                            >
                              <Copy className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/links/${link.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            {link.isActive && (
                              <button
                                onClick={() => handleArchiveLink(link.id)}
                                className="p-2 hover:bg-rose-50 rounded-sm transition-colors"
                                title="Arquivar"
                              >
                                <Archive className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Stats Modal */}
      <Modal open={showStatsModal} onClose={() => setShowStatsModal(false)}>
        <ModalHeader>
          <ModalTitle>Estatísticas do Link</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedLink && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Título
                </p>
                <p className="text-lg font-semibold text-obsidian">
                  {selectedLink.title || 'Sem título'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-1">
                    Visualizações
                  </p>
                  <p className="text-3xl font-mono font-bold text-blue-700">
                    {selectedLink.viewsCount || 0}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                    Leads Capturados
                  </p>
                  <p className="text-3xl font-mono font-bold text-emerald-700">
                    0
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Link Público
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/${selectedLink.slugToken}`}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(selectedLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowStatsModal(false)}
          >
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}