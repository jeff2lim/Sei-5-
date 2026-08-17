import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, UserProfile } from '@/domain/procedure';
import type { Product } from '@/domain/product';
import {
  RECOVERY_SESSION_SCHEMA_VERSION,
  createEmptyRecoverySession,
  type ConsentState,
  type OnboardingState,
  type RecoverySession,
} from '@/domain/session';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecoveryRepository } from './recovery-repository';

type RecoverySessionRow = {
  data: RecoverySession;
};

export class SupabaseRecoveryRepository implements RecoveryRepository {
  constructor(private readonly getClient: () => SupabaseClient = createBrowserSupabaseClient) {}

  private async userId() {
    const { data, error } = await this.getClient().auth.getUser();
    if (error || !data.user) throw new Error('로그인이 필요합니다.');
    return data.user.id;
  }

  async loadSession() {
    const userId = await this.userId();
    const { data, error } = await this.getClient()
      .from('recovery_sessions')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as RecoverySessionRow | null)?.data ?? null;
  }

  async replaceSession(session: RecoverySession) {
    const userId = await this.userId();
    const { error } = await this.getClient().from('recovery_sessions').upsert({
      user_id: userId,
      schema_version: RECOVERY_SESSION_SCHEMA_VERSION,
      data: session,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  private async mutate(update: (session: RecoverySession) => RecoverySession) {
    const current = (await this.loadSession()) ?? createEmptyRecoverySession();
    await this.replaceSession(update(current));
  }

  async saveProfile(profile: UserProfile) {
    await this.mutate((session) => ({ ...session, profile }));
  }

  async saveProcedure(procedure: ProcedureRecord) {
    await this.mutate((session) => ({ ...session, procedure }));
  }

  async saveConsent(consent: ConsentState) {
    await this.mutate((session) => ({ ...session, consent }));
  }

  async saveOnboarding(onboarding: OnboardingState) {
    await this.mutate((session) => ({ ...session, onboarding }));
  }

  async listProducts() {
    return (await this.loadSession())?.products ?? [];
  }

  async getProduct(id: string) {
    return (await this.listProducts()).find((product) => product.id === id) ?? null;
  }

  async saveProduct(product: Product) {
    await this.mutate((session) => ({
      ...session,
      products: session.products.some((item) => item.id === product.id)
        ? session.products.map((item) => (item.id === product.id ? product : item))
        : [...session.products, product],
    }));
  }

  async deleteProduct(id: string) {
    await this.mutate((session) => ({
      ...session,
      products: session.products.filter((product) => product.id !== id),
    }));
  }

  async listCheckIns() {
    return (await this.loadSession())?.checkIns ?? [];
  }

  async saveCheckIn(checkIn: CheckIn) {
    await this.mutate((session) => ({
      ...session,
      checkIns: [...session.checkIns, checkIn],
    }));
  }

  async exportData() {
    return JSON.stringify((await this.loadSession()) ?? createEmptyRecoverySession(), null, 2);
  }

  async deleteAllData() {
    const userId = await this.userId();
    const { error } = await this.getClient()
      .from('recovery_sessions')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
}
