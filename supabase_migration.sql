-- ─────────────────────────────────────────────
-- LOGIKA OS — Migración: Transacciones Recurrentes
--
-- Ejecuta esto en tu panel de Supabase:
-- Dashboard > SQL Editor > New Query > Pegar > Run
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transacciones_recurrentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contexto TEXT NOT NULL CHECK (contexto IN ('personal', 'logika')),
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
  importe NUMERIC NOT NULL,
  descripcion TEXT NOT NULL,
  categoria_personal TEXT,
  categoria_logika TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: permitir todo (app personal, un solo usuario)
ALTER TABLE transacciones_recurrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON transacciones_recurrentes
  FOR ALL
  USING (true)
  WITH CHECK (true);
