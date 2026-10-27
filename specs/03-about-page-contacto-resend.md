# 03 — About page y formulario de contacto con Resend

**Estado:** Approved
**Depende de:** SPEC 02
**Fecha:** 2026-09-07

**Objetivo:** Implementar la pantalla **About** en `/about`, portando el diseño de `about.jsx` del template `home-about` (misión, highlights y formulario de contacto), y conectar el envío del formulario a un correo real mediante una Server Action que usa Resend.

## Alcance

**Incluye:**

- Nueva pantalla **About** en `app/about/page.tsx` (client component), puerto de `about.jsx`: hero con kicker "▸ ACERCA DE", título `ACERCA DE ARCADE VAULT`, párrafo de misión, fila de 3 `highlight` con `HighlightIcon` (HEART/BROWSER/PLANT), divisor animado (`about-divider` con píxeles parpadeantes), y sección de contacto (`about-contact`) con intro + tips y el formulario. Animaciones `reveal` al hacer scroll (mismo hook `IntersectionObserver` que ya usa `app/page.tsx`), igual que el prototipo.
- Formulario de contacto con campos **Nombre**, **Correo electrónico**, **Mensaje**:
  - Validación en cliente: campos no vacíos (con animación `shake`, igual que el template) **y** formato de email válido antes de enviar.
  - Campo honeypot oculto (invisible, fuera del flujo de tab, `autoComplete="off"`) para descartar envíos de bots.
  - Al enviar, invoca una Server Action que envía el correo vía Resend.
  - Estados de la UI: reposo → enviando (botón deshabilitado, texto "ENVIANDO…") → éxito (vista `terminal-success` igual que el template, con botón "ENVIAR OTRO MENSAJE") → error (variante roja de la terminal con el mensaje de error y botón "REINTENTAR" que vuelve al formulario con los datos ingresados intactos).
  - Si el honeypot viene relleno, la Server Action no llama a Resend pero devuelve éxito (para no delatar el filtro a un bot).
- **Server Action** `sendContactMessage` en `app/about/actions.ts` (`"use server"`): recibe nombre, email, mensaje y honeypot; si el honeypot está vacío, envía el correo con el SDK de `resend` (`from: CONTACT_FROM_EMAIL`, `to: CONTACT_TO_EMAIL`, `replyTo: <email del visitante>`, asunto y cuerpo con nombre/email/mensaje); devuelve `{ success: true }` o `{ success: false, error: string }`.
- Variables de entorno nuevas: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, documentadas (sin valores reales) en `.env.local.example`. Si falta alguna en runtime, la Server Action devuelve `{ success: false, error: ... }` en vez de lanzar una excepción no controlada.
- Dependencia nueva `resend` agregada a `package.json`.
- Actualización de `components/nav.tsx`: nuevo link **"Acerca de"** → `/about` (activo cuando `pathname === "/about"`), en el menú de escritorio y en el panel móvil.
- Incorporación a `app/globals.css` de la sección `ABOUT PAGE` de `references/templates/home-about/styles.css` (clases `.about*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.term-*`, `.divider`), tal como está en el template. Además, se agregan reglas nuevas (no presentes en el template) para el estado de error del formulario: variante del bloque `terminal-success` en rojo (reutilizando la misma estructura `.term-bar`/`.term-body` con un modificador, p. ej. `.terminal-error`) y estilo del honeypot oculto (`.hp-field`, posicionado fuera de pantalla).

**No incluye (fuera de alcance de este spec):**

- Cualquier persistencia de los mensajes de contacto (base de datos, log, panel de administración). El correo enviado por Resend es el único registro.
- Rate limiting más allá del honeypot (p. ej. límite por IP, CAPTCHA). Si el spam se vuelve un problema real, se aborda en un spec futuro.
- Configurar el dominio verificado o la cuenta de Resend en sí — este spec asume que el usuario configurará `RESEND_API_KEY` y verificará `CONTACT_FROM_EMAIL` en el dashboard de Resend por su cuenta; el spec solo documenta las variables requeridas.
- Internacionalización o soporte de otro idioma distinto al español ya usado en el resto de la app.
- Cambios a las pantallas Home o Biblioteca (spec 02) más allá de agregar el link "Acerca de" al Nav.

