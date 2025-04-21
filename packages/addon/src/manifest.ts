import { Manifest, ManifestCatalog } from 'stremio-addon-sdk';
import {
  DirectionKey,
  humanReadableDirections,
  humanReadableSortOptions,
  toHumanReadable,
} from './sort-option';
const { version, description } = require('../package.json');

export const catalog: ManifestCatalog = {
  id: 'easynews-plus-plus',
  name: 'Easynews++',
  type: 'tv',
  extra: [{ name: 'search', isRequired: true }],
};

// TODO: fix in '@types/stremio-addon-sdk'
const sortOptions = humanReadableSortOptions as any;
const directionOptions = humanReadableDirections as any;

// Language options for the preferred language selector
const languageOptions = {
  '': 'No preference',
  eng: 'English',
  ger: 'German (Deutsch)',
  spa: 'Spanish (Español)',
  fre: 'French (Français)',
  ita: 'Italian (Italiano)',
  jpn: 'Japanese (日本語)',
  por: 'Portuguese (Português)',
  rus: 'Russian (Русский)',
  kor: 'Korean (한국어)',
  chi: 'Chinese (中文)',
} as any;

// Sorting preference options
const sortingOptions = {
  quality_first: 'Quality (4K → 1080p → 720p)',
  language_first: 'Preferred Language, then Quality',
  size_first: 'File Size (largest first)',
  date_first: 'Date Added (newest first)',
  relevance_first: 'Relevance (best matches first)',
} as any;

export const manifest: Manifest = {
  id: 'community.easynews-plus-plus',
  version,
  description,
  catalogs: [catalog],
  resources: [
    'catalog',
    { name: 'meta', types: ['tv'], idPrefixes: [catalog.id] },
    { name: 'stream', types: ['movie', 'series'], idPrefixes: ['tt'] },
  ],
  types: ['movie', 'series', 'tv'],
  name: 'Easynews++',
  background: 'https://i.imgur.com/QPPXf5T.jpeg',
  logo: 'https://pbs.twimg.com/profile_images/479627852757733376/8v9zH7Yo_400x400.jpeg',
  behaviorHints: { configurable: true, configurationRequired: true },
  config: [
    { title: 'Username', key: 'username', type: 'text' },
    { title: 'Password', key: 'password', type: 'password' },
    {
      title:
        "Strict Title Matching (to filter out results that don't exactly match the movie or series title)",
      key: 'strictTitleMatching',
      type: 'checkbox',
      default: 'false',
    },
    {
      title: 'Preferred Audio Language',
      key: 'preferredLanguage',
      type: 'select',
      options: languageOptions,
      default: '',
    },
    {
      title: 'Sorting Method',
      key: 'sortingPreference',
      type: 'select',
      options: sortingOptions,
      default: 'quality_first',
    },
  ],
};
