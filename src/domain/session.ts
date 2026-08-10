import type { CheckIn } from './check-in';
import type { ProcedureRecord, UserProfile } from './procedure';
import type { Product } from './product';

export type ConsentState = {
  terms: boolean;
  privacy: boolean;
  healthData: boolean;
  photo: boolean;
  marketing: boolean;
  updatedAt: string;
};

export const RECOVERY_SESSION_SCHEMA_VERSION = 2;

export type OnboardingStep = 'consent' | 'procedure' | 'products' | 'cleansing' | 'complete';

export type OnboardingState = {
  status: 'not_started' | 'in_progress' | 'completed';
  currentStep: OnboardingStep;
  completedAt: string | null;
};

export type RecoverySession = {
  schemaVersion: typeof RECOVERY_SESSION_SCHEMA_VERSION;
  onboarding: OnboardingState;
  profile: UserProfile;
  procedure: ProcedureRecord | null;
  products: Product[];
  checkIns: CheckIn[];
  consent: ConsentState | null;
};

export function getOnboardingDestination(session: RecoverySession): string {
  if (session.onboarding.status === 'completed') return '/home';

  switch (session.onboarding.currentStep) {
    case 'procedure':
      return '/onboarding/procedure';
    case 'products':
      return '/onboarding/products';
    case 'cleansing':
      return '/onboarding/cleansing';
    case 'complete':
      return '/onboarding/complete';
    case 'consent':
    default:
      return '/consent';
  }
}
