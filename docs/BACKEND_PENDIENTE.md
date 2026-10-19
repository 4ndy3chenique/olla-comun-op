# Lo que falta en backend y base de datos para pasar de `demo` a `real`

Verificado contra `endpoints/src/rutas.php`, `Sesion.php`, `Cuentas.php` y `bd/1.sql`. **Nada de esto está hecho**; esta app no modifica `endpoints/` ni `bd/`.

## 1. Cambios en endpoints existentes (PHP)

| Archivo | Problema actual | Cambio necesario |
|---|---|---|
| `src/Dominio/Cuentas.php` → `autenticar()` | Devuelve **403** si `rol_nombre !== 'SOLICITANTE_DIRIGENTE'`. Ningún rol operativo puede iniciar sesión. | Permitir `ALMACENERO`, `TRANSPORTISTA`, `AUDITOR`, `ADMINISTRADOR` (el 403 de "plataforma del solicitante" debe pasar a las rutas del solicitante, no al login). |
| `src/Dominio/Sesion.php` → `exigirDirigente()` | Solo existe middleware para el dirigente. | Añadir `exigirRol(string ...$roles)` y usarlo en las rutas nuevas. |
| `src/Nucleo/Respuesta.php` / App Setting `CORS_ORIGIN` | Solo orígenes exactos listados. | Agregar el hostname de esta app (lista separada por comas). Sin esto el navegador bloquea las llamadas. |
| Cabecera `Idempotency-Key` | CORS no la anuncia. | Añadirla a `Access-Control-Allow-Headers`. |
| (Opcional) `POST /api/auth/refresh` | Token opaco de 12 h, sin refresh. La especificación habla de JWT de 15 min. | Si se adopta vida corta, crear refresh y poner `SOPORTA_REFRESH = true` en `src/lib/sesion.ts`. La app ya conserva la cola ante 401. |

## 2. Endpoints nuevos (contrato que consume `apiReal.ts`)

Prefijo `/api`, `Authorization: Bearer`, errores `{mensaje, errores?}`, escrituras idempotentes por `uuid` (campo y cabecera `Idempotency-Key`).

| Método | Ruta | Roles | Notas |
|---|---|---|---|
| GET | `/operativo/ollas?apta=true` | ALMACENERO, AUDITOR | `ollas_comunes` con `estado_aprobacion='APTA'` |
| GET | `/operativo/transportistas` | ALMACENERO | usuarios con rol TRANSPORTISTA (`{id, nombre}`) — *añadido por la UI* |
| GET | `/operativo/guias?estado&olla_id&transportista_id&desde&hasta&page&per_page` | ALMACENERO, AUDITOR | TRANSPORTISTA solo ve las suyas |
| GET | `/operativo/guias/{id}` | idem | incluye `items`, `transiciones` (con `usuario_nombre`), `token_qr` |
| POST | `/operativo/guias` | ALMACENERO | `{uuid, olla_id, transportista_id?, items[], observaciones?}`; crea en `PROGRAMADO`, genera `token_qr` firmado (HMAC con `HMAC_SECRET`), crea `rutas_transportista` si hay transportista, registra en `bitacora_auditoria` |
| POST | `/operativo/guias/{id}/transiciones` | según transición | `{uuid, estado_destino}`; 409 si salta o retrocede el FSM; registra en `transiciones_fsm` |
| POST | `/operativo/guias/{id}/qr` | ALMACENERO | regenera token (nuevo nonce y expiración) |
| GET | `/operativo/rutas/mias` | TRANSPORTISTA | `[{ruta_id, estado_ruta, guia, olla}]` |
| POST | `/operativo/escaneos` | TRANSPORTISTA, ALMACENERO | `{uuid, guia_id, token_qr, tipo_escaneo, escaneado_en, tiempo_escaneo_ms, items_recepcionados?, contrafirma, clave_publica}` → `{resultado: VALIDO|INVALIDO_FIRMA|EXPIRADO|NONCE_REPETIDO}`. **Verifica el HMAC del token**, expiración y nonce, y la contrafirma ECDSA. `SALIDA_ALMACEN` avanza el FSM (PROGRAMADO→DESPACHADO o DESPACHADO→EN_TRANSITO) y `RECEPCION` registra cantidades y pasa EN_TRANSITO→RECEPCIONADO |
| POST | `/operativo/sincronizacion` | operativos | `{operaciones:[{uuid,tipo,payload,creado_en}]}` → `[{uuid, estado: OK|DUPLICADO|CONFLICTO|ERROR_VALIDACION, detalle?}]`; reutiliza la lógica de los endpoints anteriores y deja rastro en `cola_sincronizacion` |
| POST | `/operativo/dispositivos` | operativos | registra la clave pública ECDSA (JWK) del dispositivo |
| GET | `/operativo/menu?olla_id&semana=YYYY-MM-DD` | ALMACENERO, AUDITOR | `programaciones_menu` + `gramajes_calculados` de la semana |
| GET | `/operativo/padron?q&olla_id&estado&page&per_page` | ALMACENERO, AUDITOR | **devuelve `dni_enmascarado` (`****1236`), nunca el DNI**; `q` busca nombre o últimos 4 dígitos |
| GET | `/operativo/auditoria/bitacora?desde&hasta&tipo_evento&entidad&solo_invalidas&page&per_page` | AUDITOR, ADMINISTRADOR | solo lectura sobre `bitacora_auditoria` |
| GET | `/operativo/auditoria/liquidacion?desde&hasta&olla_id&page&per_page` | AUDITOR, ADMINISTRADOR | guías con `fecha_liquidacion`; incluye `d_fis_pct` |

