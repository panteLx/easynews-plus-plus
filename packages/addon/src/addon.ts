import {
  Cache,
  ContentType,
  MetaDetail,
  MetaVideo,
  Stream,
} from 'stremio-addon-sdk';
import addonBuilder from 'stremio-addon-sdk/src/builder';
import landingTemplate from 'stremio-addon-sdk/src/landingTemplate';
import { catalog, manifest } from './manifest';
import {
  buildSearchQuery,
  createStreamPath,
  createStreamUrl,
  createThumbnailUrl,
  getDuration,
  getFileExtension,
  getPostTitle,
  getQuality,
  getSize,
  isBadVideo,
  logError,
  matchesTitle,
} from './utils';
import { EasynewsAPI, SearchOptions } from '@easynews-plus-plus/api';
import { publicMetaProvider } from './meta';
import { fromHumanReadable, toDirection } from './sort-option';

// Definiere ValidPosterShape als Workaround für fehlendes PosterShape-Type
type ValidPosterShape = 'square' | 'regular' | 'landscape';

const builder = new addonBuilder(manifest);
const prefix = `${catalog.id}:`;

// In-memory request cache to reduce API calls and improve response times
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getFromCache<T>(key: string): T | null {
  const cached = requestCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    requestCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache<T>(key: string, data: T): void {
  requestCache.set(key, { data, timestamp: Date.now() });
}

builder.defineCatalogHandler(async ({ extra: { search } }) => {
  return {
    metas: [
      {
        id: `${prefix}${encodeURIComponent(search)}`,
        name: search,
        type: 'tv',
        logo: manifest.logo,
        background: manifest.background,
        posterShape: 'square',
        poster: manifest.logo,
        description: `Provides search results from Easynews for '${search}'`,
      },
    ],
    cacheMaxAge: 3600 * 24 * 30, // The returned data is static so it may be cached for a long time (30 days).
  };
});

builder.defineMetaHandler(
  async ({ id, type, config: { username, password } }) => {
    if (!id.startsWith(catalog.id)) {
      return { meta: null as unknown as MetaDetail };
    }

    // Make sure credentials are provided
    if (!username || !password) {
      logError({
        message: 'Missing credentials',
        error: new Error('Username and password are required'),
        context: { resource: 'meta', id, type },
      });
      return { meta: null as unknown as MetaDetail };
    }

    try {
      const search = decodeURIComponent(id.replace(prefix, ''));

      // Check cache for this search
      const cacheKey = `meta:${search}:${username}`;
      const cachedResult = getFromCache<{ meta: MetaDetail } & Cache>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const videos: MetaVideo[] = [];

      const api = new EasynewsAPI({ username, password });
      const res = await api.searchAll({ query: search });

      for (const file of res?.data ?? []) {
        const title = getPostTitle(file);

        if (isBadVideo(file) || !matchesTitle(title, search, false)) {
          continue;
        }

        videos.push({
          id: `${prefix}${file.sig}`,
          released: new Date(file['5']).toISOString(),
          title,
          overview: file['6'],
          thumbnail: createThumbnailUrl(res, file),
          streams: [
            mapStream({
              username,
              password,
              title,
              fullResolution: file.fullres,
              fileExtension: getFileExtension(file),
              duration: getDuration(file),
              size: getSize(file),
              url: `${createStreamUrl(res, username, password)}/${createStreamPath(file)}`,
              videoSize: file.rawSize,
            }),
          ],
        });
      }

      const result = {
        meta: {
          id,
          name: search,
          type: 'tv' as ContentType,
          logo: manifest.logo,
          background: manifest.background,
          poster: manifest.logo,
          posterShape: 'square' as ValidPosterShape,
          description: `Provides search results from Easynews for '${search}'`,
          videos,
        },
        ...getCacheOptions(videos.length),
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error) {
      logError({
        message: 'failed to handle meta',
        error,
        context: { resource: 'meta', id, type },
      });
      return { meta: null as unknown as MetaDetail };
    }
  }
);

builder.defineStreamHandler(
  async ({ id, type, config: { username, password, ...options } }) => {
    if (!id.startsWith('tt')) {
      return { streams: [] };
    }

    // Validate credentials
    if (!username || !password) {
      logError({
        message: 'Missing credentials',
        error: new Error('Username and password are required'),
        context: { resource: 'stream', id, type },
      });
      return { streams: [] };
    }

    // Check cache for this request
    const optionsKey = JSON.stringify(options);
    const cacheKey = `stream:${id}:${type}:${username}:${optionsKey}`;
    const cachedResult = getFromCache<{ streams: Stream[] } & Cache>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Sort options are profiled as human-readable strings in the manifest.
      // so we need to convert them back to their internal representation
      // before passing them to the search function below.
      const sortOptions: Partial<SearchOptions> = {
        sort1: fromHumanReadable(options.sort1),
        sort2: fromHumanReadable(options.sort2),
        sort3: fromHumanReadable(options.sort3),
        sort1Direction: toDirection(options.sort1Direction),
        sort2Direction: toDirection(options.sort2Direction),
        sort3Direction: toDirection(options.sort3Direction),
      };

      const meta = await publicMetaProvider(id, type);
      if (!meta || !meta.name) {
        return { streams: [] };
      }

      const api = new EasynewsAPI({ username, password });

      // First try without year to get more potential matches
      let query = buildSearchQuery(type, { ...meta, year: undefined });
      let res = await api.search({
        ...sortOptions,
        query,
      });

      // If we get no or few results, try with year included for more specificity
      if (
        (res?.data?.length <= 1 || res?.data?.length > 100) &&
        meta.year !== undefined
      ) {
        query = buildSearchQuery(type, meta);
        res = await api.search({
          ...sortOptions,
          query,
        });
      }

      if (!res || !res.data) {
        return { streams: [] };
      }

      const streams: Stream[] = [];
      const processedHashes = new Set<string>(); // To avoid duplicate files

      for (const file of res.data ?? []) {
        const title = getPostTitle(file);
        const fileHash = file['0']; // Use file hash to detect duplicates

        if (isBadVideo(file) || processedHashes.has(fileHash)) {
          continue;
        }

        processedHashes.add(fileHash);

        // For series there are multiple possible queries that could match the title.
        // We check if at least one of them matches.
        if (type === 'series') {
          const queries = [
            // full query with season and episode (and optionally year)
            query,
            // query with episode only
            buildSearchQuery(type, { name: meta.name, episode: meta.episode }),
          ];

          if (!queries.some((query) => matchesTitle(title, query, false))) {
            continue;
          }
        }

        // Movie titles should match the query strictly.
        // Other content types are loosely matched.
        if (!matchesTitle(title, query, type === 'movie')) {
          continue;
        }

        streams.push(
          mapStream({
            username,
            password,
            fullResolution: file.fullres,
            fileExtension: getFileExtension(file),
            duration: getDuration(file),
            size: getSize(file),
            title,
            url: `${createStreamUrl(res, username, password)}/${createStreamPath(file)}`,
            videoSize: file.rawSize,
          })
        );
      }

      // Sort streams - prioritize higher quality videos
      streams.sort((a, b) => {
        // Extract description lines which contain size information
        const aDesc = a.description?.split('\n') || [];
        const bDesc = b.description?.split('\n') || [];

        // Extract quality from name
        const aQuality = a.name?.includes('\n') ? a.name.split('\n')[1] : '';
        const bQuality = b.name?.includes('\n') ? b.name.split('\n')[1] : '';

        // Prioritize 4K/2160p over 1080p over 720p
        if (aQuality?.includes('4K') && !bQuality?.includes('4K')) return -1;
        if (!aQuality?.includes('4K') && bQuality?.includes('4K')) return 1;
        if (aQuality?.includes('1080p') && !bQuality?.includes('1080p'))
          return -1;
        if (!aQuality?.includes('1080p') && bQuality?.includes('1080p'))
          return 1;

        // If same quality, prioritize by file size (larger typically better quality)
        const aSize = aDesc.length > 2 ? aDesc[2] : '';
        const bSize = bDesc.length > 2 ? bDesc[2] : '';

        // Simple size comparison for GB files
        if (aSize.includes('GB') && bSize.includes('GB')) {
          const aGB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
          const bGB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
          if (aGB > bGB) return -1;
          if (aGB < bGB) return 1;
        }

        return 0;
      });

      // Limit to top 50 streams to prevent overwhelming the player
      const limitedStreams = streams.slice(0, 50);
      const result = {
        streams: limitedStreams,
        ...getCacheOptions(limitedStreams.length),
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error) {
      logError({
        message: 'failed to handle stream',
        error,
        context: { resource: 'stream', id, type },
      });
      return { streams: [] };
    }
  }
);

function mapStream({
  username,
  password,
  duration,
  size,
  fullResolution,
  title,
  fileExtension,
  videoSize,
  url,
}: {
  title: string;
  url: string;
  username: string;
  password: string;
  fileExtension: string;
  videoSize: number | undefined;
  duration: string | undefined;
  size: string | undefined;
  fullResolution: string | undefined;
}): Stream {
  const quality = getQuality(title, fullResolution);

  return {
    name: `Easynews++${quality ? `\n${quality}` : ''}`,
    description: [
      `${title}${fileExtension}`,
      `🕛 ${duration ?? 'unknown duration'}`,
      `📦 ${size ?? 'unknown size'}`,
    ].join('\n'),
    url: url,
    behaviorHints: {
      notWebReady: true,
    },
  };
}

function getCacheOptions(itemsLength: number): Partial<Cache> {
  return {
    cacheMaxAge: (Math.min(itemsLength, 10) / 10) * 3600 * 24 * 7, // up to 1 week of cache for items
  };
}

export const addonInterface = builder.getInterface();
export const landingHTML = landingTemplate(addonInterface.manifest);
