import { capitalizeFirstLetter } from './utils';

export enum SortOption {
  Relevance = 'relevance',
  Extension = 'next',
  Size = 'dsize',
  Expire = 'xtime',
  DateTime = 'dtime',
  Filename = 'nrfile',
  Subject = 'nsubject',
  From = 'nfrom',
  Group = 'sgroup',
  Header = 'head',
  TPN = 'thmparnzb',
  Set = 'set',
  VideoCodec = 'svcodec',
  AudioCodec = 'sacodec',
  ImageSize = 'dpixels',
  AVLength = 'druntime',
  Bitrate = 'dbps',
  SampleRate = 'dhz',
  FramesPerSec = 'dfps',
  Day = 'otime',
}

export type SortOptionKey = keyof typeof SortOption;

export const humanReadableSortOptions = Object.keys(SortOption).map(value =>
  toHumanReadable(value as SortOptionKey)
);

export const humanReadableDirections = ['Ascending', 'Descending'] as const;
export type DirectionKey = (typeof humanReadableDirections)[number];

export function toHumanReadable(value: SortOptionKey): string {
  const mapComplexStrings: Partial<Record<SortOptionKey, string>> = {
    AVLength: 'A/V Length',
    DateTime: 'Date & Time',
    TPN: 'TPN',
  };

  return mapComplexStrings[value] ?? capitalizeFirstLetter(value.split(/(?=[A-Z])/).join(' '));
}

export function fromHumanReadable(
  value: SortOptionKey | string | undefined
): SortOption | undefined {
  if (!value) return undefined;

  const key = Object.keys(SortOption).find(key => toHumanReadable(key as SortOptionKey) === value);

  return SortOption[key as SortOptionKey];
}

export function toDirection(value?: DirectionKey | string): '+' | '-' | undefined {
  return value ? (value === 'Ascending' ? '+' : '-') : undefined;
}
