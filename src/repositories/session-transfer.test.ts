import { createEmptyRecoverySession } from '@/domain/session';
import { describe, expect, it } from 'vitest';
import { classifySessionTransfer } from './session-transfer';

describe('classifySessionTransfer', () => {
  const session = createEmptyRecoverySession();

  it('imports local data into an empty cloud account', () => {
    expect(classifySessionTransfer(session, null)).toBe('ready');
  });

  it('does nothing when the browser has no local session', () => {
    expect(classifySessionTransfer(null, session)).toBe('nothing_to_import');
  });

  it('recognizes equal sessions even when object key order differs', () => {
    const reordered: typeof session = {
      consent: session.consent,
      checkIns: session.checkIns,
      products: session.products,
      procedure: session.procedure,
      profile: session.profile,
      onboarding: session.onboarding,
      schemaVersion: session.schemaVersion,
    };
    expect(classifySessionTransfer(session, reordered)).toBe('identical');
  });

  it('requires a choice when both sessions differ', () => {
    const cloud = {
      ...session,
      profile: { ...session.profile, sensitivity: 'high' as const },
    };
    expect(classifySessionTransfer(session, cloud)).toBe('conflict');
  });
});
