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
    { title: 'username', key: 'username', type: 'text' },
    { title: 'password', key: 'password', type: 'password' },
    {
      title:
        "Strict Title Matching (to filter out results that don't exactly match the movie or series title)",
      key: 'strictTitleMatching',
      type: 'checkbox',
      default: 'false',
    },
    {
      title: 'Sort 1st',
      key: 'sort1',
      type: 'select',
      options: sortOptions,
      default: toHumanReadable('Size'),
    },
    {
      title: 'Sort 1st direction',
      key: 'sort1Direction',
      type: 'select',
      options: directionOptions,
      default: 'Descending' satisfies DirectionKey,
    },
    {
      title: 'Sort 2nd',
      key: 'sort2',
      type: 'select',
      options: sortOptions,
      default: toHumanReadable('Relevance'),
    },
    {
      title: 'Sort 2nd direction',
      key: 'sort2Direction',
      type: 'select',
      options: directionOptions,
      default: 'Descending' satisfies DirectionKey,
    },
    {
      title: 'Sort 3rd',
      key: 'sort3',
      type: 'select',
      options: sortOptions,
      default: toHumanReadable('DateTime'),
    },
    {
      title: 'Sort 3rd direction',
      key: 'sort3Direction',
      type: 'select',
      options: directionOptions,
      default: 'Descending' satisfies DirectionKey,
    },
  ],
};
