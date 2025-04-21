import { Cache, ContentType, MetaDetail, MetaVideo } from 'stremio-addon-sdk';
import addonBuilder from 'stremio-addon-sdk/src/builder';
import { catalog, manifest } from './manifest';
import {
  buildSearchQuery,
  capitalizeFirstLetter,
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
  loadCustomTitles,
  logger,
  LogLevel,
  logError,
  matchesTitle,
  parseCustomTitles,
  getAlternativeTitles,
} from './utils';
import {
  EasynewsAPI,
  SearchOptions,
  EasynewsSearchResponse,
} from '@easynews-plus-plus/api';
import { publicMetaProvider } from './meta';
import {
  fromHumanReadable,
  toDirection,
  SortOption,
  SortOptionKey,
} from './sort-option';
import { Stream } from './types';
import * as path from 'path';
import * as fs from 'fs';

// Extended configuration interface
interface AddonConfig {
  username: string;
  password: string;
  customTitles?: string;
  strictTitleMatching?: string;
  preferredLanguage?: string;
  sortingPreference?: string;
  logLevel?: string; // Add log level configuration option
  [key: string]: any;
}

// Definiere ValidPosterShape als Workaround für fehlendes PosterShape-Type
type ValidPosterShape = 'square' | 'regular' | 'landscape';

const builder = new addonBuilder(manifest);
const prefix = `${catalog.id}:`;

// Log addon initialization
logger.info(
  `Addon initializing - version: ${getVersion()}, log level: ${logger.getLevelName()}`
);

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

// Try multiple possible locations for the file
let translationsFromFile: Record<string, string[]> = {};
let loadedPath: string | null = null;

// Start with the built-in translations by calling loadCustomTitles with a non-existent path
// This will return the default built-in translations
translationsFromFile = loadCustomTitles('');

