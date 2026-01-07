import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Batch } from '@/lib/types';

interface CartItem {
  batchId: string;
  batch: Batch;
  addedAt: string;
}

interface CartState {
  items: CartItem[];
  
  // Actions
  addItem: (batch: Batch) => void;
  removeItem: (batchId: string) => void;
  clearCart: () => void;
  isInCart: (batchId: string) => boolean;
  getItemCount: () => number;
  getTotalValue: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (batch: Batch) => {
        const { items } = get();
        const exists = items.some(item => item.batchId === batch.id);
        
        if (!exists) {
          set({
            items: [
              ...items,
              {
                batchId: batch.id,
                batch,
                addedAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      removeItem: (batchId: string) => {
        set({
          items: get().items.filter(item => item.batchId !== batchId),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      isInCart: (batchId: string) => {
        return get().items.some(item => item.batchId === batchId);
      },

      getItemCount: () => {
        return get().items.length;
      },

      getTotalValue: () => {
        return get().items.reduce((total, item) => {
          return total + (item.batch.industryPrice || 0);
        }, 0);
      },
    }),
    {
      name: 'cava-cart-storage',
      // Apenas persistir os IDs, não os dados completos
      partialize: (state) => ({
        items: state.items.map(item => ({
          batchId: item.batchId,
          batch: item.batch,
          addedAt: item.addedAt,
        })),
      }),
    }
  )
);
