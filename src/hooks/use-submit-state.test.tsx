import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getSubmitErrorMessage,
  reportSubmitFailure,
  useSubmitState,
} from './use-submit-state';

describe('useSubmitState', () => {
  it('blocks a second synchronous submit while the first one is in flight', async () => {
    let release: (() => void) | undefined;
    const operation = vi.fn(
      () => new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useSubmitState({ context: 'test' }));

    let first: Promise<boolean> | undefined;
    let second: Promise<boolean> | undefined;
    act(() => {
      first = result.current.run(operation);
      second = result.current.run(operation);
    });

    await expect(second).resolves.toBe(false);
    expect(operation).toHaveBeenCalledTimes(1);

    await act(async () => release?.());
    await expect(first).resolves.toBe(true);
  });

  it('maps a revision conflict to an actionable message', () => {
    expect(getSubmitErrorMessage({ code: 'SESSION_CONFLICT' })).toContain('최신 내용');
  });

  it('logs only static context and an error code', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('민감한 건강 입력값'), {
      code: 'PGRST500',
      answers: ['redness'],
    });

    reportSubmitFailure('check_in', error);

    expect(spy).toHaveBeenCalledWith('[submit_failed]', {
      context: 'check_in',
      code: 'PGRST500',
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('민감한 건강 입력값');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('redness');
    spy.mockRestore();
  });
});
