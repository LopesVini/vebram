import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Box, Layers, Loader2, Maximize2, Search, ChevronRight, Eye, AlertCircle,
  Expand, Shrink,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { IfcAPI, FlatMesh } from "web-ifc";
import { useClientProject } from "@/hooks/data/useClientProject";
import BimBottomSheet from "@/components/portal/BimBottomSheet";

const DEMO_IFC_URL = "/models/demo.ifc";

interface ModelInfo {
  name: string;
  meshCount: number;
  triangleCount: number;
  bbox: { width: number; height: number; depth: number };
}

interface SpatialNode {
  id: number;
  name: string;
  type: "site" | "building" | "storey" | "space" | "element";
  children: SpatialNode[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de árvore (busca, seleção, caminho até nó)
// ─────────────────────────────────────────────────────────────────────────────
function findNode(node: SpatialNode, id: number): SpatialNode | null {
  if (node.id === id) return node;
  for (const c of node.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function findPath(node: SpatialNode, id: number): number[] | null {
  if (node.id === id) return [node.id];
  for (const c of node.children) {
    const p = findPath(c, id);
    if (p) return [node.id, ...p];
  }
  return null;
}

function collectIds(node: SpatialNode): number[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

function collectMatchIds(node: SpatialNode, q: string, out: number[]) {
  if (node.name.toLowerCase().includes(q)) out.push(node.id);
  node.children.forEach(c => collectMatchIds(c, q, out));
}

// Mantém nós cujo nome bate com a busca ou que têm descendente que bate
function filterTree(node: SpatialNode, q: string): SpatialNode | null {
  const matches = node.name.toLowerCase().includes(q);
  const children = node.children
    .map(c => filterTree(c, q))
    .filter((c): c is SpatialNode => c !== null);
  if (!matches && children.length === 0) return null;
  return { ...node, children: matches ? node.children : children };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: cria scene, camera, renderer, controls, lights — independente do IFC
// ─────────────────────────────────────────────────────────────────────────────
function useThreeScene(canvasRef: React.RefObject<HTMLDivElement>) {
  const sceneRef    = useRef<THREE.Scene>();
  const cameraRef   = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const modelGroupRef = useRef<THREE.Group>(new THREE.Group());

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(15, 13, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(20, 30, 15);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x88aaff, 0.3);
    dir2.position.set(-15, 10, -10);
    scene.add(dir2);

    // Grid + ground
    const grid = new THREE.GridHelper(60, 60, 0x444466, 0x222233);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    scene.add(modelGroupRef.current);

    let raf = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [canvasRef]);

  const fitToModel = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist   = maxDim * 1.6;
    cameraRef.current.position.set(center.x + dist, center.y + dist * 0.7, center.z + dist);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  // Enquadra a câmera num bounding box arbitrário mantendo a direção atual
  const fitToBox = useCallback((box: THREE.Box3) => {
    if (!cameraRef.current || !controlsRef.current || box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const dist   = maxDim * 2.2;
    const dir = new THREE.Vector3()
      .subVectors(cameraRef.current.position, controlsRef.current.target)
      .normalize();
    cameraRef.current.position.copy(center).addScaledVector(dir, dist);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  }, []);

  const raycasterRef = useRef(new THREE.Raycaster());

  // Retorna o expressID do mesh sob o ponteiro, ou null
  const pick = useCallback((clientX: number, clientY: number): number | null => {
    const renderer = rendererRef.current;
    const camera   = cameraRef.current;
    if (!renderer || !camera) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycasterRef.current.setFromCamera(ndc, camera);
    const hits = raycasterRef.current.intersectObjects(modelGroupRef.current.children, false);
    for (const h of hits) {
      const id = (h.object as THREE.Mesh).userData?.expressID;
      if (typeof id === "number") return id;
    }
    return null;
  }, []);

  const clearModel = useCallback(() => {
    while (modelGroupRef.current.children.length) {
      const child = modelGroupRef.current.children[0] as THREE.Mesh;
      modelGroupRef.current.remove(child);
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else mat?.dispose();
    }
  }, []);

  return { modelGroup: modelGroupRef.current, fitToModel, fitToBox, clearModel, pick };
}

// ─────────────────────────────────────────────────────────────────────────────
// IFC loader: parse via web-ifc → cria meshes Three.js
// ─────────────────────────────────────────────────────────────────────────────
async function loadIfcIntoGroup(
  data: Uint8Array,
  group: THREE.Group,
  meshMap: Map<number, THREE.Mesh[]>,
  onProgress: (msg: string) => void,
): Promise<{ info: ModelInfo; tree: SpatialNode | null }> {
  onProgress("Inicializando WASM...");
  const api = new IfcAPI();
  api.SetWasmPath("/wasm/");
  await api.Init();

  onProgress("Lendo arquivo IFC...");
  const modelID = api.OpenModel(data);

  onProgress("Extraindo geometria...");
  let meshCount = 0;
  let triCount  = 0;

  api.StreamAllMeshes(modelID, (mesh: FlatMesh) => {
    const placedGeometries = mesh.geometries;
    for (let i = 0; i < placedGeometries.size(); i++) {
      const placed = placedGeometries.get(i);
      const geom   = api.GetGeometry(modelID, placed.geometryExpressID);
      const verts  = api.GetVertexArray(geom.GetVertexData(), geom.GetVertexDataSize()) as Float32Array;
      const idx    = api.GetIndexArray(geom.GetIndexData(), geom.GetIndexDataSize()) as Uint32Array;

      // verts: [x,y,z,nx,ny,nz, ...] interleaved
      const positions = new Float32Array(verts.length / 2);
      const normals   = new Float32Array(verts.length / 2);
      for (let v = 0; v < verts.length; v += 6) {
        const w = (v / 6) * 3;
        positions[w]   = verts[v];
        positions[w+1] = verts[v+1];
        positions[w+2] = verts[v+2];
        normals[w]     = verts[v+3];
        normals[w+1]   = verts[v+4];
        normals[w+2]   = verts[v+5];
      }

      const bufferGeom = new THREE.BufferGeometry();
      bufferGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      bufferGeom.setAttribute("normal",   new THREE.BufferAttribute(normals,   3));
      bufferGeom.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));

      const c = placed.color;
      const material = new THREE.MeshStandardMaterial({
        color:       new THREE.Color(c.x, c.y, c.z),
        opacity:     c.w,
        transparent: c.w < 1,
        side:        THREE.DoubleSide,
        roughness:   0.7,
        metalness:   0.05,
      });

      const threeMesh = new THREE.Mesh(bufferGeom, material);
      const m = placed.flatTransformation as number[];
      const matrix = new THREE.Matrix4().fromArray(m);
      threeMesh.applyMatrix4(matrix);
      threeMesh.castShadow    = true;
      threeMesh.receiveShadow = true;
      threeMesh.userData.expressID = mesh.expressID;
      group.add(threeMesh);

      const bucket = meshMap.get(mesh.expressID);
      if (bucket) bucket.push(threeMesh);
      else meshMap.set(mesh.expressID, [threeMesh]);

      meshCount++;
      triCount += idx.length / 3;
    }
  });

  // IFC tem o eixo Y=up, mas comum em IFC é Z=up. Rotacionamos o grupo:
  group.rotation.x = -Math.PI / 2;

  // Bounding box
  const box  = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());

  onProgress("Construindo árvore...");
  const tree = buildSpatialTree(api, modelID);

  api.CloseModel(modelID);

  return {
    info: {
      name:           "Modelo IFC",
      meshCount,
      triangleCount:  triCount,
      bbox:           { width: size.x, height: size.y, depth: size.z },
    },
    tree,
  };
}

// Tipos IFC usados na árvore espacial
const IFC_TYPE = {
  SITE:          4097777520,
  BUILDING:      1095909175,
  STOREY:        3124254112,
  SPACE:         3856911033,
  REL_AGGREGATES: 160246688,
  REL_CONTAINED: 3242617779,
} as const;

// Constrói a árvore espacial real (Site → Building → Storey → elementos)
// a partir das relações IfcRelAggregates e IfcRelContainedInSpatialStructure
function buildSpatialTree(api: IfcAPI, modelID: number): SpatialNode | null {
  try {
    const getName = (id: number, fallback: string) => {
      try {
        const ent = api.GetLine(modelID, id);
        return ent?.Name?.value || fallback;
      } catch { return fallback; }
    };

    const typeOf = (id: number): SpatialNode["type"] => {
      try {
        const t = api.GetLineType(modelID, id);
        if (t === IFC_TYPE.SITE)     return "site";
        if (t === IFC_TYPE.BUILDING) return "building";
        if (t === IFC_TYPE.STOREY)   return "storey";
        if (t === IFC_TYPE.SPACE)    return "space";
      } catch { /* segue como element */ }
      return "element";
    };

    // parentId → filhos (decomposição + contenção espacial)
    const childrenOf = new Map<number, number[]>();
    const addKids = (parent: number | undefined, kids: number[]) => {
      if (!parent || kids.length === 0) return;
      const arr = childrenOf.get(parent);
      if (arr) arr.push(...kids);
      else childrenOf.set(parent, [...kids]);
    };

    for (const relType of [IFC_TYPE.REL_AGGREGATES, IFC_TYPE.REL_CONTAINED]) {
      const rels = api.GetLineIDsWithType(modelID, relType);
      for (let i = 0; i < rels.size(); i++) {
        const rel = api.GetLine(modelID, rels.get(i));
        const parent = relType === IFC_TYPE.REL_AGGREGATES
          ? rel?.RelatingObject?.value
          : rel?.RelatingStructure?.value;
        const kids = (relType === IFC_TYPE.REL_AGGREGATES
          ? rel?.RelatedObjects
          : rel?.RelatedElements
        )?.map((r: { value: number }) => r.value) ?? [];
        addKids(parent, kids);
      }
    }

    const build = (id: number, fallback: string): SpatialNode => ({
      id,
      name: getName(id, fallback),
      type: typeOf(id),
      children: (childrenOf.get(id) ?? []).map(c => build(c, "Elemento")),
    });

    const sites = api.GetLineIDsWithType(modelID, IFC_TYPE.SITE);
    if (sites.size() > 0) return build(sites.get(0), "Site");
    const buildings = api.GetLineIDsWithType(modelID, IFC_TYPE.BUILDING);
    if (buildings.size() > 0) return build(buildings.get(0), "Edifício");
    return null;
  } catch (e) {
    console.warn("Falha ao construir árvore IFC:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree node UI
// ─────────────────────────────────────────────────────────────────────────────
function TreeNodeView({
  node, depth = 0, selectedId, onSelect, forceOpen, ancestorIds,
}: {
  node: SpatialNode;
  depth?: number;
  selectedId: number | null;
  onSelect: (node: SpatialNode) => void;
  forceOpen: boolean;
  ancestorIds: Set<number>;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isOpen = forceOpen || open || ancestorIds.has(node.id);
  const isSelected = selectedId === node.id;
  const rowRef = useRef<HTMLDivElement>(null);
  const Icon = node.type === "storey" ? Layers : Box;

  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [isSelected]);

  return (
    <div className="mb-1">
      <div
        ref={rowRef}
        onClick={() => onSelect(node)}
        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors group text-navy dark:text-white ${
          isSelected
            ? "bg-primary/15 ring-1 ring-primary/40"
            : "hover:bg-zinc-50 dark:hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <button
            onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
            className="shrink-0 flex items-center justify-center"
            aria-label={isOpen ? "Recolher" : "Expandir"}
          >
            <ChevronRight size={13} className={`text-zinc-500 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : <span className="w-[13px] shrink-0" />}
        <Icon size={13} className="text-primary shrink-0" />
        <span className="text-xs font-bold truncate">{node.name}</span>
      </div>
      {isOpen && node.children.map(c => (
        <TreeNodeView
          key={c.id} node={c} depth={depth + 1}
          selectedId={selectedId} onSelect={onSelect}
          forceOpen={forceOpen} ancestorIds={ancestorIds}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel (busca + hierarquia + info) — compartilhado pelo painel desktop e
// pela bottom sheet mobile
// ─────────────────────────────────────────────────────────────────────────────
function PanelContent({
  search, setSearch, tree, hasModel, info, loading,
  selectedId, onSelect, forceOpen, ancestorIds,
}: {
  search: string;
  setSearch: (v: string) => void;
  tree: SpatialNode | null;
  hasModel: boolean;
  info: ModelInfo | null;
  loading: boolean;
  selectedId: number | null;
  onSelect: (node: SpatialNode) => void;
  forceOpen: boolean;
  ancestorIds: Set<number>;
}) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar elementos..."
          className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-navy dark:text-white focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <p className="text-[10px] font-bold text-zinc-500 mb-2 tracking-widest">HIERARQUIA DO PROJETO</p>
        {!tree && !loading && (
          <p className="text-xs text-zinc-400 px-2 py-3">
            {hasModel ? "Nenhum elemento encontrado." : "Sem modelo carregado."}
          </p>
        )}
        {tree && (
          <TreeNodeView
            node={tree}
            selectedId={selectedId} onSelect={onSelect}
            forceOpen={forceOpen} ancestorIds={ancestorIds}
          />
        )}
      </div>

      {info && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 text-[10px] text-zinc-500 space-y-1">
          <div className="flex justify-between"><span>Arquivo</span><span className="text-navy dark:text-white truncate ml-2 max-w-[180px]" title={info.name}>{info.name}</span></div>
          <div className="flex justify-between"><span>Meshes</span><span className="text-navy dark:text-white">{info.meshCount}</span></div>
          <div className="flex justify-between"><span>Triângulos</span><span className="text-navy dark:text-white">{info.triangleCount.toLocaleString("pt-BR")}</span></div>
          <div className="flex justify-between"><span>Dimensões</span><span className="text-navy dark:text-white">{info.bbox.width.toFixed(1)} × {info.bbox.height.toFixed(1)} × {info.bbox.depth.toFixed(1)} m</span></div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function BimViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef    = useRef<HTMLDivElement>(null);
  const { modelGroup, fitToModel, fitToBox, clearModel, pick } = useThreeScene(containerRef);
  const { project, loading: projectLoading } = useClientProject();

  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<ModelInfo | null>(null);
  const [tree, setTree]         = useState<SpatialNode | null>(null);
  const [search, setSearch]     = useState("");
  const [isProjectModel, setIsProjectModel] = useState(false);
  const [showPill, setShowPill] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [cssFullscreen, setCssFullscreen]       = useState(false);

  const meshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map());
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const query = search.trim().toLowerCase();

  const displayTree = useMemo(
    () => (tree && query ? filterTree(tree, query) : tree),
    [tree, query],
  );

  const ancestorIds = useMemo(() => {
    if (!tree || selectedId === null) return new Set<number>();
    const path = findPath(tree, selectedId);
    return new Set(path ? path.slice(0, -1) : []);
  }, [tree, selectedId]);

  // Highlight 3D: reseta emissive de tudo, pinta matches da busca, depois seleção
  useEffect(() => {
    meshMapRef.current.forEach(meshes => meshes.forEach(m => {
      (m.material as THREE.MeshStandardMaterial).emissive?.setHex(0x000000);
    }));
    if (query && tree) {
      const ids: number[] = [];
      collectMatchIds(tree, query, ids);
      ids.forEach(id => meshMapRef.current.get(id)?.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xd97706);
        mat.emissiveIntensity = 0.45;
      }));
    }
    if (selectedId !== null) {
      const node = tree ? findNode(tree, selectedId) : null;
      const ids = node ? collectIds(node) : [selectedId];
      ids.forEach(id => meshMapRef.current.get(id)?.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x3b82f6);
        mat.emissiveIntensity = 0.85;
      }));
    }
  }, [query, selectedId, tree, info]);

  // Enquadra a câmera no conjunto de elementos informado
  const focusIds = useCallback((ids: number[]) => {
    const box = new THREE.Box3();
    let found = false;
    ids.forEach(id => meshMapRef.current.get(id)?.forEach(m => {
      box.expandByObject(m);
      found = true;
    }));
    if (found) fitToBox(box);
  }, [fitToBox]);

  const handleSelectNode = useCallback((node: SpatialNode) => {
    if (selectedId === node.id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(node.id);
    focusIds(collectIds(node));
  }, [selectedId, focusIds]);

  // Clique no 3D: raycast → seleciona nó correspondente; clique no vazio desmarca.
  // Distingue clique de arrasto (orbit) pela distância do ponteiro.
  const onViewerPointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onViewerPointerUp = useCallback((e: React.PointerEvent) => {
    const d = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (id === null) setSelectedId(null);
    else setSelectedId(prev => (prev === id ? null : id));
  }, [pick]);

  // Fullscreen nativo com fallback CSS (iOS Safari não suporta requestFullscreen em div)
  useEffect(() => {
    const onFs = () => setNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const fullscreenActive = nativeFullscreen || cssFullscreen;

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    if (cssFullscreen) {
      setCssFullscreen(false);
      return;
    }
    const el = viewerRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => setCssFullscreen(true));
    else setCssFullscreen(true);
  }, [cssFullscreen]);

  useEffect(() => {
    if (!info) return;
    setShowPill(true);
    const t = setTimeout(() => setShowPill(false), 3000);
    return () => clearTimeout(t);
  }, [info]);

  const loadFromBuffer = useCallback(async (buffer: ArrayBuffer, sourceName: string, fromProject = false) => {
    setLoading(true);
    setError(null);
    setSelectedId(null);
    clearModel();
    meshMapRef.current.clear();
    try {
      const data = new Uint8Array(buffer);
      const result = await loadIfcIntoGroup(data, modelGroup, meshMapRef.current, setProgress);
      setInfo({ ...result.info, name: sourceName });
      setTree(result.tree);
      setIsProjectModel(fromProject);
      setTimeout(fitToModel, 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar modelo IFC.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [modelGroup, clearModel, fitToModel]);

  const loadDemo = useCallback(async () => {
    setLoading(true);
    setProgress("Baixando modelo demo...");
    setError(null);
    try {
      const res = await fetch(DEMO_IFC_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      await loadFromBuffer(buf, "Modelo Demo (small.ifc)", false);
    } catch (e) {
      setError("Não foi possível baixar o modelo demo. " + (e instanceof Error ? e.message : ""));
      setLoading(false);
      setProgress("");
    }
  }, [loadFromBuffer]);

  // Carrega IFC do projeto assim que o projeto for resolvido
  useEffect(() => {
    if (projectLoading) return;
    if (project?.ifc_url) {
      (async () => {
        setLoading(true);
        setProgress("Baixando modelo do projeto...");
        setError(null);
        try {
          const res = await fetch(project.ifc_url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          await loadFromBuffer(buf, project.name, true);
        } catch (e) {
          setError("Não foi possível carregar o modelo do projeto. " + (e instanceof Error ? e.message : ""));
          setLoading(false);
          setProgress("");
        }
      })();
    } else {
      loadDemo();
    }
  }, [projectLoading, project?.ifc_url, project?.name, loadFromBuffer, loadDemo]);

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] -mx-3 -mt-[4.5rem] -mb-24 pt-14 lg:m-0 lg:pt-0 lg:h-[calc(100vh-6rem)] w-auto lg:w-full font-mono text-zinc-300 relative gap-0 lg:gap-6">

      {/* Header */}
      <div className="hidden lg:flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-accent/20 text-accent px-3 py-1 rounded-[0.25rem] font-bold text-sm">[ IFC ]</div>
          <h1 className="text-3xl font-black tracking-tighter text-navy dark:text-white uppercase font-sans">
            Modelo BIM Integrado
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fitToModel}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Maximize2 size={14} /> ENQUADRAR
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-0 lg:gap-6 min-h-0">

        {/* Sidebar / Tree View */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-4 flex-col shadow-lg overflow-hidden">
          <PanelContent
            search={search} setSearch={setSearch}
            tree={displayTree} hasModel={!!tree} info={info} loading={loading}
            selectedId={selectedId} onSelect={handleSelectNode}
            forceOpen={!!query} ancestorIds={ancestorIds}
          />
        </div>

        {/* 3D Viewer */}
        <div
          ref={viewerRef}
          className={`bg-zinc-100 dark:bg-[#0A0A0E] border-zinc-200 dark:border-white/15 overflow-hidden shadow-inner ${
            cssFullscreen
              ? "fixed inset-0 z-[100] rounded-none border-0"
              : "flex-1 border-y lg:border rounded-none lg:rounded-2xl relative"
          }`}
        >
          <div
            ref={containerRef}
            className="absolute inset-0"
            onPointerDown={onViewerPointerDown}
            onPointerUp={onViewerPointerUp}
          />

          {/* Pill mobile: nome do modelo, some sozinha */}
          {info && (
            <div
              className={`lg:hidden absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-500 ${showPill ? "opacity-100" : "opacity-0"}`}
            >
              <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full max-w-[70vw] truncate">
                {info.name}
              </div>
            </div>
          )}

          {/* Overlay info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="bg-white/80 dark:bg-black/60 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-3 rounded-lg hidden lg:flex items-center gap-4 pointer-events-auto shadow-lg">
              <div>
                <p className="text-[10px] text-zinc-500">VIEWER</p>
                <p className="text-xs font-bold text-navy dark:text-white">
                  {isProjectModel ? "Modelo do Projeto" : "three.js + web-ifc"}
                </p>
              </div>
              {info && (
                <>
                  <div className="w-px h-8 bg-zinc-300 dark:bg-white/10" />
                  <div>
                    <p className="text-[10px] text-zinc-500">ELEMENTOS</p>
                    <p className="text-xs font-bold text-primary">{info.meshCount} meshes</p>
                  </div>
                </>
              )}
            </div>

            <div className="ml-auto flex flex-col gap-2 pointer-events-auto">
              <button onClick={fitToModel} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title="Enquadrar">
                <Maximize2 size={16} />
              </button>
              <button onClick={toggleFullscreen} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title={fullscreenActive ? "Sair da tela cheia" : "Tela cheia"}>
                {fullscreenActive ? <Shrink size={16} /> : <Expand size={16} />}
              </button>
            </div>
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-white/80 font-mono tracking-wider">{progress || "Carregando..."}</p>
            </div>
          )}

          {/* Error overlay */}
          {error && !loading && (
            <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-white/90 font-mono max-w-md">{error}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={loadDemo} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors">
                  TENTAR DEMO NOVAMENTE
                </button>
              </div>
            </div>
          )}

          {/* Hint when empty */}
          {!loading && !error && !info && (
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-none">
              <Eye size={20} className="text-zinc-500 mb-2" />
              <p className="text-sm font-bold text-zinc-400 dark:text-zinc-500 tracking-widest font-sans uppercase">
                Modelo BIM não disponível ainda
              </p>
            </div>
          )}
        </div>
      </div>

      <BimBottomSheet>
        <PanelContent
          search={search} setSearch={setSearch}
          tree={displayTree} hasModel={!!tree} info={info} loading={loading}
          selectedId={selectedId} onSelect={handleSelectNode}
          forceOpen={!!query} ancestorIds={ancestorIds}
        />
      </BimBottomSheet>
    </div>
  );
}
