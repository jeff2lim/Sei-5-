'use client';

import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, Sensitivity, UserProfile } from '@/domain/procedure';
import type { Product, ProductCategory } from '@/domain/product';
import type { ConsentState, OnboardingStep, RecoverySession } from '@/domain/session';
import type { ProductRuleSelection } from '@/ruletable/types';
import { recoveryRepository } from '@/repositories';
import { create } from 'zustand';

type ProductDraft = {
  name: string;
  category: ProductCategory | null;
};

type RecoveryState = {
  hydrated: boolean;
  hydrationError: string | null;
  session: RecoverySession | null;
  productDraft: ProductDraft;
  hydrate: () => Promise<void>;
  saveConsent: (consent: ConsentState) => Promise<void>;
  saveOnboardingStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
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
  hydrationError: null,
  session: null,
  productDraft: blankDraft,

  async hydrate() {
    try {
      const session = await recoveryRepository.loadSession();
      set({ session, hydrated: true, hydrationError: null });
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code
          : error instanceof Error
            ? error.name
            : 'UNKNOWN';
      set({ hydrated: true, hydrationError: code });
      throw error;
    }
  },

  async saveConsent(consent) {
    await recoveryRepository.saveConsent(consent);
    await get().hydrate();
  },

  async saveOnboardingStep(currentStep) {
    await recoveryRepository.saveOnboarding({
      status: 'in_progress',
      currentStep,
      completedAt: null,
    });
    await get().hydrate();
  },

  async completeOnboarding() {
    await recoveryRepository.saveOnboarding({
      status: 'completed',
      currentStep: 'complete',
      completedAt: new Date().toISOString(),
    });
    await get().hydrate();
  },

  async saveProcedure(performedAt, sensitivity) {
    const now = new Date().toISOString();
    const currentSession = get().session;
    const currentProcedure = currentSession?.procedure;
    const procedure: ProcedureRecord = {
      id: currentProcedure?.id ?? crypto.randomUUID(),
      procedureType: 'picotoning',
      performedAt,
      createdAt: currentProcedure?.createdAt ?? now,
    };
    await recoveryRepository.saveProcedure(procedure);
    await recoveryRepository.saveProfile({
      ...(currentSession?.profile ?? { sensitivity: 'normal' }),
      sensitivity,
    });
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
    set({
      session: null,
      hydrated: true,
      hydrationError: null,
      productDraft: blankDraft,
    });
  },
}));