## Modelo de datos

No se introduce persistencia. Sí se define el contrato de la Server Action, sin estado guardado entre sesiones:

```ts
// app/about/actions.ts
export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
  honeypot: string; // debe llegar vacío en un envío legítimo
}

export interface ContactActionResult {
  success: boolean;
  error?: string; // solo presente cuando success === false
}
```

Variables de entorno requeridas (`.env.local.example`, sin valores reales):

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=
```

## Plan de implementación

1. **Dependencia.** `npm install resend` y agregar la variable de entorno de ejemplo `.env.local.example` con `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (sin valores).
2. **Estilos globales.** Anexar a `app/globals.css` la sección `ABOUT PAGE` de `references/templates/home-about/styles.css` tal cual, más las reglas nuevas para `.terminal-error` (variante roja de `.terminal-success`) y `.hp-field` (honeypot oculto visualmente pero presente en el DOM y el tab order no interactivo).
3. **Server Action.** Crear `app/about/actions.ts` con `"use server"`, exportando `sendContactMessage(input: ContactFormInput): Promise<ContactActionResult>`. Si `input.honeypot` no está vacío, devuelve `{ success: true }` sin llamar a Resend. Si faltan `RESEND_API_KEY`, `CONTACT_TO_EMAIL` o `CONTACT_FROM_EMAIL`, devuelve `{ success: false, error: "..." }`. En caso contrario, instancia `new Resend(process.env.RESEND_API_KEY)` y llama a `resend.emails.send(...)` con `from`, `to`, `replyTo: input.email`, `subject` y `text`/`html` con nombre, email y mensaje; captura errores del SDK y los traduce a `{ success: false, error: "..." }`.
4. **Pantalla About (`app/about/page.tsx`).** Client component, puerto de `about.jsx`: hero, highlights (`HighlightIcon` inline en el mismo archivo, igual patrón que `FeatureIcon` en `app/page.tsx`), divisor, y sección de contacto con el formulario. El formulario mantiene el estado local (`form`, `sent`, `error`, `shake`, `pending`) y en `onSubmit`: valida no-vacíos y formato de email (regex simple) → si falla, `shake`; si pasa, `pending = true` y llama a `sendContactMessage`; según el resultado pasa a `sent` (éxito) o `error` (con mensaje) sin perder los valores del formulario. Incluye el campo honeypot oculto. El hook de `reveal` (`IntersectionObserver`) se porta igual que en `app/page.tsx`.
5. **Nav actualizado.** En `components/nav.tsx`, agregar el link "Acerca de" (→ `/about`) después de "Salón de la Fama", y sumar `"about"` al tipo/lógica de `isActive` (`pathname === "/about"`). Replicar en el panel móvil.
6. **Verificación.** Correr `npm run lint` y `npm run build`; en `npm run dev`, navegar a `/about`, confirmar el link "Acerca de" resaltado en el Nav, probar el formulario con: envío válido (sin `RESEND_API_KEY` configurada, para ver el estado de error) y, si se dispone de una API key de prueba, un envío real de correo.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` pasa sin errores.
- [ ] `/about` muestra el hero, los 3 highlights, el divisor animado y el formulario de contacto, con la estética del template (`about.jsx` + sección `ABOUT PAGE` de `styles.css`), y las animaciones `reveal` al hacer scroll.
- [ ] El Nav muestra "Acerca de" como link, resaltado cuando `pathname === "/about"`, tanto en escritorio como en el panel móvil.
- [ ] Enviar el formulario con algún campo vacío dispara la animación `shake` y no llama a la Server Action.
- [ ] Enviar el formulario con un email con formato inválido dispara `shake` y no llama a la Server Action.
- [ ] Con datos válidos, el botón muestra "ENVIANDO…" mientras la Server Action está pendiente.
- [ ] Si `sendContactMessage` devuelve `success: true`, se muestra la vista `terminal-success` con el nombre del remitente y el botón "ENVIAR OTRO MENSAJE" que reinicia el formulario.
- [ ] Si `sendContactMessage` devuelve `success: false`, se muestra el estado de error (variante roja) con el mensaje y un botón "REINTENTAR" que vuelve al formulario conservando los valores ingresados.
- [ ] Si el campo honeypot llega relleno, la Server Action devuelve `success: true` sin invocar al SDK de Resend.
- [ ] Sin `RESEND_API_KEY`, `CONTACT_TO_EMAIL` o `CONTACT_FROM_EMAIL` configuradas, la Server Action devuelve `success: false` con un error legible, sin lanzar una excepción no controlada ni romper la build.
- [ ] `app/globals.css` incluye la sección `ABOUT PAGE` del template más `.terminal-error` y `.hp-field`.
- [ ] `.env.local.example` documenta `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` sin valores reales, y ningún valor real de estas variables queda commiteado en el repo.

## Decisiones tomadas y descartadas

- **Ruta `/about`** (en vez de `/acerca-de`): decisión explícita del usuario, coincide con el nombre del archivo del template (`about.jsx`) aunque rompe la convención en español del resto de rutas (`/biblioteca`, `/salon-de-la-fama`).
- **Server Action en vez de Route Handler** para el envío del correo: decisión explícita del usuario; es el patrón nativo de Next.js App Router para mutaciones desde un formulario y evita escribir un endpoint HTTP adicional solo para este uso.
- **Server Action en archivo separado `app/about/actions.ts`** (con `"use server"` al inicio del archivo) en vez de definirla inline dentro de la página: `app/about/page.tsx` es un client component (necesita estado y el hook `reveal`), y una Server Action no puede definirse inline dentro de un client component — debe vivir en su propio módulo `"use server"`. Se co-localiza junto a la página en vez de un directorio `app/actions/` compartido porque, por ahora, es la única Server Action del proyecto.
- **Variables de entorno sin valores reales en el spec**, documentadas solo como nombres en `.env.local.example`: decisión explícita del usuario, evita hardcodear un email o dominio real en el repositorio; el usuario configura los valores reales por su cuenta en Resend y en `.env.local` (ya ignorado por git).
- **Honeypot como única protección anti-spam**: decisión explícita del usuario; es la opción más barata de implementar para un formulario público sin autenticación, sin agregar dependencias ni fricción al usuario legítimo. Rate limiting o CAPTCHA quedan fuera de alcance.
- **Reply-To = email del visitante**: decisión explícita del usuario; permite responder directamente desde el cliente de correo del equipo sin copiar el email manualmente del cuerpo del mensaje.
- **Estado de error como variante visual de `terminal-success` (`.terminal-error`)** en vez de un diseño completamente nuevo: el template no define ningún estado de error, pero reutilizar la estética "terminal" (con color rojo en vez de verde) mantiene la coherencia visual sin inventar un patrón de UI nuevo para la app.
- **No persistir los mensajes de contacto**: el correo enviado por Resend es el registro; agregar una base de datos o tabla de mensajes es un scope mayor no pedido, y el proyecto todavía no tiene capa de persistencia (no hay base de datos en el codebase).
- **`About` como componente único en `app/about/page.tsx`** (incluyendo `HighlightIcon` y el formulario en el mismo archivo), siguiendo el mismo patrón ya usado en `app/page.tsx`, `app/salon-de-la-fama/page.tsx` y `app/juego/[id]/page.tsx` (páginas autocontenidas sin subcomponentes extraídos a `components/`).

## Riesgos identificados

- El SDK de `resend` debe usarse solo del lado del servidor (la Server Action) — si `RESEND_API_KEY` se referencia accidentalmente desde código de cliente, quedaría expuesta en el bundle. El plan de implementación confina todo el uso del SDK a `app/about/actions.ts`.
- El honeypot solo filtra bots simples que rellenan todos los campos de un formulario sin ejecutar JS/CSS; no detiene spam dirigido o bots que ya conocen el patrón. Es una mitigación básica, no una solución robusta.
- Sin `RESEND_API_KEY` configurada en el entorno de desarrollo o de despliegue, todo envío de formulario mostrará el estado de error — es el comportamiento esperado hasta que el usuario configure sus credenciales de Resend, pero conviene confirmarlo antes de asumir que el formulario "no funciona".
