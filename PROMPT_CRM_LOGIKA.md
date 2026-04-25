# PROMPT — Construcción CRM Logika Digital

> Pégalo tal cual en **Claude Code** (terminal) en la raíz de un proyecto vacío. Si usas Claude.ai web, divide en 3 mensajes: bloque 1 = `<context>` + `<stack>`, bloque 2 = `<scope>` + `<data_model>`, bloque 3 = `<execution_plan>` + `<acceptance>`. Modelo: **Claude Opus 4.7**. Activa skills: `supabase-developer`, `frontend-design`, `postgres-best-practices`, `stripe-best-practices` si las tienes instaladas.

---

```xml
<role>
Eres un arquitecto full-stack senior especializado en construir SaaS B2B en Next.js 15 (App Router) + Supabase + n8n. Trabajas para Logika Digital, una agencia de automatización e IA en Lanzarote. Vas a construir el CRM interno de la agencia desde cero, production-ready, no un MVP de juguete. No pidas confirmación para decisiones técnicas estándar. No te disculpes. No expliques conceptos básicos (sé qué es RLS, una RPC, un webhook). Si una decisión tiene trade-offs reales, propón 2 opciones con una recomendación clara y sigue.
</role>

<context>
- Empresa: Logika Digital (agencia AI/automatización), opera como autónomo en España (Canarias).
- Servicios vendidos: (1) Desarrollo software a medida, (2) Chatbots WhatsApp/voz, (3) Páginas web, (4) Gestión redes sociales.
- Modelo de ingresos mixto: setup fee único + cuota mensual recurrente (ejemplo real: Faycan €4.000 setup + €200/mes; Canarias Glass €500 setup + €180/mes; Taller Jose Luis recurrente).
- Particularidades fiscales: IGIC Canarias 7% (no IVA peninsular), facturación autónomo, retenciones IRPF cuando aplica.
- Volumen real: 3-15 clientes activos, 20-50 leads en pipeline, ~5 proyectos en ejecución simultánea. Diseña para 10x esto sin reescribir.
- Operador único: yo soy admin, vendedor, dev y account manager. El CRM es para mí (single user ahora, multi-user ready).
</context>

<stack>
OBLIGATORIO. No sustituyas componentes salvo justificación técnica explícita.
- Frontend: Next.js 15 (App Router, Server Components por defecto, Server Actions para mutations), TypeScript estricto, Tailwind CSS, shadcn/ui.
- Backend/DB: Supabase (PostgreSQL 15+, Auth, Storage, Realtime, Edge Functions en Deno).
- Auth: Supabase Auth con magic links + Google OAuth.
- Pagos / facturación: stripe-checkout para cobros recurrentes opcional + generación PDF de facturas con pdf-lib (formato AEAT-válido para autónomo ES).
- Automatización: n8n self-hosted (ya operativo en Hetzner). El CRM expone webhooks que n8n consume; no metas lógica de orquestación dentro del CRM.
- IA: Anthropic API (claude-opus-4-7) para lead scoring, resumen de notas, generación de propuestas, análisis de sentimiento de mensajes WhatsApp.
- Mensajería entrante: Evolution API (WhatsApp) → webhook → /api/webhooks/whatsapp → Supabase. Vapi para llamadas perdidas → webhook idem.
- Hosting: Vercel para Next.js, Supabase cloud para DB.
- Monorepo: pnpm workspace si hay >1 paquete; si no, repo plano.
</stack>

<scope>
Construye TODOS estos módulos. No es opcional. Si el contexto se queda corto, divide en sprints pero no recortes scope.

<module name="1. Pipeline de Ventas">
- Kanban drag-and-drop con etapas configurables (default: Lead → Cualificado → Propuesta → Negociación → Ganado / Perdido).
- Cada deal tiene: cliente potencial, servicio(s) ofertado(s) [software/chatbot/web/RRSS], valor setup €, valor recurrente €/mes, probabilidad %, fecha cierre estimada, fuente (LinkedIn, referido, cold outreach, inbound web), responsable.
- Lead scoring automático con Claude API: input = notas del lead + interacciones registradas; output = score 0-100 + razonamiento + next-best-action. Recalcula al añadir nota.
- Forecast: vista mensual y trimestral con weighted pipeline (valor × probabilidad), MRR proyectado al cierre, gap vs objetivo.
- Detector de stale deals: cualquier deal sin actividad >14 días → flag rojo + sugerencia de mensaje de re-engagement generado por Claude.
- Importación CSV de leads.
</module>

<module name="2. Clientes y Cuentas (360°)">
- Vista cliente con: datos fiscales (CIF/NIF, dirección, IGIC sí/no), contactos múltiples, proyectos activos, suscripciones recurrentes, historial completo de comunicaciones (WhatsApp + email + llamadas Vapi unificados en timeline), facturas, NPS si lo capturas.
- Distinción clara: Lead → Cliente Único (one-shot) → Cliente Recurrente (con MRR activo).
- MRR/ARR por cliente, fecha alta, churn risk score (Claude analiza últimos 30 días: frecuencia mensajes, sentimiento, retrasos en pagos).
- Segmentación por servicio contratado, sector (real estate, automoción, hostelería, turismo), ticket medio, antigüedad.
- Etiquetas custom + campos personalizados.
</module>

<module name="3. Proyectos y Entregables">
- Cada deal ganado puede generar uno o varios proyectos. Tipos predefinidos: software_custom, chatbot, web, social_media_management.
- Plantillas por tipo: un proyecto "chatbot" arranca con tareas estándar (kickoff, mapeo flujos, prompt engineering, integración Evolution API, testing, go-live, training cliente).
- Tareas con: asignado, due date, dependencias, estado, horas estimadas vs reales.
- Milestones con condiciones de pago atadas (ej: "50% al kickoff, 50% a go-live").
- Vista calendario + Gantt simplificado.
- SLA tracking para clientes recurrentes (tiempo de respuesta, tickets abiertos, cumplimiento).
</module>

<module name="4. Pagos y Facturación">
- Generación de facturas PDF cumpliendo requisitos AEAT autónomo España + IGIC Canarias 7%.
- Numeración correlativa anual sin saltos (LOG-2026-0001).
- Estados: borrador → emitida → enviada → pagada → vencida.
- Suscripciones recurrentes: motor de generación automática mensual (cron via Supabase Edge Function + pg_cron) que crea factura, la marca como emitida y dispara webhook a n8n para envío email + WhatsApp recordatorio.
- Conciliación manual de pagos (sin integrar bancos en v1).
- Dashboard financiero: MRR, ARR, ingresos mes vs mes anterior, top 5 clientes por revenue, ratio one-shot vs recurrente, ingresos por servicio.
- Alertas: factura vencida >7 días, churn detectado (cancelación recurrente).
- Exportación CSV trimestral lista para gestoría (modelo 130, 303 IGIC).
</module>

<module name="5. Marketing y Contenido">
- Calendario editorial multi-cuenta: @cgonzalezrom (personal) + @logika_labs (agencia) + cuentas de clientes gestionadas.
- Cada pieza de contenido: tipo (Reel, post, story, blog, email), plataforma, pillar/tema, estado (idea → guion → grabado → editado → publicado), responsable, link al asset en Supabase Storage o URL externa.
- Pipeline de outsourcing: marca un Reel como "para editar" → genera tarea para editor LATAM con brief auto-generado por Claude desde mis notas.
- Campañas: agrupan piezas, tienen objetivo (leads, awareness, ventas), presupuesto, atribución (UTM, código promocional, formulario web).
- Banco de ideas / hooks: tabla buscable con notas tipo Isra Bravo (frase corta, ángulo, CTA).
- Tracking de leads atribuidos a contenido específico (cierre del loop marketing → ventas).
</module>

<module name="6. Comunicaciones unificadas">
- Inbox unificado: WhatsApp (vía Evolution API webhook) + email + voicemails Vapi en una sola vista, ordenado por urgencia.
- Cada mensaje entrante de un número/email no reconocido → propone crear lead con un botón.
- Templates de respuesta con variables ({{cliente.nombre}}, {{proyecto.estado}}).
- Generador de respuestas con Claude API que usa contexto del cliente (últimas 20 interacciones + estado proyecto + facturas pendientes).
- Marcador "requiere mi atención" vs "resuelto por bot" (cuando el chatbot del cliente lo cubrió).
</module>

<module name="7. Analytics y Cockpit">
- Dashboard home con: revenue mes, pipeline weighted, deals por etapa, tareas vencen hoy/semana, alerts (facturas vencidas, deals stale, churn risk).
- Cohort analysis de clientes recurrentes (retención mes a mes desde alta).
- Funnel de conversión: leads → cualificados → propuesta → ganado, con tiempo medio entre etapas.
- Productividad personal: % tiempo en sales / dev / content / admin (input manual rápido o tracking semi-auto via tareas).
- Reportes exportables a PDF para review semanal personal.
</module>

<module name="8. Automatización (hooks para n8n)">
Expón webhooks salientes en estos eventos:
- deal.created, deal.stage_changed, deal.won, deal.lost
- client.created, client.churned
- invoice.created, invoice.paid, invoice.overdue
- project.milestone_reached
- task.assigned, task.overdue
- inbound_message.received (WhatsApp/email/Vapi)
Y endpoints entrantes para que n8n actualice CRM:
- POST /api/webhooks/n8n/lead → crea lead desde formulario web / LinkedIn scraper.
- POST /api/webhooks/n8n/whatsapp → ingesta mensajes Evolution API.
- POST /api/webhooks/n8n/vapi → ingesta llamadas perdidas.
HMAC signing en todos los webhooks. Idempotencia con request_id.
</module>
</scope>

<data_model>
Diseña el schema PostgreSQL completo ANTES de tocar UI. Requisitos:
- snake_case, plurales en tablas (clients, deals, projects, invoices, tasks, contents, communications, automations_log).
- Cada tabla: id uuid pk default gen_random_uuid(), created_at timestamptz default now(), updated_at timestamptz con trigger, deleted_at timestamptz null (soft delete).
- RLS habilitado en TODA tabla. Una policy por operación (select, insert, update, delete) y por rol (anon, authenticated). NO uses FOR ALL. Comentarios en cada policy explicando intent.
- Tabla `users_profiles` extiende auth.users con role enum ('owner','member','viewer'), default_currency, timezone (Atlantic/Canary).
- Foreign keys con ON DELETE estrategia explícita (RESTRICT por defecto, CASCADE solo donde tenga sentido como tasks→projects).
- Índices en: foreign keys, columnas de filtro frecuente (deals.stage, deals.owner_id, invoices.status, invoices.due_date), y un índice GIN en `tags text[]` y campos jsonb buscables.
- Migrations con CLI Supabase, archivo por feature lógica, naming `YYYYMMDDHHmmss_descripcion.sql`. Comentarios densos en SQL destructivo.
- RPCs de PostgreSQL para operaciones complejas (ej: `fn_calculate_mrr(period date)`, `fn_deal_won(deal_id uuid)` que crea cliente + proyecto + suscripción atómicamente).
- Edge Functions Deno para: cron mensual de facturación recurrente, webhook handlers, llamadas a Anthropic API (no expongas API key al cliente).
- Storage buckets: `invoices` (privado, signed URLs), `content_assets` (privado), `client_files` (privado por cliente vía RLS).
- Realtime suscripciones en: deals (kanban live update), inbox (mensajes entrantes), tasks asignadas.
</data_model>

<frontend_aesthetics>
NUNCA uses estética genérica de IA: ni gradientes morados sobre fondo oscuro, ni Inter/Roboto, ni cards con sombra suave por defecto, ni iconos lucide en cada esquina, ni emoji decorativo en headings.

Antes de empezar a codear UI, propón 4 direcciones visuales distintas para el CRM. Cada una en una línea: bg hex / accent hex / typeface principal — racional en una frase. Espera mi elección. Después implementa SOLO esa dirección.

Restricciones: dark mode debe ser nativo (no afterthought). Densidad de información alta (esto es una herramienta de operaciones, no una landing). Tipografía con personalidad — considera mono para datos numéricos. Animaciones discretas y funcionales (transiciones de estado kanban, no decorativas). Mobile responsive obligatorio (uso real desde móvil consultando un deal en una reunión).

Pide explícitamente: "Build a fully-featured implementation. Go beyond the basics. Include keyboard shortcuts (cmd+k command palette, j/k navigation in lists, e to edit), inline editing in tables, optimistic updates en mutations, skeleton loaders por sección, error boundaries con retry."
</frontend_aesthetics>

<execution_plan>
Trabaja en este orden. NO saltes pasos. Al terminar cada fase, haz commit con mensaje convencional y resume qué quedó hecho + qué queda.

FASE 0 — Bootstrap (1 sesión)
- pnpm create next-app con TypeScript + Tailwind + App Router.
- Configura Supabase local con CLI, link a proyecto cloud.
- Instala shadcn/ui base components.
- Configura ESLint estricto, prettier, husky pre-commit con typecheck.
- Estructura carpetas: /app, /components, /lib (supabase clients, utils), /types, /hooks, supabase/migrations, supabase/functions.
- .env.example con TODAS las variables. README con setup en <10 minutos.

FASE 1 — Schema DB completo
- Diseña TODO el schema (8 módulos) en migrations.
- RLS policies completas.
- Seeds con datos realistas: 3 clientes (Faycan, Canarias Glass, Taller Jose Luis), 8 leads variados, 12 facturas mezclando emitidas/pagadas/vencidas, 5 proyectos en distintos estados.
- Tipos TypeScript autogenerados con `supabase gen types`.
- Antes de continuar, ejecuta los queries clave (fn_calculate_mrr, deal forecast, churn risk) en SQL y pega resultados para validar el modelo.

FASE 2 — Auth + Layout base
- Magic link + Google OAuth funcionando.
- Layout con sidebar persistente, command palette (cmd+k), topbar con notificaciones.
- Tema dark/light con next-themes.

FASE 3 — Módulos en este orden de prioridad (mi prioridad real: ventas > dinero > entrega > marketing):
1. Pipeline de Ventas (kanban + lead scoring AI).
2. Clientes 360° + MRR.
3. Pagos y Facturación (incluye motor cron de recurrentes + PDF AEAT).
4. Proyectos y Tareas.
5. Comunicaciones unificadas.
6. Marketing y Contenido.
7. Analytics y Cockpit.
8. Webhooks n8n + endpoints inbound.

Cada módulo cierra con: tests críticos (al menos happy path + 1 edge case con Vitest), documentación inline en README del módulo, captura de los webhooks que dispara.

FASE 4 — Hardening
- Audit RLS con script que intenta accesos cross-user y debe fallar.
- Rate limiting en endpoints públicos (Upstash Redis o middleware Next).
- Logging estructurado (pino) con redacción de PII.
- Sentry o equivalente.
- Backup strategy documentada.
</execution_plan>

<working_protocol>
- Antes de codear cada módulo: muéstrame el plan en 5-8 bullets, espera OK.
- Trabaja en ramas feature/<modulo>. Un módulo = un PR mental con su commit final.
- Commits convencionales en español: feat(ventas): kanban con drag-and-drop optimista.
- Si encuentras una decisión con trade-off real (ej: server actions vs API routes para una mutation pesada), expón ambas en 3 líneas y recomienda. Sigue tras tu recomendación si en 1 turno no respondo.
- Si una librería que ibas a usar tiene >6 meses sin commits o <500 stars, busca alternativa.
- Cuando uses Anthropic API desde Edge Function, usa el modelo claude-opus-4-7. Streaming cuando sea UI-facing.
- No metas API keys en código. Usa Supabase Vault o variables de entorno.
- Idioma del UI: español (es-ES). Idioma del código y commits: español también (excepto términos técnicos).
- Moneda default: EUR. Timezone: Atlantic/Canary.
- No generes archivos placeholder vacíos. No generes "TODO: implementar". Si no lo vas a implementar ahora, no lo crees.
</working_protocol>

<acceptance_criteria>
El CRM está terminado cuando puedo, en una sesión real de trabajo:
1. Recibir un mensaje WhatsApp de un lead nuevo y verlo aparecer en el inbox sin recargar.
2. Convertirlo a deal en 2 clics, asignar servicios y valor, ver el lead score con razonamiento de Claude.
3. Mover el deal a "Ganado" → confirmar que se crea cliente + proyecto con tareas plantilla + suscripción recurrente activa + primera factura emitida.
4. Generar el PDF de la factura, descargarlo, y verificar que cumple formato AEAT autónomo + IGIC 7%.
5. El día 1 del mes siguiente, el cron emite automáticamente las facturas recurrentes y dispara webhook a n8n.
6. Ver dashboard con MRR actualizado, churn risk de clientes, y forecast trimestral coherente.
7. Programar un Reel en el calendario editorial atribuido a una campaña, marcarlo para editor LATAM, y que cuando llegue un lead con UTM de esa campaña, quede atribuido.
8. Buscar cualquier cliente desde el command palette (cmd+k) y abrirlo en <500ms.
9. Cerrar el portátil, abrir desde móvil, y todo funciona igual.
10. Pasar el audit RLS (un usuario sin permiso no puede leer datos de otro).
</acceptance_criteria>

<final_instruction>
Empieza por la Fase 0. Al terminar el bootstrap, antes de pasar a Fase 1, muéstrame las 4 direcciones visuales para que elija. No pidas permiso para Fase 0, ejecútala.
</final_instruction>
```

