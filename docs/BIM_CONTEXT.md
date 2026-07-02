# Contexto: Projeto BIM 3D Integrado — Vertice Zenith

**Data:** 2026-05-06 | **Status:** MVP funcional, próximo passo: upload IFC por projeto

---

## 🎯 Objetivo Geral
Integrar um visualizador BIM 3D real (web-ifc + three.js) ao portal do cliente, permitindo que cada projeto tenha seu próprio modelo IFC que o cliente pode explorar interativamente.

---

## ✅ O Que Já Foi Feito

### Backend Real (Supabase)
- **Tabelas:** `projects`, `milestones`, `updates`, `profiles` (com RLS policies)
- **Hooks:** `useProjects()`, `useClientProject()`, `useMilestones()`, `useUpdates()`, `useContacts()`, `useChat()`
- **Chat:** Realtime admin↔cliente via Supabase com messages table

### HQ Admin
- **HqProjects:** Kanban com cards clicáveis → abre drawer lateral
- **HqProjectDrawer:** Duas abas:
  - **Marcos:** linha do tempo, toggle status (pendente→ativo→concluído), form inline para adicionar
  - **Atualizações:** publicar entregas com título/descr/status, lista com delete
- **HqClients:** lista real de `profiles` (role='client') + contagem de projetos
- **HqDashboard:** stats reais (clientes, projetos, entregas pendentes, taxa conclusão) + gráficos mock

### Portal Cliente
- **ProjectDashboard:** dados reais (projeto, progresso, marcos, atualizações recentes, SYSTEM_PROMPT dinâmico pro chatbot)
- **ProjectUpdates:** registro de entregas em linha do tempo, status (aprovado/pendente/revisão)
- **BimViewer** ← NOVO:
  - Three.js scene com OrbitControls, lighting, grid
  - Web-ifc parser: extrai geometria do arquivo IFC, cria meshes three.js
  - **Atualmente:** carrega modelo demo local (`/public/models/demo.ifc`)
  - Sidebar com árvore espacial (Site → Building → Storey) extraída do IFC
  - Stats: meshes, triângulos, dimensões bbox
  - Botões: "CARREGAR IFC" (upload), "ENQUADRAR" (fit-to-model)
  - Estados: loading, error com fallbacks

### UI + Visuals
- "VérticeQG" (renomeado de VerticeHQ)
- FloatingChat real com contatos + mensagens
- Search bar no HQ com navegação
- Sino de notificações no HQ
- Dados de fachada (SEED) mesclados com reais

---

## 🔄 Arquitetura Atual do BIM

```
Browser (Cliente no Portal)
    ↓
[BimViewer.tsx — /portal/bim]
    ├→ Three.js scene (canvas)
    ├→ OrbitControls + lighting
    ├→ fetch("/models/demo.ifc") — HARDCODED
    └→ web-ifc parser → meshes → scene
```

**Problema:** Sempre carrega `demo.ifc`. Queremos que carregue o IFC do projeto do cliente.

---

## 📋 Próximo Passo: Upload IFC por Projeto

### 1️⃣ Banco de Dados
Executar no Supabase SQL Editor:
```sql
-- Criar bucket IFC (se não existir)
-- (Supabase UI: Storage → Create Bucket → ifc-models)

-- Adicionar campo ifc_url à tabela projects
ALTER TABLE projects ADD COLUMN ifc_url TEXT;
```

