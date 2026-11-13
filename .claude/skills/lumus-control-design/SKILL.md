---
name: lumus-control-design
description: Sistema de diseño de la app de escritorio Lumus Control (interfaz de control de lámparas, estilo macOS Tahoe). Úsalo al tocar cualquier pantalla o componente bajo `.mac-app` (ControlPage, Sidebar, TargetView, OverviewView, SettingsView, hojas), al elegir un color, espacio, radio, tipografía o animación, y antes de dar por terminada una pantalla. No cubre la landing ni la página de descargas, que usan los tokens `theme-*` de `src/index.css`.
---

# Lumus Control — diseño de la app

Fuente de los valores: `src/features/shell/shell.css` (tokens y componentes) y `src/features/shell/components/primitives.tsx`. Si este documento y el código discrepan y el código está bien, se corrige este documento en el mismo cambio.

Referencias de origen: Finder/Dotphin en macOS Tahoe (panel lateral flotante de vidrio, cápsulas en la barra de herramientas) y Ajustes del Sistema (mosaicos de color, listas agrupadas).

## 1. Superficies

- **Detalle** (`TargetView`): una lámpara o una habitación. Misma pantalla; cambian el encabezado y la última sección (Información / Lámparas).
- **Todas las lámparas** (`OverviewView`): solo existe si hay más de una lámpara visible o alguna habitación.
- **Ajustes** (`SettingsView`).
- **Hojas** (`DeviceSheets`): nueva/editar habitación, añadir por IP.
- La misma página corre en tres contenedores: ventana Tauri en macOS (translúcida), Tauri en Windows (opaca) y demo web dentro de `FloatingDemoWindow` o a pantalla completa en móvil.

## 2. Gesto propio

El **mosaico de lámpara** (`LampTile`): un cuadrado redondeado relleno con el color que la lámpara emite ahora. Gris si está apagada, glifo de Wi‑Fi tachado si no responde. Es el único lugar donde aparece color arbitrario; todo lo demás es neutro más el acento.

## 3. Color

Todo color sale de un token `--m-*` definido en `.mac-app` (claro) y `.dark .mac-app` (oscuro). Ningún hex en componentes, salvo los colores fijos de `IconTile` y los datos (escenas, temperaturas).

| Rol | Token | Uso |
|:--|:--|:--|
| Fondo de ventana | `--m-bg` | Velo sobre el material nativo en macOS; opaco en el resto |
| Panel lateral | `--m-sidebar` | Panel flotante |
| Grupo | `--m-group` | Listas agrupadas |
| Vidrio | `--m-glass` + `--m-glass-shadow` | Cápsulas de la barra de herramientas |
| Texto | `--m-text`, `--m-text-2` | Primario y secundario |
| Decorativo | `--m-text-3` | Solo glifos; no alcanza contraste de texto |
| Acento | `--m-accent` | Interruptores, relleno del slider, foco |
| Acento con texto | `--m-accent-fill` | Fila seleccionada y botón primario: blanco encima a ≥ 4.5:1 |
| Enlace | `--m-accent-text` | Texto de acento sobre fondo claro/oscuro |

- Texto legible ≥ 4.5:1 sobre su superficie, medido (ver sección 14).
- El estado nunca va solo en color: "Sin conexión" lleva texto e ícono.

## 4. Tipografía y números

- Fuente del sistema (`-apple-system`, SF Pro); Inter solo como respaldo en la demo web.
- Escala: 12 (secundario, encabezados de la barra lateral) · 13 (cuerpo, filas) · 15 (título de barra y de hoja) · 17 (estado vacío) · 22/700 (nombre del destino).
- **Nada por debajo de 12 px.**
- Porcentajes, kelvin, cuenta regresiva e IP usan `tabular-nums`.

## 5. Espacio, forma, profundidad

- Escala de espacio: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32. Declarada también en `dotfn-audit.json`.
- Radios: ventana 26 (sistema) → panel lateral 18 (26 menos el margen de 8) → grupo y aviso 16 → fila de barra lateral 10 → campo 9. Un radio interior es el exterior menos la separación.
- Controles en **cápsula** (radio 999): botones, control segmentado, menú desplegable, chips, grupo de la barra de herramientas. Perilla de interruptor y de slider también en cápsula (más ancha que alta).
- Sombra solo en lo que flota: panel lateral, cápsulas de vidrio, perillas, hojas. Los grupos no llevan sombra.
- Bordes de 0.5 px.

## 6. Movimiento

