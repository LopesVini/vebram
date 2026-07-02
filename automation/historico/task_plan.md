# task_plan.md — Plano de Execução

## Fases

### ✅ Fase V — Visão
- [x] Perguntas de descoberta respondidas
- [x] Estrela Guia definida: resposta automática personalizada por IA ao cliente
- [x] Integrações definidas: Gmail, Google Sheets, Groq
- [x] Schema de dados definido em gemini.md

### ✅ Fase L — Link (Credenciais)
- [x] Supabase webhook secret: definido
- [x] Gmail App Password: obtido
- [x] Google Sheets service account JSON: baixado
- [x] Groq API Key: disponível (mesma do frontend)
- [ ] GOOGLE_SHEET_ID: pendente (pegar da URL da planilha)
- [ ] Executar verify_links.py e confirmar todos os ✅

### 🔄 Fase A — Arquitetura (Build)
- [x] Estrutura de diretórios criada
- [x] POPs escritos em architecture/
- [x] tools/ implementadas
- [x] main.py (servidor FastAPI) criado
- [ ] Testar localmente com payload simulado

### ⏳ Fase E — Estilo
- [ ] Revisar HTML do e-mail ao cliente no browser
- [ ] Ajustar tom da IA se necessário

### ⏳ Fase G — Gatilho (Deploy)
- [ ] Subir código para o servidor VPS
- [ ] Instalar dependências (pip install -r requirements.txt)
- [ ] Configurar .env no servidor
- [ ] Iniciar servidor: uvicorn main:app --host 0.0.0.0 --port 8000
- [ ] Configurar Nginx + SSL
- [ ] Registrar webhook no Supabase Dashboard
- [ ] Teste end-to-end: preencher formulário real e verificar todos os destinos
