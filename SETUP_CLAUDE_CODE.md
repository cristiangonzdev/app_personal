# Setup Claude Code para CRM Logika

## 1. Crea la carpeta y arranca

```bash
mkdir crm-logika && cd crm-logika
git init
claude
```

Una vez dentro de Claude Code, **NO pegues el prompt todavía**. Primero monta la base de skills y memoria.

---

## 2. Crea el `CLAUDE.md` en la raíz

Esto se carga automáticamente en cada sesión y evita repetir contexto. Pídele a Claude Code:

```
Crea un archivo CLAUDE.md en la raíz con este contenido exacto:
```

Y le pegas:

```markdown
# CRM Logika Digital — Memoria de proyecto

## Contexto operativo
- Empresa: Logika Digital, agencia AI/automatización en Lanzarote (autónomo ES, IGIC Canarias 7%).
- Operador: Cristian (yo), single user con multi-user ready.
- Servicios vendidos: software custom, chatbots WhatsApp/voz, web, gestión RRSS.
- Modelo ingreso mixto: setup € único + recurrente €/mes.

## Stack obligatorio
- Next.js 15 App Router + TypeScript estricto + Tailwind + shadcn/ui
- Supabase (Postgres 15, Auth, Storage, Realtime, Edge Functions Deno)
- n8n self-hosted (Hetzner) para orquestación — NO meter lógica de orquestación en el CRM
- Anthropic API (claude-opus-4-7) para scoring/generación
- Evolution API + Vapi vía webhooks
- Stripe NO en v1 (cobros por transferencia)

## Reglas de código no negociables
- Server Components por defecto; Client Components solo cuando hay interactividad real.
- Server Actions para mutations, salvo endpoints que consume n8n (esos = route handlers).
- RLS habilitado en TODA tabla, una policy por operación + rol, NUNCA `FOR ALL`.
- Soft delete con `deleted_at`. Trigger `updated_at` en cada tabla.
- Idempotencia con `request_id` en webhooks entrantes.
- Migrations: `supabase/migrations/YYYYMMDDHHmmss_descripcion.sql`, comentarios densos en SQL destructivo.
- Tipos TS autogenerados con `supabase gen types typescript`.
- Idioma UI: es-ES. Idioma código y commits: español. Commits convencionales.
- Moneda: EUR. Timezone: Atlantic/Canary.

## Reglas de comunicación
- No expliques conceptos básicos.
- No te disculpes.
- Decisiones técnicas estándar: ejecuta. Trade-offs reales: 2 opciones + recomendación + sigue.
- Antes de cada módulo: plan en 5-8 bullets, espera OK.
- Al terminar fase: commit + resumen de lo hecho y lo pendiente.
- Si una librería tiene <500 stars o >6 meses sin commits, busca alternativa.

## Estructura del repo
```
/app                    # Next.js App Router
/components             # shadcn + custom
/lib                    # supabase clients, utils, anthropic
/types                  # tipos generados + custom
/hooks
/supabase
  /migrations
  /functions            # Edge Functions Deno
  /seed.sql
/.claude
  /skills               # skills locales del proyecto
CLAUDE.md
```

## Estado actual
[Claude actualiza esta sección al terminar cada fase]

- [ ] Fase 0: Bootstrap
- [ ] Fase 1: Schema completo + seeds
- [ ] Fase 2: Auth + Layout
- [ ] Fase 3.1: Pipeline ventas
- [ ] Fase 3.2: Clientes 360°
- [ ] Fase 3.3: Pagos y facturación
- [ ] Fase 3.4: Proyectos
- [ ] Fase 3.5: Comunicaciones
- [ ] Fase 3.6: Marketing
- [ ] Fase 3.7: Analytics
- [ ] Fase 3.8: Webhooks n8n
- [ ] Fase 4: Hardening
```

---

## 3. Instala skills locales del proyecto

En la misma sesión:

```
Crea la estructura .claude/skills/ y descarga estos skills oficiales:
1. supabase-developer (RLS y schema patterns)
2. frontend-design de Anthropic (anti-AI-slop)
3. postgres-best-practices oficial Supabase

Si no encuentras los repos exactos, créame skills SKILL.md mínimos
con las reglas que ya están en CLAUDE.md, separados por concern.
```

---

## 4. Configura permisos para que Claude no te pregunte cada paso

Crea `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(npx supabase *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git checkout -b *)",
      "Edit",
      "Write",
      "Read"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm -rf *)",
      "Bash(supabase db reset *)"
    ]
  }
}
```

Esto permite que Claude trabaje fluido pero no haga `git push` ni resets de DB sin tu OK.

---

## 5. Ahora sí, pega el mega-prompt

Con `CLAUDE.md` ya cargado, el mega-prompt original se simplifica porque la mitad del contexto ya vive en memoria. Puedes pegar **solo desde `<scope>` hasta `<final_instruction>`** del prompt anterior. Las secciones `<role>`, `<context>`, `<stack>`, `<working_protocol>` ya están en `CLAUDE.md`.

---

## 6. Comandos útiles durante el desarrollo

Dentro de Claude Code:

```
/clear              # limpia contexto, pero CLAUDE.md persiste
/compact            # comprime conversación larga sin perder hilo
/cost               # mira cuánto llevas gastado
#                   # añade memoria a CLAUDE.md sin salir
/skills             # lista skills cargados
```

Truco: cuando termines una fase, dile:
```
Actualiza CLAUDE.md marcando la fase X como completada y añade en
"Estado actual" 3 bullets con decisiones clave tomadas en esta fase.
```

Eso es lo que mantiene el proyecto coherente entre sesiones.

---

## 7. Workflow recomendado por sesión

1. `claude` en la carpeta del proyecto.
2. Pregunta primero: `¿Qué fase toca según CLAUDE.md? Resúmeme el plan de hoy en 5 bullets.`
3. Trabaja la fase. No hagas más de una fase grande por sesión — el contexto se degrada.
4. Antes de cerrar: `Actualiza CLAUDE.md y haz commit del progreso de hoy.`
5. `/cost` para llevar control. Una fase grande son típicamente 1-3M tokens en Opus 4.7.

---

## 8. Cuándo cambiar de Opus a Sonnet

- **Opus 4.7:** diseño de schema, decisiones arquitecturales, lead scoring AI, generación inicial de cada módulo.
- **Sonnet 4.6:** refactors, fixes de bugs concretos, escribir tests, ajustes de UI puntuales.

En Claude Code: `/model claude-sonnet-4-6` para cambiar a mitad de sesión.
