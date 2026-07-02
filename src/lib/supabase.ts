import { createClient } from "@supabase/supabase-js";

// Apenas a chave ANON vive no navegador — ela é pública por design e
// tudo que ela pode fazer é controlado pelas políticas RLS do banco.
// A chave de serviço (service role) NUNCA deve aparecer neste arquivo:
// operações privilegiadas rodam no servidor (Edge Functions como
// manage-client, ou funções RPC como approve_milestone).
const supabaseUrl = "https://xqagqxntyppsyfdyebym.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYWdxeG50eXBwc3lmZHllYnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjM1NDQsImV4cCI6MjA5MTA5OTU0NH0.bknMcwNIglI7508NGu3WPUWQZ9RBnHg5bbMDe8TAgvQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
