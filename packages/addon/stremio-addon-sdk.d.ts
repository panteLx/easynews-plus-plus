import { ContentType } from 'stremio-addon-sdk';

declare module 'stremio-addon-sdk' {
  interface Stream {
    description?: string;
  }

  interface Stream {
    behaviorHints?:
      | {
          notWebReady?: boolean | undefined;
          countryWhitelist?: string[] | undefined;
          group?: string | undefined;
          headers?: any;
          filename?: string | undefined;
        }
      | undefined;
  }
}
