'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, Mail, Phone, MessageSquare, Check, User, Inbox, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Lead, SalesLink } from '@/lib/types';
import type { LeadFilter } from '@/lib/schemas/lead.schema';
import { leadStatuses } from '@/lib/schemas/lead.schema';
import { cn } from '@/lib/utils/cn';

export default function LeadsManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [salesLinks, setSalesLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [filters, setFilters] = useState<LeadFilter>({
    search: searchParams.get('search') || '',
    linkId: searchParams.get('linkId') || '',
    startDate: '',
    endDate: '',
    optIn: undefined,
    status: '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 50,
  });

  useEffect(() => {
    fetchSalesLinks();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [filters]);

  const fetchSalesLinks = async () => {
    try {
      const data = await apiClient.get<{ links: SalesLink[] }>('/sales-links', {
        params: { limit: 1000 },
      });
      setSalesLinks(data.links);
    } catch (err) {
      console.error('Erro ao carregar links:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        leads: Lead[];
        total: number;
        page: number;
      }>('/leads', { params: filters });

      setLeads(data.leads);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar leads');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: typeof leadStatuses[number]) => {
    try {
      setIsUpdatingStatus(true);
      
      await apiClient.patch(`/leads/${leadId}/status`, {
        status: newStatus,
      });

      success('Status atualizado com sucesso');
      fetchLeads();
      
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (err) {
      error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    try {
      success('Exportação iniciada. O download começará em breve.');
      // Implementar lógica de exportação CSV
    } catch (err) {
      error('Erro ao exportar leads');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      linkId: '',
      startDate: '',
      endDate: '',
      optIn: undefined,
      status: '',
      page: 1,
      limit: 50,
    });
    router.push('/leads');
  };

  const handleCopyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact);
      success('Contato copiado!');
    } catch (err) {
      error('Erro ao copiar contato');
    }
  };

  const hasFilters = filters.search || filters.linkId || filters.startDate || filters.endDate || filters.status;
  const isEmpty = leads.length === 0;

  const getStatusBadge = (status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO') => {
    const variants: Record<'NOVO' | 'CONTATADO' | 'RESOLVIDO', string> = {
      NOVO: 'bg-blue-50 text-blue-700 border-blue-200',
      CONTATADO: 'bg-amber-50 text-amber-700 border-amber-200',
      RESOLVIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return variants[status];
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Meus Leads
            </h1>
            <p className="text-sm text-slate-500">
              Visualize e gerencie leads capturados via links
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4">
            <div className="relative w-full md:w-auto md:min-w-[240px]">
              <Input
                placeholder="Nome ou contato"
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <div className="w-full md:w-auto md:min-w-[200px]">
              <Select
                value={filters.linkId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, linkId: e.target.value, page: 1 })
                }
              >
                <option value="">Todos os Links</option>
                {salesLinks.map((link) => (
                  <option key={link.id} value={link.id} title={link.title || link.slugToken}>
                    {truncateText(link.title || link.slugToken, TRUNCATION_LIMITS.SELECT_OPTION)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full md:w-auto md:min-w-[180px]">
              <Select
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, status: e.target.value as '' | 'NOVO' | 'CONTATADO' | 'RESOLVIDO', page: 1 })
                }
              >
                <option value="">Todos os Status</option>
                <option value="NOVO">Novo</option>
                <option value="CONTATADO">Contatado</option>
                <option value="RESOLVIDO">Resolvido</option>
              </Select>
            </div>

            <div className="w-full md:w-auto md:min-w-[170px]">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, startDate: e.target.value, page: 1 })
                }
              />
            </div>

            <div className="w-full md:w-auto md:ml-auto">
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                disabled={!hasFilters}
                className="w-full md:w-auto h-[48px] px-6"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Inbox}
            title={
              hasFilters
                ? 'Nenhum lead encontrado'
                : 'Nenhum lead capturado ainda'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Quando clientes demonstrarem interesse, eles aparecerão aqui'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : undefined}
            onAction={hasFilters ? handleClearFilters : undefined}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Produto Interessado</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const isEmail = lead.contact.includes('@');
                    
                    return (
                      <TableRow 
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => handleViewDetails(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span 
                              className="font-medium text-obsidian"
                              title={lead.name}
                            >
                              {truncateText(lead.name, TRUNCATION_LIMITS.USER_NAME_SHORT)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContact(lead.contact);
                            }}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                            title={lead.contact}
                          >
                            {isEmail ? (
                              <Mail className="w-4 h-4" />
                            ) : (
                              <Phone className="w-4 h-4" />
                            )}
                            <span>{truncateText(lead.contact, TRUNCATION_LIMITS.CONTACT)}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p 
                              className="text-sm text-slate-600"
                              title={lead.salesLink?.title || lead.salesLink?.slugToken}
                            >
                              {truncateText(lead.salesLink?.title || lead.salesLink?.slugToken, TRUNCATION_LIMITS.LINK_TITLE) || '-'}
                            </p>
                            {lead.salesLink && (
                              <Badge
                                variant="default"
                                className="mt-1"
                              >
                                {lead.salesLink.linkType.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span 
                            className="text-sm text-slate-600"
                            title={lead.salesLink?.batch?.product?.name || lead.salesLink?.product?.name || 'Catálogo'}
                          >
                            {truncateText(
                              lead.salesLink?.batch?.product?.name ||
                                lead.salesLink?.product?.name ||
                                'Catálogo',
                              TRUNCATION_LIMITS.PRODUCT_NAME_SHORT
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lead.message ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(lead);
                              }}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Ver mensagem
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.marketingOptIn ? (
                            <Check className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Select
                              value={lead.status}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateStatus(lead.id, e.target.value as 'NOVO' | 'CONTATADO' | 'RESOLVIDO')}
                              disabled={isUpdatingStatus}
                              className="text-xs"
                            >
                              <option value="NOVO">Novo</option>
                              <option value="CONTATADO">Contatado</option>
                              <option value="RESOLVIDO">Resolvido</option>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(lead.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleViewDetails(lead);
                            }}
                          >
                            Ver Detalhes
                          </Button>
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
              onPageChange={(page: number) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <ModalClose onClose={() => setShowDetailModal(false)} />
        <ModalHeader>
          <ModalTitle>Detalhes do Lead</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedLead && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Informações de Contato
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Nome</p>
                      <p className="font-medium text-obsidian">{selectedLead.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedLead.contact.includes('@') ? (
                      <Mail className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Phone className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm text-slate-500">Contato</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-obsidian">{selectedLead.contact}</p>
                        <button
                          onClick={() => handleCopyContact(selectedLead.contact)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedLead.message && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                    Mensagem
                  </p>
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedLead.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Origin */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Origem do Lead
                </p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {selectedLead.salesLink?.title || 'Link sem título'}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    /{selectedLead.salesLink?.slugToken}
                  </p>
                  {selectedLead.salesLink?.batch && (
                    <p className="text-sm text-blue-800">
                      Lote: {selectedLead.salesLink.batch.batchCode} •{' '}
                      {selectedLead.salesLink.batch.product?.name}
                    </p>
                  )}
                  {selectedLead.salesLink?.product && (
                    <p className="text-sm text-blue-800">
                      Produto: {selectedLead.salesLink.product.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Marketing Opt-in */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-sm">
                {selectedLead.marketingOptIn ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-slate-600">
                      Aceitou receber comunicações de marketing
                    </p>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      Não aceitou comunicações de marketing
                    </p>
                  </>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Status do Lead
                </p>
                <Select
                  value={selectedLead.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateStatus(selectedLead.id, e.target.value as 'NOVO' | 'CONTATADO' | 'RESOLVIDO')}
                  disabled={isUpdatingStatus}
                >
                  <option value="NOVO">Novo</option>
                  <option value="CONTATADO">Contatado</option>
                  <option value="RESOLVIDO">Resolvido</option>
                </Select>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Lead capturado em {formatDate(selectedLead.createdAt, 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}