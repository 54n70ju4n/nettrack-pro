# NetTrack Pro

Seguimiento de instalaciones de red por **proyectos → pisos → espacios → puntos**, con checklists, planos con pines, reportes en PDF y personalización por proyecto.

Es una aplicación **100% del lado del cliente**: no tiene backend. Todos los datos y las imágenes (logos, planos, evidencia) se guardan en el navegador mediante **IndexedDB**. Esto la hace publicable como sitio estático (GitHub Pages) y utilizable sin conexión.

> ⚠️ Al no haber servidor, los datos **viven solo en el navegador/dispositivo** donde se usan: no se sincronizan entre equipos ni entre usuarios, y se pierden si se borran los datos del sitio. Para respaldar, exporta los reportes en PDF.

## Requisitos

- Node.js 18+ y npm.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite. No requiere variables de entorno ni backend.

## Build de producción

```bash
npm run build      # genera dist/ (base "/")
npm run preview    # sirve el build localmente
```

## Publicar en GitHub Pages

El repositorio incluye el workflow `.github/workflows/deploy-pages.yml`, que compila y despliega `dist/` en cada push a `main`.

Pasos únicos en GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Haz push a `main` (o Actions → *Deploy to GitHub Pages* → *Run workflow*).

El sitio queda en `https://<usuario>.github.io/<repo>/` (para este repo: `https://54n70ju4n.github.io/nettrack-pro/`).

La build para Pages usa `base: "/nettrack-pro/"` automáticamente (variable de entorno `GHPAGES=true` en el workflow); el build normal se sirve desde la raíz. Si publicas bajo otro nombre de repo, ajusta ese sub-path en `vite.config.js` y en el workflow.

## Estructura

- `src/api/base44Client.js`: capa de datos local (IndexedDB) con la API `entities.*`, `integrations.Core.UploadFile` y `auth` (stub sin login).
- `src/lib/queries.js`: hooks de datos con React Query.
- `src/lib/ProjectContext.jsx`: proyecto activo, alcance de datos, branding y terminología.
- `src/pages/`, `src/components/`: UI.
- `src/lib/exportFloorPdf.js`, `src/lib/pdfKit.js`: generación de PDF (jsPDF, carga bajo demanda).
