# CRM Logika Digital — Memoria de proyecto

## Contexto operativo
- Empresa: Logika Digital, agencia AI/automatización en Lanzarote (autónomo ES, IGIC Canarias 7%).
- Operador: Cristian (yo), single user con multi-user ready.
- Servicios vendidos: software custom, chatbots WhatsApp/voz, web, gestión RRSS.
- Modelo ingreso mixto: setup € único + recurrente €/mes.
- Volumen: 3-15 clientes activos, 20-50 leads en pipeline, ~5 proyectos en ejecución. Diseñar para 10x sin reescribir.

## Stack obligatorio
- Next.js 15 App Router + TypeScript estricto + Tailwind + shadcn/ui (Radix + tailwind-variants).
- Supabase (Postgres 15, Auth con magic-link + Google OAuth, Storage, Realtime, Edge Functions Deno).
- n8n self-hosted (Hetzner) para orquestación — NO meter lógica de orquestación en el CRM.
- Anthropic API (claude-opus-4-7) para scoring/generación. Streaming cuando sea UI-facing.
- Evolution API (WhatsApp) + Vapi (voz) vía webhooks entrantes.
- Stripe NO en v1 (cobros por transferencia + factura PDF AEAT).

## Reglas de código no negociables
- Server Components por defecto; Client Components solo cuando hay interactividad real.
- Server Actions para mutations, salvo endpoints que consume n8n (esos = route handlers).
- RLS habilitado en TODA tabla, una policy por operación + rol, NUNCA `FOR ALL`.
- Soft delete con `deleted_at`. Trigger `updated_at` en cada tabla.
- Idempotencia con `request_id` en webhooks entrantes.
- Migrations: `supabase/migrations/YYYYMMDDHHmmss_descripcion.sql`, comentarios densos en SQL destructivo.
- Tipos TS autogenerados con `supabase gen types typescript`.
- Idioma UI: es-ES. Idioma código y commits: español. Commits convencionales (`feat(ventas): ...`).
- Moneda: EUR. Timezone: Atlantic/Canary.
- No archivos placeholder vacíos. No `TODO: implementar`. Si no se construye, no se crea.

## Reglas de comunicación
- No expliques conceptos básicos.
- No te disculpes.
- Decisiones técnicas estándar: ejecuta. Trade-offs reales: 2 opciones + recomendación + sigue.
- Antes de cada módulo: plan en 5-8 bullets, espera OK.
- Al terminar fase: commit + resumen de lo hecho y lo pendiente.
- Si una librería tiene <500 stars o >6 meses sin commits, busca alternativa.

## Estructura del repo
```
/app                     # Next.js App Router
  /(dashboard)           # rutas protegidas con sidebar
    /ventas              # pipeline kanban
    /clientes            # cuentas 360
    /proyectos           # delivery
    /pagos               # facturas + suscripciones
    /comunicaciones      # inbox unificado
    /marketing           # contenido
    /analytics           # cockpit
  /(auth)                # login / callback
  /api/webhooks/n8n/*    # endpoints inbound
/components              # shadcn + custom
/lib                     # supabase clients, utils, anthropic, n8n
/types                   # tipos generados + custom
/hooks
/supabase
  /migrations
  /functions             # Edge Functions Deno
  /seed.sql
/.claude
  /skills                # skills locales del proyecto
CLAUDE.md
```

## Estado actual
- [x] Fase 0: Bootstrap (Next 15, Tailwind, supabase/ssr, anthropic-ai, shadcn baseline)
- [x] Fase 1: Schema completo + seeds (8 módulos, RLS por operación, RPCs MRR/forecast/won)
- [x] Fase 2: Auth + Layout (magic-link, sidebar, command palette, dark nativo)
- [x] Fase 3.1: Pipeline ventas (kanban + lead scoring AI route)
- [x] Fase 3.2: Clientes 360°
- [x] Fase 3.3: Pagos y facturación (PDF AEAT + IGIC 7%, motor cron)
- [x] Fase 3.4: Proyectos
- [x] Fase 3.5: Comunicaciones (inbox unificado)
- [x] Fase 3.6: Marketing (calendario editorial)
- [x] Fase 3.7: Analytics (cockpit)
- [x] Fase 3.8: Webhooks n8n (HMAC + idempotencia)
- [ ] Fase 4: Hardening (audit RLS, rate-limit, Sentry)

## Decisiones clave
- Multi-tenant ready: NO en v1 (single user). El schema NO añade `tenant_id`; si llega Velvet/OFM se añadirá con migración.
- Cookie de Supabase con nombre único `logika-crm` para no chocar con otras apps en el mismo project.
- RLS v1: policies escritas por rol (`authenticated`) usando `auth.uid()`; `users_profiles.role` se chequea solo en operaciones admin.
- Numeración facturas: `LOG-YYYY-NNNN` correlativo anual con `fn_next_invoice_number(year)`.
- IGIC 7% por defecto en clientes Canarias; campo `clients.igic` boolean.
- Lead scoring: edge function `score-lead` llama a Anthropic, escribe `deals.score` y `deals.score_reasoning`.
