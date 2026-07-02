# findings.md — Descobertas e Restrições

## Infraestrutura
- Site usa Supabase (PostgreSQL) com cliente JS hardcoded — sem Edge Functions
- Tabela de orçamentos: `Orçamentos` (com acento) — atenção ao nome exato nas queries
- Não há backend existente — tudo novo no servidor Antigravity

## Integrações
- **Gmail SMTP SSL**: porta 465, requer App Password (não a senha normal da conta)
- **Groq**: API compatível com OpenAI, modelo `llama-3.3-70b-versatile`, free tier generoso
- **Google Sheets**: requer service account com permissão de Editor na planilha
- **Z-API (WhatsApp)**: adiado — não essencial para MVP, adicionar em versão futura

## Restrições
- App Password do Gmail tem espaços no formato original — remover espaços antes de usar no .env
- O campo `tipo` pode conter múltiplos valores separados por vírgula (multi-select implementado no frontend)
- Supabase webhook envia payload com `"type": "INSERT"` — ignorar outros tipos
