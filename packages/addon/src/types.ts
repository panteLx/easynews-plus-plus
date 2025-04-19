import { Stream as StremioStream } from 'stremio-addon-sdk';

export type Stream = {
  name: string;
  url: string;
  description?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    headers?: {
      [key: string]: string;
    };
    filename?: string;
  };
};
