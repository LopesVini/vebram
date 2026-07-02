# gemini.md — Constituição do Projeto Verticie Automação

## Schema de Dados

### Entrada — payload do webhook Supabase (tabela `Orçamentos`)
```json
{
  "type": "INSERT",
  "table": "Orçamentos",
  "record": {
    "nome":     "string (max 100)",
    "email":    "string",
    "celular":  "string (max 20)",
    "cidade":   "string (max 100)",
    "tipo":     "string — disciplinas separadas por vírgula",
    "area":     "string (max 20, opcional)",
    "fase":     "Ideia | Anteprojeto | Projeto | Obra | Reforma | Regularização",
    "mensagem": "string (max 1000, opcional)"
  }
}
```

### Saídas

| Destino | Formato | Ferramenta |
|---|---|---|
| Cliente — e-mail | HTML + plain text, gerado por IA | send_client_email.py |
| Responsável — e-mail | Plain text com dados do lead | notify_team_email.py |
| Google Sheets | Linha com todos os campos + timestamp | log_to_sheets.py |

## Regras Comportamentais

- Tom da IA: profissional e acolhedor, em português formal
- A resposta ao cliente confirma recebimento, menciona o tipo de projeto e informa retorno em até 24h
- A IA assina como "Equipe Verticie"
- Nunca inventar informações não presentes no formulário
- Se `area` ou `mensagem` estiverem vazios, ignorar no texto — não mencionar ausência

## Invariantes Arquiteturais

- O webhook secret deve ser validado antes de qualquer processamento
- Falha em uma tool não deve derrubar o servidor — cada tool tem try/except próprio
- Logs de erro vão para `.tmp/errors.log`
- O payload original do webhook é salvo em `.tmp/last_payload.json` para debug
- Nunca commitar o arquivo `.env` ou `google-credentials.json`
