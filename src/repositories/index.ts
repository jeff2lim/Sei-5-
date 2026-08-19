import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, UserProfile } from '@/domain/procedure';
import type { Product } from '@/domain/product';
import type { ConsentState, OnboardingState } from '@/domain/session';
import { dataMode, isSupabaseConfigured } from '@/lib/supabase/config';
import { LocalRecoveryRepository } from './local-recovery-repository';
import type { RecoveryRepository } from './recovery-repository';
import type { SupabaseRecoveryRepository } from './supabase-recovery-repository';

export const localRecoveryRepository = new LocalRecoveryRepository();

let cloudRepositoryPromise: Promise<SupabaseRecoveryRepository> | null = null;

export function getSupabaseRecoveryRepository() {
  cloudRepositoryPromise ??= import('./supabase-recovery-repository').then(
    ({ SupabaseRecoveryRepository }) => new SupabaseRecoveryRepository(),
  );
  return cloudRepositoryPromise;
}

class ConfiguredRecoveryRepository implements RecoveryRepository {
  private async activeRepository() {
    if (dataMode === 'local' || !isSupabaseConfigured()) return localRecoveryRepository;
    if (dataMode === 'supabase') return getSupabaseRecoveryRepository();

    const { createBrowserSupabaseClient } = await import('@/lib/supabase/client');
    const { data, error } = await createBrowserSupabaseClient().auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    return data.user ? getSupabaseRecoveryRepository() : localRecoveryRepository;
  }

  async loadSession() {
    return (await this.activeRepository()).loadSession();
  }
  async mutateSession(update: Parameters<RecoveryRepository['mutateSession']>[0]) {
    return (await this.activeRepository()).mutateSession(update);
  }
  async saveProfile(profile: UserProfile) {
    return (await this.activeRepository()).saveProfile(profile);
  }
  async saveProcedure(procedure: ProcedureRecord) {
    return (await this.activeRepository()).saveProcedure(procedure);
  }
  async saveConsent(consent: ConsentState) {
    return (await this.activeRepository()).saveConsent(consent);
  }
  async saveOnboarding(onboarding: OnboardingState) {
    return (await this.activeRepository()).saveOnboarding(onboarding);
  }
  async listProducts() {
    return (await this.activeRepository()).listProducts();
  }
  async getProduct(id: string) {
    return (await this.activeRepository()).getProduct(id);
  }
  async saveProduct(product: Product) {
    return (await this.activeRepository()).saveProduct(product);
  }
  async deleteProduct(id: string) {
    return (await this.activeRepository()).deleteProduct(id);
  }
  async listCheckIns() {
    return (await this.activeRepository()).listCheckIns();
  }
  async saveCheckIn(checkIn: CheckIn) {
    return (await this.activeRepository()).saveCheckIn(checkIn);
  }
  async exportData() {
    return (await this.activeRepository()).exportData();
  }
  async deleteAllData() {
    return (await this.activeRepository()).deleteAllData();
  }
}

export const recoveryRepository: RecoveryRepository =
  dataMode === 'local' ? localRecoveryRepository : new ConfiguredRecoveryRepository();
