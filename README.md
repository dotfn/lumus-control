# Lumus Control 💡

<p>
  <img src="https://img.shields.io/badge/Tauri-v2.x-0066FF?logo=tauri&logoColor=white">
  <img src="https://img.shields.io/badge/Rust-1.77%2B-black?logo=rust&logoColor=white">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white">
  <img src="https://img.shields.io/badge/Zustand-5.x-black">
  <img src="https://img.shields.io/badge/UDP_Port-38899-0066FF">
  <img src="https://img.shields.io/github/actions/workflow/status/dotfn/lumus-control/ci.yml?label=CI&logo=github">
</p>

Native desktop application to discover and control smart light bulbs on your local network. No cloud, no middlemen — real-time direct communication via **UDP**.

Available for **macOS** (Apple Silicon) and **Windows** (x86_64).

---

## Features

- **Automatic discovery** of smart bulbs on the local network via UDP broadcast
- **Full control**: power on/off, brightness, color temperature, and RGB
- **Rooms & Groups** — Group your bulbs by room (e.g., *Living Room*, *Bedroom*) to control them all together in parallel with a single click
- **Dynamic scenes** — access all scene modes supported by the protocol
- **Circadian rhythm** — automatically adjusts color temperature and brightness throughout the day
- **Sleep timer** with progressive brightness fade-out until power off
- **Light/Dark theme** synchronized with the native window
- **Bilingual UI** — full Spanish and English support across the app and web landing
- **Device aliases** — rename each bulb with a custom label
- **Device exclusion** — hide secondary lamps or bulbs from other rooms with a single click to keep your dashboard clean
- **Real-time status** — asynchronous polling every 5 seconds with online/offline indicators
- **Auto-updates** — automatic detection, download, and installation of updates via Tauri Updater
- **No internet required** — the app works completely offline

---

## Architecture

The project is split into two layers with strictly separated responsibilities and full cross-platform support.

```
lumus-control/
├── .github/workflows/
│   ├── ci.yml                    # Quality checks (typecheck + lint + Rust tests)
│   └── release.yml               # Parallel macOS & Windows builds and auto-release
├── src/                          # Frontend — React + Zustand
│   ├── features/
│   │   ├── devices/              # UDP discovery and device selection
│   │   ├── lighting/             # Light control (brightness, color, scenes)
│   │   ├── settings/             # Light/Dark theme & preferences
│   │   ├── timer/                # Sleep timer with fade
│   │   ├── layout/               # Native titlebar (Traffic Lights) and widgets
│   │   └── updater/              # Auto-update widget (Tauri Updater)
│   ├── services/
│   │   └── deviceService.ts      # IPC abstraction — single entry point to Tauri
│   └── types.ts
│
└── src-tauri/                    # Backend — Rust (Tauri v2)
    ├── tauri.conf.json           # Cross-platform base configuration
    ├── tauri.macos.conf.json     # macOS-specific configuration (overlay, titlebar)
    ├── tauri.windows.conf.json   # Windows-specific configuration (native decorations)
    └── src/
        ├── main.rs               # Application entry point
        ├── lib.rs                # Orchestrator: state, on_window_event, plugins, and handlers
        ├── commands.rs           # IPC handlers (#[tauri::command])
        ├── network.rs            # Async UDP with tokio::net
        ├── config.rs             # Persistence with atomic writes
        ├── state.rs              # ConfigState, ActiveDeviceState, ShutdownSignal
        ├── monitor.rs            # Async polling (tokio::spawn)
        ├── models.rs             # Shared data structures
        └── errors.rs             # Centralized AppError
```

### Cross-Platform Support (Tauri v2)

- **Split configuration**: Native config merging (`tauri.conf.json` base + platform-specific `tauri.macos.conf.json` / `tauri.windows.conf.json`) to achieve a polished native look and feel on each operating system without code conditionals.
- **Digital signing & installers**: Automatic generation of ad-hoc signed `.dmg` bundles for macOS Apple Silicon and NSIS executable installers (`.exe`) for Windows.
- **Integrated auto-updater**: The Rust backend loads `tauri-plugin-updater`, allowing clients to receive and apply automatic updates directly from GitHub Releases.

### Rust Backend

- **Async UDP**: `tokio::net::UdpSocket` with non-blocking timeouts — the UI never freezes waiting for network responses
- **Granular Tauri state**: three independent state containers (`ConfigState`, `ActiveDeviceState`, `ShutdownSignal`) instead of a single monolith
- **Cached reads**: `get_preferences` and `get_device_names` read from the in-memory `Mutex<AppConfig>` without touching disk
- **Atomic writes**: `config.json` is written via `tmp → sync_all() → rename`, ensuring the file is never corrupted by a forced shutdown
- **Async monitor**: polling runs as a Tokio task (`tokio::spawn`) with `tokio::time::sleep`, never blocking OS threads
- **Graceful shutdown**: `on_window_event(CloseRequested)` triggers `ShutdownSignal(AtomicBool)` so the monitor exits on its next iteration
- **UDP origin validation**: responses from IPs other than the queried device are discarded to prevent stray packets on the local network

