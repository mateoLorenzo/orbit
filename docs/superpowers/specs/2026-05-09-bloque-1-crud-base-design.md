# Bloque 1 — Servicios CRUD base (sin IA)

**Adaptive Learning Companion · MVP hackathon**
**Fecha**: 2026-05-09
**Estado**: aprobado para implementación

## Contexto

Implementar los 4 servicios del Bloque 1 del documento `servicios_backend.pdf`:
`MateriasService`, `DataRoomService`, `ProgressService`, `UserProfileService`. Son la base de datos de la app, sin dependencias de IA. El resto de los bloques (servicios con provider pattern y servicios sin IA) los consumen.

Stack adaptado al repo actual: **Next.js 16 (App Router) + TypeScript + zod**, en lugar del Node + Express + Postgres del PDF.

## Decisiones tomadas durante el brainstorming

1. **Persistencia**: in-memory store (singleton del módulo). Cero setup, se pierde al reiniciar el server. Suficiente para demo de hackathon.
2. **Naming**: el backend usa los nombres del PDF en español (`Materia`, `File`, `Progress`, `Profile`). El frontend mantiene sus tipos actuales (`Subject`, `Source`, `ContentNode`). No se hace refactor del frontend en este bloque.
3. **File upload**: solo metadata. El endpoint acepta `multipart/form-data` pero no persiste los bytes en disco. `filePath` se setea como `mock://<materiaId>/<fileName>` para que el shape esté preparado para live mode.
4. **Frontend wiring**: independiente. `AppContext` sigue funcionando con sus mocks locales. La integración UI ↔ API queda fuera del scope de este bloque.
5. **Arquitectura**: service modules con store compartido (Opción A del brainstorming). Funciones puras de servicio + route handlers delgados que las invocan.

## Estructura de archivos

```
lib/server/
  store.ts                          # singleton in-memory state
  schemas.ts                        # zod schemas + tipos inferidos
  errors.ts                         # ApiError class + handleRoute wrapper
  services/
    materias.service.ts
    dataroom.service.ts
    progress.service.ts
    profile.service.ts
app/api/
  materias/route.ts                 # POST, GET   /materias
  materias/[id]/route.ts            # GET, DELETE /materias/:id
  materias/[id]/files/route.ts      # POST, GET   /materias/:id/files
  materias/[id]/progress/route.ts          # GET /materias/:id/progress
  materias/[id]/progress/summary/route.ts  # GET /materias/:id/progress/summary
  files/[id]/route.ts               # DELETE /files/:id
  nodos/[id]/status/route.ts        # PATCH  /nodos/:id/status
  profile/route.ts                  # GET, PATCH  /profile
```

## Modelos (zod schemas)

Todos los modelos exportan tanto el schema zod como el tipo inferido.

### Materia
```ts
{
  id: string,            // crypto.randomUUID()
  nombre: string,        // min 1
  createdAt: string      // ISO 8601
}
```

### File
```ts
{
  id: string,
  materiaId: string,
  fileName: string,
  fileType: string,      // MIME type, e.g. 'application/pdf'
  filePath: string,      // 'mock://<materiaId>/<fileName>' en mock mode
  size: number,          // bytes
  uploadedAt: string     // ISO 8601
}
```

### Progress
```ts
{
  id: string,
  nodoId: string,
  status: 'bloqueado' | 'disponible' | 'en_curso' | 'dominado',
  completedAt: string | null   // se setea automáticamente al pasar a 'dominado'
}
```

### Profile (singleton)
```ts
{
  id: 'singleton',
  formatoPreferido: 'texto' | 'audio' | 'video' | 'visual' | 'podcast',
  horariosActivos: string[],     // e.g. ['morning', 'evening']
  erroresRecurrentes: string[],
  friccionPromedio: number       // 0..1
}
```

## Endpoints

Salvo el upload de archivos, el body y la respuesta son JSON.

| Método | Ruta | Body / Query | Respuesta OK | Errores |
|---|---|---|---|---|
| POST | `/api/materias` | `{ nombre }` | `201 Materia` | 400 validation |
| GET | `/api/materias` | — | `200 Materia[]` | — |
| GET | `/api/materias/:id` | — | `200 Materia` | 404 |
| DELETE | `/api/materias/:id` | — | `204` | 404 |
| POST | `/api/materias/:id/files` | `multipart/form-data` con campo `file` | `201 File` | 404, 400 |
| GET | `/api/materias/:id/files` | — | `200 File[]` | 404 |
| DELETE | `/api/files/:id` | — | `204` | 404 |
| GET | `/api/materias/:id/progress` | — | `200 Progress[]` | 404 |
| PATCH | `/api/nodos/:id/status` | `{ status }` | `200 Progress` | 400, 404 |
| GET | `/api/materias/:id/progress/summary` | — | `200 ProgressSummary` | 404 |
| GET | `/api/profile` | — | `200 Profile` | — |
| PATCH | `/api/profile` | `Partial<Profile>` (sin `id`) | `200 Profile` | 400 |

