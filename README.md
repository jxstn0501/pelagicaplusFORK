# Palcia

Palcia is a modern, fast and configurable web frontend for [Jellyfin](https://jellyfin.org) built with React and Go. It started as a fork of [Pelagica](https://github.com/KartoffelChipss/pelagica) and has since grown into its own project with a redesigned player experience, a smarter home screen and many quality-of-life improvements.

![Home](./.github/assets/home.webp)

## What's new in Palcia

These features were built on top of the original Pelagica:

### 🎬 Player

- **Redesigned pause screen** — pausing shows a cinematic full-screen overlay with the title's backdrop artwork, logo, year, runtime, synopsis and a live progress bar ("72% watched · Ends at 13:44").
- **Selectable video quality** — manually pick the streaming quality/bitrate directly in the player, or leave it on auto.
- **Sleep timer** — let playback stop automatically after 30–120 minutes.
- **Next episode countdown overlay** — seamlessly continue binge-watching.
- **Keyboard shortcut overlay** — see all available player shortcuts at a glance.
- **Stability fixes** — no more infinite loading after switching quality or audio tracks.

### 🏠 Home screen

- **More recommended sections** — additional movie and series recommendations, including genre-based sections that work without any external services.
- **Smarter section ordering** — sections are arranged for a more engaging, streaming-service-like browsing flow.
- **Mood filter & shuffle play** — find something to watch based on your mood, or shuffle-play an entire series.
- **Progress bars and a random button** on cards for quicker decisions.
- **Cleaner poster cards** — distracting HD, CC, FSK and genre badges have been removed for a tidier look.

### 🔍 Search

- **Search preview & history** — instant previews while typing and quick access to your recent searches.

### ✨ Design & polish

- **UI polish everywhere** — shimmer loading skeletons, transparent navbar and dominant-color tinting for a more premium feel.
- **User ratings** — rate your media directly in the UI.

### 🌍 Localization

- **Complete German translation** — including all default section titles and UI terms.

### 🐳 Deployment

- **Automated multi-arch Docker builds** (amd64 + arm64) published to GitHub Container Registry on every push.

## Core features

Inherited from Pelagica and still fully supported:

- **Customizable Sections:** Tailor your homepage with sections like "Continue Watching", "Recently Added", or completely custom queries.
- **Media Bars:** Add custom media bars to feature specific content.
- **Search:** Quickly find media across your library from anywhere using `Cmd+K` / `Ctrl+K`.
- **Video & Music Player:** Integrated players for movies, TV shows, albums and playlists.
- **Responsive Design:** Works seamlessly on both desktop and mobile devices.
- **Theming:** Light and dark mode support as well as custom themes.

If you want to suggest new features or report bugs, please use the [GitHub Issues](https://github.com/jxstn0501/pelagicaplusFORK/issues) section.

### Integrated Services

- **Streamystats:** Get your streamystats recommendations directly on your home page.
- **kefintweaks Watchlist:** View and manage your kefintweaks watchlist within Palcia.

### Screenshots

<table>
  <tr>
    <td>
      <img src="./.github/assets/custom_sections.webp" />
    </td>
    <td>
      <img src="./.github/assets/series_page.webp" />
    </td>
  </tr>
  <tr>
    <td>
      <img src="./.github/assets/episode_page.webp" />
    </td>
    <td>
      <img src="./.github/assets/search.webp" />
    </td>
  </tr>
</table>

> Screenshots may include media artwork used for demonstration purposes only.

## Docker Installation

The easiest way to run Palcia is using Docker. This provides a production-ready setup with nginx web server.

### Quick Start

1. **Create a directory for Palcia:**

    ```bash
    mkdir -p palcia && cd palcia
    ```

2. **Run the container:**

    ```bash
    docker run -d \
      --name palcia \
      -p 8080:80 \
      -v "$(pwd)/config:/config" \
      --restart unless-stopped \
      ghcr.io/jxstn0501/pelagicaplusfork:latest
    ```

    Make sure to replace `$(pwd)/config` with the actual path where your config files should be located (e.g. `/mnt/user/appdata/palcia`)

3. **Access Palcia:**

    Open your browser to http://localhost:8080

### Container Management

```bash
# View logs
docker logs -f palcia

# Stop the container
docker stop palcia

# Start the container
docker start palcia

# Update to latest version
docker pull ghcr.io/jxstn0501/pelagicaplusfork:latest
docker stop palcia
docker rm palcia
# Then run the docker run command again from Quick Start
```

### Using Docker Compose

If you prefer using docker-compose, create a `docker-compose.yml` file:

```yaml
services:
    palcia:
        image: ghcr.io/jxstn0501/pelagicaplusfork:latest
        container_name: palcia
        ports:
            - '8080:80'
        volumes:
            - /path/to/your/config:/config
        restart: unless-stopped
```

Replace `/path/to/your/config` with the actual path where your config files should be located (e.g. `/mnt/user/appdata/palcia`)

Then run: `docker-compose up -d`

### Building from Source

If you want to build the Docker image from source instead of using prebuilt images:

```bash
# Clone the repository
git clone https://github.com/jxstn0501/pelagicaplusFORK.git
cd pelagicaplusFORK

# Build and start
docker-compose up -d --build
```

## Custom Themes

Palcia is compatible with Pelagica themes. You can find instructions on how to build and/or publish custom themes [here](https://github.com/KartoffelChipss/pelagica-themes#readme).

## Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| [Go](https://go.dev/dl/) | 1.25+ |
| [Node.js](https://nodejs.org/) | 24.16+ |
| [pnpm](https://pnpm.io/installation) | latest |
| [Task](https://taskfile.dev/installation/) | latest |

### Running the dev environment

Dependencies are installed automatically on first run (and whenever `package.json`, `pnpm-lock.yaml`, `go.mod`, or `go.sum` change).

```bash
task dev
```

This starts both the frontend (http://localhost:3000) and backend in parallel.

You can also run them individually:

```bash
task frontend   # Vite dev server only
task backend    # Go backend only
```

To see all available tasks:

```bash
task --list
```

## Contributing

Issues and pull requests are welcome.
Please open an issue to discuss larger changes before submitting a PR.

## What does that name mean?

"Palcia" is a play on "Pelagica", the project this fork is based on. "Pelagic" refers to living in the deep ocean — fitting for a Jellyfin frontend — and Palcia keeps that spirit in a shorter, friendlier name.

## Acknowledgements

Palcia is a fork of [Pelagica](https://github.com/KartoffelChipss/pelagica) by [KartoffelChipss](https://github.com/KartoffelChipss) — huge thanks for the excellent foundation.
Pelagica's design was inspired by the [finetic](https://github.com/AyaanZaveri/finetic) Jellyfin frontend; no code was used, it is an independent implementation.
