# Backend de la Plataforma Operativa: estado y pasos para activarlo

El código del backend ya está escrito en `endpoints/` y la migración en `bd/`.

> **Actualización (19-oct-2026): plan ejecutado en producción.** Migración `5_operativo.sql` al día + `7_produccion.sql` (índices) aplicada; operadores ALMACENERO/TRANSPORTISTA/AUDITOR creados; semilla 6 completa (ollas, beneficiarios, menús y gramajes); API desplegada y verificada 10/10; web operativa publicada en modo `real`. Flujo E2E probado contra la API productiva: emitir → despachar → tránsito → recepción, con bitácora y padrón.

Este documento conserva el plan original: qué hay, qué faltaba hacer y qué no se pudo probar.

## Qué se implementó

| Pieza | Archivos |
|---|---|
| 16 rutas `/api/operativo/*` (contrato exacto que consume `src/services/operativo/apiReal.ts`) | `endpoints/src/rutas.php`, `Controladores/{Guia,Escaneo,Consulta}Controlador.php`, `Dominio/{Guias,Escaneos,Sincronizacion,Consultas,Dispositivos,QrToken,Bitacora}.php`, `Nucleo/Paginacion.php` |
| Login de roles operativos (`"plataforma": "operativa"`); sin ese campo el login sigue siendo solo del dirigente | `Cuentas.php`, `CuentaControlador.php` |
| Middleware por rol (`Sesion::exigirRol`) | `Sesion.php` |
| CORS permite `Idempotency-Key`; `Peticion::consulta()` para la query string | `Respuesta.php`, `Peticion.php` |
| Migración de BD (uuid, nonce, contrafirma, dispositivos, índices) | `bd/5_operativo.sql` |
| Datos de prueba (3 ollas APTA, beneficiarios, menú de la semana) | `bd/6_semilla_operativo.sql` |
| Alta de operadores por consola (no hay endpoint de alta) | `endpoints/scripts/crear-operador.php` |
| `CORS_ORIGIN` ampliable y `QR_TTL_MINUTOS` | `endpoints/scripts/set-azure-env.ps1` (`-OrigenesExtra`), `.env.example` |

Decisiones de diseño: el transportista solo ve sus guías (404 en las ajenas); el `token_qr` solo se entrega al almacenero; `firma_valida` de la bitácora se recalcula en el servidor; la vigencia del QR se mide a la hora del escaneo en el dispositivo (permite sincronizar horas después); la clave de dispositivo queda ligada al primer usuario que firma con ella.

## Qué se probó y qué no

- **Probado:** sintaxis de todo `endpoints/` con PHP 8.4. La firma ECDSA de la contrafirma generada con WebCrypto (Node) se verifica correctamente en PHP, incluyendo tildes, barras y decimales en los insumos; datos alterados o de otro usuario se rechazan. El token QR firmado detecta manipulación del payload.
- **No probado:** ninguna consulta SQL contra MySQL (no hay base local y no se tocó la de Azure). Tampoco el flujo HTTP completo ni el despliegue. Esperen ajustes menores en la primera ejecución real.
- Nota: el XAMPP de este equipo es PHP **7.4.33**, no 8.0; el código existente (y el nuevo) requiere PHP ≥ 8.0, así que la API local solo corre con otro PHP. Producción usa 8.4.

## Pasos para activarlo (en este orden)

1. **Respaldo** de `bd_operativa_central` (la migración solo agrega columnas, tablas e índices; no borra datos).
2. Aplicar `bd/5_operativo.sql` y, solo en entornos de prueba, `bd/6_semilla_operativo.sql` (con `aplicar_sql.js` o el cliente MySQL; las sentencias se ejecutan una por una porque tolera "ya aplicado"). Requiere la IP del equipo en el firewall de MySQL.
3. Crear los operadores (la contraseña no queda en el historial si usas la variable):
   ```powershell
   $env:OPERADOR_PASSWORD = '<contraseña de 10+ caracteres>'
   php endpoints/scripts/crear-operador.php --dni=10000001 --rol=ALMACENERO --nombres="..." --apellidos="..." --email=...
   ```
   Repetir para `TRANSPORTISTA` y `AUDITOR`. Después correr la semilla 6 (necesita un almacenero para el menú).
4. **CORS**: añadir el origen de la web operativa y fijar `QR_TTL_MINUTOS`:
   ```powershell
   az webapp config appsettings set -g rg-ollas-prod -n api-ollas-prod --settings "CORS_ORIGIN=https://thankful-ocean-08840ec0f.1.azurestaticapps.net,https://<web-operativa>.azurestaticapps.net" QR_TTL_MINUTOS=720
   ```
5. **Desplegar la API**: `cd endpoints; .\scripts\deploy-api.ps1` y luego `.\scripts\verificar-api.ps1`. Probar a mano con una cuenta operativa: login con `plataforma: "operativa"`, `GET /api/operativo/guias`, y emitir/escanear una guía.
6. En GitHub de la web operativa: variable `VITE_OPERATIVO_MODO=real` y volver a ejecutar el workflow.

## Añadido después

- `PUT /api/operativo/guias/{id}/transportista` (ALMACENERO): asigna o cambia el transportista mientras la guía esté PROGRAMADO o DESPACHADO; queda en bitácora. Selector en el detalle de guía.
- `GET /api/operativo/guias?sin_liquidar=true`: guías recepcionadas sin liquidar. La vista Liquidación tiene el panel "Por liquidar" con botón (usa `POST .../liquidar`).
- Límite de peticiones por IP en todas las rutas operativas: `RATE_LIMIT_OPERATIVO` (240/min por defecto).
- Estas piezas tampoco se probaron contra MySQL real.

## Pendiente (no incluido)

- **Anular una guía** o corregir ítems tras emitirla: exige un estado nuevo en el ENUM `estado_fsm` y revisar KPIs; decisión de negocio.
- **Alta de operadores desde la web** (hoy solo por consola con `crear-operador.php`).
- **Metas de P_cal y E_ins** (`VITE_META_PCAL`, `VITE_META_EINS`): siguen sin definirse en ningún documento.
- **Vida del token**: 12 h frente a los 15 min de la especificación; requiere un endpoint de refresh (`SOPORTA_REFRESH` en `src/lib/sesion.ts`).
- **Pruebas automatizadas** del backend.
- Rotar la contraseña de `OC_2026` antes de producción real.
