import { Stream as StremioStream } from 'stremio-addon-sdk';

export interface Stream extends StremioStream {
  behaviorHints?: {
    notWebReady?: boolean;
    countryWhitelist?: string[];
    group?: string;
    headers?: any;
    filename?: string;
  };
}
