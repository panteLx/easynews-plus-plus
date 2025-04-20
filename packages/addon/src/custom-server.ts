import express from 'express';
import * as path from 'path';
import { AddonInterface } from 'stremio-addon-sdk';
import { Request, Response, NextFunction } from 'express';

// Import getRouter manually since TypeScript definitions are incomplete
// @ts-ignore
import getRouter from 'stremio-addon-sdk/src/getRouter';
import customTemplate from './custom-template';

type ServerOptions = {
  port?: number;
  cache?: number;
  cacheMaxAge?: number;
  static?: string;
};

export function serveHTTP(
  addonInterface: AddonInterface,
  opts: ServerOptions = {}
) {
  if (addonInterface.constructor.name !== 'AddonInterface') {
    throw new Error('first argument must be an instance of AddonInterface');
  }

  const app = express();

  // Use the standard router from the SDK
  app.use(getRouter(addonInterface));

  // Handle Cache-Control
  const cacheMaxAge = opts.cacheMaxAge || opts.cache;
  if (cacheMaxAge) {
    app.use((_: Request, res: Response, next: NextFunction) => {
      if (!res.getHeader('Cache-Control'))
        res.setHeader('Cache-Control', 'max-age=' + cacheMaxAge + ', public');
      next();
    });
  }

  // The important part: Use our custom template
  const landingHTML = customTemplate(addonInterface.manifest);
  const hasConfig = !!(addonInterface.manifest.config || []).length;

  // Landing page
  app.get('/', (_: Request, res: Response) => {
    if (hasConfig) {
      res.redirect('/configure');
    } else {
      res.setHeader('content-type', 'text/html');
      res.end(landingHTML);
    }
  });

  if (hasConfig)
    app.get('/configure', (_: Request, res: Response) => {
      res.setHeader('content-type', 'text/html');
      res.end(landingHTML);
    });

  // Static files, if specified
  if (opts.static) {
    const location = path.join(process.cwd(), opts.static);
    try {
      const fs = require('fs');
      if (!fs.existsSync(location))
        throw new Error('directory to serve does not exist');
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
