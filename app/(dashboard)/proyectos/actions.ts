'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const projectSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(2),
  kind: z.enum(['software_custom', 'chatbot', 'web', 'social_media_management']),
  status: z.enum(['planificado', 'en_curso', 'pausado', 'entregado', 'cancelado']).default('planificado'),
  starts_on: z.string().optional().nullable().transform(v => v || null),
  ends_on: z.string().optional().nullable().transform(v => v || null),
  hours_estimated: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createProject(formData: FormData) {
  const parsed = projectSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { data, error } = await sb.from('projects').insert(parsed).select('id').single()
  if (error) return { ok: false, error: error.message }

  // Aplica plantilla de tareas si existe
  const { data: tpl } = await sb.from('project_templates').select('task_titles').eq('kind', parsed.kind).maybeSingle()
  if (tpl && Array.isArray((tpl as { task_titles: string[] }).task_titles)) {
    const titles = (tpl as { task_titles: string[] }).task_titles
    await sb.from('tasks').insert(titles.map(t => ({ project_id: data.id, title: t })))
  }

  revalidatePath('/proyectos')
  return { ok: true, id: data.id }
}

export async function updateProject(id: string, formData: FormData) {
  const parsed = projectSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('projects').update(parsed).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/proyectos')
  revalidatePath(`/proyectos/${id}`)
  return { ok: true }
}

export async function archiveProject(id: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/proyectos')
  return { ok: true }
}

const taskSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(2),
  due_on: z.string().optional().nullable().transform(v => v || null),
})

export async function createTask(formData: FormData) {
  const parsed = taskSchema.parse(Object.fromEntries(formData))
  const sb = await getSupabaseServer()
  const { error } = await sb.from('tasks').insert(parsed)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/proyectos/${parsed.project_id}`)
  return { ok: true }
}

export async function deleteTask(id: string, projectId: string) {
  const sb = await getSupabaseServer()
  const { error } = await sb.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/proyectos/${projectId}`)
  return { ok: true }
}
