# Lumus Control — Agentes & CI/CD

Documentación de referencia para agentes de IA y colaboradores sobre la arquitectura de CI/CD, estrategia de branches y convenciones del proyecto.

---

## Estrategia de Branches

```
main
 └── develop
      ├── feature/<nombre>
      ├── fix/<nombre>
      └── chore/<nombre>
hotfix/<nombre>  →  main (directo, urgente)
```

| Branch       | Propósito                                   | Merge destino |
|--------------|---------------------------------------------|---------------|
| `main`       | Producción. Solo recibe PRs aprobados.      | —             |
| `develop`    | Integración. Base para features/fixes.      | `main`        |
| `feature/**` | Funcionalidad nueva.                        | `develop`     |
| `fix/**`     | Bugfixes.                                   | `develop`     |
| `hotfix/**`  | Fix urgente de producción.                  | `main`        |
| `chore/**`   | Docs, refactors, config sin impacto en CI.  | `develop`     |

### Convención de naming

```
feature/nombre-descriptivo
fix/descripcion-del-bug
hotfix/descripcion-urgente
chore/que-se-actualizo
```

### Protección de ramas recomendada (configurar en GitHub Settings → Branches)

- `main`: Require PR + status check `quality` + no direct push
- `develop`: Require PR + status check `quality`

---

## Workflows de CI/CD

> Arquitectura de 4 workflows separados por responsabilidad para minimizar cómputo innecesario.

### `ci.yml` — Quality Checks

**Runner:** `ubuntu-latest` (1× costo, suficiente para Node puro)

**Cuándo corre:**
- Push a `develop`, `feature/**`, `fix/**`, `hotfix/**`, `chore/**`
- PRs hacia `main` o `develop`
- **Solo si cambiaron** archivos en: `src/`, `src-tauri/`, `package.json`, `pnpm-lock.yaml`, `tailwind.config.js`, `tsconfig*.json`, `.eslintrc*`

