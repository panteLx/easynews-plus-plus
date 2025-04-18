# Easynews++

> [!NOTE]  
> I am not affiliated with Easynews in any way. This project is a fan-made addon for Stremio that provides access to Easynews content. You need an active Easynews subscription to use this addon.

> [!NOTE]  
> This fork is only usefull for Omni or Vidi users! There are no additional features! The only difference is the auth implementation.

Provides content from Easynews & includes a search catalog. This addon can also be [self-hosted](#self-hosting).

Public instance: [b89262c192b0-stremio-easynews-addon.baby-beamup.club](https://b89262c192b0-stremio-easynews-addon.baby-beamup.club/).

## FAQ

### What is Easynews?

Easynews is a premium Usenet provider that offers a web-based Usenet browser. It allows you to search, preview, and download files from Usenet newsgroups without the need for a newsreader. Easynews is known for its user-friendly interface and fast download speeds. The Easynews addon for Stremio provides access to Easynews content directly within the Stremio app. You can search for and stream movies, TV shows, and other media files from Easynews using the addon. In a way it can serve as an alternative to debrid services (Real-Debrid, Premiumize, AllDebrid etc.). An Easynews account with an active subscription is required to use the addon.

### Why not extend the existing Easynews+ addon?

The auth implementation on the existing Easynews+ addon is fine for streamio so there is no need to update that addon.
The only difference between both addons is the different auth implementation (No basic auth header auth). My fork is only usefull for Omni or Vidi instances because they didnt support basic auth headers (yet).

### Why not extend the existing Easynews addon?

Initially I wanted to simply add the search catalog to the existing Easynews addon but when the developer didn't respond to my query, and the code wasn't open source for me to add it myself, I decided to create my own addon.

The goal of this addon is to provide more features, better performance, self-host-ability and an open-source codebase for anyone to contribute to.

### Why can't I find show X or movie Y?

Golden rule of thumb: look it up on [Easynews web search](https://members.easynews.com/). If you can't find it there, or it's only returning bad quality results (duration < 5 minutes, marked as spam, no video etc.), you won't find it using the addon either.

If you do find your content through the web search however, it may be because the addon can't match the resulting titles returned by the Easynews API names with the metadata from Stremio, or it's in the wrong format.

A couple of examples where the addon won't be able to find results:

- The anime series `death note` doesn't follow the conventional season number + episode number standard. The show has titles like `Death Note 02` instead of the expected format `Death Note S01E02`.
- For the movie `Mission: Impossible - Dead Reckoning Part One (2023)` Stremio's metadata returns only `dead reckoning` for this title, making it impossible (pun not intended) to match. Movie titles are strictly matched by their full title.
- The real title of the movie `WALL-E (2008)` contains an annoying 'dot' special character: `WALL·E`. This should be converted to a `-` character, but the addon converts that character already to a space because this sanitization is needed for 99% of the other titles. No results for `WALL E` will be returned (actually, no results for `WALL-E` either, but it still serves as a good example).

There are more oddly titled file names returned by EasyNews. The good news is they are a minority. The bad news is that addon can't possibly support all of these edge cases because that would slow down the search query exponentially and put more stress on both the addon's server and Easynews API, ultimately impacting the performance.

We try to match most shows, but for the remaining 10-20% of edge cases we currently require you to use the EN+ search catalog instead. Maybe this wil improve in the future. If you have any suggestions to improve this system, please [let us know](https://github.com/sleeyax/stremio-easynews-addon/discussions).

In any case, feel free to [open an issue on the EN+ repo](https://github.com/sleeyax/stremio-easynews-addon/issues/new?labels=missing+content&title=Missing+content+for+%27TITLE+SEASON+EPISODE+%27) if you think the addon should be able to find a specific show or movie. It helps us improve the addon.

## Self-hosting

To get results in a fast and private manner, you may wish to self-host the addon. This is easy to do, and only requires a few steps. We support multiple ways of self-hosting:

### Cloudflare workers

The addon can be deployed as a [Cloudflare worker](https://workers.cloudflare.com/), which is a serverless platform that runs your code in data centers around the world. It's incredibly fast and reliable, and you can deploy the addon for free.

Follow the [getting started guide](https://developers.cloudflare.com/workers/get-started/guide/) and then deploy the addon with the [wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/):

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run build
$ npm run deploy:cloudflare-worker
```

Navigate to the URL provided by Cloudflare to verify that the addon is running. It should look something like `https://easynews-plus-plus.yourname.workers.dev/`.

### Docker

You can use the provided Dockerfile to build and run the addon in a container. To do this, you need to have [Docker](https://docs.docker.com/get-docker/) installed on your system.

Build the image yourself:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ docker build -t easynews-plus-plus .
$ docker run -p 8080:1337 easynews-plus-plus
```

Navigate to `http://localhost:8080/` in your browser to verify that the addon is running.

### From source

If you'd rather run directly from source, you can do so with [Node.js](https://nodejs.org/en/download/prebuilt-installer/current). Make sure you have NPM 7 or higher installed on your system. We also recommend Node 20 or higher, though older versions might still work.

```bash
# version should be >= 20
$ node -v
# version must be >= 7
$ npm -v
$ git clone https://github.com/pantelx-easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run build
# starts the addon in production mode
$ npm run start:addon
```

Navigate to `http://localhost:1337/` in your browser to verify that the addon is running. You can set the `PORT` environment variable to change the listener port. For example, to run the addon on port `8080`:

```bash
$ PORT=8080 npm run start:addon
```

---

Looking for additional hosting options? Let us know which platform(s) you'd like to see supported by [creating an issue on the EN+ repo](https://github.com/sleeyax/stremio-easynews-addon/issues/new).

## Contribute

Notes for contributors.

### Development

Clone the repository and install the dependencies:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git
$ cd easynews-plus-plus
$ npm i
```

Run the easynews addon in development mode:

```bash
# addon
$ npm run start:addon:dev
# cloudflare worker
$ npm run start:cloudflare-worker:dev
```

### Production

To deploy the addon to beamup, run:

```bash
$ npm run deploy:beamup
```

To release a new version of the addon:

```bash
$ npm version <major|minor|patch>
$ git push --follow-tags
```

Finally, create a new release targeting the tag you just pushed on GitHub and include some release notes.

## License

[MIT](./LICENSE)
