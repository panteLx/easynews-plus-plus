# Easynews++

<div align="center">
  
![Easynews++ Logo](https://img.shields.io/badge/Easynews%2B%2B-Addon-blue?style=for-the-badge)
[![Buy Me A Coffee](https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-orange?style=for-the-badge)](https://buymeacoffee.com/pantel)

</div>

> [!NOTE]  
> This addon is based on the Easynews+ addon which is great too. It uses a different auth implementation than other Easynews addons to function as expected on multiple platforms like Stremio, Omni & Vidi and has additional enhancements and features.

## 🔗 Quick Links

**Public instance:** [https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure](https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure) or [https://en.pantelx.com](https://en.pantelx.com)

**Self-hosting:** [Check out the Self-Hosting Guide](#self-hosting)

**Support the project:** [Buy Me A Coffee](https://buymeacoffee.com/pantel)

---

## ✨ Enhancements/Features compared to the Easynews(+) addons

### 🚀 Performance Improvements

- Multi-level caching system to reduce API calls
- In-memory result caching with TTL (Time-To-Live) control
- Stream count limitation to optimize player performance
- Efficient duplicate detection using hash tracking

### 🔍 Search/Streaming Improvements

- Smart title matching with percentage-based similarity for multi-word titles
- Support for various naming conventions and special character handling
- Enhanced content filtering (removes samples, broken files, etc.)
- Fallback search strategies for difficult-to-find content
- Smart quality sorting prioritizing 4K/UHD → 1080p → 720p
- File size-based sorting when resolutions match
- Better quality detection from file names with multiple resolution and format patterns
- Subtitle fetching should be more reliable
- Configurable strict title matching to filter out results that don't exactly match the movie or series title (default: off)

### 🌐 Custom Title Feature

I've recently improved the custom title functionality to better handle alternative titles and translations. The addon now properly combines (Example: Original - Mufasa: The Lion King; German: Mufasa: Der Koenig der Loewen):

- Original titles
- Direct custom titles from the custom-titles.json file
- Alternative titles from metadata
- Additional titles from partial matches

This enhancement is currently only available in the self-hosted version. If you'd like to see your custom titles added to the public version, please create a new issue.

### 🔄 Compatibility

- This addon does not use basic auth headers to stream media because it isn't supported on multiple platforms like Omni and Vidi.

---

## 🛠️ Self-Hosting

To get results in a fast and private manner, you may wish to self-host the addon. This is easy to do, and only requires a few steps. We support multiple ways of self-hosting:

> Optional: Add some custom/translated titles to custom-titles.json

### 🐳 Docker

You can use the provided Dockerfile to build and run the addon in a container. To do this, you need to have [Docker](https://docs.docker.com/get-docker/) installed on your system.

#### Build the Docker image:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ docker build -t easynews-plus-plus .
$ docker run -p 8080:1337 easynews-plus-plus
```

Navigate to `http://localhost:8080/` in your browser to verify that the addon is running.

### 📦 From source

If you'd rather run directly from source, you can do so with [Node.js](https://nodejs.org/en/download/prebuilt-installer/current). Make sure you have NPM 7 or higher installed on your system. We also recommend Node 20 or higher, though older versions might still work.

#### To build the addon from source, run:

```bash
# version should be >= 20
$ node -v
# version must be >= 7
$ npm -v
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
# starts the addon in production mode
$ npm run start:addon
```

Navigate to `http://localhost:1337/` in your browser to verify that the addon is running. You can set the `PORT` environment variable to change the listener port. For example, to run the addon on port `8080`:

```bash
$ PORT=8080 npm run start:addon
```

### ☁️ Deployment to external services

The addon can be deployed as a [Cloudflare worker](https://workers.cloudflare.com/), which is a serverless platform that runs your code in data centers around the world. It's incredibly fast and reliable, and you can deploy the addon for free.

#### To deploy the addon to Cloudflare, run:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run deploy:cf
# You can also preview your changes first if enabled on the Cloudflare worker dashboard
$ npm run preview:cf
```

You will see the Cloudflare URL in the terminal.

#### To deploy the addon to beamup, run:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run deploy:beamup
```

You will see the Beamup URL in the terminal.

---

### 💻 Development

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
# cloudflare worker deployment in development mode
$ npm run start:cf:dev
```

### 📝 Release on Github

To release a new version of the addon and commit it to Github:

```bash
$ npm run version:<patch|minor|major>
```

Finally, create a new release targeting the tag you just pushed on GitHub and include some release notes.

---

## ❓ FAQ

### What is Easynews?

Easynews is a premium Usenet provider that offers a web-based Usenet browser. It allows you to search, preview, and download files from Usenet newsgroups without the need for a newsreader. Easynews is known for its user-friendly interface and fast download speeds. The Easynews addon for multiple platforms provides access to Easynews content directly within platforms like Stremio, Omni or Vidi. You can search for and stream movies, TV shows, and other media files from Easynews using the addon. In a way it can serve as an alternative to debrid services (Real-Debrid, Premiumize, AllDebrid etc.). An Easynews account with an active subscription is required to use the addon.

### Why can't I find show X or movie Y?

Golden rule of thumb: look it up on [Easynews web search](https://members.easynews.com/). If you can't find it there, or it's only returning bad quality results (duration < 5 minutes, marked as spam, no video etc.), you won't find it using the addon either.

If you do find your content through the web search however, it may be because the addon can't match the resulting titles returned by the Easynews API names with the metadata from your media player, or it's in the wrong format. You can selfhost your own Easynews++ addon and add a translated/custom title for that movie.

A couple of examples where the addon won't be able to find results without adding translated/custom titles:

- The anime series `death note` doesn't follow the conventional season number + episode number standard. The show has titles like `Death Note 02` instead of the expected format `Death Note S01E02`.
- For the movie `Mission: Impossible - Dead Reckoning Part One (2023)` the metadata returns only `dead reckoning` for this title, making it impossible (pun not intended) to match. Movie titles are strictly matched by their full title.
- The real title of the movie `WALL-E (2008)` contains an annoying 'dot' special character: `WALL·E`. This should be converted to a `-` character, but the addon converts that character already to a space because this sanitization is needed for 99% of the other titles. No results for `WALL E` will be returned (actually, no results for `WALL-E` either, but it still serves as a good example).

Create a new issue if you're unsuccessful with the translated/custom title.

### Why am I limited to 50 streams when searching for content?

The addon limits results to the top 50 highest quality streams to prevent overwhelming the media player and to improve performance. These streams are intelligently sorted by quality (4K/UHD prioritized over 1080p, etc.) and by file size within the same resolution to ensure you're seeing the best options first.

## 💖 Support the Project

If you find this addon useful and would like to support its development, you can buy me a coffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow.svg?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/pantel)

Your support helps keep this project maintained and improved with new features!

## 📄 License

[MIT](./LICENSE)

> [!NOTE]  
> I am not affiliated with Easynews in any way. This project is a fan-made addon that provides access to Easynews content. You need an active Easynews subscription to use this addon.
