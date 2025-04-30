import { EasynewsSearchResponse, FileData, SearchOptions } from './types';
import { createBasic } from './utils';

export class EasynewsAPI {
  private readonly baseUrl = 'https://members.easynews.com';
  private readonly username: string;
  private readonly password: string;
  private readonly cache = new Map<string, { data: EasynewsSearchResponse; timestamp: number }>();
  private readonly cacheTTL = 1000 * 60 * 60 * parseInt(process.env.CACHE_TTL || '24'); // 24 hours

  constructor(options: { username: string; password: string }) {
    if (!options) {
      throw new Error('Missing options');
    }

    this.username = options.username;
    this.password = options.password;
  }

  private getCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query,
      pageNr: options.pageNr || 1,
      maxResults: parseInt(process.env.MAX_RESULTS_PER_PAGE || '250'),
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
    if (!cached) {
      console.debug(`[EasynewsAPI] Cache miss for key: ${cacheKey.substring(0, 50)}...`);
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      console.debug(`[EasynewsAPI] Cache expired for key: ${cacheKey.substring(0, 50)}...`);
      this.cache.delete(cacheKey);
      return null;
    }

    console.debug(`[EasynewsAPI] Cache hit for key: ${cacheKey.substring(0, 50)}...`);
    return cached.data;
  }

  private setCache(cacheKey: string, data: EasynewsSearchResponse): void {
    console.debug(
      `[EasynewsAPI] Caching ${data.data?.length || 0} results for key: ${cacheKey.substring(0, 50)}...`
    );
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  async search({
    query,
    pageNr = 1,
    maxResults = parseInt(process.env.MAX_RESULTS_PER_PAGE || '250'),
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

    console.debug(`[EasynewsAPI] Searching for: "${query}" (page ${pageNr}, max ${maxResults})`);

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

    console.debug(`[EasynewsAPI] Request URL: ${url.toString().substring(0, 100)}...`);

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: createBasic(this.username, this.password),
        },
        signal: AbortSignal.timeout(20_000), // 20 seconds
      });

      if (res.status === 401) {
        console.debug(`[EasynewsAPI] Authentication failed for user: ${this.username}`);
        throw new Error('Authentication failed: Invalid username or password');
      }

      if (!res.ok) {
        console.debug(`[EasynewsAPI] Request failed with status: ${res.status} ${res.statusText}`);
        throw new Error(
          `Failed to fetch search results of query '${query}': ${res.status} ${res.statusText}`
        );
      }

      const json = await res.json();
      console.debug(
        `[EasynewsAPI] Received ${json.data?.length || 0} results out of ${json.results || 0} total`
      );
      this.setCache(cacheKey, json);
      return json;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.debug(`[EasynewsAPI] Search request timed out for: "${query}"`);
          throw new Error(`Search request for '${query}' timed out after 20 seconds`);
        }
        console.debug(`[EasynewsAPI] Error during search: ${error.message}`);
        throw error;
      }
      console.debug(`[EasynewsAPI] Unknown error during search`);
      throw new Error(`Unknown error during search for '${query}'`);
    }
  }

  async searchAll(options: SearchOptions): Promise<EasynewsSearchResponse> {
    console.debug(`[EasynewsAPI] Starting searchAll for: "${options.query}"`);

    const data: FileData[] = [];
    let res: Partial<EasynewsSearchResponse> = {
      data: [],
      results: 0,
      returned: 0,
      unfilteredResults: 0,
    };

    // Set constants for result limits
    const TOTAL_MAX_RESULTS = parseInt(process.env.TOTAL_MAX_RESULTS || '500'); // Maximum total results to return
    const MAX_PAGES = parseInt(process.env.MAX_PAGES || '10'); // Safety limit on number of page requests
    const MAX_RESULTS_PER_PAGE = parseInt(process.env.MAX_RESULTS_PER_PAGE || '250'); // Maximum results per page

    console.info(
      `[EasynewsAPI] Search limits: max ${TOTAL_MAX_RESULTS} results, max ${MAX_PAGES} pages, ${MAX_RESULTS_PER_PAGE} per page`
    );

    let pageNr = 1;
    let pageCount = 0;

    try {
      while (pageCount < MAX_PAGES) {
        // Calculate optimal page size for each request
        // Always respect TOTAL_MAX_RESULTS even on the first page
        const remainingResults = TOTAL_MAX_RESULTS - data.length;
        const optimalPageSize = Math.min(MAX_RESULTS_PER_PAGE, remainingResults);

        // If we've already reached our limit, stop fetching
        if (remainingResults <= 0) {
          console.debug(
            `[EasynewsAPI] Reached result limit (${TOTAL_MAX_RESULTS}), stopping pagination`
          );
          break;
        }

        console.debug(
          `[EasynewsAPI] Fetching page ${pageNr} with ${optimalPageSize} results per page`
        );
        const pageResult = await this.search({
          ...options,
          pageNr,
          maxResults: optimalPageSize,
        });

        res = pageResult;
        pageCount++;

        const newData = pageResult.data || [];

        // No more results
        if (newData.length === 0) {
          console.debug(`[EasynewsAPI] No more results found, stopping pagination`);
          break;
        }

        // Duplicate detection - stop if first item of new page matches first item of previously fetched data
        if (data.length > 0 && newData[0]?.['0'] === data[0]?.['0']) {
          console.debug(`[EasynewsAPI] Duplicate results detected, stopping pagination`);
          break;
        }

        console.debug(`[EasynewsAPI] Adding ${newData.length} results from page ${pageNr}`);
        data.push(...newData);

        // Stop if we've reached our total limit
        if (data.length >= TOTAL_MAX_RESULTS) {
          console.debug(
            `[EasynewsAPI] Reached result limit (${TOTAL_MAX_RESULTS}), trimming and stopping`
          );
          // Trim the array to exactly TOTAL_MAX_RESULTS
          data.length = TOTAL_MAX_RESULTS;
          break;
        }

        pageNr++;
      }

      console.debug(`[EasynewsAPI] SearchAll complete, returning ${data.length} total results`);
      return { ...res, data } as EasynewsSearchResponse;
    } catch (error) {
      // If we have partial results, return them
      if (data.length > 0) {
        console.debug(`[EasynewsAPI] Returning ${data.length} partial results due to error`);
        console.error(
          `Partial results returned due to error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return { ...res, data } as EasynewsSearchResponse;
      }
      console.debug(
        `[EasynewsAPI] No results to return due to error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }
}
