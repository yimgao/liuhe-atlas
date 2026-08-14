import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as data from './lib/data';
import { makeBacktest, makeRecommendations } from './test/fixtures/mockData';

vi.mock('./lib/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/data')>();
  return {
    ...actual,
    fetchRecommendations: vi.fn(),
    fetchLatestBacktest: vi.fn(),
  };
});

const mockedFetchRecommendations = vi.mocked(data.fetchRecommendations);
const mockedFetchLatestBacktest = vi.mocked(data.fetchLatestBacktest);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('App', () => {
  it('requests 20 recommendations by default on load', async () => {
    mockedFetchRecommendations.mockResolvedValue(makeRecommendations(20));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);

    await waitFor(() => expect(mockedFetchRecommendations).toHaveBeenCalledWith(20));
    expect(await screen.findAllByText(/^#\d+$/)).toHaveLength(20);
  });

  it('shows a loading state before data arrives', () => {
    mockedFetchRecommendations.mockReturnValue(new Promise(() => {}));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);

    expect(screen.getByText('加载中…')).toBeInTheDocument();
  });

  it('shows an error with a retry button when the request fails, and retry re-fetches', async () => {
    mockedFetchRecommendations.mockRejectedValueOnce(new Error('HTTP 500'));
    mockedFetchRecommendations.mockResolvedValueOnce(makeRecommendations(20));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);

    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findAllByText(/^#\d+$/)).toHaveLength(20);
    expect(mockedFetchRecommendations).toHaveBeenCalledTimes(2);
  });

  it('shows the insufficient-history warning when data_quality is insufficient_history', async () => {
    mockedFetchRecommendations.mockResolvedValue(
      makeRecommendations(20, {
        data_quality: 'insufficient_history',
        warning: '历史样本不足，排名主要反映抽样噪声',
        sample_count: 5,
      }),
    );
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);

    expect(await screen.findByText(/历史样本不足/)).toBeInTheDocument();
  });

  it('shows an empty-history header state when there is no latest draw', async () => {
    mockedFetchRecommendations.mockResolvedValue(
      makeRecommendations(20, { latest_draw: null, sample_count: 0 }),
    );
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);

    expect(await screen.findByText('暂无历史开奖数据')).toBeInTheDocument();
  });

  it('shows only the top-N items after the count changes, for an arbitrary N', async () => {
    mockedFetchRecommendations.mockResolvedValue(makeRecommendations(20));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);
    await waitFor(() => expect(mockedFetchRecommendations).toHaveBeenCalledWith(20));

    mockedFetchRecommendations.mockResolvedValue(makeRecommendations(7));
    const numberInput = screen.getByLabelText('推荐数量 (1-47)');
    await userEvent.clear(numberInput);
    await userEvent.type(numberInput, '7');

    await waitFor(() => expect(mockedFetchRecommendations).toHaveBeenCalledWith(7), {
      timeout: 2000,
    });
    await waitFor(() => expect(screen.getAllByText(/^#\d+$/)).toHaveLength(7));
  });

  it('switches to the daily pick mode', async () => {
    mockedFetchRecommendations.mockResolvedValue(makeRecommendations(20));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);
    await screen.findAllByText(/^#\d+$/);

    await userEvent.click(screen.getByRole('tab', { name: '今日幸运号' }));

    expect(screen.getByText('距下次更新')).toBeInTheDocument();
    expect(screen.getAllByText(/^#\d+$/)).toHaveLength(20);
  });

  it('renders the payout calculator alongside recommendations', async () => {
    mockedFetchRecommendations.mockResolvedValue(makeRecommendations(20));
    mockedFetchLatestBacktest.mockResolvedValue(makeBacktest());

    render(<App />);
    await screen.findAllByText(/^#\d+$/);

    expect(screen.getByText('投注期望值计算器')).toBeInTheDocument();
  });
});
