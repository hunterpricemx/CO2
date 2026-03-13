# Conquer Classic Plus — Plan de Acción

> **Documento vivo.** Actualiza los estados de las fases a medida que avanza el desarrollo.
> Última revisión: Marzo 2026

---

## Tabla de Contenidos

1. [Visión del Proyecto](#visión-del-proyecto)
2. [Stack Técnico](#stack-técnico)
3. [Arquitectura](#arquitectura)
4. [Variables de Entorno](#variables-de-entorno)
5. [Estructura de Carpetas](#estructura-de-carpetas)
6. [Fases de Desarrollo](#fases-de-desarrollo)
7. [Schema de Base de Datos](#schema-de-base-de-datos)
8. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
9. [Convenciones de Código](#convenciones-de-código)
10. [Cómo Ejecutar](#cómo-ejecutar)
11. [Cómo Contribuir](#cómo-contribuir)
12. [Roadmap Futuro](#roadmap-futuro)

---

## Visión del Proyecto

**Conquer Classic Plus** es el sitio web oficial del servidor privado del MMORPG Conquer Online. Provee a los jugadores información sobre el juego, eventos, guías, parches, rankings y gestión de cuentas. A los administradores les ofrece un panel de control completo para gestionar el contenido sin tocar la base de datos directamente.

**Audiencia:**
- Jugadores del servidor (Spanish/English/Portuguese)
- Administradores del servidor

**Versiones del juego soportadas:**
- **Classic Plus 1.0** — versión clásica del servidor
- **Experience 2.0** — versión de mayor experiencia del servidor

---

## Stack Técnico

| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | **Next.js 16** App Router | SSR, file-based routing, Server Actions |
| UI Library | **React 19** + TypeScript strict | Tipos en toda la codebase, mejor DX |
| Estilos | **Tailwind CSS v4** | CSS-first config, mejor performance |
| Componentes | **shadcn/ui** + Radix UI | Accesibles, customizables, sin overhead |
| Backend | **Supabase** | DB (PostgreSQL), Auth, Storage todo en uno |
| SSR Supabase | **@supabase/ssr** | Server Components + Middleware auth |
| i18n | **next-intl** | Routing por locale, type-safe translations |
| Editor | **TipTap** | WYSIWYG extensible, React-first |
| Formularios | **react-hook-form** + **zod** | Validación type-safe en cliente y servidor |
| Notificaciones | **sonner** | Toast ligero y bonito |
| Íconos | **lucide-react** | Tree-shakeable, consistente |
| Fechas | **date-fns** | Ligero, funcional |

> **Nota sobre MariaDB:** Por ahora TODO va a Supabase. Cuando haya acceso a la MariaDB de producción del juego, solo hay que: agregar `mysql2`, crear `lib/db.ts` y actualizar `modules/users/queries.ts`. El resto del proyecto no cambia.

---

## Arquitectura

### Patrón de módulos

Cada módulo de negocio es autónomo y vive en `modules/`. Contiene todo lo que le pertenece:

```
modules/[nombre]/
  types.ts        ← Tipos TypeScript del módulo (interfaces, enums, schemas Zod)
  actions.ts      ← Server Actions de Next.js (mutaciones: create/update/delete)
  queries.ts      ← Queries de Supabase (read-only, para Server Components)
  components/     ← Componentes React específicos del módulo
  README.md       ← Documentación del módulo
  index.ts        ← Re-exports públicos
```

**Regla:** los módulos no se importan entre sí directamente. Comparten tipos via `types/index.ts`.

### Autenticación

- **Admins:** Supabase Auth con `user_metadata.role = 'admin'`. Acceso a `/admin/*`.
- **Jugadores:** Supabase Auth con `user_metadata.role = 'player'`. Acceso a `/[locale]/[version]/myaccount`.
- **Protección:** `middleware.ts` intercepta todas las rutas y verifica el token de Supabase via `@supabase/ssr`.

### Flujo de datos

```
Server Component → queries.ts (createServerClient) → Supabase PostgreSQL
Client Component → createBrowserClient → Supabase Realtime/Storage
Server Action    → actions.ts (createServerClient service_role) → Supabase
```

---

## Variables de Entorno

Crea un archivo `.env.local` en la raíz (ver `.env.example`):

```bash
# Supabase — obtenidas en: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://fjvadikuvcshwxikebhv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...    # Publishable key
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...             # Secret key (¡NUNCA exponer al cliente!)

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=es
NEXT_PUBLIC_DEFAULT_VERSION=1.0
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` tiene acceso total al DB sin RLS. Solo debe usarse en Server Actions y Server Components, nunca en código cliente.

---

## Estructura de Carpetas

```
conquer-react/
├── PLAN.md                          ← Este archivo
├── .env.example                     ← Template de variables de entorno
├── .env.local                       ← Variables reales (no commitear)
│
├── app/                             ← Next.js App Router
│   ├── layout.tsx                   ← Root layout (fonts, providers, Toaster)
│   ├── page.tsx                     ← Landing: selector de versión (/)
│   ├── [locale]/                    ← Routing por idioma (es/en/pt)
│   │   └── [version]/              ← Routing por versión (1.0/2.0)
│   │       ├── layout.tsx          ← Layout público (Header + Footer)
│   │       ├── page.tsx            ← Home de la versión
│   │       ├── login/page.tsx
│   │       ├── register/page.tsx
│   │       ├── download/page.tsx
│   │       ├── donate/page.tsx
│   │       ├── vip/page.tsx
│   │       ├── guides/
│   │       │   ├── page.tsx        ← Listado con búsqueda
│   │       │   └── [slug]/page.tsx ← Detalle de guía
│   │       ├── fixes/
│   │       │   ├── page.tsx
│   │       │   └── [slug]/page.tsx
│   │       ├── events/page.tsx
│   │       ├── market/page.tsx
│   │       ├── rankings/page.tsx
│   │       ├── myaccount/page.tsx  ← Protegida (requiere auth player)
│   │       └── terms/page.tsx
│   └── admin/                      ← Panel de administración (protegido)
│       ├── layout.tsx              ← Admin layout con Sidebar
│       ├── page.tsx                ← Dashboard con KPIs
│       ├── login/page.tsx          ← Login de admin (Supabase Auth)
│       ├── events/
│       │   ├── page.tsx            ← Listado de eventos
│       │   ├── new/page.tsx        ← Crear evento
│       │   └── [id]/page.tsx       ← Editar evento
│       ├── guides/ (igual estructura)
│       ├── fixes/  (igual estructura)
│       ├── users/page.tsx          ← Gestión de usuarios
│       └── donations/page.tsx      ← Vista de donaciones
│
├── modules/                         ← Módulos de negocio (arquitectura modular)
│   ├── events/                     ← Ver modules/events/README.md
│   ├── guides/                     ← Ver modules/guides/README.md
│   ├── fixes/                      ← Ver modules/fixes/README.md
│   ├── users/                      ← Ver modules/users/README.md
│   ├── donations/                  ← Ver modules/donations/README.md
│   └── auth/                       ← Ver modules/auth/README.md
│
├── components/
│   ├── ui/                         ← shadcn/ui (auto-generados, no editar)
│   ├── shared/                     ← Componentes del sitio público
│   │   ├── Header.tsx             ← Nav global con i18n + server clock
│   │   ├── Footer.tsx
│   │   ├── LanguageSelector.tsx
│   │   ├── ServerClock.tsx        ← Relojes US/EU en tiempo real
│   │   └── VersionBadge.tsx
│   └── admin/                     ← Componentes del panel admin
│       ├── AdminSidebar.tsx       ← Nav lateral del admin
│       ├── AdminHeader.tsx        ← Header del admin con user info
│       ├── DataTable.tsx          ← Tabla reutilizable (sort, filter, paginación)
│       ├── KPICard.tsx            ← Cards de métricas del dashboard
│       ├── ContentEditor.tsx      ← TipTap con tabs ES/EN/PT
│       └── ImageUpload.tsx        ← Upload a Supabase Storage
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← createBrowserClient (Client Components)
│   │   ├── server.ts             ← createServerClient (Server Components/Actions)
│   │   └── database.types.ts    ← Tipos generados del schema de Supabase
│   └── utils.ts                  ← cn() helper y utilidades generales
│
├── i18n/
│   ├── request.ts                ← Configuración next-intl (getRequestConfig)
│   ├── routing.ts                ← Locales y versiones soportadas
│   └── messages/
│       ├── es.json               ← Traducciones en español
│       ├── en.json               ← Traducciones en inglés
│       └── pt.json               ← Traducciones en portugués
│
├── hooks/
│   ├── useGameUser.ts            ← Hook para la sesión del jugador
│   └── useAdminUser.ts           ← Hook para la sesión del admin
│
├── types/
│   └── index.ts                  ← Tipos globales compartidos entre módulos
│
├── middleware.ts                  ← Auth guard (/admin) + next-intl routing
├── next.config.ts
└── package.json
```

---

## Fases de Desarrollo

### Leyenda de estados
- ✅ **Completado** — funcional y probado
- 🔄 **En progreso** — actualmente en desarrollo
- ⬜ **Pendiente** — no iniciado
- 🚫 **Bloqueado** — esperando dependencia

---

### Fase 0 — Setup del Proyecto
| # | Tarea | Estado |
|---|---|---|
| 0.1 | Crear proyecto Next.js 16 con TypeScript | ✅ |
| 0.2 | Configurar Tailwind CSS v4 + PostCSS | ✅ |
| 0.3 | Instalar dependencias (Supabase, next-intl, TipTap, etc.) | ✅ |
| 0.4 | Inicializar shadcn/ui + instalar componentes base | ✅ |
| 0.5 | Configurar `.env.local` y `.env.example` | ✅ |
| 0.6 | Crear `PLAN.md` (este archivo) | ✅ |
| 0.7 | Actualizar `next.config.ts` con next-intl + imágenes Supabase | ✅ |

---

### Fase 1 — Infraestructura
| # | Tarea | Estado |
|---|---|---|
| 1.1 | `lib/supabase/client.ts` — createBrowserClient | ✅ |
| 1.2 | `lib/supabase/server.ts` — createServerClient | ✅ |
| 1.3 | `lib/supabase/database.types.ts` — tipos del schema | ✅ |
| 1.4 | `middleware.ts` — auth guard + next-intl routing | ✅ |
| 1.5 | `i18n/routing.ts` + `i18n/request.ts` | ✅ |
| 1.6 | `i18n/messages/es.json`, `en.json`, `pt.json` | ✅ |
| 1.7 | `modules/auth/` — helpers de Supabase Auth | ✅ |
| 1.8 | `app/layout.tsx` — Root layout con providers + fonts | ✅ |
| 1.9 | `types/index.ts` — tipos globales compartidos | ✅ |

---

### Fase 2 — Schema Supabase
| # | Tarea | Estado |
|---|---|---|
| 2.1 | SQL: tabla `profiles` (vinculada a auth.users) | ✅ |
| 2.2 | SQL: tabla `events` (multilingual) | ✅ |
| 2.3 | SQL: tabla `guides` + `guide_categories` | ✅ |
| 2.4 | SQL: tabla `fixes` | ✅ |
| 2.5 | SQL: tabla `donations` | ✅ |
| 2.6 | SQL: tabla `rankings` + `market_items` | ✅ |
| 2.7 | RLS policies (lectura pública, escritura admin) | ✅ |
| 2.8 | Storage bucket `conquer-media` + policies | ✅ |
| 2.9 | Seed: `guide_categories` + datos de ejemplo | ✅ |
| 2.10 | **⚠️ ACCIÓN REQUERIDA:** Ejecutar SQL en Supabase Dashboard | ⬜ |

---

### Fase 3 — Design System + Componentes Compartidos
| # | Tarea | Estado |
|---|---|---|
| 3.1 | Design tokens en `globals.css` (dark gaming theme) | ✅ |
| 3.2 | `components/shared/Header.tsx` | ✅ |
| 3.3 | `components/shared/Footer.tsx` | ✅ |
| 3.4 | `components/shared/ServerClock.tsx` | ✅ |
| 3.5 | `components/shared/LanguageSelector.tsx` | ✅ |
| 3.6 | `components/admin/AdminSidebar.tsx` | ✅ |
| 3.7 | `components/admin/AdminHeader.tsx` | ✅ |
| 3.8 | `components/admin/DataTable.tsx` | ✅ |
| 3.9 | `components/admin/KPICard.tsx` | ✅ |
| 3.10 | `components/admin/ContentEditor.tsx` (TipTap) | ✅ |
| 3.11 | `components/admin/ImageUpload.tsx` | ✅ |

---

### Fase 4 — Módulos de Negocio
| # | Tarea | Estado |
|---|---|---|
| 4.1 | `modules/events/` completo | ✅ |
| 4.2 | `modules/guides/` completo | ✅ |
| 4.3 | `modules/fixes/` completo | ✅ |
| 4.4 | `modules/users/` completo | ✅ |
| 4.5 | `modules/donations/` completo | ✅ |
| 4.6 | `modules/auth/` completo | ✅ |

---

### Fase 5 — Sitio Público
| # | Tarea | Estado |
|---|---|---|
| 5.1 | Landing page — selector de versión | ✅ |
| 5.2 | Home v1.0 + v2.0 (hero + event cards) | ✅ |
| 5.3 | Página de Eventos | ✅ |
| 5.4 | Página de Guías + búsqueda + detalle | ✅ |
| 5.5 | Página de Fixes + detalle | ✅ |
| 5.6 | Login + Register (Supabase Auth) | ✅ |
| 5.7 | MyAccount (protegida, jugadores) | ✅ |
| 5.8 | Download, Donate, VIP (estáticas) | ✅ |
| 5.9 | Rankings, Market | ✅ |
| 5.10 | Terms, Rules | ✅ |

---

### Fase 6 — Panel Admin
| # | Tarea | Estado |
|---|---|---|
| 6.1 | Admin login page | ✅ |
| 6.2 | Admin dashboard — KPIs | ✅ |
| 6.3 | CRUD de Eventos | ✅ |
| 6.4 | CRUD de Guías | ✅ |
| 6.5 | CRUD de Fixes | ✅ |
| 6.6 | Gestión de Usuarios | ✅ |
| 6.7 | Vista de Donaciones | ✅ |

---

### Fase 7 — Polish
| # | Tarea | Estado |
|---|---|---|
| 7.1 | Loading skeletons en todas las páginas | ⬜ |
| 7.2 | SEO: metadata + Open Graph por página | ⬜ |
| 7.3 | Responsive mobile del panel admin | ⬜ |
| 7.4 | Error boundaries (`error.tsx` + `not-found.tsx`) | ⬜ |
| 7.5 | Actualizar PLAN.md con estado final | ⬜ |

---

## Schema de Base de Datos

Los archivos SQL están en `sql/`. Ejecutarlos en orden en el **SQL Editor de Supabase Dashboard**.

### Tablas

| Tabla | Descripción | Archivo SQL |
|---|---|---|
| `profiles` | Perfiles de usuario (admins + jugadores) | `sql/001_profiles.sql` |
| `events` | Eventos del servidor (multilingual) | `sql/002_events.sql` |
| `guide_categories` | Categorías de guías | `sql/003_guides.sql` |
| `guides` | Guías de juego (multilingual) | `sql/003_guides.sql` |
| `fixes` | Parches y correcciones (multilingual) | `sql/004_fixes.sql` |
| `donations` | Registro de donaciones | `sql/005_donations.sql` |
| `rankings` | Rankings PK y KO | `sql/006_rankings.sql` |
| `market_items` | Ítems del mercado in-game | `sql/006_rankings.sql` |

> Las RLS policies están en `sql/007_rls_policies.sql`.
> La configuración de Storage está en `sql/008_storage.sql`.
> Los datos de ejemplo están en `sql/009_seed.sql`.

### Roles de usuario

Los roles se almacenan en `auth.users.raw_user_meta_data`:
```json
{ "role": "admin" }   // acceso a /admin
{ "role": "player" }  // acceso a /myaccount
```

Para crear el primer admin, usar el SQL de `sql/009_seed.sql` o Supabase Dashboard → Authentication → Users → editar el usuario y agregar `{ "role": "admin" }` en el metadata.

---

## Decisiones Arquitectónicas

### ¿Por qué módulos y no feature folders dentro de `app/`?

Los módulos en `modules/` separan la **lógica de negocio** de la **capa de presentación** (`app/`). Esto permite:
- Reutilizar la misma lógica en páginas públicas y en el panel admin
- Testear la lógica sin montar componentes React
- Escalar el proyecto sin acoplar páginas entre sí

### ¿Por qué Supabase y no una API REST propia?

Supabase provee DB (PostgreSQL), Auth, Storage y Realtime en un solo servicio. Con `@supabase/ssr` tenemos integración server-side nativa para Next.js. Elimina la necesidad de crear y mantener un backend separado.

### ¿Por qué siempre dark mode?

Conquer Online es un juego con estética medieval/oscura. El diseño del sitio original usa exclusivamente dark theme. Se estableció `color-scheme: dark` en `:root` para eliminar el flash de luz en modo claro y simplificar los tokens de color.

### ¿Por qué next-intl?

Es la solución i18n más integrada con Next.js App Router. Soporta Server Components, tiene type-safety para las claves de traducción y el routing por locale es automático via middleware.

### ¿Por qué TipTap como editor?

TipTap es extensible, open-source y React-first. Soporta CSS personalizado para que el contenido editado se vea igual en el editor y en el sitio. Alternativa evaluada: Quill (no React-first), ProseMirror (bajo nivel).

---

## Convenciones de Código

### Naming
- **Componentes:** PascalCase (`EventCard.tsx`)
- **Hooks:** camelCase con prefijo `use` (`useGameUser.ts`)
- **Types/Interfaces:** PascalCase con sufijo descriptivo (`EventRow`, `CreateEventInput`)
- **Server Actions:** verbo + sustantivo en camelCase (`createEvent`, `updateGuide`)
- **Queries:** `get` + sustantivo en camelCase (`getEvents`, `getGuideBySlug`)

### Imports
Usar siempre path aliases en lugar de rutas relativas:
```ts
// ✅ correcto
import { createServerClient } from "@/lib/supabase/server";
import { EventCard } from "@/modules/events";

// ❌ incorrecto
import { createServerClient } from "../../lib/supabase/server";
```

### Server vs Client Components
- Por defecto, **todos los componentes son Server Components**
- Agregar `"use client"` solo cuando se necesite: estado, eventos del browser, hooks de React

### Documentación (TSDoc)
Todas las funciones públicas en `modules/` y `lib/` llevan TSDoc:
```ts
/**
 * Fetches published events for a specific game version.
 *
 * @param version - Game version ("1.0" | "2.0")
 * @param locale  - Locale for translated fields ("es" | "en" | "pt")
 * @returns Array of published events sorted by schedule date
 */
export async function getPublishedEvents(version: GameVersion, locale: Locale) { ... }
```

---

## Cómo Ejecutar

### Requisitos
- Node.js 20+
- npm 10+

### Setup inicial
```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves de Supabase

# 3. Ejecutar el schema SQL en Supabase
# Ir a: https://supabase.com/dashboard/project/fjvadikuvcshwxikebhv/sql/new
# Ejecutar los archivos en sql/ en orden numérico

# 4. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

### Scripts disponibles
```bash
npm run dev      # Servidor dev con Turbopack (puerto 3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

---

## Cómo Contribuir

1. **Lee este PLAN.md** antes de tocar cualquier código
2. **Entiende el módulo** que vas a modificar leyendo su `README.md`
3. **Sigue las convenciones** de naming e imports descritas arriba
4. **Documenta con TSDoc** cualquier función pública nueva
5. **Actualiza este PLAN.md** cuando completes una tarea (cambia ⬜ por ✅)
6. **No mezcles módulos** — si necesitas lógica de otro módulo, importa solo desde su `index.ts`

---

## Roadmap Futuro

Cosas planeadas pero no implementadas en la v1:

- [ ] **MariaDB integration** — cuando haya acceso al servidor de producción: agregar `mysql2`, `lib/db.ts`, actualizar `modules/users/queries.ts`
- [ ] **Deploy a Vercel** — configurar variables de entorno en Vercel, dominio personalizado
- [ ] **Realtime** — actualización en vivo de eventos y rankings usando Supabase Realtime
- [ ] **Notificaciones push** — cuando se crea un nuevo evento, notificar a jugadores suscritos
- [ ] **Tebex integration** — webhook de donaciones de Tebex → tabla `donations`
- [ ] **Modo mantenimiento** — flag global para mostrar página de mantenimiento
- [ ] **Tests E2E** — Playwright para flujos críticos (login, crear evento, etc.)
- [ ] **Analytics** — integrar Plausible o similar para stats de visitas

---

*Este documento fue generado como parte del plan inicial de implementación y debe mantenerse actualizado durante toda la vida del proyecto.*
