-- ─────────────────────────────────────────────
-- Seed con datos realistas para desarrollo
-- ─────────────────────────────────────────────

-- Clientes
insert into public.clients (id, legal_name, commercial_name, client_type, fiscal_id, igic, sector, ticket_avg, tags) values
  ('11111111-1111-1111-1111-111111111111','Faycan Distribuciones SL','Faycan','recurrente','B-35888888',true,'distribución alimentaria',4200,'{recurrente,canarias}'),
  ('22222222-2222-2222-2222-222222222222','Canarias Glass SLU','Canarias Glass','recurrente','B-35777777',true,'reformas',680,'{recurrente,reformas}'),
  ('33333333-3333-3333-3333-333333333333','Taller Jose Luis','Taller Jose Luis','recurrente','12345678X',true,'automoción',420,'{recurrente,automocion}'),
  ('44444444-4444-4444-4444-444444444444','Inmobiliaria Tropical','Tropical Homes','lead',null,true,'real estate',null,'{lead,real_estate}'),
  ('55555555-5555-5555-5555-555555555555','Hotel Costa Mar','Costa Mar','lead',null,true,'turismo',null,'{lead,turismo}')
on conflict (id) do nothing;

-- Contactos
insert into public.contacts (client_id, full_name, role, email, phone, is_primary) values
  ('11111111-1111-1111-1111-111111111111','Antonio Faycan','CEO','antonio@faycan.es','+34666111111',true),
  ('22222222-2222-2222-2222-222222222222','María Glass','Manager','maria@canariasglass.es','+34666222222',true),
  ('33333333-3333-3333-3333-333333333333','Jose Luis','Owner','joseluis@gmail.com','+34666333333',true),
  ('44444444-4444-4444-4444-444444444444','Lucía Pérez','Directora','lucia@tropical.es','+34666444444',true),
  ('55555555-5555-5555-5555-555555555555','Pedro Costa','Recepción','pedro@costamar.es','+34666555555',true)
on conflict do nothing;

-- Deals (pipeline mezclado)
insert into public.deals (id, title, client_id, services, setup_amount, recurring_amount, probability, expected_close, source, stage, score, score_reasoning, next_best_action) values
  ('aaaaaaaa-0000-0000-0000-000000000001','Chatbot WhatsApp Tropical','44444444-4444-4444-4444-444444444444','{chatbot}',2500,180,40,current_date + 14,'inbound_web','propuesta',72,'Sector activo, contacto rápido, presupuesto medio.','Enviar caso de éxito Faycan'),
  ('aaaaaaaa-0000-0000-0000-000000000002','Web + RRSS Costa Mar','55555555-5555-5555-5555-555555555555','{web,social_media_management}',1800,250,30,current_date + 21,'referido','negociacion',81,'Referido caliente, ticket 2x media. Decisor identificado.','Cerrar reunión presencial esta semana'),
  ('aaaaaaaa-0000-0000-0000-000000000003','Software custom inventario','11111111-1111-1111-1111-111111111111','{software_custom}',6500,300,55,current_date + 35,'inbound_web','cualificado',68,'Cliente activo expandiendo. Necesidad clara.','Discovery técnico'),
  ('aaaaaaaa-0000-0000-0000-000000000004','Chatbot voz Vapi','22222222-2222-2222-2222-222222222222','{chatbot}',3200,220,20,current_date + 60,'cold_outreach','lead',45,'Contactado pero sin respuesta clara aún.','Mensaje seguimiento + caso de uso')
on conflict (id) do nothing;

-- Suscripciones activas (recurrentes existentes)
insert into public.subscriptions (client_id, service, amount_monthly, starts_on, description) values
  ('11111111-1111-1111-1111-111111111111','chatbot',200,current_date - 120,'Mantenimiento chatbot WhatsApp'),
  ('22222222-2222-2222-2222-222222222222','web',180,current_date - 80,'Hosting + mantenimiento web'),
  ('33333333-3333-3333-3333-333333333333','social_media_management',420,current_date - 200,'Gestión Instagram + TikTok')
on conflict do nothing;

-- Proyectos
insert into public.projects (id, client_id, name, kind, status, starts_on) values
  ('bbbbbbbb-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Chatbot Faycan v2','chatbot','en_curso',current_date - 30),
  ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Rediseño web Glass','web','planificado',current_date - 5)
on conflict (id) do nothing;

-- Tareas
insert into public.tasks (project_id, title, status, due_on) values
  ('bbbbbbbb-0000-0000-0000-000000000001','Mapeo flujos nuevos','done',current_date - 20),
  ('bbbbbbbb-0000-0000-0000-000000000001','Prompt engineering FAQs','doing',current_date + 3),
  ('bbbbbbbb-0000-0000-0000-000000000001','Testing en sandbox','todo',current_date + 7),
  ('bbbbbbbb-0000-0000-0000-000000000002','Wireframes home','todo',current_date + 5)
on conflict do nothing;

-- Facturas
do $$
declare v_year int := extract(year from now())::int;
begin
  insert into public.invoices (number, client_id, status, issue_date, due_date, subtotal, igic_pct, igic_amount, total, notes)
  values
    (public.fn_next_invoice_number(v_year),'11111111-1111-1111-1111-111111111111','pagada', current_date - 60, current_date - 45, 200, 7.0, 14, 214, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'22222222-2222-2222-2222-222222222222','pagada', current_date - 60, current_date - 45, 180, 7.0, 12.6, 192.6, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'33333333-3333-3333-3333-333333333333','emitida', current_date - 5, current_date + 10, 420, 7.0, 29.4, 449.4, 'Mensualidad'),
    (public.fn_next_invoice_number(v_year),'11111111-1111-1111-1111-111111111111','vencida', current_date - 35, current_date - 5, 200, 7.0, 14, 214, 'Mensualidad pendiente');
end $$;

-- Comunicaciones
insert into public.communications (client_id, channel, direction, from_addr, body, occurred_at, needs_attention) values
  ('44444444-4444-4444-4444-444444444444','whatsapp','in','+34666444444','Hola, ¿podríais pasarme presupuesto del chatbot?', now() - interval '2 hours', true),
  ('55555555-5555-5555-5555-555555555555','email','in','pedro@costamar.es','Os vimos en LinkedIn, queremos refrescar la web.', now() - interval '6 hours', true),
  ('11111111-1111-1111-1111-111111111111','whatsapp','out',null,'Te paso link de la nueva versión del bot.', now() - interval '1 day', false);

-- Marketing seed
insert into public.campaigns (name, goal, budget, starts_on, utm_campaign) values
  ('Lanzamiento Chatbot Q2','leads',500,current_date - 14,'chatbot-q2'),
  ('Casos de éxito Faycan','awareness',0,current_date - 30,'casos-exito');

insert into public.contents (title, kind, platform, account_handle, status, pillar) values
  ('Reel cómo Faycan automatizó pedidos','reel','instagram','@logika_labs','grabado','automatización'),
  ('Post LinkedIn IGIC vs IVA agencias','post','linkedin','@cgonzalezrom','idea','fiscalidad'),
  ('Short YouTube Vapi en español','short','youtube','@logika_labs','editado','voz IA');

insert into public.hooks_bank (phrase, angle, cta, tags) values
  ('Tu chatbot no necesita ser inteligente, necesita cerrar.','contrarian','Mira el caso','{ventas,chatbot}'),
  ('Lo que un autónomo aprende facturando 80k al año en Canarias.','autoridad','Hilo','{fiscal,autónomo}');