Forma de las respuestas: `Pagina<T> = {items, total, page, per_page}`; tipos exactos en `src/types/operativo.ts`.

## 3. Cambios de base de datos (`bd/` — propuesta, no aplicada)

Todo en `bd_operativa_central`. Se sugiere un archivo nuevo `bd/5_operativo.sql` (idempotente) en vez de editar `1.sql`.

```sql
-- Idempotencia por uuid (hoy ninguna tabla operativa tiene uuid)
ALTER TABLE guias_despacho ADD COLUMN uuid CHAR(36) NULL UNIQUE AFTER id,
                           ADD COLUMN observaciones VARCHAR(300) NULL;
ALTER TABLE transiciones_fsm ADD COLUMN uuid CHAR(36) NULL UNIQUE AFTER id;

-- Escaneos: lo que hoy no se puede guardar
ALTER TABLE escaneos_qr
  ADD COLUMN uuid CHAR(36) NULL UNIQUE AFTER id,
  ADD COLUMN nonce VARCHAR(64) NULL,
  ADD COLUMN escaneado_en DATETIME NULL,
  ADD COLUMN contrafirma VARCHAR(255) NULL,
  ADD COLUMN dispositivo_id INT NULL,
  ADD UNIQUE KEY uq_nonce_tipo (nonce, tipo_escaneo);   -- antirrepetición en servidor

-- Claves públicas de los dispositivos (contrafirma ECDSA P-256)
CREATE TABLE IF NOT EXISTS dispositivos_usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  clave_publica_jwk JSON NOT NULL,
  huella CHAR(64) NOT NULL UNIQUE,         -- SHA-256 de la JWK canónica
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_disp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Recepción por ítem y vínculo ruta↔guía ya existen (items_despacho.cantidad_recepcionada, rutas_transportista).
-- Índices útiles para paginación y filtros
CREATE INDEX idx_guias_olla_fecha ON guias_despacho (olla_id, fecha_generacion);
CREATE INDEX idx_bitacora_fecha   ON bitacora_auditoria (timestamp);
```

**Datos semilla necesarios** (hoy no hay forma de crear estas cuentas por API):
- Usuarios `ALMACENERO`, `TRANSPORTISTA`, `AUDITOR` (con `password_hash` generado por `password_hash()` bcrypt): script SQL o un comando de consola; no hay endpoint de alta de operadores.
- Al menos una `ollas_comunes` con `estado_aprobacion='APTA'`, `beneficiarios`, `tablas_midis`, y `programaciones_menu` + `gramajes_calculados` para probar menú y balance.
- `bitacora_auditoria.firma_hmac` se calcula con `HMAC_SECRET` (el mismo del proyecto; no rotarlo sin plan).

## 4. Decisiones abiertas para el dueño

- Metas de **P_cal** y **E_ins**: no figuran en ningún documento del repositorio; la app las lee de `VITE_META_PCAL` / `VITE_META_EINS` (vacías = sin semáforo).
- Vida del token: 12 h hoy vs. 15 min en la especificación.
- Quién calcula `D_fis`/`t_liq` oficiales: la app los muestra, pero el reporte de rendición debería usar el valor del servidor.
