# Lumus Control 💡

<p>
  <img src="https://img.shields.io/badge/Tauri-v2.x-0066FF?logo=tauri&logoColor=white">
  <img src="https://img.shields.io/badge/Rust-1.77%2B-black?logo=rust&logoColor=white">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white">
  <img src="https://img.shields.io/badge/Zustand-5.x-black">
  <img src="https://img.shields.io/badge/UDP_Port-38899-0066FF">
  <img src="https://img.shields.io/github/actions/workflow/status/dotfn/lumus-control/ci.yml?label=CI&logo=github">
</p>

Aplicación de escritorio nativa para descubrir y controlar bombillas inteligentes en tu red local. Sin nube, sin intermediarios — comunicación directa mediante **UDP** en tiempo real.

Disponible para **macOS** (Apple Silicon) y **Windows** (x86_64).

---

## Funcionalidades

- **Descubrimiento automático** de bombillas en la red local vía broadcast UDP
- **Control completo**: encendido/apagado, brillo, temperatura de color y RGB
- **Habitaciones y Grupos** — Agrupá tus bombillas por estancias (ej. *Living*, *Dormitorio*) para controlarlas todas juntas en paralelo con un único clic
- **Escenas dinámicas** — acceso a todos los modos de escena del protocolo
- **Sleep timer** con fade progresivo del brillo hasta apagado
- **Tema claro/oscuro** sincronizado con la ventana nativa
- **Alias de dispositivos** — renombrá cada bombilla con un nombre personalizado
- **Exclusión de dispositivos** — ocultá lámparas secundarias o de otros cuartos con un clic para no saturar tu panel
- **Estado en tiempo real** — polling asíncrono cada 5 segundos con indicador online/offline
- **Actualización automática** — detección, descarga e instalación automática de actualizaciones vía Tauri Updater
- **Sin internet requerido** — la app funciona completamente offline

---

---

## Arquitectura

El proyecto está dividido en dos capas con responsabilidades estrictamente separadas y cuenta con soporte multiplataforma.

```
lumus-control/
├── .github/workflows/
│   ├── ci.yml                    # Quality checks (typecheck + lint + Rust tests)
│   └── release.yml               # Compilación paralela macOS & Windows y auto-release
├── src/                          # Frontend — React + Zustand
│   ├── features/
│   │   ├── devices/              # Descubrimiento UDP y selección de dispositivo
│   │   ├── lighting/             # Control de luz (brillo, color, escenas)
│   │   ├── settings/             # Tema claro/oscuro
│   │   ├── timer/                # Sleep timer con fade
│   │   ├── layout/               # Titlebar nativa (Traffic Lights) y widgets
│   │   └── updater/              # Widget de actualización automática (Tauri Updater)
│   ├── services/
│   │   └── deviceService.ts      # Abstracción IPC — única puerta de entrada a Tauri
│   └── types.ts
│
└── src-tauri/                    # Backend — Rust (Tauri v2)
    ├── tauri.conf.json           # Configuración base multiplataforma
    ├── tauri.macos.conf.json     # Configuración específica para macOS (overlay, titlebar)
    ├── tauri.windows.conf.json   # Configuración específica para Windows (decoraciones nativas)
    └── src/
        ├── main.rs               # Punto de entrada de la aplicación
        ├── lib.rs                # Orquestador: estados, on_window_event, plugins y handlers
        ├── commands.rs           # IPC handlers (#[tauri::command])
        ├── network.rs            # UDP asíncrono con tokio::net
        ├── config.rs             # Persistencia con escritura atómica
        ├── state.rs              # ConfigState, ActiveDeviceState, ShutdownSignal
        ├── monitor.rs            # Polling asíncrono (tokio::spawn)
        ├── models.rs             # Estructuras de datos compartidas
        └── errors.rs             # AppError centralizado
```

### Soporte Multiplataforma (Tauri v2)

- **Configuración dividida**: Uso de config merging nativo (`tauri.conf.json` base + `tauri.macos.conf.json` / `tauri.windows.conf.json` específicos) para lograr una estética nativa y pulida en cada sistema operativo sin condicionales en el código.
- **Firma digital e instaladores**: Generación automática de archivos `.dmg` firmados ad-hoc para macOS Apple Silicon y ejecutables de instalación (`.exe` NSIS) para Windows.
- **Auto-updater integrado**: El backend Rust carga el plugin `tauri-plugin-updater` permitiendo que el cliente reciba y aplique actualizaciones automáticas desde GitHub Releases.

### Backend Rust

- **UDP asíncrono**: `tokio::net::UdpSocket` con timeouts no bloqueantes — la UI nunca se congela esperando respuestas de red
- **Estado granular en Tauri**: tres estados independientes (`ConfigState`, `ActiveDeviceState`, `ShutdownSignal`) en lugar de un monolito
- **Lecturas desde caché**: `get_preferences` y `get_device_names` leen del `Mutex<AppConfig>` en memoria, sin tocar el disco
- **Escritura atómica**: `config.json` se escribe via `tmp → sync_all() → rename`, garantizando que el archivo nunca quede corrupto por un cierre forzado
- **Monitor asíncrono**: el polling corre como una tarea Tokio (`tokio::spawn`) con `tokio::time::sleep`, sin bloquear ningún hilo del OS
- **Apagado limpio**: `on_window_event(CloseRequested)` activa `ShutdownSignal(AtomicBool)`, el monitor sale en su próxima iteración
- **Validación de origen UDP**: las respuestas de IPs distintas al dispositivo consultado son descartadas para evitar paquetes parásitos en la red local

