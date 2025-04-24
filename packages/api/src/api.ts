import { EasynewsSearchResponse, FileData, SearchOptions } from './types';
import { createBasic } from './utils';

export class EasynewsAPI {
  private readonly baseUrl = 'https://members.easynews.com';
  private readonly username: string;
  private readonly password: string;
  private readonly cache = new Map<string, { data: EasynewsSearchResponse; timestamp: number }>();
  private readonly cacheTTL = 1000 * 60 * 15; // 15 minutes

  constructor(options: { username: string; password: string; cacheTTL?: number }) {
    if (!options) {
      throw new Error('Missing options');
    }

    this.username = options.username;
    this.password = options.password;

    if (options.cacheTTL) {
      this.cacheTTL = options.cacheTTL;
    }
  }

  private getCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query,
      pageNr: options.pageNr || 1,
      maxResults: options.maxResults || 100,
      sort1: options.sort1 || 'dsize',
      sort1Direction: options.sort1Direction || '-',
      sort2: options.sort2 || 'relevance',
      sort2Direction: options.sort2Direction || '-',
      sort3: options.sort3 || 'dtime',
      sort3Direction: options.sort3Direction || '-',
    });
  }

  private getFromCache(cacheKey: string): EasynewsSearchResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.data;
  }

  private setCache(cacheKey: string, data: EasynewsSearchResponse): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  async search({
    query,
    pageNr = 1,
    maxResults = 50,
    sort1 = 'dsize',
    sort1Direction = '-',
    sort2 = 'relevance',
    sort2Direction = '-',
    sort3 = 'dtime',
    sort3Direction = '-',
  }: SearchOptions): Promise<EasynewsSearchResponse> {
    if (!query) {
      throw new Error('Query parameter is required');
    }

    const cacheKey = this.getCacheKey({
      query,
      pageNr,
      maxResults,
      sort1,
      sort1Direction,
      sort2,
      sort2Direction,
      sort3,
      sort3Direction,
    });

    const cachedResult = this.getFromCache(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const searchParams = {
      st: 'adv',
      sb: '1',
      fex: 'm4v,3gp,mov,divx,xvid,wmv,avi,mpg,mpeg,mp4,mkv,avc,flv,webm',
      'fty[]': 'VIDEO',
      spamf: '1',
      u: '1',
      gx: '1',
      pno: pageNr.toString(),
      sS: '3',
      s1: sort1,
      s1d: sort1Direction,
      s2: sort2,
      s2d: sort2Direction,
      s3: sort3,
      s3d: sort3Direction,
      pby: maxResults.toString(),
      safeO: '0',
      gps: query,
    };

    const url = new URL(`${this.baseUrl}/2.0/search/solr-search/advanced`);
    url.search = new URLSearchParams(searchParams).toString();

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: createBasic(this.username, this.password),
        },
        signal: AbortSignal.timeout(20_000), // 20 seconds
      });

      if (res.status === 401) {
        throw new Error('Authentication failed: Invalid username or password');
      }

      if (!res.ok) {
        throw new Error(
          `Failed to fetch search results of query '${query}': ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      this.setCache(cacheKey, json);
      return json;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Search request for '${query}' timed out after 20 seconds`);
        }
        throw error;
      }
      throw new Error(`Unknown error during search for '${query}'`);
    }
  }

  async searchAll(options: SearchOptions): Promise<EasynewsSearchResponse> {
    const data: FileData[] = [];
    let res: Partial<EasynewsSearchResponse> = {
      data: [],
      results: 0,
      returned: 0,
      unfilteredResults: 0,
    };
    let pageNr = 1;
    const maxPages = 5; // Limit to prevent excessive API calls
    let pageCount = 0;
    // Get the maxResults if specified, otherwise use a high number
    const maxResults = options.maxResults || 100;

    try {
      while (pageCount < maxPages) {
        const pageResult = await this.search({ ...options, pageNr });
        res = pageResult;
        pageCount++;

        const newData = pageResult.data || [];

        // No more results
        if (newData.length === 0) {
          break;
        }

        // Duplicate detection - stop if first item of new page matches first item of previously fetched data
        if (data.length > 0 && newData[0]?.['0'] === data[0]?.['0']) {
          break;
        }

        data.push(...newData);

        // Stop if we've reached the requested maximum results
        if (data.length >= maxResults) {
          // Trim the array to exactly maxResults
          data.length = maxResults;
          break;
        }

        pageNr++;
      }

      return { ...res, data } as EasynewsSearchResponse;
    } catch (error) {
      // If we have partial results, return them
      if (data.length > 0) {
        console.error(
          `Partial results returned due to error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return { ...res, data } as EasynewsSearchResponse;
      }
      throw error;
    }
  }
}
