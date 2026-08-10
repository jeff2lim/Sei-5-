import { createEmptyRecoverySession } from '@/domain/session';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseRecoveryRepository } from './supabase-recovery-repository';

describe('SupabaseRecoveryRepository', () => {
  it('loads only the authenticated user row', async () => {
    const session = createEmptyRecoverySession();
    const maybeSingle = vi.fn().mockResolvedValue({ data: { data: session }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from,
    } as unknown as SupabaseClient;

    const repository = new SupabaseRecoveryRepository(() => client);

    await expect(repository.loadSession()).resolves.toEqual(session);
    expect(from).toHaveBeenCalledWith('recovery_sessions');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('writes the authenticated user id and current schema version', async () => {
    const session = createEmptyRecoverySession();
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as SupabaseClient;

    const repository = new SupabaseRecoveryRepository(() => client);
    await repository.replaceSession(session);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        schema_version: 2,
        data: session,
      }),
    );
  });
});
