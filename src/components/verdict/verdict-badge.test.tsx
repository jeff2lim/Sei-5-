import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerdictBadge } from './verdict-badge';

describe('VerdictBadge', () => {
  it('communicates status with text, not color alone', () => {
    render(<VerdictBadge level="stop" />);
    expect(screen.getByText('중단')).toBeVisible();
  });

  it('labels unknown explicitly', () => {
    render(<VerdictBadge level="unknown" />);
    expect(screen.getByText('판정 정보 없음')).toBeVisible();
  });
});
