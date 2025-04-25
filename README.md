# Easynews++

<div align="center">
  
![Easynews++ Logo](https://img.shields.io/badge/Easynews%2B%2B-Addon-blue?style=for-the-badge)
[![Discord](https://img.shields.io/badge/Discord-Join%20our%20Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/Ma4SnagqwE)
[![Buy Me A Coffee](https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-orange?style=for-the-badge)](https://buymeacoffee.com/pantel)

</div>

> [!NOTE]  
> Easynews++ is an open-source addon that enhances the Easynews experience with superior performance, advanced search capabilities, and intelligent stream selection. It features custom title support, multi-platform compatibility, and self-hosting options. Built upon the foundation of Easynews+, it implements a different authentication approach to ensure seamless operation across various platforms including Stremio, Omni, Vidi and Fusion.

## 🔗 Quick Links

**Public Instance:** [https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure](https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure) or [https://en.pantelx.com](https://en.pantelx.com)

**Discord Server:** [Join our Discord](https://discord.gg/Ma4SnagqwE) for community discussions and support

**Self-Hosting:** [Check out the Self-Hosting Guide](#%EF%B8%8F-self-hosting-guide)

**Support the Project:** [Buy Me A Coffee](https://buymeacoffee.com/pantel)

---

## ✨ Key Features

### 🚀 Performance Optimizations

- Multi-level caching system to minimize API calls
- In-memory result caching with configurable TTL (Time-To-Live)
- Intelligent stream count limitation for optimal player performance
- Advanced duplicate detection using hash tracking

### 🔍 Enhanced Search & Streaming

- Sophisticated title matching with percentage-based similarity for multi-word titles
- Custom title support for enhanced content discovery
- Comprehensive support for various naming conventions and special characters
- Advanced content filtering (removes samples, broken files, etc.)
- Multiple fallback search strategies for challenging content
- Smart quality prioritization (4K/UHD → 1080p → 720p)
- File size-based sorting within the same resolution
- Language filtering with preferred audio language prioritization
- Improved quality detection from complex file names
- Enhanced subtitle fetching reliability
- Configurable strict title matching (disabled by default)

### 🌐 Custom Title Management

- Intelligent handling of alternative titles and custom titles
- Support for original titles, custom titles and metadata alternatives
- Partial matching for related title variants
- Custom title addition via custom-titles.json file

> [!NOTE]  
> To add custom titles to the public instance, please create a new issue with your suggestions.

### 🔧 Advanced Configuration Options & Language Filtering

- Quality filtering to display only streams with specific resolutions
- Customizable maximum results per quality to balance stream variety and performance
- File size limitation to filter out excessively large files

- Preferred audio language selection from multiple supported options
  - Automatic prioritization of content in your preferred language
  - Clear language labeling in stream descriptions
  - Visual indicators for preferred language content (⭐)

> [!NOTE]  
> If you would like additional languages added to the public instance, please create a new issue with your request.

### 🌐 Multi-Language UI Support

- Full UI translation support for 13 languages:
  - English (default)
  - German (Deutsch)
  - Spanish (Español)
  - French (Français)
  - Italian (Italiano)
  - Japanese (日本語)
  - Portuguese (Português)
  - Russian (Русский)
  - Korean (한국어)
  - Chinese (中文)
  - Dutch (Nederlands)
  - Romanian (Română)
  - Bulgarian (Български)
- Seamless language switching without losing configuration
- Translated form fields, options, and descriptions
- Consistent UI experience across all supported languages

### 🔄 Platform Compatibility

- Seamless operation across multiple streaming platforms
- Optimized for Stremio, Omni, Vidi and Fusion compatibility
- Authentication implementation that works without basic auth headers for media streaming

#### ✅ **Fully Supported & Tested:**

- tvOS (Omni & Vidi)
- iOS (Fusion)
- Stremio
  - Windows 4.x
  - Windows 5.x (beta)
  - Linux
  - Web (Browser)
  - Android Mobile (beta)

#### ⚠️ **Should Work (Untested):**

- Stremio:
  - macOS
  - Android TV
  - Android Mobile (stable)
  - Steam Deck
  - Raspberry Pi
  - Sony TV
  - Philips TV

#### ❌ **Currently Not Supported:**

- Stremio:
  - webOS (confirmed not working)
  - iOS
  - Samsung TV

> [!NOTE]  
> We are actively working on expanding platform support. If you encounter any issues with a specific platform, please report them in our [Discord community](https://discord.gg/Ma4SnagqwE) or create a new issue on GitHub.

---

## 🛠️ Self-Hosting Guide

For optimal performance and privacy, you can self-host the addon. We offer multiple deployment options:

> [!TIP]  
> Consider adding custom/translated titles to custom-titles.json for enhanced functionality

### 🐳 Docker Deployment

Deploy using Docker for a containerized solution:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ docker build -t easynews-plus-plus .
$ docker run -p 8080:1337 easynews-plus-plus
```

Alternatively, you can use the pre-built Docker image from GitHub Container Registry:

```bash
$ docker pull ghcr.io/pantelx/easynews-plus-plus:latest
$ docker run -p 8080:1337 ghcr.io/pantelx/easynews-plus-plus:latest
```

Verify the installation by visiting `http://localhost:8080/` in your browser.

> [!NOTE]  
> The Docker image is automatically built and published to GitHub Container Registry (ghcr.io) for each push to the main branch and for each new version tag. You can find all available tags on the [GitHub Packages page](https://github.com/pantelx/easynews-plus-plus/pkgs/container/easynews-plus-plus).

### 📦 Source Installation

For direct source installation, ensure you have:

- Node.js 20 or higher
- NPM 7 or higher

```bash
# Verify Node.js version
$ node -v
# Verify NPM version
$ npm -v
# Clone and install
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
# Start in production mode
$ npm run start
```

Access the addon at `http://localhost:1337/`. Customize the port using the `PORT` environment variable:

```bash
$ PORT=8080 npm run start
```

### ☁️ Cloud Deployment

#### Cloudflare Worker

Deploy to Cloudflare's global edge network for optimal performance:

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run deploy:cf
# Preview changes (if enabled in Cloudflare dashboard)
$ npm run preview:cf
```

#### Beamup Deployment

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git && cd easynews-plus-plus
$ npm i
$ npm run deploy:beamup
```

---

### 💻 Development Setup

```bash
$ git clone https://github.com/pantelx/easynews-plus-plus.git
$ cd easynews-plus-plus
$ npm i
```

Development modes:

```bash
# Addon development
$ npm run dev
# Cloudflare worker development
$ npm run dev:cf
```

### 📝 Release Process

Bump the version tag, release and publish to npm:

```bash
$ npm run release
```

> [!NOTE]  
> Enable workflow "docker-publish" to automatically build and publish the docker image to GitHub Container Registry. Enable workflow "release" to automatically create a new version tag and release on GitHub.

### 📦 Workflows

- `pr.yml`: Lint PR titles
- `test.yml`: Test if the addon works as expected
- `release.yml`: Release a new version to GitHub
- `docker-publish.yml`: Build and publish the docker image to GitHub Container Registry

---

## ❓ Frequently Asked Questions

### What is Easynews?

Easynews is a premium Usenet provider offering a web-based Usenet browser. It enables users to search, preview, and download files from Usenet newsgroups without requiring a newsreader. Known for its user-friendly interface and fast download speeds, Easynews serves as an alternative to debrid services (Real-Debrid, Premiumize, AllDebrid, etc.). An active Easynews subscription is required to use this addon.

### How does the caching system work?

The addon implements a multi-level caching strategy to improve performance:

1. In-memory request caching reduces repeated API calls
2. Configurable Time-To-Live (TTL) ensures data freshness
3. Results are cached based on search parameters and user settings
4. Cached results are automatically invalidated after the TTL expires

This significantly reduces API usage and improves response times for frequently accessed content.

### How does title matching work?

The title matching system uses several advanced techniques:

1. Percentage-based similarity for multi-word titles
2. Support for various naming conventions (e.g., "The Movie" vs "Movie, The")
3. Special character handling (spaces, punctuation, accents)
4. Configurable strict matching option for exact results

When strict matching is enabled, only exact title matches are returned. When disabled (default), the addon uses smart matching to find related content.

### How does the custom title system work?

The custom title system helps find content with alternative titles or translations:

1. Original titles are combined with custom translations
2. Additional titles from metadata are incorporated
3. Partial matching enables finding related content
4. Self-hosted users can add custom titles via custom-titles.json

> [!NOTE]  
> To add custom titles to the public instance, please create a new issue with your suggestions.

### Why can't I find specific content?

First, verify the content exists on [Easynews web search](https://members.easynews.com/). If unavailable or returning poor quality results (duration < 5 minutes, marked as spam, no video), the addon won't find it either.

If the content exists on Easynews but the addon can't find it, this might be due to:

- Title matching issues between Easynews API and media player metadata
- Unconventional title formats
- Special character handling

Examples of challenging cases:

- Anime series like `death note` using non-standard episode numbering
- Movies with partial metadata matches (e.g., `Mission: Impossible - Dead Reckoning Part One`)
- Special character handling (e.g., `WALL·E` vs `WALL-E`)

For these cases, consider self-hosting and adding custom titles or using the public instance and create a new issue with the custom titles you want to get supported.

### How does the quality prioritization work?

The addon automatically prioritizes streams based on several factors:

1. Resolution quality (4K/UHD → 1080p → 720p → 480p)
2. File size within the same resolution (larger files typically offer better quality)
3. Comparison of GB vs MB files (GB files are prioritized)
4. Numerical size comparison within the same unit (e.g., 2GB over 1GB)

This system ensures you get the highest quality content available without manual filtering.

### What sorting options are available?

The addon offers multiple sorting methods that can be selected in the configuration:

1. **Quality First** (default): Prioritizes by resolution quality, then preferred language, then file size.
2. **Language First**: Prioritizes content with your preferred language, then sorts by quality and size.
3. **Size First**: Sorts primarily by file size (largest first), then quality, then language.
4. **Date First**: Prioritizes newest content first, with secondary sorting by quality and language.
5. **Relevance First**: Sorts by API relevance score, which typically finds the best matches to your search terms.

You can select your preferred sorting method in the addon configuration page. For optimal language prioritization, the "Language First" option works best when you've also set your preferred language.

### Why is there a 50-stream limit?

The addon limits results to the top 50 highest quality streams to:

1. Prevent media player overload
2. Optimize performance and response times
3. Focus on quality over quantity
4. Streamline the user experience

After quality sorting, the top 50 streams will represent the best available options, making additional results unnecessary.

### How does the language filter work?

The language filter allows you to prioritize content in your preferred audio language:

1. Select your preferred language in the addon configuration
2. Streams containing your preferred language audio will be shown first
3. Other language streams will be displayed below
4. All streams display their audio language information in the description
5. Your preferred language will be marked with a star (⭐)

For maximum language prioritization effect, use the "Language First" sorting option in combination with your preferred language setting. This ensures content in your preferred language always appears at the top of results, regardless of quality or size.

This makes it easier to find content in languages you understand without removing other options.

If you need additional languages added to the public instance, please [create a new issue](https://github.com/pantelx/easynews-plus-plus/issues/new) with your request.

### How is platform compatibility ensured?

The addon achieves universal compatibility through:

1. Authentication implementation that works across all platforms
2. Direct media streaming without reliance on basic auth headers
3. Optimized response formats compatible with Stremio, Omni, Vidi and Fusion
4. Consistent stream URL structure that works uniformly across devices

This approach eliminates the platform-specific issues commonly found in other addons.

## 💖 Support the Project

Your support helps maintain and improve this project! Consider:

- [Buying me a coffee](https://buymeacoffee.com/pantel)
- Joining our [Discord community](https://discord.gg/Ma4SnagqwE) for support and updates
- Contributing on [GitHub](https://github.com/panteLx/easynews-plus-plus)

## 📄 License

[MIT](./LICENSE)

> [!NOTE]  
> This is an independent, fan-made addon for Easynews. An active Easynews subscription is required for use. We are not affiliated with Easynews.