### 2️⃣ Hook para Upload
Criar `src/hooks/useProjectIfc.ts`:
```typescript
export function useProjectIfc(projectId: string) {
  async function uploadIfc(file: File) {
    const path = `${projectId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("ifc-models")
      .upload(path, file, { upsert: true });
    
    if (uploadError) return { error: uploadError };
    
    const { data } = supabase.storage
      .from("ifc-models")
      .getPublicUrl(path);
    
    const { error: updateError } = await supabase
      .from("projects")
      .update({ ifc_url: data.publicUrl })
      .eq("id", projectId);
    
    return { error: updateError };
  }
  
  async function deleteIfc(projectId: string) {
    // Delete from storage + set ifc_url = null
  }
  
  return { uploadIfc, deleteIfc };
}
```

### 3️⃣ UI no Drawer (HqProjectDrawer)
Adicionar aba **"Modelo BIM"** com:
- Mostrar IFC atual (se existir): nome + tamanho + preview thumb
- Botão "Upload novo modelo IFC" → file input
- Delete com confirmação
- Loading/progress durante upload

### 4️⃣ Portal BIM (BimPlaceholder)
Modificar `loadDemo()`:
```typescript
const loadDemo = useCallback(async () => {
  const project = await fetch projeto real via useClientProject()
  
  if (project?.ifc_url) {
    // Carregar IFC do projeto
    await loadFromBuffer(await fetch(project.ifc_url).then(r => r.arrayBuffer()), project.name)
  } else {
    // Fallback: carregar demo
    await loadFromBuffer(await fetch("/models/demo.ifc")..., "Modelo Demo")
  }
}, [...])
```

---

## 📁 Arquivos Chave

| Arquivo | O que faz | Próxima ação |
|---------|-----------|--------------|
| `src/pages/portal/BimPlaceholder.tsx` | Viewer 3D | Integrar `ifc_url` do projeto |
| `src/components/hq/HqProjectDrawer.tsx` | Drawer admin | Adicionar aba BIM com upload |
| `src/hooks/useProjects.ts` | CRUD projetos | Adicionar campo `ifc_url` ao tipo |
| `src/lib/supabase.ts` | Client Supabase | Já está pronto |

---

## 🛠 Dependências Instaladas
- `web-ifc` (WASM core do IFC.js)
- `three` (3D scene)
- `three-stdlib` (OrbitControls, etc)
- WASM files: `/public/wasm/web-ifc.wasm` + `web-ifc-mt.wasm`
- Demo IFC: `/public/models/demo.ifc` (414 KB)

---

## 🚀 Comandos Úteis
```bash
# Dev
npm run dev                    # Starts on :8080 or :8081
npx tsc --noEmit              # Type check

# Git
git status
git add -A && git commit -m "feat: ..."
git push origin main

# Supabase
# Dashboard: https://app.supabase.com/projects/xqagqxntyppsyfdyebym
```

---

## 📊 Checklist: Integração Completa do BIM

- [ ] Criar bucket `ifc-models` no Supabase Storage
- [ ] Executar SQL: `ALTER TABLE projects ADD COLUMN ifc_url TEXT`
- [ ] Criar `useProjectIfc` hook com upload/delete
- [ ] Adicionar aba "Modelo BIM" no HqProjectDrawer
- [ ] Testar upload de IFC no drawer
- [ ] Modificar BimPlaceholder para carregar IFC do projeto
- [ ] Testar: cliente vê modelo do projeto dele no portal
- [ ] Refinar UX: progress bar upload, preview, error handling
- [ ] Deploy em produção

---

## 💡 Notas Técnicas

**Web-IFC API:**
- `IfcAPI.SetWasmPath("/wasm/")` — localização dos .wasm files
- `api.OpenModel(data)` — parse IFC (Uint8Array)
- `api.StreamAllMeshes()` — iteração sobre geometria
- Verts: `[x,y,z,nx,ny,nz, ...]` interleaved
- Transforms: `placedGeometry.flatTransformation` (4x4 matrix)

**Supabase Storage:**
- Public URL: `https://xqagqxntyppsyfdyebym.supabase.co/storage/v1/object/public/ifc-models/{path}`
- RLS policies: padrão (allow all se autenticado)

**Three.js Mesh:**
- BufferGeometry + MeshStandardMaterial
- `matrix.applyMatrix4()` para aplicar transforms do IFC
- `castShadow=true, receiveShadow=true` para renderização realista

---

## 📞 Contato / Context para Próximo Chat

Se continuar em outro chat, copie este arquivo + mencione:
- Objetivo: **"Integrar upload de IFC por projeto no HQ e fazer portal carregar modelo real do cliente"**
- Status: **"Viewer BIM funciona com demo, agora ligar ao Supabase Storage"**
- Próximo: **"Implementar useProjectIfc + UI upload + carregar ifc_url no portal"**

---

**Last Updated:** 2026-05-06
**Next Chat Starter:** "Continue de BIM_CONTEXT.md — implementar upload IFC por projeto"
