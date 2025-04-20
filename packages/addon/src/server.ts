import { addonInterface } from './addon';
import { serveHTTP } from './custom-server';

serveHTTP(addonInterface, { port: +(process.env.PORT ?? 1337) });