- Interruptor: 200 ms. Hoja: 200 ms entrando desde arriba. Barra de progreso del temporizador: lineal, 1 s por tick.
- Sliders y selección de fila: sin transición (uso continuo).
- `prefers-reduced-motion`: todo a 0.01 ms.

## 7. Navegación

- Panel lateral persistente: Todas las lámparas · Habitaciones (con sus lámparas anidadas) · Lámparas sueltas · Ajustes al pie.
- Por debajo de 640 px de ancho del contenedor (container query, no media query) el panel pasa a cajón con botón en la barra.
- La barra superior es zona de arrastre; en el detalle no repite el nombre, que ya está en el encabezado.
- Acción primaria de cada destino: el interruptor grande del encabezado.

## 8. Estados

- **Cargando**: "Buscando lámparas…" con indicador.
- **Vacío**: sin lámparas → explicación + "Buscar de nuevo" y "Añadir por IP…". Habitación sin lámparas → aviso + "Editar…".
- **Sin conexión**: controles atenuados e inertes, aviso con "Buscar". Nunca se muestra encendida una lámpara que no responde.
- **Habitación parcial**: "2 de 3 encendidas · 1 sin conexión".

## 9. Foco, teclado, puntero

- Foco visible: contorno de 3 px del acento al 55 %.
- Área mínima de puntero 24×24; en el cajón táctil las filas miden 32 de alto y ocupan todo el ancho.
- Interruptores `role="switch"`, control segmentado `radiogroup`, hojas `dialog` modal que cierran con Escape y devuelven el foco.

## 10. Escritura

- Español rioplatense neutro, frases cortas, sin signos de exclamación.
- Unidades con espacio: "75 %", "2700 K".
- Los botones nombran el resultado: "Buscar ahora", "Añadir", "Ocultar".
- La interfaz no se explica a sí misma: una pista por fila como máximo, y solo si agrega información.

## 11. Rechazado

- **Pestañas superiores para Escenas y Temporizador.** Son propiedades del destino seleccionado, no secciones de la app.
- **Tarjetas con sombra y brillo alrededor de todo** (el diseño anterior): se veía web, no nativo.
- **Repetir nombre y estado en la barra superior** cuando ya están en el encabezado del detalle.
- **Aspecto solo "parecido a macOS".** La dirección pedida es nativo de Tahoe: material translúcido real de la ventana, panel flotante, cápsulas y radios concéntricos; no una imitación plana.

## 12. Trampas conocidas

- `.mac-app button { color: inherit }` gana por especificidad a una clase sola. Los colores propios de un botón van con prefijo `.mac-app` (`.mac-app .mac-btn--primary`). Ya produjo texto oscuro sobre azul.
- Los estilos globales de `input[type=range]` en `src/index.css` afectan a los sliders; se anulan con `.mac-app .mac-slider`.
- La translucidez depende de tres cosas a la vez: `transparent` + `windowEffects` en `tauri.macos.conf.json`, `macOSPrivateApi` + la feature `macos-private-api` de Cargo, y la clase `vibrant` en `<html>` (la pone `index.html`). Pintar un color de fondo de ventana desde Rust o JS la tapa.
- Tras cambios grandes con `tauri dev` abierto, la ventana puede quedar en blanco por recarga en caliente: reiniciar antes de diagnosticar.
- La posición de los botones de ventana se fija en `trafficLightPosition`; el alto de `.mac-sidebar__top--traffic` debe acompañarla.

## 13. Abierto

Decisiones que no están tomadas; no resolverlas sin consultar:

- **Contraste de controles sin borde.** `dotfn-audit` marca como falta dura (3:1) los botones de solo ícono, la pista del slider, el interruptor apagado y el borde del menú desplegable. Son el idioma nativo de macOS y se dejaron así por pedido de look nativo. Alternativa: un modo de mayor contraste que les agregue borde.
- **Tema automático** según el sistema (hoy es Claro/Oscuro manual).
- **Velo sobre el material** (62 % claro y oscuro): no se midió el contraste sobre fondos de escritorio muy saturados.

## 14. Antes de dar algo por terminado

1. `pnpm verify` y `pnpm build`.
2. `dotfn-audit` (checks.js) sobre `/demo` en claro y oscuro, en detalle, Todas las lámparas y Ajustes: 0 faltas de contraste de texto, 0 texto menor a 12 px, 0 áreas de puntero menores a 24 px, sin desbordes.
3. Mirar la ventana real de Tauri, no solo la demo: translucidez, botones de ventana dentro del panel, arrastre desde la barra.
4. Probar el caso malo: lámpara sin conexión, habitación parcial, nombre largo, una sola lámpara.
