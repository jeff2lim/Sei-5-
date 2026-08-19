'use client';

import { useCallback, useRef, useState } from 'react';

type SubmitStateOptions = {
  context: string;
  fallbackMessage?: string;
};

const DEFAULT_ERROR_MESSAGE = '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';

export function getSubmitErrorCode(error: unknown) {
  if (error && typeof error === 'object') {
    if ('code' in error && typeof error.code === 'string') return error.code;
    if ('name' in error && typeof error.name === 'string') return error.name;
  }
  return 'UNKNOWN';
}

export function getSubmitErrorMessage(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  const code = getSubmitErrorCode(error);
  if (code === 'SESSION_CONFLICT') {
    return '다른 화면에서 기록이 변경됐어요. 최신 내용을 확인한 뒤 다시 저장해 주세요.';
  }
  if (code === 'CHECK_IN_ID_CONFLICT') {
    return '이미 저장된 기록과 내용이 달라요. 화면을 새로고침한 뒤 다시 시도해 주세요.';
  }
  if (code === 'AuthSessionMissingError' || code === '401' || code === '42501') {
    return '로그인 상태가 만료됐어요. 다시 로그인한 뒤 저장해 주세요.';
  }
  return fallbackMessage;
}

export function reportSubmitFailure(context: string, error: unknown) {
  // 오류 원문, stack, 입력값은 기록하지 않습니다. 화면명과 분류 코드만 남깁니다.
  console.error('[submit_failed]', { context, code: getSubmitErrorCode(error) });
}

export function useSubmitState({
  context,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
}: SubmitStateOptions) {
  const inFlightRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = useCallback(
    async (operation: () => Promise<unknown>) => {
      if (inFlightRef.current) return false;
      inFlightRef.current = true;
      setSubmitting(true);
      setErrorMessage(null);
      try {
        await operation();
        return true;
      } catch (error) {
        reportSubmitFailure(context, error);
        setErrorMessage(getSubmitErrorMessage(error, fallbackMessage));
        return false;
      } finally {
        inFlightRef.current = false;
        setSubmitting(false);
      }
    },
    [context, fallbackMessage],
  );

  return {
    submitting,
    errorMessage,
    run,
    clearError: () => setErrorMessage(null),
    showError: setErrorMessage,
  };
}
