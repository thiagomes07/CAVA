'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  X, 
  Calendar, 
  ExternalLink, 
  Clock, 
  Copy,
  MapPin,
  Package,
  Power
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils/cn';
import type { SalesLink, LinkType } from '@/lib/types';

interface LinkDetailsModalProps {
  link: SalesLink;
  onClose: () => void;
  onCopyLink: (link: SalesLink) => void;
  onArchive?: (link: SalesLink) => void;
  onViewPublicPage?: (link: SalesLink) => void;
}

export const LinkDetailsModal: React.FC<LinkDetailsModalProps> = ({
  link,
  onClose,
  onCopyLink,
  onArchive,
  onViewPublicPage,
}) => {
  const locale = useLocale();
  const t = useTranslations('links');

  const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
  const isActive = link.isActive && !isExpired;

  const fullUrl = link.fullUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/${locale}/${link.slugToken}`;

  // Get display data based on link type
  const getDisplayData = () => {
    // For MULTIPLOS_LOTES with items
    if (link.linkType === 'MULTIPLOS_LOTES' && link.items && link.items.length > 0) {
      const firstItem = link.items[0];
      const batch = firstItem.batch;
      const product = batch?.product;
      const media = batch?.medias?.[0] || product?.medias?.[0];
      
      return {
        title: link.title || t('multiplesBatches'),
        subtitle: `${link.items.length} ${t('batchesIncluded')}`,
        imageUrl: media?.url,
        dimensions: batch ? `${batch.width}x${batch.height} cm` : null,
        lotCode: batch?.batchCode,
        material: product?.material,
        finish: product?.finish,
        items: link.items
      };
    }
    
    // For LOTE_UNICO
    if (link.batch) {
      const product = link.product || link.batch.product;
      const media = link.batch.medias?.[0] || product?.medias?.[0];
      
      return {
        title: product?.name || t('untitledLink'),
        subtitle: link.batch.batchCode,
        imageUrl: media?.url,
        dimensions: `${link.batch.width}x${link.batch.height} cm`,
        lotCode: link.batch.batchCode,
        material: product?.material,
        finish: product?.finish,
        slabs: `${link.batch.availableSlabs}/${link.batch.quantitySlabs}`,
        area: link.batch.totalArea
      };
    }
    
    // For PRODUTO_GERAL
    if (link.product) {
      const media = link.product.medias?.[0];
      
      return {
        title: link.product.name,
        subtitle: `${link.product.material} • ${link.product.finish}`,
        imageUrl: media?.url,
        material: link.product.material,
        finish: link.product.finish
      };
    }
    
    // For CATALOGO_COMPLETO or fallback
    return {
      title: link.title || t('completeCatalog'),
      subtitle: t('typeCatalog'),
      imageUrl: null
    };
  };

  const displayData = getDisplayData();

  const handleCopyLink = () => {
    onCopyLink(link);
  };

  const handleViewPublic = () => {
    if (onViewPublicPage) {
      onViewPublicPage(link);
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  const getLinkTypeLabel = (type: LinkType) => {
    const labels: Record<LinkType, string> = {
      LOTE_UNICO: t('typeSingleBatch'),
      PRODUTO_GERAL: t('typeProduct'),
      CATALOGO_COMPLETO: t('typeCatalog'),
      MULTIPLOS_LOTES: t('typeMultipleBatches') || 'Múltiplos Lotes',
    };
    return labels[type] || type;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-sm shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/10" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#222] flex justify-between items-start bg-obsidian">
          <div>
            <div className="flex items-center mb-2 flex-wrap gap-y-2">
              <h2 className="text-3xl font-serif text-white mr-4">
                {link.title || displayData.title}
              </h2>
              {!link.isActive && (
                <span className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                  {t('statusArchived')}
                </span>
              )}
              {isExpired && link.isActive && (
                <span className="px-3 py-1 bg-amber-900/30 border border-amber-800 text-amber-400 text-[10px] font-bold uppercase tracking-widest rounded-sm">
                  {t('statusExpired')}
                </span>
              )}
              {isActive && (
                <span className="px-3 py-1 bg-blue-900/30 border border-blue-800 text-blue-400 text-[10px] font-bold uppercase tracking-widest flex items-center rounded-sm">
                  <Clock className="w-3 h-3 mr-1" /> {t('statusActive')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">
              {getLinkTypeLabel(link.linkType)} • /{link.slugToken}
            </p>
            {link.customMessage && (
              <p className="text-sm text-slate-400 mt-3 max-w-2xl">
                {link.customMessage}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Column - Image */}
            <div className="md:w-5/12 lg:w-5/12 p-4 md:p-6 lg:p-8 md:border-r border-slate-200 bg-white flex flex-col">
              <div className="aspect-[4/3] md:aspect-square max-h-48 md:max-h-64 lg:max-h-none bg-slate-100 overflow-hidden mb-4 md:mb-6 lg:mb-8 relative group mx-auto md:mx-0 w-full">
                {displayData.imageUrl ? (
                  <img 
                    src={displayData.imageUrl} 
                    alt={displayData.title} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    onError={(e) => {
                      console.error('Image failed to load:', displayData.imageUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-24 h-24 text-slate-300" />
                  </div>
                )}
                {displayData.lotCode && (
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-obsidian">
                    {t('lot')} {displayData.lotCode}
                  </div>
                )}
              </div>
              
              <div className="space-y-4 md:space-y-6 lg:space-y-8 flex-1">
                <div>
                  <h3 className="font-serif text-xl md:text-2xl lg:text-3xl text-obsidian mb-2">{displayData.title}</h3>
                  {displayData.material && (
                    <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                      <MapPin className="w-3 h-3 mr-2" /> {displayData.material} {displayData.finish && `• ${displayData.finish}`}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-6 border-t border-b border-slate-100">
                  {displayData.dimensions && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('dimensions')}</span>
                      <span className="font-mono text-sm text-obsidian">{displayData.dimensions}</span>
                    </div>
                  )}
                  {displayData.lotCode && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('lot')}</span>
                      <span className="font-mono text-sm text-obsidian">{displayData.lotCode}</span>
                    </div>
                  )}
                  {displayData.slabs && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('slabs')}</span>
                      <span className="font-mono text-sm text-obsidian">{displayData.slabs}</span>
                    </div>
                  )}
                  {displayData.area && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('area')}</span>
                      <span className="font-mono text-sm text-obsidian">{displayData.area.toFixed(2)} m²</span>
                    </div>
                  )}
                </div>

                {/* Multiple items list */}
                {displayData.items && displayData.items.length > 1 && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      {t('batchesIncluded')} ({displayData.items.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {displayData.items.map((item, idx) => {
                        const itemBatch = item.batch;
                        const itemMedia = itemBatch?.medias?.[0] || itemBatch?.product?.medias?.[0];
                        
                        return (
                          <div key={item.id || idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-sm">
                            <div className="w-12 h-12 bg-slate-200 rounded-sm overflow-hidden flex-shrink-0">
                              {itemMedia?.url ? (
                                <img 
                                  src={itemMedia.url} 
                                  alt={itemBatch?.batchCode || ''} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-obsidian truncate">
                                {itemBatch?.product?.name || t('productNotSpecified')}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {itemBatch?.batchCode} • {item.quantity} {t('slabs')}
                              </p>
                            </div>
                            {link.showPrice && item.unitPrice > 0 && (
                              <p className="text-sm font-medium text-obsidian">
                                {formatCurrency(item.unitPrice * item.quantity, locale as 'pt' | 'en' | 'es')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Stats */}
            <div className="flex-1 p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 lg:space-y-12 bg-[#FAFAFA]">
              <div className="space-y-4 md:space-y-6 lg:space-y-8">
                {/* Stats Row */}
                <div className="flex justify-between items-end border-b border-slate-200 pb-4 md:pb-6 lg:pb-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('views')}</p>
                    <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-obsidian">{link.viewsCount || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('price')}</p>
                    <p className="text-2xl md:text-3xl lg:text-4xl font-serif text-obsidian">
                      {link.showPrice && link.displayPrice 
                        ? formatCurrency(link.displayPrice, locale as 'pt' | 'en' | 'es')
                        : '-'
                      }
                    </p>
                  </div>
                </div>

                {/* Link URL Box */}
                <div className="bg-obsidian p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ExternalLink className="w-32 h-32 rotate-12" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em] mb-4">{t('linkUrl')}</p>
                    <div className="text-lg font-mono tracking-tight mb-6 break-all text-slate-300">
                      {fullUrl}
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleCopyLink}
                        className="px-6 py-3 bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center"
                      >
                        <Copy className="w-4 h-4 mr-2" /> {t('copyLink')}
                      </button>
                      <button 
                        onClick={handleViewPublic}
                        className="px-6 py-3 bg-white text-obsidian text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> {t('openLink')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-obsidian uppercase tracking-[0.2em] flex items-center border-b border-slate-200 pb-4">
                    <Calendar className="w-3 h-3 mr-2" /> {t('dates')}
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('created')}</p>
                      <p className="text-sm font-mono text-obsidian">{formatDate(link.createdAt, 'dd/MM/yyyy', locale as 'pt' | 'en' | 'es')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('expiration')}</p>
                      <p className={cn(
                        "text-sm font-mono",
                        isExpired ? "text-amber-600" : "text-obsidian"
                      )}>
                        {link.expiresAt ? formatDate(link.expiresAt, 'dd/MM/yyyy', locale as 'pt' | 'en' | 'es') : t('noExpiration')}
                      </p>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 bg-white border-t border-slate-200 flex items-center justify-end gap-4 z-10">
          <button 
            onClick={handleViewPublic}
            className="px-6 py-3 bg-white border border-slate-200 text-obsidian text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            {t('openLink')}
          </button>
          
          {link.isActive && onArchive && (
            <button 
              onClick={() => onArchive(link)}
              className="px-6 py-3 bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center"
            >
              <Power className="w-4 h-4 mr-2" /> {t('deactivateLink')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
