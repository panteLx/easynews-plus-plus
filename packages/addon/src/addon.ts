import { Cache, ContentType, MetaDetail, MetaVideo } from 'stremio-addon-sdk';
import addonBuilder from 'stremio-addon-sdk/src/builder';
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
  getVersion,
  isBadVideo,
  logger,
  logError,
  matchesTitle,
  getAlternativeTitles,
} from './utils';
import { EasynewsAPI, SearchOptions, EasynewsSearchResponse } from 'easynews-plus-plus-api';
import { publicMetaProvider } from './meta';
import { Stream } from './types';
import customTitlesJson from '../../../custom-titles.json';

// Extended configuration interface
interface AddonConfig {
  username: string;
  password: string;
  strictTitleMatching?: string;
  preferredLanguage?: string;
  sortingPreference?: string;
  logLevel?: string; // Add log level configuration option
  showQualities?: string; // Comma-separated list of qualities to show
  maxResultsPerQuality?: string; // Max results per quality
  maxFileSize?: string; // Max file size in GB
  [key: string]: any;
}

// Definiere ValidPosterShape als Workaround für fehlendes PosterShape-Type
type ValidPosterShape = 'square' | 'regular' | 'landscape';

const builder = new addonBuilder(manifest);
const prefix = `${catalog.id}:`;

// Log addon initialization
logger.info(`Addon initializing - version: ${getVersion()}, log level: ${logger.getLevelName()}`);

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

// Load custom titles
let titlesFromFile: Record<string, string[]> = {};
let loadedPath = '';

try {
  // Always use the imported JSON by default
  logger.info('Loading custom titles from imported custom-titles.json');
  titlesFromFile = customTitlesJson;
  loadedPath = 'imported';

  // Log some details about the loaded custom titles
  const numCustomTitles = Object.keys(titlesFromFile).length;
  logger.info(`Successfully loaded ${numCustomTitles} custom titles`);

  if (numCustomTitles > 0) {
    // Log a few examples to verify they're loaded correctly
    const examples = Object.entries(titlesFromFile).slice(0, 3);
    for (const [original, customTitles] of examples) {
      logger.info(`Example custom title: "${original}" -> "${customTitles.join('", "')}"`);
    }
  } else {
    logger.info(
      'No custom titles were loaded from the file. The file might be empty or have invalid format.'
    );
  }
} catch (error) {
  logger.error('Error loading custom titles file:', error);
  logger.info('Using imported custom titles as fallback');
  titlesFromFile = customTitlesJson;
}

// Import custom template for landing page
import customTemplate from './custom-template';

