import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRecoveryRepository } from './local-recovery-repository';

const STORAGE_KEY = 'recovery-note:v1';

const consent = {
  terms: true,
  privacy: true,
  healthData: true,
  photo: false,
  marketing: false,
  updatedAt: '2026-08-10T00:00:00.000Z',
};

const procedure = {
  id: 'procedure-1',
  procedureType: 'picotoning',
  performedAt: '2026-08-10',
  createdAt: '2026-08-10T00:00:00.000Z',
};

describe('LocalRecoveryRepository onboarding migration', () => {
  beforeEach(() => window.localStorage.clear());

  it('resumes a legacy session with a procedure at the products step', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { sensitivity: 'normal' },
        procedure,
        products: [],
        checkIns: [],
        consent,
      }),
    );

    const session = await new LocalRecoveryRepository().loadSession();

    expect(session?.schemaVersion).toBe(2);
    expect(session?.onboarding).toEqual({
      status: 'in_progress',
      currentStep: 'products',
      completedAt: null,
    });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').schemaVersion).toBe(2);
  });

  it('keeps legacy users who reached the cleansing answer completed', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { sensitivity: 'normal', cleansingFeel: 'unknown' },
        procedure,
        products: [],
        checkIns: [],
        consent,
      }),
    );

    const session = await new LocalRecoveryRepository().loadSession();

    expect(session?.onboarding).toEqual({
      status: 'completed',
      currentStep: 'complete',
      completedAt: null,
    });
  });
});
