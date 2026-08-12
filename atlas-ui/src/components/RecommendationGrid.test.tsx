import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecommendationGrid } from './RecommendationGrid';

const recommendations = [
  { rank: 1, ball: 30, estimated_probability: 0.05, historical_count: 8, gap_draws: 1 },
  { rank: 2, ball: 3, estimated_probability: 0.04, historical_count: 6, gap_draws: 2 },
  { rank: 3, ball: 17, estimated_probability: 0.03, historical_count: 4, gap_draws: 3 },
];

describe('RecommendationGrid', () => {
  it('copies numbers in rank order, not resorted numerically', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<RecommendationGrid recommendations={recommendations} />);
    await userEvent.click(screen.getByRole('button', { name: '复制推荐号码' }));

    expect(writeText).toHaveBeenCalledWith('30, 3, 17');
  });

  it('shows an empty-state message when there are no recommendations', () => {
    render(<RecommendationGrid recommendations={[]} />);
    expect(screen.getByText('暂无推荐结果')).toBeInTheDocument();
  });
});