---

## Cómo usarlo

1. **Claude Code (recomendado):** Crea carpeta vacía → `claude` → pega el bloque entero. Si tienes skills instalados (`supabase-developer`, `frontend-design`), Claude los invocará solo gracias al matching del frontmatter.
2. **Claude.ai web:** divide en los 3 mensajes que indico arriba para no saturar contexto inicial. Activa Code Execution.
3. **Skills opcionales que merecen instalación previa** (en `.claude/skills/`):
   - `supabase-developer` (FastMCP) — RLS y schema.
   - `frontend-design` (Anthropic public) — anti-AI-slop.
   - `stripe-best-practices` (oficial Stripe) — solo si añades Stripe v2.

## Ajustes que probablemente quieras hacer antes de pegarlo

- Si no quieres Stripe en v1 (cobras por transferencia), elimina la línea de stripe-checkout en `<stack>`.
- Si vas a usar el CRM también para Velvet/OFM en el futuro, añade en `<context>` "multi-tenant ready desde día 1" — eso cambia el schema (todas las tablas con `tenant_id`).
- El bloque `<acceptance_criteria>` es lo que más fuerza calidad. No lo recortes aunque tengas prisa.

¿Quieres que prepare también el `SKILL.md` del propio CRM (para que Claude lo cargue como skill reutilizable cuando vuelvas a iterar sobre él en futuras sesiones)?