**Qué hace:**
1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck` — verificación de tipos TypeScript
3. `pnpm lint` — ESLint con zero warnings

**NO corre si solo cambiaron:** `README.md`, `docs/**`, `.github/**`, `*.sh`, archivos de Homebrew.

---

### `release.yml` — Build & Release (Tags o Manual)

**Runner:** `macos-latest` (build macOS) / `windows-latest` (build Windows) / `ubuntu-latest` (release/tap jobs)

**Cuándo corre:**
- Push a tags `v*` — **siempre, sin path filter**.
- `workflow_dispatch` — trigger manual para release candidates o pruebas de compilación (genera un borrador/draft en GitHub y omite la actualización del Homebrew Tap para seguridad).
- `cancel-in-progress: false` — un release nunca se cancela a mitad.

**Qué hace:**
1. Build paralelo para macOS Apple Silicon (`aarch64-apple-darwin`) y Windows (`x86_64-pc-windows-msvc`).
2. Genera las firmas digitales y crea la GitHub Release (pública si es tag real, borrador/draft si es manual).
3. **Update Homebrew Tap (job integrado)**: Actualiza el Tap de Homebrew de forma instantánea y local usando el artefacto macOS generado, filtrando que el tag sea estrictamente de producción (`vX.Y.Z`) para no ensuciar el repositorio de Homebrew con release candidates o tags de prueba.

---

## Flujo de Trabajo Recomendado

### Feature nueva

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-feature
# ... trabajo ...
git push origin feature/mi-feature
# Abrir PR hacia develop en GitHub
```

### Release

```bash
# Desde develop, una vez aprobadas todas las features del sprint
git checkout main
git merge develop
git tag v1.2.0
git push origin main --tags
# El workflow release.yml se dispara automáticamente
```

### Hotfix urgente

```bash
git checkout main
git checkout -b hotfix/fix-critico
# ... fix ...
git push origin hotfix/fix-critico
# PR directo a main, luego cherry-pick o merge a develop
```

---

## Comandos Útiles

```bash
# Desarrollo local
pnpm dev:frontend      # Solo frontend (Vite)
pnpm dev               # App Tauri completa

# Verificación (igual que CI)
pnpm typecheck
pnpm lint

# Build macOS
pnpm tauri build --target aarch64-apple-darwin
pnpm tauri build --target x86_64-apple-darwin

# Build Windows (requiere Windows o cross-compilation)
pnpm tauri build --target x86_64-pc-windows-msvc
```

---

## Estructura del Proyecto

```
lumus-control/
├── .agents/
│   ├── skills/          # Skills de agentes IA (accesibilidad, deploy, etc.)
│   └── agents.md        # Este archivo
├── .github/
│   └── workflows/
│       ├── ci.yml          # Quality checks (typecheck + lint + Rust tests) — ubuntu-latest
│       └── release.yml     # Build + Release (tags v* o manual) — macOS, Windows, Linux
├── src/                 # Frontend React/TypeScript
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── stores/          # Zustand stores
│   └── index.css        # Sistema de design tokens (CSS custom properties)
├── src-tauri/           # Backend Rust (Tauri v2)
│   ├── tauri.conf.json          # Base cross-platform
│   ├── tauri.macos.conf.json    # Override macOS (titleBarStyle, signing)
│   └── tauri.windows.conf.json  # Override Windows (native decorations, NSIS)
├── tailwind.config.js   # Configuración Tailwind + tema personalizado
└── vercel.json          # Config deploy landing en Vercel
```

---

## Sistema de Colores y Theming

El proyecto usa **CSS custom properties** como fuente de verdad para el sistema de colores. Tailwind consume estas variables a través de `tailwind.config.js`.

### Principios
- Las variables CSS se definen en `src/index.css` bajo `:root` (light) y `.dark` (dark mode)
- El dark mode se activa via clase `.dark` en el elemento `<html>` (estrategia `class` de Tailwind)
- Los componentes usan clases semánticas como `bg-theme-bg`, `text-theme-primary`, `border-theme-border`
- **No usar** `!important` ni overrides de variables internas de Tailwind para resolver problemas de theming

### Archivos críticos del tema
- `src/index.css` — variables CSS, tokens de diseño, componentes base
- `tailwind.config.js` — mapeo de tokens a utilidades Tailwind
- `src/stores/themeStore.ts` — estado del tema (light/dark) con persistencia

---

## Soporte Multi-Plataforma

### Config Split de Tauri

El proyecto usa el sistema de **config merging** de Tauri v2 para separar la estética por plataforma sin conditionals en código:

| Archivo | Plataforma | Contenido |
|---------|------------|-----------|
| `tauri.conf.json` | Todas | Base: ventana, seguridad, iconos |
| `tauri.macos.conf.json` | macOS | `titleBarStyle: Overlay`, `hiddenTitle`, signing, target `dmg` |
| `tauri.windows.conf.json` | Windows | Decoraciones nativas, WebView2 bootstrapper, target `nsis` |

El CLI de Tauri aplica el merge automáticamente según la plataforma de build. No se requiere código condicional en Rust ni en TypeScript.

### Targets por Plataforma

| Plataforma | Runner CI | Rust Target | Instalador |
|------------|-----------|-------------|------------|
| macOS Apple Silicon | `macos-latest` | `aarch64-apple-darwin` | `.dmg` |
| Windows | `windows-latest` | `x86_64-pc-windows-msvc` | `.exe` (NSIS) |

### Firma de Código
- **macOS**: `signingIdentity: "-"` (firma ad-hoc) — suficiente para distribución directa
- **Windows**: Sin firma de código — SmartScreen muestra advertencia "Unknown Publisher" en primera instalación. Aceptable para proyecto OSS sin presupuesto de certificado ($0).

### Optimizaciones de Release
El `[profile.release]` en `Cargo.toml` activa LTO + codegen-units=1 solo en builds de release:
- **LTO**: reduce tamaño del binario ~20-30%
- **codegen-units=1**: maximiza optimizaciones entre crates
- **panic=abort**: elimina overhead de unwinding

---

## Notas para Agentes IA

- **Antes de modificar `tailwind.config.js` o `index.css`**, verificar el historial de commits reciente para no introducir regresiones visuales
- **No agregar overrides** sobre variables internas de Tailwind (`--tw-bg-opacity`, etc.) para resolver problemas de theming
- **Los componentes no deben compensar** defectos del sistema de temas — si un componente necesita workarounds, es señal de que el problema está en el sistema
- **Branch de trabajo**: crear siempre desde `develop`, nunca desde `main`
- **Commits**: seguir Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `perf:`, `ci:`)
- **Config Tauri**: modificar `tauri.macos.conf.json` o `tauri.windows.conf.json` para cambios platform-specific — nunca en `tauri.conf.json` base a menos que aplique a todas las plataformas
