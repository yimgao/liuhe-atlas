import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountSelector } from './CountSelector';

describe('CountSelector', () => {
  it('debounces arbitrary values (not fixed presets) before calling onChange', async () => {
    const onChange = vi.fn();
    render(<CountSelector value={20} onChange={onChange} />);

    const input = screen.getByLabelText('推荐数量 (1-47)');
    await userEvent.clear(input);
    await userEvent.type(input, '33');

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(33), { timeout: 1000 });
  });

  it('rejects values outside 1-47 without calling onChange', async () => {
    const onChange = vi.fn();
    render(<CountSelector value={20} onChange={onChange} />);

    const input = screen.getByLabelText('推荐数量 (1-47)');
    await userEvent.clear(input);
    await userEvent.type(input, '48');

    expect(screen.getByText('请输入 1 到 47 之间的整数')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 400));
    expect(onChange).not.toHaveBeenCalled();
  });
});
