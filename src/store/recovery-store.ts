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
  /** 값이 있으면 새 제품을 만들지 않고 이 제품을 갱신합니다. */
  editingProductId?: string;
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
    const existing = get().session?.procedure;
    const procedure: ProcedureRecord = {
      // 시술일 수정은 같은 기록을 갱신하고, 최초 등록만 새 id를 발급합니다.
      id: existing?.id ?? crypto.randomUUID(),
      procedureType: 'picotoning',
      performedAt,
      createdAt: existing?.createdAt ?? now,
    };
    await recoveryRepository.saveProcedure(procedure);
    // saveProfile은 프로필 전체를 덮어쓰므로 기존 값을 유지해야 합니다.
    await recoveryRepository.saveProfile({ ...get().session?.profile, sensitivity });
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
    const { productDraft, session } = get();
    if (!productDraft.category || !productDraft.name.trim()) {
      throw new Error('제품 이름과 카테고리가 필요합니다.');
    }
    const now = new Date().toISOString();
    const existing = productDraft.editingProductId
      ? session?.products.find((item) => item.id === productDraft.editingProductId)
      : undefined;
    const product: Product = {
      id: existing?.id ?? crypto.randomUUID(),
      name: productDraft.name.trim(),
      category: productDraft.category,
      ruleSelection: selection,
      attributeIds: selection.ingredientGroupIds,
      createdAt: existing?.createdAt ?? now,
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
