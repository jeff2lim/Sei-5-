import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DraftBanner } from './draft-banner';

describe('DraftBanner', () => {
  it('shows the mandatory non-patient warning for the draft pack', () => {
    render(<DraftBanner />);
    expect(screen.getByRole('status')).toHaveTextContent('실제 환자 안내용으로 검수되지 않았습니다');
  });
});
