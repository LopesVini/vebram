// ============================================================
// Edge Function: manage-client
// ------------------------------------------------------------
// Cria / atualiza / remove CLIENTES com conta de login real.
// Roda NO SERVIDOR do Supabase — a chave-mestra (service role)
// fica secreta aqui e NUNCA vai para o navegador.
//
// Só sócios/equipe (e-mail com "@vertice" ou "admin") podem usar.
// O navegador chama isto com o token do usuário logado; validamos
// esse token e o cargo antes de fazer qualquer coisa.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function isAdminEmail(email?: string | null): boolean {
  const e = (email ?? "").toLowerCase();
  return e.includes("@vertice") || e.includes("admin");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // 1) Quem está chamando? Precisa ser um sócio logado.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autenticado." }, 401);

    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller?.user) return json({ error: "Sessão inválida." }, 401);
    if (!isAdminEmail(caller.user.email)) {
      return json({ error: "Apenas sócios podem gerenciar clientes." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    // 2) Criar cliente (conta de login + ficha)
    if (action === "create") {
      const { name, email, password, company, phone, city, status, vip } = body;
      if (!email || !password) return json({ error: "E-mail e senha são obrigatórios." }, 400);
      if (String(password).length < 6) return json({ error: "A senha deve ter ao menos 6 caracteres." }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password: String(password),
        email_confirm: true, // já ativa; o cliente pode logar direto
        user_metadata: { display_name: name, role: "client" },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const id = created.user!.id;
      // O gatilho handle_new_user já criou a ficha; completamos os dados extras.
      const { error: updErr } = await admin.from("profiles").update({
        display_name: name,
        role: "client",
        metadata: { company, phone, city, status, vip },
      }).eq("id", id);
      if (updErr) return json({ error: updErr.message }, 400);

      return json({ ok: true, id });
    }

    // 3) Atualizar dados de um cliente
    if (action === "update") {
      const { id, name, company, phone, city, status, vip } = body;
      if (!id) return json({ error: "ID do cliente ausente." }, 400);
      const { error } = await admin.from("profiles").update({
        display_name: name,
        metadata: { company, phone, city, status, vip },
      }).eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id });
    }

    // 4) Remover um cliente (apaga a conta de login; a ficha some junto)
    if (action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "ID do cliente ausente." }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      await admin.from("profiles").delete().eq("id", id); // garantia extra
      return json({ ok: true, id });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
