import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RandomComparison } from './RandomComparison';

describe('RandomComparison', () => {
  it('renders the requested number of random balls', () => {
    render(<RandomComparison count={10} modelBalls={[]} />);
    expect(screen.getAllByText(/^#\d+$/)).toHaveLength(10);
  });

  it('regenerates balls when clicking reroll', async () => {
    render(<RandomComparison count={49} modelBalls={[]} />);
    const before = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    await userEvent.click(screen.getByRole('button', { name: '重新生成' }));
    const after = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    expect(after).not.toEqual(before);
  });

  it('shows the overlap count against the model recommendations', () => {
    render(<RandomComparison count={49} modelBalls={[1, 2, 3]} />);
    expect(screen.getByText(/与模型推荐重合/)).toBeInTheDocument();
  });
});
