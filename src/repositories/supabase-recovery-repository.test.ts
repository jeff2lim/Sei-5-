import { createEmptyRecoverySession } from '@/domain/session';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseRecoveryRepository } from './supabase-recovery-repository';

function createClient(row: unknown, rpcResult?: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockReturnValue({ select }),
    rpc,
  } as unknown as SupabaseClient;
  return { client, eq, rpc };
}

describe('SupabaseRecoveryRepository', () => {
  it('loads only the authenticated user row and its data', async () => {
    const session = createEmptyRecoverySession();
    const { client, eq } = createClient({ data: session, revision: 3 });

    const repository = new SupabaseRecoveryRepository(() => client);

    await expect(repository.loadSession()).resolves.toEqual(session);
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('conditionally writes the current revision through the database function', async () => {
    const session = createEmptyRecoverySession();
    const { client, rpc } = createClient(
      { data: session, revision: 3 },
      [{ applied: true, data: session, revision: 4 }],
    );

    const repository = new SupabaseRecoveryRepository(() => client);
    await repository.mutateSession((current) => ({
      ...current,
      profile: { ...current.profile, sensitivity: 'high' },
    }));

    expect(rpc).toHaveBeenCalledWith(
      'replace_recovery_session_if_revision',
      expect.objectContaining({
        p_expected_revision: 3,
        p_schema_version: 2,
        p_data: expect.objectContaining({
          profile: expect.objectContaining({ sensitivity: 'high' }),
        }),
      }),
    );
  });

  it('returns the latest server session when a conditional write conflicts', async () => {
    const session = createEmptyRecoverySession();
    const latest = { ...session, profile: { ...session.profile, sensitivity: 'high' as const } };
    const { client } = createClient(
      { data: session, revision: 3 },
      [{ applied: false, data: latest, revision: 4 }],
    );
    const repository = new SupabaseRecoveryRepository(() => client);

    const result = repository.mutateSession((current) => ({
      ...current,
      profile: { ...current.profile, sensitivity: 'low' },
    }));

    await expect(result).rejects.toMatchObject({
      code: 'SESSION_CONFLICT',
      latestSession: latest,
    });
  });

  it('does not call the database for an identical check-in retry', async () => {
    const checkIn = {
      id: 'check-in-1',
      checkedAt: '2026-08-20T00:00:00.000Z',
      answers: [],
      rulePackVersion: 'v6',
    };
    const session = { ...createEmptyRecoverySession(), checkIns: [checkIn] };
    const { client, rpc } = createClient({ data: session, revision: 3 });
    const repository = new SupabaseRecoveryRepository(() => client);

    await repository.saveCheckIn(checkIn);

    expect(rpc).not.toHaveBeenCalled();
  });

  it('makes a retry idempotent when the first response is lost after the write', async () => {
    const checkIn = {
      id: 'check-in-response-lost',
      checkedAt: '2026-08-20T00:00:00.000Z',
      answers: [{ symptomId: 'redness', present: true }],
      rulePackVersion: 'v6',
    };
    const empty = createEmptyRecoverySession();
    const saved = { ...empty, checkIns: [checkIn] };
    let row = { data: empty, revision: 1 };
    const maybeSingle = vi.fn().mockImplementation(async () => ({ data: row, error: null }));
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const rpc = vi.fn().mockImplementation(async () => {
      // 데이터베이스에는 반영됐지만 응답 전 네트워크가 끊긴 상황을 재현합니다.
      row = { data: saved, revision: 2 };
      return { data: null, error: new Error('response lost') };
    });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ select }),
      rpc,
    } as unknown as SupabaseClient;
    const repository = new SupabaseRecoveryRepository(() => client);

    await expect(repository.saveCheckIn(checkIn)).rejects.toThrow('response lost');
    await expect(repository.saveCheckIn(checkIn)).resolves.toEqual(saved);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(row.data.checkIns).toHaveLength(1);
  });
});
