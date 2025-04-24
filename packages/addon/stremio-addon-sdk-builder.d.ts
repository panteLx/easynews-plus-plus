declare module 'stremio-addon-sdk/src/builder' {
  import type {
    AddonCatalog,
    AddonInterface,
    Cache,
    ContentType,
    Manifest,
    MetaDetail,
    MetaPreview,
    Subtitle,
  } from 'stremio-addon-sdk';

  type Config = {
    username: string;
    password: string;
    sort1?: string;
    sort1Direction?: string;
    sort2?: string;
    sort2Direction?: string;
    sort3?: string;
    sort3Direction?: string;
  };

  export default class addonBuilder {
    constructor(manifest: Manifest);

    defineCatalogHandler(handler: (args: Args) => Promise<{ metas: MetaPreview[] } & Cache>): void;

    defineMetaHandler(
      handler: (args: {
        type: ContentType;
        id: string;
        config: Config;
      }) => Promise<{ meta: MetaDetail } & Cache>
    ): void;

    defineStreamHandler(
      handler: (args: {
        type: ContentType;
        id: string;
        config: Config;
      }) => Promise<{ streams: Stream[] } & Cache>
    ): void;

    defineSubtitlesHandler(
      handler: (args: {
        type: ContentType;
        id: string;
        extra: {
          videoHash: string;
          videoSize: string;
        };
      }) => Promise<{ subtitles: Subtitle[] } & Cache>
    ): void;

    defineResourceHandler(args: {
      type: ContentType;
      id: string;
    }): Promise<{ addons: AddonCatalog[] } & Cache>;

    getInterface(): AddonInterface;
  }
}
