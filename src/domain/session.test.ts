import { describe, expect, it } from 'vitest';
import { getOnboardingDestination, type RecoverySession } from './session';

function sessionWith(onboarding: RecoverySession['onboarding']): RecoverySession {
  return {
    schemaVersion: 2,
    onboarding,
    profile: { sensitivity: 'normal' },
    procedure: null,
    products: [],
    checkIns: [],
    consent: null,
  };
}

describe('getOnboardingDestination', () => {
  it('returns the saved step for an in-progress onboarding', () => {
    expect(
      getOnboardingDestination(
        sessionWith({ status: 'in_progress', currentStep: 'products', completedAt: null }),
      ),
    ).toBe('/onboarding/products');
  });

  it('returns home only after onboarding is completed', () => {
    expect(
      getOnboardingDestination(
        sessionWith({
          status: 'completed',
          currentStep: 'complete',
          completedAt: '2026-08-10T00:00:00.000Z',
        }),
      ),
    ).toBe('/home');
  });
});
