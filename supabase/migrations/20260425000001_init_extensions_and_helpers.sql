-- ─────────────────────────────────────────────
-- 00001 — Extensiones, enums, helpers globales
-- ─────────────────────────────────────────────

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Trigger genérico de updated_at
create or replace function public.fn_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Enums core
do $$ begin
  create type role_enum as enum ('owner','member','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_kind as enum ('software_custom','chatbot','web','social_media_management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_stage as enum ('lead','cualificado','propuesta','negociacion','ganado','perdido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_source as enum ('linkedin','referido','cold_outreach','inbound_web','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_type as enum ('lead','one_shot','recurrente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('planificado','en_curso','pausado','entregado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo','doing','blocked','done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('borrador','emitida','enviada','pagada','vencida','anulada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('activa','pausada','cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_channel as enum ('whatsapp','email','vapi','sms','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type comm_direction as enum ('in','out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('idea','guion','grabado','editado','publicado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_kind as enum ('reel','post','story','blog','email','short');
exception when duplicate_object then null; end $$;
