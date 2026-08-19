import type { CheckIn } from '@/domain/check-in';
import type { ProcedureRecord, UserProfile } from '@/domain/procedure';
import type { Product } from '@/domain/product';
import type { ConsentState, OnboardingState, RecoverySession } from '@/domain/session';

export interface RecoveryRepository {
  loadSession(): Promise<RecoverySession | null>;
  mutateSession(update: (session: RecoverySession) => RecoverySession): Promise<RecoverySession>;
  saveProfile(profile: UserProfile): Promise<void>;
  saveProcedure(procedure: ProcedureRecord): Promise<void>;
  saveConsent(consent: ConsentState): Promise<void>;
  saveOnboarding(onboarding: OnboardingState): Promise<void>;
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  listCheckIns(): Promise<CheckIn[]>;
  saveCheckIn(checkIn: CheckIn): Promise<void>;
  exportData(): Promise<string>;
  deleteAllData(): Promise<void>;
}

export class SessionConflictError extends Error {
  readonly code = 'SESSION_CONFLICT';

  constructor(
    message: string,
    readonly latestSession: RecoverySession | null,
  ) {
    super(message);
    this.name = 'SessionConflictError';
  }
}

export class CheckInIdConflictError extends Error {
  readonly code = 'CHECK_IN_ID_CONFLICT';

  constructor(checkInId: string) {
    super(`이미 다른 내용으로 저장된 체크인 ID입니다: ${checkInId}`);
    this.name = 'CheckInIdConflictError';
  }
}

export function appendCheckInIdempotently(session: RecoverySession, checkIn: CheckIn) {
  const existing = session.checkIns.find((item) => item.id === checkIn.id);
  if (!existing) return { ...session, checkIns: [...session.checkIns, checkIn] };
  if (JSON.stringify(existing) === JSON.stringify(checkIn)) return session;
  throw new CheckInIdConflictError(checkIn.id);
}
