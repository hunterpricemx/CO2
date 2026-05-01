# Shop Delivery Endpoint — Spec para el cliente C# del game server

Este documento describe el contrato HTTP que debe implementar el listener del game server para entregar ítems comprados desde el portal web.

> **Audiencia:** desarrollador del cliente C# del game server (Conquer Online "Classic Plus").
> **Versión:** 1.0
> **Estado:** spec aprobada para "Servidor Pruebas". El mismo contrato se reutilizará para v1.0 y v2.0 cuando se promuevan a producción.

---

## 1. Endpoint

| Atributo | Valor |
|---|---|
| Método | `POST` |
| Path por defecto | `/shop/` |
| Configuración | URL completa configurable desde **Admin → Game Server → Servidor Pruebas → Shop endpoint** |
| Ejemplo | `http://192.168.1.50:8080/shop/` |
| Content-Type | `application/json; charset=utf-8` |

> **Recomendación:** preferir `https://` cuando el servidor lo soporte. Aunque el HMAC mitiga manipulación del payload, HTTPS evita filtración del UID e IP del jugador.

---

## 2. Headers de entrada

```
POST /shop/ HTTP/1.1
Host: <gameserver>:8080
Content-Type: application/json; charset=utf-8
X-Shop-Signature: sha256=<hex>
```

### `X-Shop-Signature`

- Formato: `sha256=<hex_lowercase>`
- Cálculo: `HMAC-SHA256(secret, raw_body_bytes)` → hex en minúsculas.
- `secret` es el valor configurado en Supabase (`shop_hmac_secret_test`) y entregado al admin del game server por canal seguro.
- **Comparar siempre con `CryptographicOperations.FixedTimeEquals` (no con `==`)** para evitar timing attacks.

---

## 3. Body de entrada

```json
{
  "purchase_id": "11111111-2222-3333-4444-555555555555",
  "uid": 123456,
  "item_id": 720001,
  "ip": "203.0.113.42",
  "env": "test",
  "timestamp": 1735689600000,
  "nonce": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `purchase_id` | string (UUID v4) | Identificador único de la compra. **Usar como clave de idempotencia.** |
| `uid` | int positivo | EntityID del jugador en `accounts` / `topserver_turbo`. |
| `item_id` | int positivo | ID del ítem a entregar. |
| `ip` | string \| null | IP pública del jugador (capturada por el portal). Puede ser null si el portal corre sin proxy. |
| `env` | "test" \| "v1" \| "v2" | Identifica el entorno del game server. Permite logs/análisis cruzados. |
| `timestamp` | int (epoch ms UTC) | Momento en que el portal generó la petición. |
| `nonce` | string (UUID v4) | Único por petición. Usado para anti-replay junto con `timestamp`. |

---

## 4. Validaciones obligatorias del listener (en orden)

1. **Firma HMAC.** Calcular HMAC-SHA256 sobre el body crudo (bytes recibidos, no re-serializado) y comparar contra `X-Shop-Signature`. Si no coincide → `400 invalid_signature`.
2. **Frescura del timestamp.** `Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - timestamp) <= 30_000`. Si no, `400 stale_timestamp`.
3. **Anti-replay por nonce.** Mantener un cache en memoria de nonces vistos durante los últimos 5 minutos (ej. `MemoryCache` con expiración por entrada). Si `nonce` ya está → `400 replay`.
4. **Idempotencia por purchase_id.** Tabla `delivered_purchases (purchase_id CHAR(36) PRIMARY KEY, delivered_at DATETIME, uid INT, item_id BIGINT)`. Si `purchase_id` ya existe → responder `200 {"ok":true,"already_delivered":true}` **sin re-entregar el ítem**.
5. **Validación de payload.** `uid > 0`, `item_id > 0`, `env ∈ {"test","v1","v2"}`. Si no, `400 invalid_payload`.
6. **Existencia del jugador.** Verificar que el `uid` exista en la tabla de personajes. Si no, `404 uid_not_found`.
7. **Existencia del ítem.** Validar que `item_id` esté en el catálogo de ítems entregables. Si no, `404 item_not_found`.

> ⚠️ **Nunca concatenar `uid` o `item_id` en SQL.** Usar `MySqlCommand` con parámetros (`@uid`, `@item_id`).

---

## 5. Lógica de entrega

Pseudo-flujo dentro del listener (después de que pasen las validaciones):

```csharp
using var tx = conn.BeginTransaction();

// 1. Insertar el ítem en el inventario del jugador
var insertItem = new MySqlCommand(
    "INSERT INTO items (PlayerID, ItemID, Plus, Bless, ...) VALUES (@uid, @item, 0, 0, ...)",
    conn, tx);
insertItem.Parameters.AddWithValue("@uid", uid);
insertItem.Parameters.AddWithValue("@item", itemId);
insertItem.ExecuteNonQuery();

