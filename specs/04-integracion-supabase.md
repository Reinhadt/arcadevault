# 04 — Integración base con Supabase

**Estado:** Implemented
**Depende de:** Ninguna (sigue la convención de variables de entorno documentadas en `.env.local.example` introducida en SPEC 03)
**Fecha:** 2026-10-27

**Objetivo:** Dejar Supabase integrado y verificado en la app Next.js (dependencias, variables de entorno y clientes de navegador y servidor) para que futuras specs construyan auth, perfiles y puntajes sobre esa base, sin implementar ninguna de esas funcionalidades todavía.

## Alcance

**Incluye:**

- Dependencias nuevas en `package.json`: `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno nuevas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas (sin valores reales) en `.env.local.example`. Los valores reales se cargan en `.env.local` (ya ignorado por git).
- Cliente de **navegador** en `lib/supabase/client.ts`: exporta `createClient()` basado en `createBrowserClient` de `@supabase/ssr`, para usar desde client components.
- Cliente de **servidor** en `lib/supabase/server.ts`: exporta `createClient()` asíncrono basado en `createServerClient` de `@supabase/ssr` y `cookies()` de `next/headers`, para usar desde Server Components, Server Actions y Route Handlers.
- Ruta temporal de verificación `app/api/health/supabase/route.ts` (Route Handler `GET`) que instancia el cliente de servidor, hace una petición mínima al proyecto y responde `{ ok: true }` o `{ ok: false, error: string }`. Se elimina al terminar la verificación (último paso del plan).
- Si falta alguna de las dos variables de entorno en runtime, el helper falla con un error legible que nombra la variable ausente (no un `undefined` silencioso dentro del SDK).

**No incluye (fuera de alcance de este spec):**

- Autenticación de cualquier tipo (email/contraseña, OAuth, magic link, modo invitado). `components/auth-provider.tsx` y `app/auth/page.tsx` no se modifican y siguen siendo mock.
- `proxy.ts` (refresco de sesión por cookies): no tiene efecto sin auth; se agrega en la spec de autenticación.
- Tablas, políticas RLS, triggers o migraciones (`supabase/migrations/`). La base de datos queda vacía.
- Perfiles de jugador (`profiles`) y cualquier uso de `user_metadata`.
- Persistencia de puntajes, Salón de la Fama real o mover `GAMES`/`seededScores` de `lib/data.ts` a la BD.
- Generación de tipos TypeScript de la BD (`database.types.ts` y genérico `Database`): se hace cuando existan tablas.
- Supabase CLI y entorno local (`supabase init`, `supabase start`); se trabaja contra el proyecto remoto ya conectado por MCP.
- Uso de la contraseña de base de datos (`SUPABASE_DB_PASS` en `.env`) o de claves `service_role`: no se necesitan para esta integración.

## Modelo de datos

Esta feature no introduce estructuras de datos ni tablas. Solo define el contrato de configuración, sin valores reales:

```
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Contrato de los helpers (firmas, sin implementación):

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient;

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>;
```

## Plan de implementación

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. Antes de escribir código, leer en `node_modules/next/dist/docs/` la guía vigente de `cookies()` y Route Handlers (Next.js 16 difiere de versiones previas, según `AGENTS.md`). El proyecto sigue compilando.
2. **Variables de entorno.** Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (vacías) a `.env.local.example`. Obtener la URL y la publishable key del proyecto (herramientas MCP `get_project_url` y `get_publishable_keys`) y cargarlas en `.env.local`.
3. **Cliente de navegador.** Crear `lib/supabase/client.ts` con `createClient()` usando `createBrowserClient`. Valida que ambas variables existan y lanza un error que nombra la ausente. `npm run build` pasa.
4. **Cliente de servidor.** Crear `lib/supabase/server.ts` con `createClient()` asíncrono usando `createServerClient` y el almacén de cookies de `next/headers` (`getAll`/`setAll`; el `setAll` tolera el error de escritura desde Server Components). Misma validación de variables. `npm run build` pasa.
5. **Ruta de verificación.** Crear `app/api/health/supabase/route.ts` (`GET`) que llama a `createClient()` de servidor y a `supabase.auth.getSession()` para validar el cableado, y hace un `fetch` a `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health` con el header `apikey` para confirmar conectividad con el proyecto. Responde `200 { ok: true }` o `500 { ok: false, error }`. Verificar en `npm run dev` con `GET /api/health/supabase` (con las variables cargadas y también sin ellas).
6. **Limpieza.** Eliminar `app/api/health/supabase/route.ts` (y el directorio `app/api/` si queda vacío). Los dos helpers de `lib/supabase/` quedan listos para las specs siguientes.

## Criterios de aceptación

- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` como dependencias.
- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `.env.local.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales, y ningún valor real de Supabase queda commiteado en el repo.
- [ ] `lib/supabase/client.ts` exporta `createClient()` y `lib/supabase/server.ts` exporta `createClient()` asíncrono.
- [ ] Con las variables cargadas, `GET /api/health/supabase` (antes del paso 6) responde `200` con `{ ok: true }`.
- [ ] Sin `NEXT_PUBLIC_SUPABASE_URL` o sin `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, la misma ruta responde `500` con `{ ok: false, error }` donde `error` nombra la variable ausente.
- [ ] Tras el paso 6, `app/api/health/supabase/route.ts` no existe en el repo.
- [ ] `components/auth-provider.tsx`, `app/auth/page.tsx` y `lib/data.ts` no tienen cambios respecto a SPEC 03.
- [ ] El esquema `public` de la BD sigue sin tablas (verificable con `list_tables` del MCP de Supabase).

