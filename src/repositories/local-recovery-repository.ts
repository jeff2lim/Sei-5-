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
import {
  appendCheckInIdempotently,
  type RecoveryRepository,
} from './recovery-repository';

const STORAGE_KEY = 'recovery-note:v1';

type StoredSession = Partial<Omit<RecoverySession, 'onboarding' | 'schemaVersion'>> & {
  schemaVersion?: number;
  storageRevision?: number;
  onboarding?: Partial<OnboardingState>;
};

type LocalSessionSnapshot = {
  session: RecoverySession;
  revision: number;
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
  private readSnapshot(): LocalSessionSnapshot {
    if (typeof window === 'undefined') {
      return { session: createEmptyRecoverySession(), revision: 0 };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { session: createEmptyRecoverySession(), revision: 0 };
    try {
      const stored = JSON.parse(raw) as StoredSession;
      const { storageRevision = 0, ...storedSession } = stored;
      const session: RecoverySession = {
        ...createEmptyRecoverySession(),
        ...storedSession,
        schemaVersion: RECOVERY_SESSION_SCHEMA_VERSION,
        onboarding: migrateOnboarding(stored),
        profile: { ...createEmptyRecoverySession().profile, ...stored.profile },
      };

      if (stored.schemaVersion !== RECOVERY_SESSION_SCHEMA_VERSION || !stored.onboarding) {
        this.write(session, storageRevision);
      }
      return { session, revision: storageRevision };
    } catch {
      return { session: createEmptyRecoverySession(), revision: 0 };
    }
  }

  private read() {
    return this.readSnapshot().session;
  }

  private write(session: RecoverySession, storageRevision: number) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, storageRevision }));
  }

  private async withWriteLock<T>(operation: () => T | Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(`${STORAGE_KEY}:write`, operation);
    }
    return operation();
  }

  async mutateSession(update: (session: RecoverySession) => RecoverySession) {
    return this.withWriteLock(() => {
      const { session, revision } = this.readSnapshot();
      const next = update(session);
      if (next === session) return session;
      this.write(next, revision + 1);
      return next;
    });
  }

  async loadSession() {
    const session = this.read();
    return session.procedure || session.consent || session.products.length ? session : null;
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
    return this.read().products;
  }

  async getProduct(id: string) {
    return this.read().products.find((product) => product.id === id) ?? null;
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
    return this.read().checkIns;
  }

  async saveCheckIn(checkIn: CheckIn) {
    await this.mutateSession((session) => appendCheckInIdempotently(session, checkIn));
  }

  async exportData() {
    return JSON.stringify(this.read(), null, 2);
  }

  async deleteAllData() {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
