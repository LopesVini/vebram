// Tipos do CRM — espelham o schema em supabase/migrations/20260705_crm_schema.sql
export type CrmRole = 'owner' | 'vendedor';
export type StageType = 'open' | 'won' | 'lost';
export type ChannelType = 'whatsapp' | 'email' | 'phone' | 'instagram' | 'other';
export type InteractionType = 'note' | 'contact' | 'stage_change' | 'task' | 'system';
export type TaskStatus = 'pending' | 'done';

export interface Company {
  id: string; name: string; slug: string; is_active: boolean;
  created_at: string; updated_at: string;
}
export interface Membership {
  id: string; company_id: string; user_id: string; role: CrmRole; created_at: string;
}
export interface MembershipWithCompany extends Membership { company: Company; }

export interface PipelineStage {
  id: string; company_id: string; name: string; position: number;
  stage_type: StageType; color: string | null; is_active: boolean; created_at: string;
}
export interface Client {
  id: string; company_id: string; name: string; source: string | null;
  entered_at: string; owner_id: string | null; stage_id: string | null;
  estimated_value: number | null; lost_reason: string | null; lost_at: string | null;
  created_at: string; updated_at: string;
}
export interface ContactChannel {
  id: string; company_id: string; client_id: string; type: ChannelType;
  value: string; is_primary: boolean; created_at: string;
}
export interface Interaction {
  id: string; company_id: string; client_id: string; author_id: string | null;
  type: InteractionType; body: string | null;
  metadata: Record<string, unknown>; created_at: string;
}
export interface CrmTask {
  id: string; company_id: string; client_id: string; title: string;
  due_date: string | null; assignee_id: string | null; status: TaskStatus;
  completed_at: string | null; created_at: string; updated_at: string;
}
export interface AutomationRule {
  id: string; company_id: string; name: string;
  trigger: Record<string, unknown>; conditions: unknown[]; action: Record<string, unknown>;
  is_active: boolean; created_at: string; updated_at: string;
}
