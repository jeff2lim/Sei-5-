'use client';

import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, Sensitivity, UserProfile } from '@/domain/procedure';
import type { Product, ProductCategory } from '@/domain/product';
import type { ConsentState, OnboardingStep, RecoverySession } from '@/domain/session';
import type { ProductRuleSelection } from '@/ruletable/types';
import { recoveryRepository } from '@/repositories';
import { SessionConflictError } from '@/repositories/recovery-repository';
import { create } from 'zustand';

type ProductDraft = {
  name: string;
  category: ProductCategory | null;
  /** 값이 있으면 새 제품을 만들지 않고 이 제품을 갱신합니다. */
  editingProductId?: string;
};

type RecoveryState = {
  hydrated: boolean;
  hydrationError: string | null;
  session: RecoverySession | null;
  productDraft: ProductDraft;
  hydrate: () => Promise<void>;
  saveConsent: (consent: ConsentState, nextStep?: OnboardingStep) => Promise<void>;
  saveOnboardingStep: (step: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  saveProcedure: (
    performedAt: string,
    sensitivity: Sensitivity,
    nextStep?: OnboardingStep,
  ) => Promise<void>;
  saveProfile: (profile: UserProfile, nextStep?: OnboardingStep) => Promise<void>;
  setProductDraft: (draft: ProductDraft) => void;
  saveProduct: (selection: ProductRuleSelection) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  saveCheckIn: (checkIn: CheckIn) => Promise<void>;
  exportData: () => Promise<string>;
  deleteAllData: () => Promise<void>;
};

const blankDraft: ProductDraft = { name: '', category: null };

export const useRecoveryStore = create<RecoveryState>((set, get) => {
  async function persistSession(operation: () => Promise<RecoverySession>) {
    try {
      const session = await operation();
      set({ session, hydrated: true, hydrationError: null });
      return session;
    } catch (error) {
      if (error instanceof SessionConflictError) {
        set({
          session: error.latestSession,
          hydrated: true,
          hydrationError: error.code,
        });
      }
      throw error;
    }
  }

  return {
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

  async saveConsent(consent, nextStep) {
    await persistSession(() =>
      recoveryRepository.mutateSession((session) => ({
        ...session,
        consent,
        onboarding: nextStep
          ? { status: 'in_progress', currentStep: nextStep, completedAt: null }
          : session.onboarding,
      })),
    );
  },

  async saveOnboardingStep(currentStep) {
    await persistSession(() =>
      recoveryRepository.saveOnboarding({
        status: 'in_progress',
        currentStep,
        completedAt: null,
      }),
    );
  },

  async completeOnboarding() {
    await persistSession(() =>
      recoveryRepository.saveOnboarding({
        status: 'completed',
        currentStep: 'complete',
        completedAt: new Date().toISOString(),
      }),
    );
  },

  async saveProcedure(performedAt, sensitivity, nextStep) {
    const now = new Date().toISOString();
    const newProcedureId = crypto.randomUUID();
    await persistSession(() =>
      recoveryRepository.mutateSession((session) => {
        const currentProcedure = session.procedure;
        const procedure: ProcedureRecord = {
          // 시술일 수정은 같은 기록을 갱신하고, 최초 등록만 새 id를 발급합니다.
          id: currentProcedure?.id ?? newProcedureId,
          procedureType: 'picotoning',
          performedAt,
          createdAt: currentProcedure?.createdAt ?? now,
        };
        return {
          ...session,
          procedure,
          profile: { ...session.profile, sensitivity },
          onboarding: nextStep
            ? { status: 'in_progress', currentStep: nextStep, completedAt: null }
            : session.onboarding,
        };
      }),
    );
  },

  async saveProfile(profile, nextStep) {
    await persistSession(() =>
      recoveryRepository.mutateSession((session) => ({
        ...session,
        profile,
        onboarding: nextStep
          ? { status: 'in_progress', currentStep: nextStep, completedAt: null }
          : session.onboarding,
      })),
    );
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
    await persistSession(() => recoveryRepository.saveProduct(product));
    set({ productDraft: blankDraft });
    return product;
  },

  async updateProduct(product) {
    await persistSession(() =>
      recoveryRepository.saveProduct({ ...product, updatedAt: new Date().toISOString() }),
    );
  },

  async deleteProduct(id) {
    await persistSession(() => recoveryRepository.deleteProduct(id));
  },

  async saveCheckIn(checkIn) {
    await persistSession(() => recoveryRepository.saveCheckIn(checkIn));
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
  };
});