// Export landing HTML for Cloudflare Worker
export const landingHTML = customTemplate(manifest);

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
  async ({ id, type, config }: { id: string; type: ContentType; config: AddonConfig }) => {
    const { username, password, logLevel } = config;

    // For language filtering in the catalog
    const preferredLang = config.preferredLanguage || '';

    // Configure logger based on config
    if (logLevel) {
      logger.setLevel(logLevel);
    }

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
      const res = await api.searchAll({
        query: search,
        maxResults: 50, // Limit results directly from the API
      });

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
              file,
              preferredLang: '',
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
  async ({ id, type, config }: { id: string; type: ContentType; config: AddonConfig }) => {
    const {
      username,
      password,
      strictTitleMatching,
      preferredLanguage,
      sortingPreference,
      logLevel,
      showQualities,
      maxResultsPerQuality,
      maxFileSize,
      ...options
    } = config;

    // Configure logger based on config
    if (logLevel) {
      logger.setLevel(logLevel);
    }

    if (!id.startsWith('tt')) {
      return {
        streams: [],
      };
    }

    // Include settings in cache key to ensure
    // users with different settings get different cache results
    const cacheKey = `${id}:v3:user=${username}:strict=${strictTitleMatching === 'on' || strictTitleMatching === 'true'}:lang=${preferredLanguage || ''}:sort=${sortingPreference}:qualities=${showQualities || ''}:maxPerQuality=${maxResultsPerQuality || ''}:maxSize=${maxFileSize || ''}`;

    // const cacheKey = `${id}:v3:strict=${strictTitleMatching === 'on' || strictTitleMatching === 'true'}:lang=${preferredLanguage || ''}:sort=${sortingPreference}:qualities=${showQualities || ''}:maxPerQuality=${maxResultsPerQuality || ''}:maxSize=${maxFileSize || ''}`;
    logger.info(`Cache key: ${cacheKey}`);
    const cached = getFromCache<{ streams: Stream[] }>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      if (!username || !password) {
        throw new Error('Missing username or password');
      }

      // Parse strictTitleMatching option (checkbox returns string 'on' or undefined)
      const useStrictMatching = strictTitleMatching === 'on' || strictTitleMatching === 'true';
      logger.info(`Strict title matching: ${useStrictMatching ? 'enabled' : 'disabled'}`);

      // Get preferred language from configuration
      const preferredLang = preferredLanguage || '';
      logger.info(`Preferred language: ${preferredLang ? preferredLang : 'No preference'}`);

      // Parse quality filters
      // const qualityFilters = showQualities
      //   ? showQualities.split(',').map(q => q.trim())
      //   : ['4k', '1080p', '720p', '480p'];

      const qualityFilters = showQualities
        ? showQualities
            .split(',')
            .map(q => q.trim().toLowerCase())
            .filter(Boolean)
        : ['4k', '1080p', '720p', '480p'];

      logger.info(`Quality filters: ${qualityFilters.join(', ')}`);

      // Parse max results per quality (0 = no limit)
      // const maxResultsPerQualityValue = parseInt(maxResultsPerQuality || '0');
      let maxResultsPerQualityValue = parseInt(maxResultsPerQuality ?? '0', 10);
      if (Number.isNaN(maxResultsPerQualityValue) || maxResultsPerQualityValue < 0) {
        maxResultsPerQualityValue = 0;
      }
      logger.info(
        `Max results per quality: ${maxResultsPerQualityValue === 0 ? 'No limit' : maxResultsPerQualityValue}`
      );

      // Parse max file size (0 = no limit)
      // const maxFileSizeGB = parseFloat(maxFileSize || '0');
      let maxFileSizeGB = parseFloat(maxFileSize ?? '0');
      if (Number.isNaN(maxFileSizeGB) || maxFileSizeGB < 0) {
        maxFileSizeGB = 0;
      }
      logger.info(`Max file size: ${maxFileSizeGB === 0 ? 'No limit' : maxFileSizeGB + ' GB'}`);

      // Use custom titles from custom-titles.json
      const customTitles = { ...titlesFromFile };

      logger.info(
        `Using ${Object.keys(customTitles).length} custom titles from custom-titles.json`
      );

      // For troubleshooting:
      logger.info(`Sorting preference from config: ${sortingPreference}`);

      // Configure API sorting options based on user sorting preference
      const sortOptions: Partial<SearchOptions> = {
        query: '', // Will be set for each search later
      };

      // Automatically set API sorting parameters based on sorting preference
      switch (sortingPreference) {
        case 'size_first':
          sortOptions.sort1 = 'dsize'; // Size
          sortOptions.sort1Direction = '-'; // Descending
          sortOptions.sort2 = 'relevance';
          sortOptions.sort2Direction = '-';
          break;
        case 'date_first':
          sortOptions.sort1 = 'dtime'; // DateTime
          sortOptions.sort1Direction = '-'; // Descending
          sortOptions.sort2 = 'dsize';
          sortOptions.sort2Direction = '-';
          break;
        case 'relevance_first':
          sortOptions.sort1 = 'relevance'; // Relevance
          sortOptions.sort1Direction = '-'; // Descending
          sortOptions.sort2 = 'dsize';
          sortOptions.sort2Direction = '-';
          break;
        case 'language_first':
          // For language prioritization, relevance usually works best with the API
          sortOptions.sort1 = 'relevance';
          sortOptions.sort1Direction = '-';
          sortOptions.sort2 = 'dsize';
          sortOptions.sort2Direction = '-';
          break;
        case 'quality_first':
        default:
          // For quality prioritization, size is a good proxy for quality
          sortOptions.sort1 = 'dsize'; // Size
          sortOptions.sort1Direction = '-'; // Descending
          sortOptions.sort2 = 'relevance';
          sortOptions.sort2Direction = '-';
          break;
      }

      // Set a reasonable third sort option for all cases
      sortOptions.sort3 = 'dtime'; // DateTime
      sortOptions.sort3Direction = '-'; // Descending

      // Log the API sorting parameters
      logger.info(
        `API Sorting: ${sortOptions.sort1} (${sortOptions.sort1Direction}), ${sortOptions.sort2} (${sortOptions.sort2Direction}), ${sortOptions.sort3} (${sortOptions.sort3Direction})`
      );

      const meta = await publicMetaProvider(id, type);
      logger.info(`Searching for: ${meta.name}`);

      // Check if we have a custom title for this title directly
      if (customTitles[meta.name]) {
        logger.info(
          `Direct custom title found for "${meta.name}": "${customTitles[meta.name].join('", "')}"`
        );
      } else {
        logger.info(`No direct custom title found for "${meta.name}", checking partial matches`);

        // Look for partial matches in title keys
        for (const [key, values] of Object.entries(customTitles)) {
          if (
            meta.name.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(meta.name.toLowerCase())
          ) {
            logger.info(
              `Possible title match: "${meta.name}" ~ "${key}" -> "${values.join('", "')}"`
            );
          }
        }
      }

      const api = new EasynewsAPI({ username, password });

      logger.info(`Getting alternative titles for: ${meta.name}`);

      // Initialize with the original title
      let allTitles = [meta.name];

      // Add any direct custom titles found in customTitles
      if (customTitles[meta.name] && customTitles[meta.name].length > 0) {
        logger.info(
          `Adding direct custom titles for "${meta.name}": "${customTitles[meta.name].join('", "')}"`
        );
        allTitles = [...allTitles, ...customTitles[meta.name]];
      }

      // Add any alternative names from meta (if available)
      if (meta.alternativeNames && meta.alternativeNames.length > 0) {
        logger.info(`Adding ${meta.alternativeNames.length} alternative names from metadata`);
        // Filter out duplicates
        const newAlternatives = meta.alternativeNames.filter(alt => !allTitles.includes(alt));
        allTitles = [...allTitles, ...newAlternatives];
      }

      // Use getAlternativeTitles to find additional matches (like partial matches)
      const additionalTitles = getAlternativeTitles(meta.name, customTitles).filter(
        alt => !allTitles.includes(alt) && alt !== meta.name
      );

      if (additionalTitles.length > 0) {
        logger.info(`Adding ${additionalTitles.length} additional titles from partial matches`);
        allTitles = [...allTitles, ...additionalTitles];
      }

      logger.info(`Will search for ${allTitles.length} titles: ${allTitles.join(', ')}`);

      // Store all search results here
      const allSearchResults: {
        query: string;
        result: EasynewsSearchResponse;
      }[] = [];

      // First try without year for each title variant
      for (const titleVariant of allTitles) {
        // Skip empty titles
        if (!titleVariant.trim()) continue;

        const titleMeta = { ...meta, name: titleVariant, year: undefined };
        const query = buildSearchQuery(type, titleMeta);
        logger.info(`Searching without year for: "${query}"`);

        try {
          const res = await api.search({
            ...sortOptions,
            query,
            maxResults: 50, // Limit results directly from the API
          });

          const resultCount = res?.data?.length || 0;
          logger.info(`Found ${resultCount} results for "${query}"`);

          if (resultCount > 0) {
            allSearchResults.push({ query, result: res });

            // Log a few examples of the results
            const examples = res.data.slice(0, 2);
            for (const file of examples) {
              const title = getPostTitle(file);
              logger.info(`Example result: "${title}" (${file['4'] || 'unknown size'})`);
            }
          }
        } catch (error) {
          logger.error(`Error searching for "${query}":`, error);
          // Continue with other titles even if one fails
        }
      }

      // If we get no or few results, try with year included for more specificity
      if (allSearchResults.length === 0 && meta.year !== undefined) {
        logger.info(`No results found without year, trying with year: ${meta.year}`);

        for (const titleVariant of allTitles) {
          // Skip empty titles
          if (!titleVariant.trim()) continue;

          const titleMeta = { ...meta, name: titleVariant, year: meta.year };
          const query = buildSearchQuery(type, titleMeta);
          logger.info(`Searching with year for: "${query}"`);

          try {
            const res = await api.search({
              ...sortOptions,
              query,
              maxResults: 50, // Limit results directly from the API
            });

            const resultCount = res?.data?.length || 0;
            logger.info(`Found ${resultCount} results for "${query}"`);

            if (resultCount > 0) {
              allSearchResults.push({ query, result: res });

              // Log a few examples of the results
              const examples = res.data.slice(0, 2);
              for (const file of examples) {
                const title = getPostTitle(file);
                logger.info(`Example result: "${title}" (${file['4'] || 'unknown size'})`);
              }
            }
          } catch (error) {
            logger.error(`Error searching for "${query}":`, error);
            // Continue with other titles even if one fails
          }
        }
      }

      if (allSearchResults.length === 0) {
        return { streams: [] };
      }

      const processedHashes = new Set<string>();

      // Store all streams here
      let streams: Stream[] = [];

      // Process each search result
      for (const { query, result: res } of allSearchResults) {
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
            // Create queries for all title variants
            const queries: string[] = [];

            for (const titleVariant of allTitles) {
              // Add full query with season and episode
              const fullMeta = {
                ...meta,
                name: titleVariant,
                year: meta.year,
              };
              queries.push(buildSearchQuery(type, fullMeta));

              // Add query with episode only
              const episodeMeta = {
                name: titleVariant,
                episode: meta.episode,
              };
              queries.push(buildSearchQuery(type, episodeMeta));
            }

            // Use strictTitleMatching setting if enabled for series
            if (!queries.some(q => matchesTitle(title, q, useStrictMatching))) {
              continue;
            }
          }

          // For movies, check if title matches any of the query variants
          // Other content types are loosely matched
          const matchesAnyVariant = allTitles.some(titleVariant => {
            const variantQuery = buildSearchQuery(type, {
              ...meta,
              name: titleVariant,
            });
            // For movies, always use strictTitleMatching if enabled, otherwise default to movie behavior
            return matchesTitle(title, variantQuery, type === 'movie' || useStrictMatching);
          });

          if (!matchesAnyVariant) {
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
              file,
              preferredLang,
            })
          );
        }
      }

      // Sort streams based on user preference
      if (sortingPreference === 'language_first' && preferredLang) {
        logger.info(`Applying language-first sorting for language: ${preferredLang}`);

        // Special handling for language-first sorting
        // First, separate streams by language
        const preferredLangStreams: Stream[] = [];
        const otherStreams: Stream[] = [];

        // Split streams into two groups
        for (const stream of streams) {
          const file = (stream as any)._temp?.file;
          const hasPreferredLang =
            file?.alangs && Array.isArray(file.alangs) && file.alangs.includes(preferredLang);

          if (hasPreferredLang) {
            preferredLangStreams.push(stream);
          } else {
            otherStreams.push(stream);
          }
        }

        logger.info(
          `Found ${preferredLangStreams.length} streams with preferred language and ${otherStreams.length} other streams`
        );

        // Sort each group by quality and size
        const sortByQualityAndSize = (a: Stream, b: Stream) => {
          // Extract quality info
          const aDesc = a.description?.split('\n') || [];
          const bDesc = b.description?.split('\n') || [];
          const aQuality = a.name?.includes('\n') ? a.name.split('\n')[1] : '';
          const bQuality = b.name?.includes('\n') ? b.name.split('\n')[1] : '';

          // Get quality scores
          const getQualityScore = (quality: string): number => {
            if (quality?.includes('4K') || quality?.includes('2160p') || quality?.includes('UHD'))
              return 4;
            if (quality?.includes('1080p')) return 3;
            if (quality?.includes('720p')) return 2;
            if (quality?.includes('480p')) return 1;
            return 0;
          };
          const aScore = getQualityScore(aQuality);
          const bScore = getQualityScore(bQuality);

          // Compare quality scores
          if (aScore !== bScore) {
            return bScore - aScore;
          }

          // Compare sizes
          const aSize = aDesc.length > 2 ? aDesc[2] : '';
          const bSize = bDesc.length > 2 ? bDesc[2] : '';

          if (aSize.includes('GB') && bSize.includes('GB')) {
            const aGB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
            const bGB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
            if (aGB > bGB) return -1;
            if (aGB < bGB) return 1;
          }

          if (aSize.includes('GB') && bSize.includes('MB')) return -1;
          if (aSize.includes('MB') && bSize.includes('GB')) return 1;

          if (aSize.includes('MB') && bSize.includes('MB')) {
            const aMB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
            const bMB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
            if (aMB > bMB) return -1;
            if (aMB < bMB) return 1;
          }

          return 0;
        };

        // Sort each group independently
        preferredLangStreams.sort(sortByQualityAndSize);
        otherStreams.sort(sortByQualityAndSize);

        // Replace streams array with the concatenated sorted groups
        streams.length = 0;
        streams.push(...preferredLangStreams, ...otherStreams);
      } else {
        // Original sorting for other preferences
        streams.sort((a, b) => {
          // Extract stream data
          const aFile = (a as any)._temp?.file;
          const bFile = (b as any)._temp?.file;
          const aHasPreferredLang = preferredLang && aFile?.alangs?.includes(preferredLang);
          const bHasPreferredLang = preferredLang && bFile?.alangs?.includes(preferredLang);

          // Extract quality info
          const aDesc = a.description?.split('\n') || [];
          const bDesc = b.description?.split('\n') || [];
          const aQuality = a.name?.includes('\n') ? a.name.split('\n')[1] : '';
          const bQuality = b.name?.includes('\n') ? b.name.split('\n')[1] : '';

          // Get quality scores
          const getQualityScore = (quality: string): number => {
            if (quality?.includes('4K') || quality?.includes('2160p') || quality?.includes('UHD'))
              return 4;
            if (quality?.includes('1080p')) return 3;
            if (quality?.includes('720p')) return 2;
            if (quality?.includes('480p')) return 1;
            return 0;
          };
          const aScore = getQualityScore(aQuality);
          const bScore = getQualityScore(bQuality);

          // Size comparison logic
          const compareSize = () => {
            const aSize = aDesc.length > 2 ? aDesc[2] : '';
            const bSize = bDesc.length > 2 ? bDesc[2] : '';

            if (aSize.includes('GB') && bSize.includes('GB')) {
              const aGB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
              const bGB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
              if (aGB > bGB) return -1;
              if (aGB < bGB) return 1;
            }

            if (aSize.includes('GB') && bSize.includes('MB')) return -1;
            if (aSize.includes('MB') && bSize.includes('GB')) return 1;

            if (aSize.includes('MB') && bSize.includes('MB')) {
              const aMB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
              const bMB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
              if (aMB > bMB) return -1;
              if (aMB < bMB) return 1;
            }

            return 0;
          };

          // Apply sorting based on user preference
          switch (sortingPreference) {
            case 'size_first':
              // Size first, then quality, then language
              const sizeCompare = compareSize();
              if (sizeCompare !== 0) {
                return sizeCompare;
              }
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              if (aHasPreferredLang !== bHasPreferredLang) {
                return aHasPreferredLang ? -1 : 1;
              }
              return 0;

            case 'date_first':
              // We don't sort heavily by date locally - the API already did that
              // Just do minimal local sorting for quality/language
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              if (aHasPreferredLang !== bHasPreferredLang) {
                return aHasPreferredLang ? -1 : 1;
              }
              return 0;

            case 'relevance_first':
              // For relevance, we primarily rely on the API sorting
              // Just minimal quality and language adjustments
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              if (aHasPreferredLang !== bHasPreferredLang) {
                return aHasPreferredLang ? -1 : 1;
              }
              return 0;

            case 'lang_first':
            case 'language_first':
              // Quality first, then language, then size
              if (aHasPreferredLang !== bHasPreferredLang) {
                return aHasPreferredLang ? -1 : 1;
              }
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              return compareSize();

            case 'quality_first':
            default:
              // Quality first (default), then language, then size
              if (aScore !== bScore) {
                return bScore - aScore;
              }
              if (aHasPreferredLang !== bHasPreferredLang) {
                return aHasPreferredLang ? -1 : 1;
              }
              return compareSize();
          }
        });
      }

      // After all streams have been collected, filter and limit them based on user settings
      if (streams.length > 0) {
        const originalCount = streams.length;
        logger.info(`Starting filters with ${originalCount} streams`);

        // Filter streams by quality
        const defaultQualitySet = ['4k', '1080p', '720p', '480p'];
        const isCustomQualityFilter = !(
          qualityFilters.length === defaultQualitySet.length &&
          qualityFilters.every(q => defaultQualitySet.includes(q))
        );

        if (isCustomQualityFilter) {
          const qualityMap: Record<string, string[]> = {
            '4k': ['4K', 'UHD', '2160p'],
            '1080p': ['1080p'],
            '720p': ['720p'],
            '480p': ['480p', 'SD'],
          };

          // Create a list of allowed quality strings
          const allowedQualityTerms: string[] = [];
          qualityFilters.forEach(q => {
            if (qualityMap[q]) {
              allowedQualityTerms.push(...qualityMap[q]);
            }
          });

          logger.info(`Filtering for qualities: ${qualityFilters.join(', ')}`);
          logger.info(`Accepted quality terms: ${allowedQualityTerms.join(', ')}`);

          if (allowedQualityTerms.length > 0) {
            const filteredStreams = streams.filter(stream => {
              const quality = stream.name?.split('\n')[1] || '';
              const matchesQuality = allowedQualityTerms.some(term => quality.includes(term));
              return matchesQuality;
            });

            // Only update if we found at least one match
            if (filteredStreams.length > 0) {
              streams = filteredStreams;
              logger.info(`After quality filtering: ${streams.length} streams remain`);
            } else {
              logger.warn(`Quality filtering would remove all streams - keeping original results`);
            }
          }
        }

        // Filter streams by file size (only if maxFileSizeGB > 0)
        if (maxFileSizeGB > 0) {
          const filteredStreams = streams.filter(stream => {
            const description = stream.description || '';
            const sizeLine = description.split('\n').find(line => line.includes('📦'));

            if (!sizeLine) return true; // Keep if we can't determine size

            if (sizeLine.includes('GB')) {
              const sizeGB = parseFloat(sizeLine.match(/[\d.]+/)?.[0] || '0');
              return sizeGB <= maxFileSizeGB;
            }

            if (sizeLine.includes('MB')) {
              const sizeMB = parseFloat(sizeLine.match(/[\d.]+/)?.[0] || '0');
              return sizeMB / 1024 <= maxFileSizeGB;
            }

            return true; // Keep if we can't parse the size
          });

          // Only update if we found at least one match
          if (filteredStreams.length > 0) {
            streams = filteredStreams;
            logger.info(`After max file size filtering: ${streams.length} streams remain`);
          } else {
            logger.warn(`File size filtering would remove all streams - keeping original results`);
          }
        }

        // Group streams by quality for limiting per quality (only if maxResultsPerQualityValue > 0)
        if (maxResultsPerQualityValue > 0) {
          const streamsByQuality: Record<string, Stream[]> = {};

          // Determine quality category for each stream
          streams.forEach(stream => {
            const quality = stream.name?.split('\n')[1] || '';
            let qualityCategory = 'other';

            if (quality.includes('4K') || quality.includes('UHD') || quality.includes('2160p')) {
              qualityCategory = '4k';
            } else if (quality.includes('1080p')) {
              qualityCategory = '1080p';
            } else if (quality.includes('720p')) {
              qualityCategory = '720p';
            } else if (quality.includes('480p') || quality.includes('SD')) {
              qualityCategory = '480p';
            }

            if (!streamsByQuality[qualityCategory]) {
              streamsByQuality[qualityCategory] = [];
            }
            streamsByQuality[qualityCategory].push(stream);
          });

          // Log the distribution of streams by quality
          Object.entries(streamsByQuality).forEach(([quality, streams]) => {
            logger.info(`Quality ${quality}: ${streams.length} streams`);
          });

          // Apply limits per quality category and rebuild streams array
          const limitedStreams: Stream[] = [];
          Object.keys(streamsByQuality).forEach(quality => {
            const qualityStreams = streamsByQuality[quality];
            const limitedQualityStreams = qualityStreams.slice(0, maxResultsPerQualityValue);
            limitedStreams.push(...limitedQualityStreams);

            if (limitedQualityStreams.length < qualityStreams.length) {
              logger.info(
                `Quality ${quality}: Limited from ${qualityStreams.length} to ${limitedQualityStreams.length} streams`
              );
            }
          });

          if (limitedStreams.length > 0) {
            streams = limitedStreams;
            logger.info(`After applying max results per quality: ${streams.length} streams remain`);
          } else {
            logger.warn(`Per-quality limiting would remove all streams - keeping original results`);
          }
        }

        logger.info(`Filtering complete: ${originalCount} streams → ${streams.length} streams`);
      }

      // Limit to top 25 streams to prevent overwhelming the player
      // No need to slice here since we're already limiting results at the API level
      const result = {
        streams,
        ...getCacheOptions(streams.length),
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
  file,
  preferredLang,
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
  file: any;
  preferredLang: string;
}): Stream {
  const quality = getQuality(title, fullResolution);

  // Log language information for debugging
  if (file.alangs) {
    logger.info(`Stream "${title}" has languages: ${JSON.stringify(file.alangs)}`);
  } else {
    logger.info(`Stream "${title}" has no language information`);
  }

  // Show language information in the description if available
  const languageInfo = file.alangs?.length
    ? `🌐 ${file.alangs.join(', ')}${preferredLang && file.alangs.includes(preferredLang) ? ' ⭐' : ''}`
    : '🌐 Unknown';

  const stream: Stream & { _temp?: any } = {
    name: `Easynews++${quality ? `\n${quality}` : ''}`,
    description: [
      `${title}${fileExtension}`,
      `🕛 ${duration ?? 'unknown duration'}`,
      `📦 ${size ?? 'unknown size'}`,
      languageInfo,
    ].join('\n'),
    url: url,
    behaviorHints: {
      notWebReady: true,
      filename: `${title}${fileExtension}`,
    },
    // Add temporary property with file data for sorting
    _temp: { file },
  };

  return stream;
}

function getCacheOptions(itemsLength: number): Partial<Cache> {
  return {
    cacheMaxAge: (Math.min(itemsLength, 10) / 10) * 3600 * 24 * 7, // up to 1 week of cache for items
  };
}

export const addonInterface = builder.getInterface();
