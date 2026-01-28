'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Plus, Search, Copy, Edit2, Trash2, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

interface CatalogLink {
  id: string;
  slugToken: string;
  title?: string;
  customMessage?: string;
  viewsCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullUrl?: string;
  batches?: Array<{ id: string; batchCode: string }>;
}

export default function CatalogLinksPage() {
  const locale = useLocale();
  const router = useRouter();
  const { success, error } = useToast();

  const [links, setLinks] = useState<CatalogLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkToDelete, setLinkToDelete] = useState<CatalogLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<CatalogLink[]>('/catalog-links');
      setLinks(data);
    } catch (err) {
      error('Erro ao carregar catálogos');
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (link: CatalogLink) => {
    try {
      const fullUrl = link.fullUrl || `${window.location.origin}/${locale}/catalogo/${link.slugToken}`;
      await navigator.clipboard.writeText(fullUrl);
      success('Link copiado!');
    } catch (err) {
      error('Erro ao copiar link');
    }
  };

  const handleDelete = async () => {
    if (!linkToDelete) return;

    try {
      setIsDeleting(true);
      await apiClient.delete(`/catalog-links/${linkToDelete.id}`);
      success('Catálogo removido');
      setLinkToDelete(null);
      fetchLinks();
    } catch (err) {
      error('Erro ao remover catálogo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewPublic = (link: CatalogLink) => {
    // A URL pública não precisa do locale, é uma rota pública
    const fullUrl = link.fullUrl || `${window.location.origin}/catalogo/${link.slugToken}`;
    window.open(fullUrl, '_blank');
  };

  const filteredLinks = links.filter((link) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      link.slugToken.toLowerCase().includes(searchLower) ||
      link.title?.toLowerCase().includes(searchLower) ||
      link.customMessage?.toLowerCase().includes(searchLower)
    );
  });

  const getLinkStatus = (link: CatalogLink) => {
    if (!link.isActive) return { label: 'Arquivado', variant: 'INATIVO' as const };
    if (link.expiresAt && new Date(link.expiresAt) < new Date())
      return { label: 'Expirado', variant: 'INATIVO' as const };
    return { label: 'Ativo', variant: 'DISPONIVEL' as const };
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">Catálogos</h1>
            <p className="text-sm text-slate-500">
              Gerencie seus catálogos públicos personalizados
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push(`/${locale}/catalogos/new`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Catálogo
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar catálogos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingState variant="table" rows={10} />
        ) : filteredLinks.length === 0 ? (
          <EmptyState
            icon={Search}
            title={searchTerm ? 'Nenhum catálogo encontrado' : 'Nenhum catálogo criado'}
            description={
              searchTerm
                ? 'Tente ajustar sua busca'
                : 'Crie seu primeiro catálogo personalizado'
            }
          />
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Lotes</TableHead>
                  <TableHead>Visualizações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => {
                  const status = getLinkStatus(link);
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <code className="text-xs font-mono text-obsidian">{link.slugToken}</code>
                      </TableCell>
                      <TableCell>
                        {link.title || (
                          <span className="text-slate-400 italic">Sem título</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {link.batches?.length || 0} lote{(link.batches?.length || 0) !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>{link.viewsCount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status.variant === 'DISPONIVEL' ? 'success' : 'secondary'
                          }
                        >
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(link.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPublic(link)}
                            title="Ver público"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyLink(link)}
                            title="Copiar link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLinkToDelete(link)}
                            title="Remover"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={!!linkToDelete} onClose={() => setLinkToDelete(null)}>
        <ModalHeader>
          <ModalTitle>Remover Catálogo</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            Tem certeza que deseja remover o catálogo <strong>{linkToDelete?.slugToken}</strong>?
            Esta ação não pode ser desfeita.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setLinkToDelete(null)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
          >
            Remover
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