### React Frontend

- **Domain-scoped Zustand stores**: `useDeviceStore`, `useLightingStore`, `useTimerStore`, `useSettingsStore` (defined locally inside each feature)
- **Service layer** (`deviceService.ts`): stores do not interact with Tauri directly
- **Optimistic updates with rollback**: the UI responds immediately; if the UDP command fails, state rolls back to the previous value
- **Local group persistence**: Rooms (`groups`) and their IP associations are saved and loaded locally from `localStorage` (`device_groups`), keeping group logic decoupled from the Tauri backend
- **Parallel multicast control**: When a room is selected, the lighting store dispatches UDP control requests in parallel to all group IPs using `Promise.allSettled`, ensuring resilience and preventing stalls if a bulb is offline
- **Custom hooks** for timing and update side-effects: `useLightEvents`, `useSleepTimerCountdown`, `useAppUpdater`

---

## UDP Protocol

Bulbs listen on port **38899**. The app implements the protocol directly in Rust:

```json
// Discovery (broadcast to 255.255.255.255:38899)
{"method": "getPilot", "params": {}}

// Direct control (unicast to device IP)
{"method": "setPilot", "params": {"state": true, "dimming": 80, "temp": 3000}}
{"method": "setPilot", "params": {"r": 255, "g": 100, "b": 0}}
{"method": "setPilot", "params": {"sceneId": 14}}
```

---

## Installation

### Homebrew (macOS)

```bash
brew install --cask dotfn/tap/lumus-control
```

### Manual Download

Download the installer for your platform from the [**Releases**](../../releases) page.

| Platform | File | Method / Installer |
|---|---|---|
| macOS (Apple Silicon) | `Lumus.Control_<version>_aarch64.dmg` | DMG (drag to Applications) |
| Windows (x86_64) | `Lumus.Control_<version>_x64-setup.exe` | Executable installer (NSIS) |

> [!NOTE]
> On macOS, if you install the DMG manually by dragging the app to your Applications folder, you may need to clear the quarantine attribute in Terminal:
> ```bash
> xattr -rd com.apple.quarantine "/Applications/Lumus Control.app"
> ```

### Local Build

```bash
pnpm install
pnpm tauri build
```
*(Locally compiled installers will be generated under `src-tauri/target/release/bundle/` for your platform).*

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Rust](https://rustup.rs/) 1.77+ (via `rustup`)
- macOS: Xcode Command Line Tools
- Windows: Visual Studio C++ Build Tools
- Linux: `libwebkit2gtk-4.1-dev`, `pkg-config`, `libssl-dev`

### Commands

```bash
# Install dependencies
pnpm install

# Start full development environment (Tauri + Frontend)
pnpm dev

# Start only the Frontend dev server (Vite)
pnpm dev:frontend

# Run all local quality checks
pnpm verify

# TypeScript type checking
pnpm typecheck

# TypeScript/React linter (zero warnings allowed)
pnpm lint

# Format Rust code
pnpm rust:format

# Run Clippy on Rust code
pnpm rust:clippy

# Run Rust unit tests (Backend)
pnpm rust:test

# Build the application for production locally
pnpm tauri build
```

### Backend Tests

```bash
pnpm rust:test
# Or directly via Cargo:
cargo test --manifest-path src-tauri/Cargo.toml
```

The backend includes **12 unit tests** in `config.rs` and `network.rs` covering atomic writes, corrupted file recovery, configuration roundtrips, and IP validation.

---

## CI / CD

The repository uses two GitHub Actions workflows:

* **CI (`.github/workflows/ci.yml`)**: Two parallel jobs — frontend (`pnpm typecheck`, `pnpm lint`) and Rust (`cargo fmt --check`, `cargo clippy`, `cargo test`) — on every push to `main` and development branches (`develop`, `feature/*`, `fix/*`), and on PRs targeting `develop` or `main`.
* **Release (`.github/workflows/release.yml`)**: Creates a draft release with auto-generated notes, builds and signs in parallel for macOS (Apple Silicon) and Windows (x86_64) using [`tauri-action`](https://github.com/tauri-apps/tauri-action) (which also publishes `latest.json` for the auto-updater), publishes the release, and updates the cask in [`dotfn/homebrew-tap`](https://github.com/dotfn/homebrew-tap) (for production tags without a pre-release suffix).

---

## License

MIT
