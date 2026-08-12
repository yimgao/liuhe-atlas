import type { BacktestResponse, RecommendationsResponse } from './types';

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status} for ${path}`, res.status);
  }
  return (await res.json()) as T;
}

export function fetchRecommendations(count: number): Promise<RecommendationsResponse> {
  return request<RecommendationsResponse>(`/recommendations?count=${count}`);
}

export function fetchLatestBacktest(): Promise<BacktestResponse> {
  return request<BacktestResponse>('/backtests/latest');
}

export { ApiError };
