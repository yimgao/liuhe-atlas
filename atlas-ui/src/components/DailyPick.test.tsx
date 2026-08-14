import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyPick } from './DailyPick';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DailyPick', () => {
  it('renders the requested number of balls', () => {
    render(<DailyPick count={10} modelBalls={[]} />);
    expect(screen.getAllByText(/^#\d+$/)).toHaveLength(10);
  });

  it('shows the same numbers across renders on the same day', () => {
    const { unmount } = render(<DailyPick count={49} modelBalls={[]} />);
    const first = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    unmount();

    render(<DailyPick count={49} modelBalls={[]} />);
    const second = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    expect(second).toEqual(first);
  });

  it('keeps the first N numbers stable when the count grows', () => {
    const { unmount } = render(<DailyPick count={5} modelBalls={[]} />);
    const small = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    unmount();

    render(<DailyPick count={10} modelBalls={[]} />);
    const large = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
    expect(large.slice(0, 5)).toEqual(small);
  });

  it('shows a countdown to the next update', () => {
    render(<DailyPick count={10} modelBalls={[]} />);
    expect(screen.getByText('距下次更新')).toBeInTheDocument();
    expect(screen.getByText('14:00:00')).toBeInTheDocument();
  });

  it('shows the overlap count against the model recommendations', () => {
    render(<DailyPick count={49} modelBalls={[1, 2, 3]} />);
    expect(screen.getByText(/与模型推荐重合/)).toBeInTheDocument();
  });
});
