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
import type { RecoveryRepository } from './recovery-repository';

const STORAGE_KEY = 'recovery-note:v1';

type StoredSession = Partial<Omit<RecoverySession, 'onboarding' | 'schemaVersion'>> & {
  schemaVersion?: number;
  onboarding?: Partial<OnboardingState>;
};

function migrateOnboarding(session: StoredSession): OnboardingState {
  if (
    session.onboarding?.status &&
    session.onboarding.currentStep &&
    session.onboarding.completedAt !== undefined
  ) {
    return session.onboarding as OnboardingState;
  }

  // v1 had no completion marker. Reaching the cleansing answer was the last persisted
  // action before the completion screen, so it is the safest legacy completion signal.
  if (session.profile?.cleansingFeel !== undefined) {
    return { status: 'completed', currentStep: 'complete', completedAt: null };
  }
  if (session.procedure) {
    return { status: 'in_progress', currentStep: 'products', completedAt: null };
  }
  if (session.consent) {
    return { status: 'in_progress', currentStep: 'procedure', completedAt: null };
  }
  return { status: 'not_started', currentStep: 'consent', completedAt: null };
}

export class LocalRecoveryRepository implements RecoveryRepository {
  private read(): RecoverySession {
    if (typeof window === 'undefined') return createEmptyRecoverySession();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyRecoverySession();
    try {
      const stored = JSON.parse(raw) as StoredSession;
      const session: RecoverySession = {
        ...createEmptyRecoverySession(),
        ...stored,
        schemaVersion: RECOVERY_SESSION_SCHEMA_VERSION,
        onboarding: migrateOnboarding(stored),
        profile: { ...createEmptyRecoverySession().profile, ...stored.profile },
      };

      if (stored.schemaVersion !== RECOVERY_SESSION_SCHEMA_VERSION || !stored.onboarding) {
        this.write(session);
      }
      return session;
    } catch {
      return createEmptyRecoverySession();
    }
  }

  private write(session: RecoverySession) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  async loadSession() {
    const session = this.read();
    return session.procedure || session.consent || session.products.length ? session : null;
  }

  async saveProfile(profile: UserProfile) {
    this.write({ ...this.read(), profile });
  }

  async saveProcedure(procedure: ProcedureRecord) {
    this.write({ ...this.read(), procedure });
  }

  async saveConsent(consent: ConsentState) {
    this.write({ ...this.read(), consent });
  }

  async saveOnboarding(onboarding: OnboardingState) {
    this.write({ ...this.read(), onboarding });
  }

  async listProducts() {
    return this.read().products;
  }

  async getProduct(id: string) {
    return this.read().products.find((product) => product.id === id) ?? null;
  }

  async saveProduct(product: Product) {
    const session = this.read();
    const products = session.products.some((item) => item.id === product.id)
      ? session.products.map((item) => (item.id === product.id ? product : item))
      : [...session.products, product];
    this.write({ ...session, products });
  }

  async deleteProduct(id: string) {
    const session = this.read();
    this.write({ ...session, products: session.products.filter((product) => product.id !== id) });
  }

  async listCheckIns() {
    return this.read().checkIns;
  }

  async saveCheckIn(checkIn: CheckIn) {
    const session = this.read();
    this.write({ ...session, checkIns: [...session.checkIns, checkIn] });
  }

  async exportData() {
    return JSON.stringify(this.read(), null, 2);
  }

  async deleteAllData() {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