`ProgressSummary`:
```ts
{
  total: number,
  dominado: number,
  enCurso: number,
  disponible: number,
  bloqueado: number,
  percentDominado: number   // 0..100, redondeado a entero
}
```

## Comportamientos transversales

### Validación
Cada route handler parsea el input con zod. En caso de error:
```json
{ "error": "validation", "issues": [...] }   // status 400
```

### Manejo de errores
Una clase `ApiError(status, code, message)` y un wrapper `handleRoute(fn)` que:
- captura `ApiError` y devuelve `{ status, body: { error: code, message } }`,
- captura `ZodError` y devuelve `400 { error: 'validation', issues }`,
- cualquier otro error → `500 { error: 'internal', message: 'Internal server error' }`.

### Cascade delete
Borrar una `Materia` también borra todos los `File[]` con ese `materiaId` (lo pide el PDF). `Progress` no se cascadea porque está atado a `nodoId` (los nodos los maneja el bloque 2).

### PATCH /nodos/:id/status (upsert)
- Si no existe `Progress` para ese `nodoId`, lo crea.
- Si existe, actualiza el `status`.
- Cuando el nuevo `status` es `'dominado'`, setea `completedAt = new Date().toISOString()`.
- Cuando el nuevo `status` es distinto de `'dominado'`, deja `completedAt` en `null`.

### Profile singleton
- Existe siempre exactamente un `Profile` con `id: 'singleton'`, seedeado al arrancar el store.
- `PATCH /profile` recibe un partial y hace merge. El campo `id` se ignora si viene en el body.

### Progress por materia
Como `Progress` no tiene `materiaId` (vive sobre `nodoId`), por ahora `GET /materias/:id/progress` y el summary devuelven **todos los Progress del store** con un comentario `// TODO bloque 2: filtrar por nodos de la materia` y validan que la `materiaId` exista. Cuando exista `LearningPathService`, se filtra por los `nodoId` que pertenecen a esa materia.

### Seed inicial
`store.ts` arranca con:
- `materias: []`
- `files: []`
- `progress: []`
- `profile`: el singleton con `formatoPreferido: 'texto'`, `horariosActivos: []`, `erroresRecurrentes: []`, `friccionPromedio: 0.5`.

## Testing

Framework: **Vitest** (se agrega como devDependency).

- Un test file por servicio (`materias.service.test.ts`, `dataroom.service.test.ts`, `progress.service.test.ts`, `profile.service.test.ts`).
- Cobertura mínima: happy path + edge cases (404, validación, cascade delete, upsert de Progress, status `dominado` setea `completedAt`).
- Helper `resetStore()` que se invoca en `beforeEach` para aislar tests.
- Tests de route handlers: invocar el handler directamente con un `Request` mock y assertear la `Response`.
- Disciplina TDD: tests del service primero, implementación después; route handlers después de los services.

## Out of scope

- Autenticación / multi-usuario (PDF lo confirma).
- Persistencia entre reinicios del server.
- Guardado de bytes de archivos.
- Refactor del frontend para consumir la API.
- Servicios con IA (bloques 2 y 3).
- Endpoints WebSocket o streaming.
- Endpoints de los nodos del learning path (bloque 2).

## Tabla resumen de archivos a crear

| Archivo | Líneas estimadas |
|---|---|
| `lib/server/store.ts` | ~30 |
| `lib/server/schemas.ts` | ~60 |
| `lib/server/errors.ts` | ~40 |
| `lib/server/services/materias.service.ts` | ~40 |
| `lib/server/services/dataroom.service.ts` | ~50 |
| `lib/server/services/progress.service.ts` | ~70 |
| `lib/server/services/profile.service.ts` | ~30 |
| `app/api/materias/route.ts` | ~30 |
| `app/api/materias/[id]/route.ts` | ~30 |
| `app/api/materias/[id]/files/route.ts` | ~40 |
| `app/api/materias/[id]/progress/route.ts` | ~25 |
| `app/api/materias/[id]/progress/summary/route.ts` | ~25 |
| `app/api/files/[id]/route.ts` | ~25 |
| `app/api/nodos/[id]/status/route.ts` | ~30 |
| `app/api/profile/route.ts` | ~30 |
| Tests (4 archivos) | ~300 total |
| `vitest.config.ts` | ~10 |

Total aproximado: ~865 líneas.

## Validación posterior con ingeniería (del PDF)

Las preguntas abiertas del PDF se mantienen como notas para resolver cuando llegue el live mode:
- Migración a Postgres (con o sin pgvector).
- Reemplazo del store in-memory por un AssetStorageService real.
- Endpoints WebSocket si los necesita el bloque 2.
- Modelo de Nodo con sus 5 steps (lo define el bloque 2).
