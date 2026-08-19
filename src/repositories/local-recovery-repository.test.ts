import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRecoveryRepository } from './local-recovery-repository';
import { CheckInIdConflictError } from './recovery-repository';

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

describe('LocalRecoveryRepository consistent writes', () => {
  beforeEach(() => window.localStorage.clear());

  const checkIn = {
    id: 'check-in-1',
    checkedAt: '2026-08-20T00:00:00.000Z',
    procedureDay: 10,
    answers: [{ symptomId: 'redness', present: true, severity: 1 as const }],
    rulePackVersion: 'v6',
  };

  it('stores an identical check-in retry only once', async () => {
    const repository = new LocalRecoveryRepository();

    await repository.saveCheckIn(checkIn);
    await repository.saveCheckIn(checkIn);

    await expect(repository.listCheckIns()).resolves.toEqual([checkIn]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').storageRevision).toBe(1);
  });

  it('rejects reuse of a check-in id with different answers', async () => {
    const repository = new LocalRecoveryRepository();
    await repository.saveCheckIn(checkIn);

    await expect(
      repository.saveCheckIn({ ...checkIn, answers: [{ symptomId: 'redness', present: false }] }),
    ).rejects.toBeInstanceOf(CheckInIdConflictError);
  });

  it('applies related onboarding fields in one revision', async () => {
    const repository = new LocalRecoveryRepository();
    await repository.mutateSession((session) => ({
      ...session,
      consent,
      onboarding: { status: 'in_progress', currentStep: 'procedure', completedAt: null },
    }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.storageRevision).toBe(1);
    expect(stored.consent).toEqual(consent);
    expect(stored.onboarding.currentStep).toBe('procedure');
  });
});
