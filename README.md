# Vertice Engineering — Site + Portal

Produto web da Vertice Engineering: um **site institucional** somado a um **portal SaaS** para um escritório de engenharia/arquitetura. Dois programas convivem neste repositório:

- **Frontend** (raiz) — site + portal em Vite + React + TypeScript, com Tailwind e shadcn/ui.
- **Automação** (`automation/`) — serviço Python (FastAPI) que processa pedidos de orçamento (resposta por IA, e-mail e planilha). Roda separado, no Render.

## Como rodar o frontend

Pré-requisito: [Node.js](https://nodejs.org) instalado (o `npm` vem junto).

```bash
npm install     # instala as dependências (só na primeira vez)
npm run dev     # abre o site em http://localhost:8080
npm run build   # gera a versão de produção
npm run lint    # verifica problemas no código
npm run test    # roda os testes
```

## Como rodar a automação (backend)

```bash
cd automation
pip install -r requirements.txt
uvicorn main:app --reload
```

## Estrutura em 30 segundos

| Pasta | O que é |
|-------|---------|
| `src/pages/` | As telas do site (uma por rota) |
| `src/components/` | Peças de interface reutilizáveis (`ui/` são os componentes shadcn) |
| `src/hooks/` | "Ajudantes" que buscam/guardam dados (falam com o Supabase) |
| `src/lib/` | Ferramentas centrais (ex.: conexão com o banco de dados) |
| `automation/` | Backend Python, deploy separado no Render |
| `docs/` | Documentos de contexto, arquitetura e histórico do projeto |

## Documentação

- **[CLAUDE.md](CLAUDE.md)** — guia técnico detalhado da arquitetura (o melhor ponto de partida para desenvolver).
- **[docs/](docs/)** — contexto de produto, decisões de arquitetura e material de referência.
