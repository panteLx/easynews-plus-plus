import express, { Request, Response, NextFunction } from 'express';
import { AddonInterface } from 'stremio-addon-sdk';
import path from 'path';
// Import getRouter manually since TypeScript definitions are incomplete
// @ts-ignore
import getRouter from 'stremio-addon-sdk/src/getRouter';
import customTemplate from './custom-template';
import { addonInterface } from './addon';
import { createLogger, getVersion } from 'easynews-plus-plus-shared';

// Create a logger with server prefix and explicitly set the level from environment variable
export const logger = createLogger({
  prefix: 'Server',
  level: process.env.EASYNEWS_LOG_LEVEL || undefined, // Use the environment variable if set
});

type ServerOptions = {
  port?: number;
  cache?: number;
  cacheMaxAge?: number;
  static?: string;
};

// Helper function to create a deep clone of the manifest with a specified language
function createManifestWithLanguage(addonInterface: AddonInterface, lang: string) {
  const manifest = JSON.parse(JSON.stringify(addonInterface.manifest)); // Deep clone
  logger.debug(`Creating manifest clone for language: ${lang}`);

  // Find and update the uiLanguage field
  if (manifest.config) {
    const uiLangFieldIndex = manifest.config.findIndex((field: any) => field.key === 'uiLanguage');
    if (uiLangFieldIndex >= 0 && lang) {
      logger.debug(`Setting language in manifest to: ${lang}`);
      manifest.config[uiLangFieldIndex].default = lang;
    } else {
      logger.debug(`No language field found in manifest or empty language: ${lang}`);
    }
  }

  return manifest;
}

function serveHTTP(addonInterface: AddonInterface, opts: ServerOptions = {}) {
  if (addonInterface.constructor.name !== 'AddonInterface') {
    throw new Error('first argument must be an instance of AddonInterface');
  }

  logger.debug(`Creating Express server with options: ${JSON.stringify(opts)}`);
  const app = express();

  // Handle Cache-Control
  const cacheMaxAge = opts.cacheMaxAge || opts.cache;
  if (cacheMaxAge) {
    logger.debug(`Setting cache max age to: ${cacheMaxAge}`);
    app.use((_: Request, res: Response, next: NextFunction) => {
      if (!res.getHeader('Cache-Control'))
        res.setHeader('Cache-Control', 'max-age=' + cacheMaxAge + ', public');
      next();
    });
  }

  // Use the standard router from the SDK
  app.use(getRouter(addonInterface));
  logger.debug('Stremio Router middleware attached');

  // The important part: Use our custom template with internationalization
  const hasConfig = !!(addonInterface.manifest.config || []).length;
  logger.debug(`Addon has configuration: ${hasConfig}`);

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`Received ${req.method} request for: ${req.originalUrl || req.url}`);
    next();
  });

  // Landing page
  app.get('/', (req: Request, res: Response) => {
    logger.debug(`Handling root request with query params: ${JSON.stringify(req.query)}`);
    if (hasConfig) {
      // Pass any language parameter to the configure route
      const lang = (req.query.lang as string) || '';
      const redirectUrl = lang ? `/configure?lang=${lang}` : '/configure';
      logger.debug(`Redirecting to configuration page: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } else {
      res.setHeader('content-type', 'text/html');
      // Generate the landing HTML with the default language
      logger.debug('Generating landing page HTML with default manifest');
      const landingHTML = customTemplate(addonInterface.manifest);
      res.end(landingHTML);
    }
  });

  if (hasConfig)
    app.get('/configure', (req: Request, res: Response) => {
      // Set no-cache headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('content-type', 'text/html');

      // Get language from query parameter
      const lang = (req.query.lang as string) || '';
      logger.debug(`Express server: Received configure request with lang=${lang}`);

      // Generate HTML with the selected language
      let tempManifest;

      // If a language is specified, create a specialized manifest for that language
      if (lang) {
        logger.debug(`Creating manifest with specific language: ${lang}`);
        tempManifest = createManifestWithLanguage(addonInterface, lang);
      } else {
        // Otherwise, use the default manifest
        logger.debug('Using default manifest (no language specified)');
        tempManifest = addonInterface.manifest;
      }

      // Generate HTML with the updated language
      logger.debug('Generating configuration page HTML');
      const landingHTML = customTemplate(tempManifest);
      res.end(landingHTML);
    });

  // Static files, if specified
  if (opts.static) {
    const location = path.join(process.cwd(), opts.static);
    logger.debug(`Setting up static file serving from: ${location}`);
    try {
      const fs = require('fs');
      if (!fs.existsSync(location)) {
        logger.debug(`Static directory does not exist: ${location}`);
        throw new Error('directory to serve does not exist');
      }
      app.use(opts.static, express.static(location));
      logger.debug(`Static file middleware attached for path: ${opts.static}`);
    } catch (e) {
      logger.error('Error setting up static directory:', e);
    }
  }

  // Start the server
  logger.debug(`Starting server on port: ${opts.port || process.env.PORT || 7000}`);
  const server = app.listen(opts.port || process.env.PORT || 7000);

  return new Promise(function (resolve, reject) {
    server.on('listening', function () {
      const addressInfo = server.address();
      const port = typeof addressInfo === 'object' ? addressInfo?.port : null;
      const url = `http://127.0.0.1:${port}/manifest.json`;
      logger.debug(`Server started successfully on port: ${port}`);
      logger.info(`Addon accessible at: ${url}`);
      resolve({ url, server });
    });
    server.on('error', err => {
      logger.debug(`Server failed to start: ${err.message}`);
      reject(err);
    });
  });
}

// Start the server with the addon interface
logger.debug(`Starting addon server with interface: ${addonInterface.manifest.id}`);
serveHTTP(addonInterface, { port: +(process.env.PORT ?? 1337) }).catch(err => {
  logger.error('Server failed to start:', err);
  process.exitCode = 1;
});

// Log environment configuration
logger.info('--- Environment configuration ---');
logger.info(`PORT: ${process.env.PORT || 'undefined'}`);
logger.info(`LOG_LEVEL: ${logger.level || 'undefined'}`);
logger.info(`VERSION: ${getVersion() || 'undefined'}`);

// Log API search configuration
logger.info('--- API search configuration ---');
logger.info(`TOTAL_MAX_RESULTS: ${process.env.TOTAL_MAX_RESULTS || 'undefined'}`);
logger.info(`MAX_PAGES: ${process.env.MAX_PAGES || 'undefined'}`);
logger.info(`MAX_RESULTS_PER_PAGE: ${process.env.MAX_RESULTS_PER_PAGE || 'undefined'}`);
logger.info(`CACHE_TTL: ${process.env.CACHE_TTL || 'undefined'}`);

// Log if TMDB is enabled
logger.info('--- TMDB configuration ---');
logger.info(`TMDB Integration: ${process.env.TMDB_API_KEY ? 'Enabled' : 'Disabled'}`);
logger.info('--- End of configuration ---');