### Frontend React

- **Stores Zustand** por dominio: `useDeviceStore`, `useLightingStore`, `useTimerStore`, `useSettingsStore` (definidos localmente dentro de cada feature)
- **Capa de servicios** (`deviceService.ts`): los stores no conocen Tauri directamente
- **Actualizaciones optimistas con rollback**: la UI responde instantáneamente; si el comando UDP falla, el estado revierte al valor anterior
- **Persistencia local de grupos**: Las habitaciones (`groups`) y sus asociaciones de IPs se guardan y cargan localmente desde `localStorage` (`device_groups`), manteniendo la lógica de grupos desconectada del backend Tauri.
- **Control multicast paralelo**: Si se selecciona una habitación, el store de iluminación despacha las peticiones UDP de control en paralelo a todas las IPs del grupo usando `Promise.allSettled`, asegurando robustez y evitando bloqueos si alguna bombilla está desconectada.
- **Custom hooks** para efectos de tiempo y actualización: `useLightEvents`, `useSleepTimerCountdown`, `useAppUpdater`

---

## Protocolo UDP

Las bombillas escuchan en el puerto **38899**. La app implementa el protocolo directamente en Rust:

```json
// Descubrimiento (broadcast a 255.255.255.255:38899)
{"method": "getPilot", "params": {}}

// Control directo (unicast a la IP del dispositivo)
{"method": "setPilot", "params": {"state": true, "dimming": 80, "temp": 3000}}
{"method": "setPilot", "params": {"r": 255, "g": 100, "b": 0}}
{"method": "setPilot", "params": {"sceneId": 14}}
```

---

## Instalación

### One-liner (Recomendado para macOS Apple Silicon)

Copia y pega esto en la Terminal:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dotfn/lumus-control/main/install.sh)"
```

El script detecta automáticamente tu arquitectura (Apple Silicon), descarga el DMG correcto desde GitHub, lo instala en `/Applications` y remueve el atributo de cuarentena para evitar el bloqueo de Gatekeeper. *(Nota: Intel Macs ya no son soportados oficialmente).*

### Homebrew (macOS)

```bash
brew tap dotfn/tap
brew install --cask lumus-control
```

### Descarga manual

Descargá el instalador correspondiente desde la página de [**Releases**](../../releases).

| Plataforma | Archivo | Método / Instalador |
|---|---|---|
| macOS (Apple Silicon) | `Lumus.Control_<version>_aarch64.dmg` | DMG + `install.sh` o arrastrar a Aplicaciones |
| Windows (x86_64) | `Lumus.Control_<version>_x64-setup.exe` | Instalador ejecutable (NSIS) |

> [!NOTE]
> En macOS, si instalás manualmente el DMG arrastrándolo a la carpeta de Aplicaciones, es posible que debas remover el atributo de cuarentena ejecutando en tu terminal:
> ```bash
> xattr -rd com.apple.quarantine "/Applications/Lumus Control.app"
> ```

### Build local

```bash
pnpm install
pnpm tauri build
```
*(Los instaladores compilados localmente se generarán en la carpeta `src-tauri/target/release/bundle/` según la plataforma de tu sistema).*

---

## Desarrollo local

### Requisitos

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Rust](https://rustup.rs/) 1.77+ (vía `rustup`)
- macOS: Xcode Command Line Tools
- Windows: Build Tools para Visual Studio C++
- Linux: `libwebkit2gtk-4.1-dev`, `pkg-config`, `libssl-dev`

### Comandos

```bash
# Instalar dependencias
pnpm install

# Iniciar entorno de desarrollo completo (Tauri + Frontend)
pnpm dev

# Iniciar únicamente el servidor dev de Frontend (Vite)
pnpm dev:frontend

# Ejecutar todas las verificaciones locales (Quality Checks completos)
pnpm verify

# Verificación de tipos TypeScript
pnpm typecheck

# Linter de TypeScript/React (cero warnings permitidos)
pnpm lint

# Formatear código de Rust
pnpm rust:format

# Ejecutar clippy en Rust
pnpm rust:clippy

# Ejecutar tests unitarios de Rust (Backend)
pnpm rust:test

# Compilar la aplicación para producción localmente
pnpm tauri build
```

### Tests del backend

```bash
pnpm rust:test
# O directamente vía Cargo:
cargo test --manifest-path src-tauri/Cargo.toml
```

El backend tiene **12 tests unitarios** en `config.rs` y `network.rs` cubriendo escritura atómica, lectura con archivo corrupto, roundtrip de configuración y validación de IPs.

---

## CI / CD

El repositorio cuenta con dos workflows de GitHub Actions:

* **CI (`.github/workflows/ci.yml`)**: Dos jobs en paralelo — frontend (`pnpm typecheck`, `pnpm lint`) y Rust (`cargo fmt --check`, `cargo clippy`, `cargo test`) — en cada push a `main` y ramas de desarrollo (`develop`, `feature/*`, `fix/*`), y en PRs dirigidos a `develop` o `main`.
* **Release (`.github/workflows/release.yml`)**: Crea un release draft con notas auto-generadas, compila y firma en paralelo para macOS (Apple Silicon) y Windows (x86_64) usando [`tauri-action`](https://github.com/tauri-apps/tauri-action) (que además publica el `latest.json` del auto-updater), publica el release y actualiza el cask en [`dotfn/homebrew-tap`](https://github.com/dotfn/homebrew-tap) (únicamente para tags de producción sin sufijo).

---

## Licencia

MIT
