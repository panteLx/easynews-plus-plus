import { EasynewsSearchResponse, FileData, SearchOptions } from './types';
import { createBasic } from './utils';

export class EasynewsAPI {
  private readonly baseUrl = 'https://members.easynews.com';
  private readonly username: string;
  private readonly password: string;

  constructor(options: { username: string; password: string }) {
    if (!options) {
      throw new Error('Missing options');
    }

    this.username = options.username;
    this.password = options.password;
  }

  async search({
    query,
    pageNr = 1,
    maxResults = 1000,
    sort1 = 'dsize',
    sort1Direction = '-',
    sort2 = 'relevance',
    sort2Direction = '-',
    sort3 = 'dtime',
    sort3Direction = '-',
  }: SearchOptions): Promise<EasynewsSearchResponse> {
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

    const res = await fetch(url, {
      headers: {
        Authorization: createBasic(this.username, this.password),
      },
      signal: AbortSignal.timeout(20_000), // 20 seconds
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch search results of query '${query}': ${res.status} ${res.statusText}`
      );
    }

    const json = await res.json();

    return json;
  }

  async searchAll(options: SearchOptions): Promise<EasynewsSearchResponse> {
    const data: FileData[] = [];
    let res: EasynewsSearchResponse;
    let pageNr = 1;

    while (true) {
      res = await this.search({ ...options, pageNr });

      // No more results.
      if (
        (res.data ?? []).length === 0 ||
        data[0]?.['0'] === res.data[0]?.['0']
      ) {
        break;
      }

      data.push(...res.data);

      pageNr++;
    }

    res.data = data;

    return res;
  }
}
