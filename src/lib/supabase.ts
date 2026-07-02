import { createClient } from "@supabase/supabase-js";

// Apenas a chave ANON vive no navegador — ela é pública por design e
// tudo que ela pode fazer é controlado pelas políticas RLS do banco.
// A chave de serviço (service role) NUNCA deve aparecer neste arquivo:
// operações privilegiadas rodam no servidor (Edge Functions como
// manage-client, ou funções RPC como approve_milestone).
const supabaseUrl = "https://xqagqxntyppsyfdyebym.supabase.co";
const supabaseAnonKey = "sb_publishable_v-11b-yKfSrivXD4pqyoWA_pKIjzn4r";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
