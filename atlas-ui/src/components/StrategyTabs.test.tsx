import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StrategyTabs } from './StrategyTabs';

describe('StrategyTabs', () => {
  it('calls onChange with the clicked mode', async () => {
    const onChange = vi.fn();
    render(<StrategyTabs mode="model" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: '随机对照' }));
    expect(onChange).toHaveBeenCalledWith('random');
  });

  it('marks the active tab as selected', () => {
    render(<StrategyTabs mode="random" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: '随机对照' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '模型推荐' })).toHaveAttribute('aria-selected', 'false');
  });
});
