'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const taskStatusSchema = z.enum(['todo', 'doing', 'blocked', 'done'])

export async function updateTaskStatus(taskId: string, status: string) {
  const s = taskStatusSchema.parse(status)
  const sb = await getSupabaseServer()
  await sb.from('tasks').update({ status: s }).eq('id', taskId)
  revalidatePath('/proyectos', 'layout')
}
