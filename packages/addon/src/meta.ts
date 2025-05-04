import { extractDigits, getAlternativeTitles, sanitizeTitle } from './utils';

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

async function getAlternativeTMDBTitles(
  id: string,
  language: string,
  apiKey: string
): Promise<string[]> {
  const url = `https://api.themoviedb.org/3/movie/${id}/alternative_titles?country=${language}`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  return fetch(url, options)
    .then(res => res.json())
    .then(data => {
      const alternativeTitles = data.titles
        .filter((title: AlternativeTitle) => title.iso_3166_1 === language.toUpperCase())
        .map((title: AlternativeTitle) => title.title);
      return alternativeTitles;
    });
}

async function tmdbMetaProvider(
  id: string,
  preferredLanguage: string,
  apiKey: string
): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  const url = `https://api.themoviedb.org/3/find/${tt}?language=${preferredLanguage}&external_source=imdb_id`;

  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };

  return fetch(url, options)
    .then(res => res.json())
    .then(data => {
      const result =
        data.movie_results && data.movie_results.length > 0
          ? data.movie_results[0]
          : data.tv_results && data.tv_results.length > 0
            ? data.tv_results[0]
            : null;

      if (!result) {
        throw new Error(`No results found for IMDB ID ${id}`);
      }

      const title = result.title || result.name;
      const originalTitle = result.original_title || result.original_name;
      const releaseYear =
        result.release_date?.split('-')[0] || result.first_air_date?.split('-')[0];

      return getAlternativeTMDBTitles(result.id, preferredLanguage, apiKey).then(
        alternativeNames => {
          return {
            name: title,
            originalName: originalTitle,
            alternativeNames,
            year: parseInt(releaseYear),
            season,
            episode,
          };
        }
      );
    });
}

async function imdbMetaProvider(id: string): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  return fetch(`https://v2.sg.media-imdb.com/suggestion/t/${tt}.json`)
    .then(res => res.json())
    .then(json => {
      return json.d.find((item: { id: string }) => item.id === tt);
    })
    .then(({ l, y }) => {
      // Get original name and potential custom titles
      const originalName = l;
      const alternativeNames = getAlternativeTitles(originalName);

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
      const alternativeNames = getAlternativeTitles(originalName);

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
  apiKey: string = ''
): Promise<MetaProviderResponse> {
  return tmdbMetaProvider(id, preferredLanguage, apiKey)
    .then(meta => {
      if (meta.name) {
        return meta;
      }

      return cinemetaMetaProvider(id, type);
    })
    .then(meta => {
      if (meta.name) {
        return meta;
      }

      throw new Error('Failed to find metadata');
    });
}
