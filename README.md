# Ollas Comunes — Plataforma Operativa

Aplicación web (PWA offline-first) para **Almacenero**, **Transportista** y **Auditor**. React 19 + Vite 8 + TypeScript + Tailwind 3.4, mismo design system que `ollas-comunes-pwa`.

## Modos de datos

| `VITE_OPERATIVO_MODO` | Qué hace |
|---|---|
| `demo` (por defecto) | Datos simulados en memoria, con banner "MODO DEMO". Accesos rápidos por rol, sin contactar la API. Permite probar toda la UI y la cola offline. |
| `real` | Login real (`POST /auth/login`) y endpoints operativos del contrato objetivo (ver `docs/BACKEND_PENDIENTE.md`). **Hoy la API no los tiene**, así que no usar en producción todavía. |

## Desarrollo

```bash
cp .env.example .env     # ajustar VITE_API_BASE_URL
npm install
npm run dev              # http://localhost:5174
npm run build && npm run lint
```

Probar offline: DevTools → Network → Offline. Emite una guía (almacenero) o registra una recepción (transportista), recarga, vuelve a "Online" y mira la cola vaciarse en `/cola` sin duplicados.

## Despliegue en Azure Static Web Apps

El workflow está en `.github/workflows/azure-static-web-apps-blue-glacier-0500cf30f.yml` (generado por Azure y ajustado: compila con Node 22 y sube `dist`). **Esta carpeta debe ser la raíz de su propio repositorio de GitHub**, porque el workflow vive en `.github/` de la raíz del repo.

1. **Repositorio**: crear un repo nuevo (p. ej. `OLLAS-COMUNES-OP`) y subir el contenido de `ollas-comunes-op/` en la rama `main`.
2. **Crear el recurso** (una vez; requiere `az login`):
   ```powershell
   az staticwebapp create -n stapp-ollas-op-prod -g rg-ollas-prod -l eastus2 --sku Free
   az staticwebapp show -n stapp-ollas-op-prod -g rg-ollas-prod --query defaultHostname -o tsv
   az staticwebapp secrets list -n stapp-ollas-op-prod -g rg-ollas-prod --query properties.apiKey -o tsv
   ```
   (Si no hay cupo de Static Web Apps Free en la suscripción, usar otra región o el portal.)
3. **GitHub → Settings → Secrets and variables → Actions**:
   - Secret `AZURE_STATIC_WEB_APPS_API_TOKEN_BLUE_GLACIER_0500CF30F`: ya lo creó Azure al vincular el repositorio.
   - Variable `VITE_API_BASE_URL` (opcional): si falta, el workflow usa `https://api-ollas-prod-fhezb8atcxgmbrfa.eastus-01.azurewebsites.net/api`.
   - Variable `VITE_OPERATIVO_MODO` = `demo` (o `real` cuando el backend esté listo). Opcionales: `VITE_META_PCAL`, `VITE_META_EINS`.
4. **CORS de la API** (obligatorio para modo `real`): `CORS_ORIGIN` solo acepta coincidencias exactas. Añadir el origen de esta app, **separado por comas** junto al de la web del solicitante:
   ```
   CORS_ORIGIN=https://thankful-ocean-08840ec0f.1.azurestaticapps.net,https://<hostname-de-esta-app>.azurestaticapps.net
   ```
   Se aplica con `endpoints/scripts/set-azure-env.ps1` (o `az webapp config appsettings set`). En modo `demo` no hace falta.
5. **Push a `main`** dispara: `npm ci` → lint → build → publicación de `dist`. Verifica el sitio, instala la PWA y revisa en consola que no haya errores de CORS.

`public/staticwebapp.config.json` excluye del fallback SPA al Service Worker, manifest, íconos y assets, añade cabeceras de seguridad y `Permissions-Policy: camera=(self)` (necesario para el escáner QR; la cámara solo funciona bajo HTTPS, que Azure SWA provee).

## Seguridad y datos personales (Ley N.° 29733)

- El Service Worker precachea **solo estáticos**; las respuestas de `/api` usan `NetworkOnly` y nunca se guardan.
- Los datos offline (cola, caché de lectura) van en IndexedDB cifrados con **AES-256-GCM** (Web Crypto, clave no extraíble). Limitación: protege contra inspección casual del perfil del navegador, no contra código malicioso en la misma página ni contra quien use el navegador desbloqueado. Sin `crypto.subtle` el modo offline se desactiva (nunca texto plano).
- DNI siempre enmascarado (`****1236`); la API operativa debe devolverlo ya enmascarado.
- La app **no verifica el HMAC del QR** (el secreto vive en el servidor). Valida formato/expiración/nonce y contrafirma el escaneo con una clave ECDSA P-256 del dispositivo; el servidor verifica el HMAC al sincronizar. En la bitácora, `firma_valida` es lo que informa el servidor.
- Cerrar sesión o vencer el token **no borra la cola**; solo "Borrar datos del dispositivo" (confirmación explícita) lo hace.

## Estructura

```
src/features/{auth,almacen,transporte,padron,auditoria,cola}   vistas por módulo
src/components/{ui,layout,offline}                              design system y shell
src/services/{http.ts,auth.ts,operativo/,reportes/}             cliente HTTP, API demo/real, PDF/Excel
src/lib/{offline,qr,fsm.ts,nutricion.ts,dni.ts,sesion.ts}       IndexedDB cifrada, QR, reglas del dominio
src/context/  src/routes/  src/hooks/
```
