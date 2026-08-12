import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PayoutCalculator } from './PayoutCalculator';

describe('PayoutCalculator', () => {
  it('computes the expected net value for the given count using default stake/payout', () => {
    render(<PayoutCalculator count={20} />);
    // cost = 10*20 = 200, expectedReturn = 470*20/49 = 191.84, net = -8.16
    expect(screen.getAllByText('-8.16').length).toBeGreaterThan(0);
  });

  it('recomputes when stake is edited', async () => {
    render(<PayoutCalculator count={10} />);
    const stakeInput = screen.getByLabelText('单注金额');
    await userEvent.clear(stakeInput);
    await userEvent.type(stakeInput, '20');
    // cost = 20*10 = 200, expectedReturn = 470*10/49 = 95.92, net = -104.08
    expect(await screen.findAllByText('-104.08')).not.toHaveLength(0);
  });

  it('shows the break-even payout for the current stake', () => {
    render(<PayoutCalculator count={20} />);
    // breakEvenPayout = 10 * 49 = 490
    expect(screen.getByText(/490/)).toBeInTheDocument();
  });
});
