# Changelog

## [0.7.1] — 2026-11-14

### Features
- **Nueva identidad e icono de app**: incorporación del nuevo icono 3D de lámpara colgante en macOS (`.icns`), Windows (`.ico` y tiles), iOS y Android, junto con adaptaciones vectoriales para el favicon web (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`), imagen OpenGraph y el componente `<LumusLogo />` en la interfaz.

## [0.7.0] — 2026-11-14

### Features
- **Soporte bilingüe (ES / EN)**: español e inglés en toda la web, la demo interactiva y la aplicación de escritorio, con selector de idioma en Ajustes y en la landing.
- **Rediseño nativo macOS Tahoe**: ventana translúcida con material nativo en la barra lateral, controles en cápsula y radios concéntricos.
- **Sección de descargas optimizada**: jerarquía centrada, selector de plataforma (macOS / Windows / Código fuente), tabla comparativa y preguntas frecuentes.
- **Backend Rust**: reconstrucción del registro de lámparas, descubrimiento y control UDP local.

## [0.6.0] — 2026-07-02

### Fixes
- **Sincronización de estado real**: el monitor de Rust ahora siempre vigila el dispositivo (o grupo completo) seleccionado en la UI vía el nuevo comando `set_active_device`; apagar una lámpara desde otra app/computadora se refleja en ≤5s.
- **Reposo/despertar**: refresh inmediato de estado, ritmo circadiano y temporizador al volver de reposo; el sleep timer usa reloj de pared y ya no pierde el tiempo dormido.
- **UI optimista estable**: los eventos de polling ya no revierten cambios locales recientes (slider que "saltaba hacia atrás").
- **glass-card transparente**: corregido `background-color` inválido que dejaba las tarjetas sin fondo.
- **Updater**: sin chequeo automático en dev y sin versión falsa "v0.0.0" en estado de error.

### Features
- **Polling de grupos**: al seleccionar una habitación se monitorean todas sus lámparas; cada una refleja su estado real en el sidebar.
- **Throttle de red**: máximo un comando UDP cada 150ms al arrastrar sliders, con entrega garantizada del valor final.

### CI/CD
- CI corre en pushes a `main`, con jobs paralelos (frontend / Rust) e incluye `cargo fmt` y `clippy`.
- Release migrado a `tauri-action` oficial: draft con changelog, builds firmados, `latest.json` automático para el updater.
- Cask de Homebrew centralizado en `dotfn/homebrew-tap` (`brew tap dotfn/tap`).

## [0.5.2] — 2026-06-29

### Chore
- Single source of truth for homepage URL via Vite define
- Fix deprecated string comparison in release.yml depends_on macos

## [0.5.1] — 2026-06-29

### Chore
- Add eslint dep, apply cargo fmt, fix two lint errors
- Improve Homebrew cask for brew audit compliance

## [0.5.0] — 2026-06-27

### Features
- **Identidad por MAC**: Migración completa de identificación de dispositivos de IP a MAC address, haciendo los dispositivos reconocibles incluso si cambian de IP.
- **Polling Circadiano**: Nuevo hook `useCircadianPolling` para sincronización de temperatura de color con hora del día, eliminación de `useCircadianAutoClear`.
- **Backend Rust**: Refactor mayor del backend con soporte para identidad MAC, 9 bugfixes y 6 optimizaciones de rendimiento.

## [0.4.0] — 2026-06-26

### Features
- **Demo Interactiva**: Ventana flotante arrastrable y redimensionable con tráfico lights de macOS.
- **Demo Responsive**: Diseño responsive con navegación de retroceso y panel dock.
- **Hook `useMediaQuery`**: Nuevo hook utilitario para detectar media queries desde React.

## [0.3.10] — 2026-06-25

### Features
- **Habitaciones y Grupos**: Capacidad de agrupar lámparas por estancias (ej. "Living", "Dormitorio") para un control unificado y simultáneo.
- **Control UDP en Paralelo**: Envío multicast de comandos de control a todos los dispositivos del grupo usando `Promise.allSettled` de forma no bloqueante.
- **Persistencia Local**: Guardado automático de la estructura de habitaciones y asignaciones en el almacenamiento local (`localStorage`).

### UX/UI
- **Barra Lateral Organizada**: Estructura de barra lateral dividida en "Habitaciones" (acordeón expandible), "Lámparas sin asignar" y "Dispositivos excluidos".
- **Botón de Creación Directa**: Agregado el botón "➕ Añadir" para crear grupos de manera intuitiva desde la barra lateral.
- **Acciones Dinámicas sin Solapamiento**: Al hacer hover sobre las tarjetas, los metadatos secundarios (IP, estado y número de lámparas) se desvanecen suavemente para dar espacio a los botones de edición y exclusión/eliminación.
- **Diseño Rectangular Unificado**: Eliminados los óvalos/cápsulas flotantes con bordes rotos, unificando los botones de acción como tarjetas rectangulares redondeadas (`rounded-xl`) integradas al tema.
- **Scroll Natural**: Eliminado el scrollbox interno restringido (`max-h-20rem`); el listado fluye libremente y se desplaza usando el scroll principal de la barra lateral.

## [0.2.0] — 2026-06-21

### CI/CD
- Workflow reestructurado con 3 jobs: quality → build → release
- Release automático publicado (no draft) al pushear tag v*
- Changelog generado automáticamente desde git log
- Se agrego `cargo test` a la fase de calidad
- Artefacto .dmg subido como build artifact

### Docs
- CHANGELOG.md creado con historial completo
- README actualizado: descarga via Releases, solo macOS

### Chore
- Sincronización de versión entre package.json, tauri.conf.json y Cargo.toml

## [0.1.0] — 2026-06-21

### Features
- Scaffolding Tauri + React + TypeScript
- Backend Rust modular con comandos IPC
- Descubrimiento UDP de dispositivos en red local
- Control completo: encendido/apagado, brillo, temperatura de color y RGB
- Escenas dinámicas con modos del protocolo
- Sleep timer con fade progresivo
- Tema claro/oscuro sincronizado con ventana nativa
- Alias de dispositivos personalizados
- Polling asíncrono de estado cada 5 segundos
- Frontend React con Zustand stores por dominio
- Capa de servicios (`deviceService.ts`) como abstracción IPC
- Actualizaciones optimistas con rollback

### Refactors
- Migración a backend Rust modular con estados granulares
- Vistas separadas: Dashboard, Escenas, Temporizador, Configuración
- Rebranding completo de WiZ a Lumus

### Fixes
- Validación de entradas en frontend y refuerzo de tipos
- Sanitización de errores y protección de archivo de configuración
- Validación de IPs en backend Rust
- Protección CSP y restricción de servidor de desarrollo
- Almacenamiento migrado de localStorage a backend Tauri
- Fuentes Google auto-hosteadas
- Flash blanco eliminado al abrir la app
- Tema aplicado correctamente y sin parpadeos
- Configuración atómica con escritura segura (tmp → sync → rename)

### Tests
- 12 tests unitarios para `config.rs` y `network.rs`:
  - Escritura atómica
  - Lectura con archivo corrupto
  - Roundtrip de configuración
  - Validación de IPs

### CI
- Workflow de GitHub Actions para lint, typecheck y build
- Release automático para macOS (Apple Silicon)
