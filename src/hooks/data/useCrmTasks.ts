import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CrmTask } from '@/hooks/data/crmTypes';

export interface NewTask { title: string; due_date: string | null; client_id: string; assignee_id: string | null; }
export interface TaskBuckets { overdue: CrmTask[]; today: CrmTask[]; upcoming: CrmTask[]; done: CrmTask[]; }

// Pura: separa por vencimento. `todayISO` = 'YYYY-MM-DD'.
export function bucketTasks(tasks: CrmTask[], todayISO: string): TaskBuckets {
  const b: TaskBuckets = { overdue: [], today: [], upcoming: [], done: [] };
  for (const t of tasks) {
    if (t.status === 'done') { b.done.push(t); continue; }
    const d = t.due_date; // date-only string 'YYYY-MM-DD' or null
    if (!d) { b.upcoming.push(t); }
    else if (d < todayISO) { b.overdue.push(t); }
    else if (d === todayISO) { b.today.push(t); }
    else { b.upcoming.push(t); }
  }
  return b;
}

export function useCrmTasks(companyId: string | null) {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!companyId) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', companyId)
      .order('due_date', { ascending: true, nullsFirst: false });
    setTasks((data as CrmTask[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function addTask(t: NewTask): Promise<{ error: Error | null }> {
    if (!companyId) return { error: new Error('Nenhuma empresa ativa.') };
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...t, company_id: companyId, status: 'pending' })
      .select()
      .single();
    if (!error && data) setTasks((prev) => [...prev, data as CrmTask]);
    return { error };
  }

  async function toggleTask(id: string, done: boolean): Promise<{ error: Error | null }> {
    const prev = tasks;
    const changes = { status: done ? 'done' : 'pending', completed_at: done ? new Date().toISOString() : null } as Partial<CrmTask>;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, ...changes } : t)));
    const { error } = await supabase.from('tasks').update(changes).eq('id', id).eq('company_id', companyId);
    if (error) setTasks(prev);
    return { error };
  }

  async function deleteTask(id: string): Promise<{ error: Error | null }> {
    const prev = tasks;
    setTasks((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('company_id', companyId);
    if (error) setTasks(prev);
    return { error };
  }

  return { tasks, loading, refetch, addTask, toggleTask, deleteTask };
}