try {
  // Check if we're in a Cloudflare Worker environment
  if (
    typeof process === 'undefined' ||
    typeof fs === 'undefined' ||
    typeof __dirname === 'undefined' ||
    !fs.existsSync
  ) {
    logger.info(
      'Running in Cloudflare Worker environment, using built-in custom titles only'
    );
  } else {
    // Only try filesystem paths if we're in a Node.js environment
    const possiblePaths = [
      // In the same directory as the running code
      path.join(__dirname, 'custom-titles.json'),
      // One level up (addon root directory)
      path.join(__dirname, '..', 'custom-titles.json'),
      // Two levels up (packages directory)
      path.join(__dirname, '..', '..', 'custom-titles.json'),
      // Three levels up (project root)
      path.join(__dirname, '..', '..', '..', 'custom-titles.json'),
      // In current working directory
      path.join(process.cwd(), 'custom-titles.json'),
      // In addon subdirectory of current working directory
      path.join(process.cwd(), 'addon', 'custom-titles.json'),
      // In dist subdirectory of current working directory
      path.join(process.cwd(), 'dist', 'custom-titles.json'),
    ];

    // Try each path until we find the file
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          logger.info(`Found custom-titles.json at: ${filePath}`);
          translationsFromFile = loadCustomTitles(filePath);
          loadedPath = filePath;

          // Log some details about the loaded custom titles
          const numTranslations = Object.keys(translationsFromFile).length;
          logger.info(`Successfully loaded ${numTranslations} custom titles`);

          if (numTranslations > 0) {
            // Log a few examples to verify they're loaded correctly
            const examples = Object.entries(translationsFromFile).slice(0, 3);
            for (const [original, translations] of examples) {
              logger.info(
                `Example custom title: "${original}" -> "${translations.join('", "')}"`
              );
            }
          } else {
            logger.info(
              'No custom titles were loaded from the file. The file might be empty or have invalid format.'
            );
          }
          break;
        }
      } catch (error) {
        logger.info(`Error checking path ${filePath}: ${error}`);
      }
    }

    if (!loadedPath) {
      logger.info(
        `Could not find custom-titles.json file. Using built-in custom titles only. Built-in custom titles count: ${Object.keys(translationsFromFile).length}`
      );
      logger.info('Some examples of built-in custom titles:');
      const examples = Object.entries(translationsFromFile).slice(0, 5);
      for (const [original, translations] of examples) {
        logger.info(`  "${original}" -> "${translations.join('", "')}"`);
      }
    } else {
      logger.info(`Using custom titles from: ${loadedPath}`);
    }
  }
} catch (error) {
  logger.error('Error loading custom titles file:', error);
  logger.info('Using built-in custom titles as fallback');
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
  async ({
    id,
    type,
    config,
  }: {
    id: string;
    type: ContentType;
    config: AddonConfig;
  }) => {
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
  async ({
    id,
    type,
    config,
  }: {
    id: string;
    type: ContentType;
    config: AddonConfig;
  }) => {
    const {
      username,
      password,
      customTitles,
      strictTitleMatching,
      preferredLanguage,
      sortingPreference,
      logLevel,
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
    const cacheKey = `${id}:v2:strict=${strictTitleMatching === 'on' || strictTitleMatching === 'true'}:lang=${preferredLanguage || ''}:sort=${sortingPreference}`;
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
      const useStrictMatching =
        strictTitleMatching === 'on' || strictTitleMatching === 'true';
      logger.info(
        `Strict title matching: ${useStrictMatching ? 'enabled' : 'disabled'}`
      );

      // Get preferred language from configuration
      const preferredLang = preferredLanguage || '';
      logger.info(
        `Preferred language: ${preferredLang ? preferredLang : 'No preference'}`
      );

      // Combine config-provided custom titles with titles from file
      let customTranslations = { ...translationsFromFile };

      logger.info(
        `Using ${Object.keys(customTranslations).length} custom titles (${Object.keys(translationsFromFile).length} from built-in/file + additional from config)`
      );

      // Add any custom titles from configuration
      if (customTitles) {
        logger.info(`Additional custom titles provided in configuration`);
        const customTitlesObj = parseCustomTitles(customTitles);
        const customCount = Object.keys(customTitlesObj).length;
        logger.info(`Parsed ${customCount} custom titles from configuration`);

        if (customCount > 0) {
          // Merge translations, custom titles take precedence
          customTranslations = {
            ...translationsFromFile,
            ...customTitlesObj,
          };
          logger.info(
            `Combined custom titles count: ${Object.keys(customTranslations).length}`
          );
        }
      }

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

      // Check if we have a translation for this title directly
      if (customTranslations[meta.name]) {
        logger.info(
          `Direct custom title found for "${meta.name}": "${customTranslations[meta.name].join('", "')}"`
        );
      } else {
        logger.info(
          `No direct custom title found for "${meta.name}", checking partial matches`
        );

        // Look for partial matches in title keys
        for (const [key, values] of Object.entries(customTranslations)) {
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

      // Use alternativeNames from metadata if available, or generate them
      // Convert translations to JSON string for getAlternativeTitles
      const titlesJson = JSON.stringify(customTranslations);

      logger.info(`Getting alternative titles for: ${meta.name}`);

      // Initialize with the original title
      let allTitles = [meta.name];

      // Add any direct translations found in customTranslations
      if (
        customTranslations[meta.name] &&
        customTranslations[meta.name].length > 0
      ) {
        logger.info(
          `Adding direct custom titles for "${meta.name}": "${customTranslations[meta.name].join('", "')}"`
        );
        allTitles = [...allTitles, ...customTranslations[meta.name]];
      }

      // Add any alternative names from meta (if available)
      if (meta.alternativeNames && meta.alternativeNames.length > 0) {
        logger.info(
          `Adding ${meta.alternativeNames.length} alternative names from metadata`
        );
        // Filter out duplicates
        const newAlternatives = meta.alternativeNames.filter(
          (alt) => !allTitles.includes(alt)
        );
        allTitles = [...allTitles, ...newAlternatives];
      }

      // Use getAlternativeTitles to find additional matches (like partial matches)
      const additionalTitles = getAlternativeTitles(
        meta.name,
        titlesJson
      ).filter((alt) => !allTitles.includes(alt) && alt !== meta.name);

      if (additionalTitles.length > 0) {
        logger.info(
          `Adding ${additionalTitles.length} additional titles from partial matches`
        );
        allTitles = [...allTitles, ...additionalTitles];
      }

      logger.info(
        `Will search for ${allTitles.length} titles: ${allTitles.join(', ')}`
      );

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
              logger.info(
                `Example result: "${title}" (${file['4'] || 'unknown size'})`
              );
            }
          }
        } catch (error) {
          logger.error(`Error searching for "${query}":`, error);
          // Continue with other titles even if one fails
        }
      }

      // If we get no or few results, try with year included for more specificity
      if (allSearchResults.length === 0 && meta.year !== undefined) {
        logger.info(
          `No results found without year, trying with year: ${meta.year}`
        );

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
                logger.info(
                  `Example result: "${title}" (${file['4'] || 'unknown size'})`
                );
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

      const streams: Stream[] = [];
      const processedHashes = new Set<string>(); // To avoid duplicate files

      // Process all search results
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
            if (
              !queries.some((q) => matchesTitle(title, q, useStrictMatching))
            ) {
              continue;
            }
          }

          // For movies, check if title matches any of the query variants
          // Other content types are loosely matched
          const matchesAnyVariant = allTitles.some((titleVariant) => {
            const variantQuery = buildSearchQuery(type, {
              ...meta,
              name: titleVariant,
            });
            // For movies, always use strictTitleMatching if enabled, otherwise default to movie behavior
            return matchesTitle(
              title,
              variantQuery,
              type === 'movie' || useStrictMatching
            );
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
        logger.info(
          `Applying language-first sorting for language: ${preferredLang}`
        );

        // Special handling for language-first sorting
        // First, separate streams by language
        const preferredLangStreams: Stream[] = [];
        const otherStreams: Stream[] = [];

        // Split streams into two groups
        for (const stream of streams) {
          const file = (stream as any)._temp?.file;
          const hasPreferredLang =
            file?.alangs &&
            Array.isArray(file.alangs) &&
            file.alangs.includes(preferredLang);

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
            if (
              quality?.includes('4K') ||
              quality?.includes('2160p') ||
              quality?.includes('UHD')
            )
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
          const aHasPreferredLang =
            preferredLang && aFile?.alangs?.includes(preferredLang);
          const bHasPreferredLang =
            preferredLang && bFile?.alangs?.includes(preferredLang);

          // Extract quality info
          const aDesc = a.description?.split('\n') || [];
          const bDesc = b.description?.split('\n') || [];
          const aQuality = a.name?.includes('\n') ? a.name.split('\n')[1] : '';
          const bQuality = b.name?.includes('\n') ? b.name.split('\n')[1] : '';

          // Get quality scores
          const getQualityScore = (quality: string): number => {
            if (
              quality?.includes('4K') ||
              quality?.includes('2160p') ||
              quality?.includes('UHD')
            )
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
    logger.info(
      `Stream "${title}" has languages: ${JSON.stringify(file.alangs)}`
    );
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
