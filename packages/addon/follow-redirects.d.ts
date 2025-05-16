declare module 'follow-redirects' {
  /**
   * A drop-in replacement for Node’s http/https with built-in redirect support.
   * The final `responseUrl` is exposed on the IncomingMessage.
   */
  export const http: {
    // Three-arg overload: (url, options, callback) for request
    request(
      url: string | import('url').URL,
      options: import('http').RequestOptions & { maxRedirects?: number },
      callback?: (res: import('http').IncomingMessage & { responseUrl?: string }) => void
    ): import('http').ClientRequest;

    // Two-arg overload: (url, options, callback) for request
    request(
      options: import('http').RequestOptions & { maxRedirects?: number },
      callback?: (res: import('http').IncomingMessage & { responseUrl?: string }) => void
    ): import('http').ClientRequest;

    // Three-arg overload: (url, options, callback) for get
    get(
      url: string | import('url').URL,
      options: import('http').RequestOptions & { maxRedirects?: number },
      callback?: (res: import('http').IncomingMessage & { responseUrl?: string }) => void
    ): import('http').ClientRequest;

    // Two-arg overload: (url, options, callback) for get
    get(
      options: import('http').RequestOptions & { maxRedirects?: number },
      callback?: (res: import('http').IncomingMessage & { responseUrl?: string }) => void
    ): import('http').ClientRequest;
  };

  // Same API over HTTPS
  export const https: typeof http;
}
