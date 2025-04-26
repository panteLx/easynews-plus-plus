import express, { Request, Response, NextFunction } from 'express';
import { AddonInterface } from 'stremio-addon-sdk';
// Import getRouter manually since TypeScript definitions are incomplete
// @ts-ignore
import getRouter from 'stremio-addon-sdk/src/getRouter';
import * as path from 'path';
import customTemplate from './custom-template';
import { addonInterface } from './addon';

type ServerOptions = {
  port?: number;
  cache?: number;
  cacheMaxAge?: number;
  static?: string;
};

// Helper function to create a deep clone of the manifest with a specified language
function createManifestWithLanguage(addonInterface: AddonInterface, lang: string) {
  const manifest = JSON.parse(JSON.stringify(addonInterface.manifest)); // Deep clone

  // Find and update the uiLanguage field
  if (manifest.config) {
    const uiLangFieldIndex = manifest.config.findIndex((field: any) => field.key === 'uiLanguage');
    if (uiLangFieldIndex >= 0 && lang) {
      console.log(`Setting language in manifest to: ${lang}`);
      manifest.config[uiLangFieldIndex].default = lang;
    }
  }

  return manifest;
}

function serveHTTP(addonInterface: AddonInterface, opts: ServerOptions = {}) {
  if (addonInterface.constructor.name !== 'AddonInterface') {
    throw new Error('first argument must be an instance of AddonInterface');
  }

  const app = express();

  // Handle Cache-Control
  const cacheMaxAge = opts.cacheMaxAge || opts.cache;
  if (cacheMaxAge) {
    app.use((_: Request, res: Response, next: NextFunction) => {
      if (!res.getHeader('Cache-Control'))
        res.setHeader('Cache-Control', 'max-age=' + cacheMaxAge + ', public');
      next();
    });
  }

  // Use the standard router from the SDK
  app.use(getRouter(addonInterface));

  // The important part: Use our custom template with internationalization
  const hasConfig = !!(addonInterface.manifest.config || []).length;

  // Landing page
  app.get('/', (req: Request, res: Response) => {
    if (hasConfig) {
      // Pass any language parameter to the configure route
      const lang = (req.query.lang as string) || '';
      const redirectUrl = lang ? `/configure?lang=${lang}` : '/configure';
      res.redirect(redirectUrl);
    } else {
      res.setHeader('content-type', 'text/html');
      // Generate the landing HTML with the default language
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
      console.log(`Express server: Received request with lang=${lang}`);

      // Generate HTML with the selected language
      let tempManifest;

      // If a language is specified, create a specialized manifest for that language
      if (lang) {
        tempManifest = createManifestWithLanguage(addonInterface, lang);
      } else {
        // Otherwise, use the default manifest
        tempManifest = addonInterface.manifest;
      }

      // Generate HTML with the updated language
      const landingHTML = customTemplate(tempManifest);
      res.end(landingHTML);
    });

  // Static files, if specified
  if (opts.static) {
    const location = path.join(process.cwd(), opts.static);
    try {
      const fs = require('fs');
      if (!fs.existsSync(location)) throw new Error('directory to serve does not exist');
      app.use(opts.static, express.static(location));
    } catch (e) {
      console.error('Error setting up static directory:', e);
    }
  }

  // Start the server
  const server = app.listen(opts.port || process.env.PORT || 7000);

  return new Promise(function (resolve, reject) {
    server.on('listening', function () {
      const addressInfo = server.address();
      const port = typeof addressInfo === 'object' ? addressInfo?.port : null;
      const url = `http://127.0.0.1:${port}/manifest.json`;
      console.log('HTTP addon accessible at:', url);
      resolve({ url, server });
    });
    server.on('error', reject);
  });
}

// Start the server with the addon interface
serveHTTP(addonInterface, { port: +(process.env.PORT ?? 1337) }).catch(err => {
  console.error('[server] failed to start:', err);
  process.exitCode = 1;
});
