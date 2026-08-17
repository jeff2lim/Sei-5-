import type { RecoverySession } from '@/domain/session';
import { getSupabaseRecoveryRepository, localRecoveryRepository } from './index';

export type SessionTransferInspection = {
  local: RecoverySession | null;
  cloud: RecoverySession | null;
  status: 'nothing_to_import' | 'ready' | 'identical' | 'conflict';
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function classifySessionTransfer(
  local: RecoverySession | null,
  cloud: RecoverySession | null,
): SessionTransferInspection['status'] {
  if (!local) return 'nothing_to_import';
  if (!cloud) return 'ready';
  if (JSON.stringify(canonicalize(local)) === JSON.stringify(canonicalize(cloud))) {
    return 'identical';
  }
  return 'conflict';
}

export async function inspectSessionTransfer(): Promise<SessionTransferInspection> {
  const supabaseRecoveryRepository = await getSupabaseRecoveryRepository();
  const [local, cloud] = await Promise.all([
    localRecoveryRepository.loadSession(),
    supabaseRecoveryRepository.loadSession(),
  ]);

  return { local, cloud, status: classifySessionTransfer(local, cloud) };
}

export async function importLocalSessionToCloud(session: RecoverySession) {
  const supabaseRecoveryRepository = await getSupabaseRecoveryRepository();
  await supabaseRecoveryRepository.replaceSession(session);
  await localRecoveryRepository.deleteAllData();
}

export async function discardLocalSession() {
  await localRecoveryRepository.deleteAllData();
}
