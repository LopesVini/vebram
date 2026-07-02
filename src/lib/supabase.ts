import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xqagqxntyppsyfdyebym.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYWdxeG50eXBwc3lmZHllYnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjM1NDQsImV4cCI6MjA5MTA5OTU0NH0.bknMcwNIglI7508NGu3WPUWQZ9RBnHg5bbMDe8TAgvQ";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxYWdxeG50eXBwc3lmZHllYnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTUyMzU0NCwiZXhwIjoyMDkxMDk5NTQ0fQ.jrMPBcP2e6nz1mUdnMWdJA96A_Y-CB7b0jhMnIoHqhU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente com privilégios admin — bypassa RLS para operações privilegiadas.
// IMPORTANTE: precisa ser "sem sessão" (persistSession/autoRefreshToken = false)
// e com storageKey próprio. Sem isso, ele compartilhava o armazenamento de
// login do cliente anônimo e acabava usando o TOKEN DO USUÁRIO logado no lugar
// da chave de serviço — fazendo a aprovação de marcos falhar por RLS.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: "vertice-admin-noauth",
  },
});
