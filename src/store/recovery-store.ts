'use client';

import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, Sensitivity, UserProfile } from '@/domain/procedure';
import type { Product, ProductCategory } from '@/domain/product';
import type { ConsentState, RecoverySession } from '@/domain/session';
import type { ProductRuleSelection } from '@/ruletable/types';
import { recoveryRepository } from '@/repositories';
import { create } from 'zustand';

type ProductDraft = {
  name: string;
  category: ProductCategory | null;
};

type RecoveryState = {
  hydrated: boolean;
  session: RecoverySession | null;
  productDraft: ProductDraft;
  hydrate: () => Promise<void>;
  saveConsent: (consent: ConsentState) => Promise<void>;
  saveProcedure: (performedAt: string, sensitivity: Sensitivity) => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  setProductDraft: (draft: ProductDraft) => void;
  saveProduct: (selection: ProductRuleSelection) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveCheckIn: (checkIn: CheckIn) => Promise<void>;
  exportData: () => Promise<string>;
  deleteAllData: () => Promise<void>;
};

const blankDraft: ProductDraft = { name: '', category: null };

export const useRecoveryStore = create<RecoveryState>((set, get) => ({
  hydrated: false,
  session: null,
  productDraft: blankDraft,

  async hydrate() {
    const session = await recoveryRepository.loadSession();
    set({ session, hydrated: true });
  },

  async saveConsent(consent) {
    await recoveryRepository.saveConsent(consent);
    await get().hydrate();
  },

  async saveProcedure(performedAt, sensitivity) {
    const now = new Date().toISOString();
    const procedure: ProcedureRecord = {
      id: crypto.randomUUID(),
      procedureType: 'picotoning',
      performedAt,
      createdAt: now,
    };
    await recoveryRepository.saveProcedure(procedure);
    await recoveryRepository.saveProfile({ sensitivity });
    await get().hydrate();
  },

  async saveProfile(profile) {
    await recoveryRepository.saveProfile(profile);
    await get().hydrate();
  },

  setProductDraft(productDraft) {
    set({ productDraft });
  },

  async saveProduct(selection) {
    const { productDraft } = get();
    if (!productDraft.category || !productDraft.name.trim()) {
      throw new Error('제품 이름과 카테고리가 필요합니다.');
    }
    const now = new Date().toISOString();
    const product: Product = {
      id: crypto.randomUUID(),
      name: productDraft.name.trim(),
      category: productDraft.category,
      ruleSelection: selection,
      attributeIds: selection.ingredientGroupIds,
      createdAt: now,
      updatedAt: now,
    };
    await recoveryRepository.saveProduct(product);
    set({ productDraft: blankDraft });
    await get().hydrate();
    return product;
  },

  async updateProduct(product) {
    await recoveryRepository.saveProduct({ ...product, updatedAt: new Date().toISOString() });
    await get().hydrate();
  },

  async deleteProduct(id) {
    await recoveryRepository.deleteProduct(id);
    await get().hydrate();
  },

  async saveCheckIn(checkIn) {
    await recoveryRepository.saveCheckIn(checkIn);
    await get().hydrate();
  },

  async exportData() {
    return recoveryRepository.exportData();
  },

  async deleteAllData() {
    await recoveryRepository.deleteAllData();
    set({ session: null, hydrated: true, productDraft: blankDraft });
  },
}));
