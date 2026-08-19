import { createEmptyRecoverySession } from '@/domain/session';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionConflictError } from '@/repositories/recovery-repository';

const repositoryMocks = vi.hoisted(() => ({
  loadSession: vi.fn(),
  mutateSession: vi.fn(),
  saveOnboarding: vi.fn(),
  saveProduct: vi.fn(),
  deleteProduct: vi.fn(),
  saveCheckIn: vi.fn(),
  exportData: vi.fn(),
  deleteAllData: vi.fn(),
}));

vi.mock('@/repositories', () => ({ recoveryRepository: repositoryMocks }));

import { useRecoveryStore } from './recovery-store';

describe('recovery store mutation updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRecoveryStore.setState({
      hydrated: true,
      hydrationError: null,
      session: createEmptyRecoverySession(),
      productDraft: { name: '', category: null },
    });
  });

  it('applies a successful mutation result without hydrating the full session again', async () => {
    const consent = {
      terms: true,
      privacy: true,
      healthData: true,
      photo: false,
      marketing: false,
      updatedAt: '2026-08-20T00:00:00.000Z',
    };
    repositoryMocks.mutateSession.mockImplementation(async (update) =>
      update(createEmptyRecoverySession()),
    );

    await useRecoveryStore.getState().saveConsent(consent, 'procedure');

    expect(repositoryMocks.loadSession).not.toHaveBeenCalled();
    expect(useRecoveryStore.getState().session).toMatchObject({
      consent,
      onboarding: { status: 'in_progress', currentStep: 'procedure' },
    });
  });

  it('replaces stale local state with the latest server state after a revision conflict', async () => {
    const latest = {
      ...createEmptyRecoverySession(),
      profile: { sensitivity: 'high' as const },
    };
    repositoryMocks.mutateSession.mockRejectedValue(
      new SessionConflictError('conflict', latest),
    );

    await expect(
      useRecoveryStore.getState().saveProfile({ sensitivity: 'low' }),
    ).rejects.toBeInstanceOf(SessionConflictError);

    expect(useRecoveryStore.getState()).toMatchObject({
      session: latest,
      hydrationError: 'SESSION_CONFLICT',
    });
  });
});
