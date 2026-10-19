# Backend de la Plataforma Operativa: estado y pasos para activarlo

El código del backend ya está escrito en `endpoints/` y la migración en `bd/`. **Nada se ha desplegado ni aplicado a la base de producción.** Este documento dice qué hay, qué falta hacer y qué no se pudo probar.

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

## Pendiente (no incluido)

- **Pantalla para liquidar guías.** El endpoint `POST /operativo/guias/{id}/liquidar` existe, pero la web no tiene botón: la vista Liquidación estará vacía hasta que alguien liquide guías (por API o agregando el botón al auditor).
- **Asignar o cambiar transportista** de una guía ya emitida (hoy solo se asigna al emitir).
- **Anular una guía** o corregir ítems tras emitirla.
- **Alta de operadores desde la web** (hoy solo por consola).
- **Rate limiting** en los endpoints operativos (solo lo tienen login y RENIEC).
- **Metas de P_cal y E_ins** (`VITE_META_PCAL`, `VITE_META_EINS`): siguen sin definirse en ningún documento.
- **Vida del token**: 12 h vigentes frente a los 15 min de la especificación; requiere un endpoint de refresh (`SOPORTA_REFRESH` en `src/lib/sesion.ts`).
- **Pruebas automatizadas** del backend (no hay suite; la verificación hecha fue manual).
- Rotar la contraseña de `OC_2026` (pendiente desde `TRASPASO.md`) antes de producción real.