// 2. Marcar como entregado para idempotencia
var markDelivered = new MySqlCommand(
    "INSERT INTO delivered_purchases (purchase_id, delivered_at, uid, item_id) VALUES (@pid, NOW(), @uid, @item)",
    conn, tx);
markDelivered.Parameters.AddWithValue("@pid", purchaseId);
markDelivered.Parameters.AddWithValue("@uid", uid);
markDelivered.Parameters.AddWithValue("@item", itemId);
markDelivered.ExecuteNonQuery();

tx.Commit();
```

Si el jugador está online, opcional pero recomendado: notificar al cliente del juego para que el ítem aparezca en inventario sin requerir relog.

---

## 6. Respuestas

Todas las respuestas son `Content-Type: application/json`.

| Status | Body | Cuándo |
|---|---|---|
| `200` | `{"ok":true,"delivered":true}` | Entregado en esta llamada |
| `200` | `{"ok":true,"already_delivered":true}` | Duplicado idempotente, no se reentrega |
| `400` | `{"ok":false,"error":"invalid_signature"}` | HMAC no coincide |
| `400` | `{"ok":false,"error":"stale_timestamp"}` | `timestamp` fuera de la ventana de 30s |
| `400` | `{"ok":false,"error":"replay"}` | `nonce` ya visto |
| `400` | `{"ok":false,"error":"invalid_payload"}` | Faltan campos o tipos inválidos |
| `404` | `{"ok":false,"error":"uid_not_found"}` | El jugador no existe |
| `404` | `{"ok":false,"error":"item_not_found"}` | El ítem no es entregable |
| `500` | `{"ok":false,"error":"<mensaje>"}` | Error interno (DB caída, transacción rollback, etc.) |

### Firma de respuesta (recomendado, no obligatorio)

Para que el portal valide que la respuesta vino del game server real (y no de un proxy malicioso), incluir también:

```
X-Shop-Signature: sha256=<hex(hmac_sha256(secret, response_body_bytes))>
```

El portal lo valida y si falla marca la entrega como sospechosa (no la rechaza, pero la registra).

---

## 7. Performance y threading

- **Latencia objetivo:** responder en < 2 s.
- **Timeout del portal:** corta a `shop_timeout_ms_test` (default 5 s) y dispara refund automático en CPs.
- **Threading en `HttpListener`:** **no procesar dentro de `GetContext`** (bloquea el game loop). Usar:

```csharp
listener.Start();
listener.BeginGetContext(OnRequest, listener);

void OnRequest(IAsyncResult ar) {
    var l = (HttpListener)ar.AsyncState;
    var ctx = l.EndGetContext(ar);
    l.BeginGetContext(OnRequest, l);   // re-armar antes de procesar
    Task.Run(() => HandleShopRequest(ctx));
}
```

- **Consumo de DB:** usar pool de conexiones MySQL (`MySqlConnectionStringBuilder.Pooling = true`).

---

## 8. Seguridad adicional

| Vector | Mitigación obligatoria |
|---|---|
| MITM en red local | Preferir HTTPS o exponer solo en red privada. |
| Spoof del portal | Solo HMAC garantiza autenticidad — proteger el secret. |
| Replay | Timestamp + nonce + idempotency. |
| Inyección SQL | Parámetros, jamás concatenación. |
| DoS | Limitar conexiones concurrentes (`HttpListener.GetContextCount`-style) y throttle por IP de origen. |
| Allowlist | Filtrar IPs entrantes a la(s) IP(s) del Vercel/cPanel donde corre el portal. |

---

## 9. Ejemplo: request firmado con `curl`

```bash
SECRET="0123456789abcdef..."  # mismo valor que shop_hmac_secret_test
BODY='{"purchase_id":"11111111-2222-3333-4444-555555555555","uid":123456,"item_id":720001,"ip":"203.0.113.42","env":"test","timestamp":1735689600000,"nonce":"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')"

curl -i -X POST "http://192.168.1.50:8080/shop/" \
  -H "Content-Type: application/json" \
  -H "X-Shop-Signature: $SIG" \
  --data "$BODY"
```

---

## 10. Checklist de implementación

- [ ] Levantar `HttpListener` en `http://*:8080/shop/` con re-arme asíncrono.
- [ ] Leer body crudo en bytes (no parsear antes de validar firma).
- [ ] Validar `X-Shop-Signature` con `FixedTimeEquals`.
- [ ] Cache de nonces 5 min.
- [ ] Tabla `delivered_purchases` para idempotencia.
- [ ] Inserción de ítem dentro de transacción + marcado de idempotencia.
- [ ] Catálogo de `item_id` válidos (whitelist).
- [ ] Logs estructurados (purchase_id, uid, item_id, latencia, resultado).
- [ ] Pruebas: firma válida, firma inválida, stale timestamp, replay nonce, duplicate purchase_id, item_id desconocido.
