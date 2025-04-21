# Easynews++

<div align="center">
  
![Easynews++ Logo](https://img.shields.io/badge/Easynews%2B%2B-Addon-blue?style=for-the-badge)
[![Discord](https://img.shields.io/badge/Discord-Join%20our%20Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/Ma4SnagqwE)
[![Buy Me A Coffee](https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-orange?style=for-the-badge)](https://buymeacoffee.com/pantel)

</div>

> [!NOTE]  
> Easynews++ is an open-source addon that enhances the Easynews experience with superior performance, advanced search capabilities, and intelligent stream selection. It features custom title support, multi-platform compatibility, and self-hosting options. Built upon the foundation of Easynews+, it implements a different authentication approach to ensure seamless operation across various platforms including Stremio, Omni, Vidi and Fusion.

## 🔗 Quick Links

**Public instance:** [https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure](https://easynews-cloudflare-worker.jqrw92fchz.workers.dev/configure) or [https://en.pantelx.com](https://en.pantelx.com)

**Discord Server:** [Join our Discord](https://discord.gg/Ma4SnagqwE) for community discussions and support

**Self-hosting:** [Check out the Self-Hosting Guide](#%EF%B8%8F-self-hosting-guide)

**Support the project:** [Buy Me A Coffee](https://buymeacoffee.com/pantel)

---

## ✨ Key Features

### 🚀 Performance Optimizations

- Multi-level caching system to minimize API calls
- In-memory result caching with configurable TTL (Time-To-Live)
- Intelligent stream count limitation for optimal player performance
- Advanced duplicate detection using hash tracking

### 🔍 Enhanced Search & Streaming

- Sophisticated title matching with percentage-based similarity for multi-word titles
- Comprehensive support for various naming conventions and special characters
- Advanced content filtering (removes samples, broken files, etc.)
- Multiple fallback search strategies for challenging content
- Smart quality prioritization (4K/UHD → 1080p → 720p)
- File size-based sorting within the same resolution
- Improved quality detection from complex file names
- Enhanced subtitle fetching reliability
- Configurable strict title matching (disabled by default)

### 🌐 Custom Title Management

The custom title functionality has been significantly enhanced to better handle alternative titles and translations. The addon now intelligently combines:

- Original titles
- Custom titles from the custom-titles.json file
- Alternative titles from metadata
- Additional titles from partial matches

> [!NOTE]  
> This enhancement is currently exclusive to the self-hosted version. To add additional custom titles to the public version, please create a new issue with the custom titles you want to get supported.

### 🔄 Platform Compatibility

- Utilizes a different authentication implementation that works seamlessly across multiple platforms
- Specifically optimized for Omni, Vidi and Fusion compatibility
- No reliance on basic auth headers for media streaming

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

Verify the installation by visiting `http://localhost:8080/` in your browser.

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
$ npm run start:addon
```

Access the addon at `http://localhost:1337/`. Customize the port using the `PORT` environment variable:

```bash
$ PORT=8080 npm run start:addon
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
$ npm run start:addon:dev
# Cloudflare worker development
$ npm run start:cf:dev
```

### 📝 Release Process

Create a new version tag and release:

```bash
$ npm run release
```

> [!NOTE]  
> This will only create a new version tag and release on GitHub if the script found fix or feat commits since the latest tag.

---

## ❓ Frequently Asked Questions

### What is Easynews?

Easynews is a premium Usenet provider offering a web-based Usenet browser. It enables users to search, preview, and download files from Usenet newsgroups without requiring a newsreader. Known for its user-friendly interface and fast download speeds, Easynews serves as an alternative to debrid services (Real-Debrid, Premiumize, AllDebrid, etc.). An active Easynews subscription is required to use this addon.

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

### Why is there a 50-stream limit?

The addon limits results to the top 50 highest quality streams to:

- Prevent media player overload
- Optimize performance
- Ensure quality-focused results (prioritizing 4K/UHD → 1080p → 720p)
- Sort by file size within the same resolution

## 💖 Support the Project

Your support helps maintain and improve this project! Consider:

- [Buying me a coffee](https://buymeacoffee.com/pantel)
- Joining our [Discord community](https://discord.gg/Ma4SnagqwE) for support and updates
- Contributing on [GitHub](https://github.com/panteLx/easynews-plus-plus)

## 📄 License

[MIT](./LICENSE)

> [!NOTE]  
> This is an independent, fan-made addon for Easynews. An active Easynews subscription is required for use. We are not affiliated with Easynews.
