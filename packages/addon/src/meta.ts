import { extractDigits } from './utils';
import { createLogger } from 'easynews-plus-plus-shared';

// Create a logger with metadata prefix and explicitly set the level from environment variable
export const logger = createLogger({
  prefix: 'Metadata',
  level: process.env.EASYNEWS_LOG_LEVEL || undefined, // Use the environment variable if set
});

export type MetaProviderResponse = {
  name: string;
  originalName?: string; // Original name before any custom titles
  alternativeNames?: string[]; // Alternative names/custom titles
  year?: number;
  season?: string;
  episode?: string;
};

interface AlternativeTitle {
  iso_3166_1: string;
  title: string;
  type: string;
}

/**
 * Fetches foreign titles from TMDB.
 */
async function getAlternativeTMDBTitles(
  id: string,
  type: 'movie' | 'tv',
  language: string,
  apiKey: string
): Promise<string[]> {
  let url = `https://api.themoviedb.org/3/${type}/${id}/alternative_titles`;

  // If the type is movie, we can add the country code as a query parameter
  // to get the foreign titles for that country
  if (type === 'movie' && language) {
    url += `?country=${language}`;
  }
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetch(url, options);
  const data = await response.json();

  let titles: { title: string; iso_3166_1: string }[];
  if (!data) {
    logger.warn('No data found for TMDB alternative titles');
    return [];
  } else if (data.status_code === 34) {
    logger.warn('TMDB error: No results found');
    return [];
  }
  // If the type is movie, we can get the titles from the data
  // If the type is tv, we need to filter the results by the language
  if (type === 'movie') {
    titles = data.titles || [];
  } else {
    titles = (data.results || []).filter(
      (result: AlternativeTitle) => result.iso_3166_1 === language.toUpperCase()
    );
  }
  return titles.map(title => title.title);
}

/**
 * Fetches metadata from TMDB.
 */
async function tmdbMetaProvider(
  id: string,
  preferredLanguage: string,
  apiKey: string
): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  // Use the preferred language if provided, otherwise fall back to English
  const languageParam = preferredLanguage || 'en-US';
  const url = `https://api.themoviedb.org/3/find/${tt}?language=${languageParam}&external_source=imdb_id`;

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const res = await fetch(url, options);
  const data = await res.json();

  const result = data.movie_results?.[0] ?? data.tv_results?.[0] ?? null;

  if (!result) {
    throw new Error(`No TMDB results found for IMDB ID ${id}`);
  }

  const title = result.title || result.name;
  const originalTitle = result.original_title || result.original_name;
  const releaseDate = result.release_date || result.first_air_date;
  const releaseYear = releaseDate?.split('-')[0];

  let alternativeNames: string[] = [];
  try {
    logger.debug(
      `Fetching alternative titles for ${result.id} (${result.media_type}) in language ${preferredLanguage}`
    );
    alternativeNames = await getAlternativeTMDBTitles(
      result.id,
      result.media_type,
      preferredLanguage,
      apiKey
    );
    logger.debug(
      `Found ${alternativeNames.length} alternative titles: ${alternativeNames.join(', ')}`
    );
  } catch (err) {
    logger.warn(`Failed to fetch alternative titles: ${(err as Error).message}`);
  }

  return {
    name: title,
    originalName: originalTitle,
    alternativeNames,
    year: parseInt(releaseYear),
    season,
    episode,
  };
}

/**
 * Fetches metadata from IMDB.
 */
async function imdbMetaProvider(id: string): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  return fetch(`https://v2.sg.media-imdb.com/suggestion/t/${tt}.json`)
    .then(res => res.json())
    .then(json => {
      return json.d.find((item: { id: string }) => item.id === tt);
    })
    .then(({ l, y }) => {
      // Get original name
      const originalName = l;
      const alternativeNames: string[] = [];

      return {
        name: originalName,
        originalName,
        alternativeNames,
        year: y,
        season,
        episode,
      };
    });
}

/**
 * Fetches metadata from Cinemeta.
 */
async function cinemetaMetaProvider(id: string, type: string): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  return fetch(`https://v3-cinemeta.strem.io/meta/${type}/${tt}.json`)
    .then(res => res.json())
    .then(json => {
      const meta = json.meta;
      const name = meta.name;
      const year = extractDigits(meta.year ?? meta.releaseInfo);

      // Get original name and potential custom titles
      const originalName = name;
      const alternativeNames: string[] = [];

      return {
        name,
        originalName,
        alternativeNames,
        year,
        episode,
        season,
      } satisfies MetaProviderResponse;
    });
}

/**
 * Fetches metadata from TMDB and use Cinemeta as a fallback.
 */
export async function publicMetaProvider(
  id: string,
  preferredLanguage: string,
  type: string,
  apiKey?: string
): Promise<MetaProviderResponse> {
  if (apiKey) {
    const tmdbMeta = await tmdbMetaProvider(id, preferredLanguage, apiKey);
    if (tmdbMeta?.name) return tmdbMeta;
    logger.warn('TMDB failed, falling back to IMDB');
  } else {
    logger.warn('No TMDB API key provided, skipping TMDB and trying IMDB');
  }
  logger.warn('TMDB failed, falling back to IMDB (no foreign titles)');
  const imdbMeta = await imdbMetaProvider(id);
  if (imdbMeta?.name) return imdbMeta;

  logger.warn('IMDB failed, falling back to Cinemeta');
  const cinemetaMeta = await cinemetaMetaProvider(id, type);
  if (cinemetaMeta?.name) return cinemetaMeta;

  throw new Error('Failed to find metadata');
}
