import { LocalRecoveryRepository } from './local-recovery-repository';
import { SupabaseRecoveryRepository } from './supabase-recovery-repository';

export const recoveryRepository =
  process.env.NEXT_PUBLIC_DATA_MODE === 'supabase'
    ? new SupabaseRecoveryRepository()
    : new LocalRecoveryRepository();