## Decisiones tomadas y descartadas

- **Solo integración, sin funcionalidad:** decisión explícita del usuario. Auth, perfiles, puntajes y migraciones se difieren a specs propias; así esta spec es chica, verificable y no mezcla más de un dominio.
- **Cliente de navegador + cliente de servidor, sin `proxy.ts`:** el proxy solo refresca cookies de sesión y sin auth sería código muerto. Se agrega en la spec de autenticación.
- **`@supabase/ssr` en vez de usar solo `@supabase/supabase-js`:** es el paquete recomendado por Supabase para el App Router; maneja sesión en cookies para Server Components y Server Actions, que necesitarán las specs de auth.
- **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en vez de `NEXT_PUBLIC_SUPABASE_ANON_KEY`:** decisión explícita del usuario; es la nomenclatura vigente de Supabase y la anon key es la heredada. La publishable key es segura de exponer en el navegador; la protección real vendrá de RLS en specs futuras.
- **No usar `service_role` ni `SUPABASE_DB_PASS`:** no se necesitan para la integración y una clave `service_role` en el repo o en el bundle sería un riesgo de seguridad.
- **Ruta temporal de health check en vez de script externo o solo build/lint:** decisión explícita del usuario; valida runtime real (cookies, env vars, conectividad) con el stack de Next.js. Se elimina en el último paso para no dejar un endpoint público innecesario.
- **Health check contra `/auth/v1/health` en lugar de una consulta a una tabla:** la BD está vacía, así que no hay tabla contra la cual consultar; el endpoint de salud de Auth confirma conectividad sin depender del esquema.
- **Sin generar tipos TypeScript ahora:** decisión explícita del usuario; con el esquema `public` vacío el archivo generado no aporta valor. Se genera cuando existan tablas (herramienta MCP `generate_typescript_types`).
- **Sin migraciones en el repo ni Supabase CLI local:** no hay esquema que versionar todavía; la estrategia de migraciones (`supabase/migrations/` vs. solo MCP) se decide en la primera spec que cree tablas.

## Riesgos identificados

- La publishable key es pública por diseño; si en el futuro se agregan tablas sin RLS habilitado, cualquiera con esa clave podría leerlas o escribirlas. Mitigación: la spec que cree la primera tabla debe habilitar RLS y revisar `get_advisors` del MCP.
- `cookies()` es asíncrono en Next.js 16; usar el patrón de versiones anteriores (síncrono) rompería el cliente de servidor. Mitigación: el paso 1 exige leer la guía vigente en `node_modules/next/dist/docs/` antes de escribir código.
- Si `.env.local` no se carga (servidor de desarrollo ya iniciado antes de crear el archivo), el health check fallará aunque el código sea correcto. Mitigación: reiniciar `npm run dev` tras cargar las variables.

## Qué **no** incluye este spec

- Autenticación (cualquier método) ni cambios al mock de `components/auth-provider.tsx`.
- Tablas, RLS, migraciones, perfiles o puntajes reales.
- `proxy.ts`, tipos generados de la BD y Supabase CLI local.
- Un endpoint de health check permanente.

Cada uno de estos puntos, si se aborda, va en su propia spec.
