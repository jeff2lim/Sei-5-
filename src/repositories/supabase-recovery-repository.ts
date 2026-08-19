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
import {
  appendCheckInIdempotently,
  SessionConflictError,
  type RecoveryRepository,
} from './recovery-repository';

type RecoverySessionRow = {
  data: RecoverySession;
  revision: number;
};

type ReplaceSessionResult = {
  applied: boolean;
  data: RecoverySession | null;
  revision: number | null;
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
      .select('data, revision')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as RecoverySessionRow | null)?.data ?? null;
  }

  async replaceSession(session: RecoverySession) {
    const snapshot = await this.loadSnapshot();
    await this.replaceIfRevision(session, snapshot.revision);
  }

  private async loadSnapshot() {
    const userId = await this.userId();
    const { data, error } = await this.getClient()
      .from('recovery_sessions')
      .select('data, revision')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    const row = data as RecoverySessionRow | null;
    return { session: row?.data ?? null, revision: row?.revision ?? null };
  }

  private async replaceIfRevision(session: RecoverySession, expectedRevision: number | null) {
    const { data, error } = await this.getClient().rpc('replace_recovery_session_if_revision', {
      p_data: session,
      p_expected_revision: expectedRevision,
      p_schema_version: RECOVERY_SESSION_SCHEMA_VERSION,
    });
    if (error) throw error;
    const result = (data as ReplaceSessionResult[] | null)?.[0];
    if (!result?.applied) {
      throw new SessionConflictError(
        '다른 화면에서 데이터가 먼저 변경되었습니다. 최신 내용을 확인한 뒤 다시 시도해 주세요.',
        result?.data ?? null,
      );
    }
    return session;
  }

  async mutateSession(update: (session: RecoverySession) => RecoverySession) {
    const snapshot = await this.loadSnapshot();
    const current = snapshot.session ?? createEmptyRecoverySession();
    const next = update(current);
    if (next === current) return current;
    return this.replaceIfRevision(next, snapshot.revision);
  }

  async saveProfile(profile: UserProfile) {
    await this.mutateSession((session) => ({ ...session, profile }));
  }

  async saveProcedure(procedure: ProcedureRecord) {
    await this.mutateSession((session) => ({ ...session, procedure }));
  }

  async saveConsent(consent: ConsentState) {
    await this.mutateSession((session) => ({ ...session, consent }));
  }

  async saveOnboarding(onboarding: OnboardingState) {
    await this.mutateSession((session) => ({ ...session, onboarding }));
  }

  async listProducts() {
    return (await this.loadSession())?.products ?? [];
  }

  async getProduct(id: string) {
    return (await this.listProducts()).find((product) => product.id === id) ?? null;
  }

  async saveProduct(product: Product) {
    await this.mutateSession((session) => ({
      ...session,
      products: session.products.some((item) => item.id === product.id)
        ? session.products.map((item) => (item.id === product.id ? product : item))
        : [...session.products, product],
    }));
  }

  async deleteProduct(id: string) {
    await this.mutateSession((session) => ({
      ...session,
      products: session.products.filter((product) => product.id !== id),
    }));
  }

  async listCheckIns() {
    return (await this.loadSession())?.checkIns ?? [];
  }

  async saveCheckIn(checkIn: CheckIn) {
    await this.mutateSession((session) => appendCheckInIdempotently(session, checkIn));
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
