import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EasynewsAPI } from '../src/api';

// Mock the fetch function
vi.mock('node:fetch', () => ({
  default: vi.fn(),
}));

// Mock the shared package logger
vi.mock('easynews-plus-plus-shared', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('EasynewsAPI', () => {
  let api: EasynewsAPI;

  beforeEach(() => {
    // Create a new API instance for each test
    api = new EasynewsAPI({
      username: 'test-user',
      password: 'test-password',
    });

    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when options are missing', () => {
    // @ts-expect-error Testing invalid constructor
    expect(() => new EasynewsAPI()).toThrow('Missing options');
  });

  it('should throw error when query is missing', async () => {
    await expect(api.search({ query: '' })).rejects.toThrow('Query parameter is required');
  });

  it('should handle authentication failure', async () => {
    // Mock fetch to return 401 status
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
    });

    await expect(api.search({ query: 'test' })).rejects.toThrow('Authentication failed');
  });

  it('should handle API error', async () => {
    // Mock fetch to return 500 status
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(api.search({ query: 'test' })).rejects.toThrow('Failed to fetch search results');
  });

  it('should handle network timeout', async () => {
    // Mock fetch to throw AbortError
    global.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });

    await expect(api.search({ query: 'test' })).rejects.toThrow('timed out');
  });

  it('should return search results successfully', async () => {
    // Mock successful search response with minimal data
    const mockResponse = {
      data: [],
      results: 0,
      returned: 0,
      unfilteredResults: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await api.search({ query: 'test' });
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should use cache for identical searches', async () => {
    // Mock successful search response with minimal data
    const mockResponse = {
      data: [],
      results: 0,
      returned: 0,
      unfilteredResults: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // First search should make API call
    await api.search({ query: 'test' });
    // Second identical search should use cache
    await api.search({ query: 'test' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should call search at least once for searchAll', async () => {
    // Create a simplified test for searchAll
    const searchSpy = vi.spyOn(api, 'search');

    // Set up a mock response with a successful result
    const mockResponse = {
      data: [{ '0': '1', '1': 'test1.mp4' }], // Minimal data to simulate results
      results: 1,
      returned: 1,
      unfilteredResults: 1,
      // Add any other required properties here if needed
    };

    // Mock implementation for search to return the mock response
    searchSpy.mockResolvedValue(mockResponse as any);

    // Set environment variables for testing
    process.env.TOTAL_MAX_RESULTS = '10';
    process.env.MAX_PAGES = '2';
    process.env.MAX_RESULTS_PER_PAGE = '5';

    // Call searchAll
    await api.searchAll({ query: 'test' });

    // Should have called search at least once
    expect(searchSpy).toHaveBeenCalled();
    expect(searchSpy.mock.calls.length).toBeGreaterThan(0);

    // Clean up environment variables
    delete process.env.TOTAL_MAX_RESULTS;
    delete process.env.MAX_PAGES;
    delete process.env.MAX_RESULTS_PER_PAGE;
  });
});
