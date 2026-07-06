import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Box, Layers, Loader2, Maximize2, Search, ChevronRight, Eye, AlertCircle,
  Expand, Shrink, Camera, CheckCircle2, Circle, Hammer, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { IfcAPI, FlatMesh } from "web-ifc";
import { toast } from "sonner";
import { useClientProject } from "@/hooks/data/useClientProject";
import { useBimPhases } from "@/hooks/data/useBimPhases";
import BimBottomSheet from "@/components/portal/BimBottomSheet";
import {
  buildPhaseLookup, findOrphans,
  type BimPhase, type PhaseAssignment, type PhaseLookup,
} from "@/lib/bimPhases";
import { DEMO_PHASES } from "@/lib/demoPhases";

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

  // Vistas predefinidas relativas ao bounding box atual do modelo
  const setView = useCallback((view: "top" | "front" | "iso") => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist   = maxDim * 1.6;
    // topo: offset mínimo em z evita gimbal do OrbitControls no polo
    if (view === "top")        camera.position.set(center.x, center.y + dist, center.z + dist * 0.001);
    else if (view === "front") camera.position.set(center.x, center.y + size.y * 0.15, center.z + dist);
    else                       camera.position.set(center.x + dist, center.y + dist * 0.7, center.z + dist);
    controls.target.copy(center);
    controls.update();
  }, []);

  // Plano de corte global: t em [0,1] percorre o bbox no eixo escolhido
  const setClipping = useCallback((axis: "x" | "y" | "z" | null, t: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (!axis) { renderer.clippingPlanes = []; return; }
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) { renderer.clippingPlanes = []; return; }
    const normal = new THREE.Vector3(
      axis === "x" ? -1 : 0,
      axis === "y" ? -1 : 0,
      axis === "z" ? -1 : 0,
    );
    const pos = box.min[axis] + (box.max[axis] - box.min[axis]) * t;
    renderer.clippingPlanes = [new THREE.Plane(normal, pos)];
  }, []);

  // Renderiza um frame e exporta o canvas como PNG (data URL)
  const screenshot = useCallback((): string | null => {
    const renderer = rendererRef.current;
    const scene    = sceneRef.current;
    const camera   = cameraRef.current;
    if (!renderer || !scene || !camera) return null;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
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

  return {
    modelGroup: modelGroupRef.current,
    fitToModel, fitToBox, clearModel, pick, setView, setClipping, screenshot,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IFC loader: parse via web-ifc → cria meshes Three.js
// ─────────────────────────────────────────────────────────────────────────────
async function loadIfcIntoGroup(
  data: Uint8Array,
  group: THREE.Group,
  meshMap: Map<number, THREE.Mesh[]>,
  onProgress: (msg: string) => void,
): Promise<{ info: ModelInfo; tree: SpatialNode | null; api: IfcAPI; modelID: number }> {
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
      threeMesh.userData.expressID       = mesh.expressID;
      threeMesh.userData.origOpacity     = c.w;
      threeMesh.userData.origTransparent = c.w < 1;
      group.add(threeMesh);

      const bucket = meshMap.get(mesh.expressID);
      if (bucket) bucket.push(threeMesh);
      else meshMap.set(mesh.expressID, [threeMesh]);

      meshCount++;
      triCount += idx.length / 3;
    }
  });

  // web-ifc já entrega as transformações com Y para cima — sem rotação extra.

  // Bounding box
  const box  = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());

  onProgress("Construindo árvore...");
  const tree = buildSpatialTree(api, modelID);

  // Modelo fica aberto: painel de propriedades consulta o IFC sob demanda.
  // Quem carrega é responsável por CloseModel ao trocar de modelo/desmontar.
  return {
    info: {
      name:           "Modelo IFC",
      meshCount,
      triangleCount:  triCount,
      bbox:           { width: size.x, height: size.y, depth: size.z },
    },
    tree,
    api,
    modelID,
  };
}

// Tipos IFC usados na árvore espacial e nas propriedades
const IFC_TYPE = {
  SITE:            4097777520,
  BUILDING:        1095909175,
  STOREY:          3124254112,
  SPACE:           3856911033,
  REL_AGGREGATES:   160246688,
  REL_CONTAINED:   3242617779,
  REL_DEFINES_BY_PROPERTIES: 4186316022,
  REL_ASSOCIATES_MATERIAL:   2655215786,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Propriedades IFC do elemento selecionado
// ─────────────────────────────────────────────────────────────────────────────
interface PropRow { name: string; value: string }
interface PropGroup { group: string; items: PropRow[] }
interface ElementProps {
  name: string;
  typeName: string;
  globalId?: string;
  objectType?: string;
  storey?: string;
  material?: string;
  psets: PropGroup[];
}

interface DefinitionMaps {
  psets: Map<number, number[]>;     // expressID do elemento → ids de pset/quantity
  materials: Map<number, number>;   // expressID do elemento → id do material
}

// Indexa IfcRelDefinesByProperties e IfcRelAssociatesMaterial uma vez por modelo
function buildDefinitionMaps(api: IfcAPI, modelID: number): DefinitionMaps {
  const psets = new Map<number, number[]>();
  const materials = new Map<number, number>();
  try {
    const rels = api.GetLineIDsWithType(modelID, IFC_TYPE.REL_DEFINES_BY_PROPERTIES);
    for (let i = 0; i < rels.size(); i++) {
      const rel = api.GetLine(modelID, rels.get(i));
      const defId = rel?.RelatingPropertyDefinition?.value;
      if (!defId) continue;
      for (const o of rel?.RelatedObjects ?? []) {
        if (!o?.value) continue;
        const arr = psets.get(o.value);
        if (arr) arr.push(defId);
        else psets.set(o.value, [defId]);
      }
    }
  } catch (e) { console.warn("Psets indisponíveis:", e); }
  try {
    const rels = api.GetLineIDsWithType(modelID, IFC_TYPE.REL_ASSOCIATES_MATERIAL);
    for (let i = 0; i < rels.size(); i++) {
      const rel = api.GetLine(modelID, rels.get(i));
      const matId = rel?.RelatingMaterial?.value;
      if (!matId) continue;
      for (const o of rel?.RelatedObjects ?? []) {
        if (o?.value) materials.set(o.value, matId);
      }
    }
  } catch (e) { console.warn("Materiais indisponíveis:", e); }
  return { psets, materials };
}

function formatIfcValue(v: unknown): string | null {
  if (v == null) return null;
  const val = typeof v === "object" ? (v as { value?: unknown }).value : v;
  if (val == null) return null;
  if (typeof val === "number" && !Number.isInteger(val)) {
    return val.toFixed(3).replace(/\.?0+$/, "");
  }
  return String(val);
}

function findStoreyName(tree: SpatialNode | null, id: number): string | undefined {
  if (!tree) return undefined;
  const path = findPath(tree, id);
  if (!path) return undefined;
  for (let i = path.length - 2; i >= 0; i--) {
    const n = findNode(tree, path[i]);
    if (n?.type === "storey") return n.name;
  }
  return undefined;
}

function getElementProps(
  api: IfcAPI,
  modelID: number,
  id: number,
  defs: DefinitionMaps,
  tree: SpatialNode | null,
): ElementProps {
  let name = `#${id}`;
  let typeName = "Elemento";
  let globalId: string | undefined;
  let objectType: string | undefined;
  try {
    const line = api.GetLine(modelID, id);
    name       = line?.Name?.value || name;
    globalId   = line?.GlobalId?.value;
    objectType = line?.ObjectType?.value || line?.PredefinedType?.value;
  } catch { /* mantém defaults */ }
  try {
    typeName = api.GetNameFromTypeCode(api.GetLineType(modelID, id)) || typeName;
  } catch { /* mantém default */ }

  let material: string | undefined;
  const matId = defs.materials.get(id);
  if (matId) {
    try {
      const m = api.GetLine(modelID, matId, true);
      material = m?.Name?.value
        || m?.ForLayerSet?.MaterialLayers?.map((l: { Material?: { Name?: { value?: string } } }) => l?.Material?.Name?.value).filter(Boolean).join(", ")
        || m?.Materials?.map((x: { Name?: { value?: string } }) => x?.Name?.value).filter(Boolean).join(", ")
        || undefined;
    } catch { /* material ilegível */ }
  }

  const psets: PropGroup[] = [];
  for (const defId of defs.psets.get(id) ?? []) {
    try {
      const def = api.GetLine(modelID, defId, true);
      const raw = def?.HasProperties ?? def?.Quantities ?? [];
      const items: PropRow[] = [];
      for (const p of raw) {
        const pName = p?.Name?.value;
        if (!pName) continue;
        const value = formatIfcValue(p?.NominalValue)
          ?? formatIfcValue(p?.LengthValue)
          ?? formatIfcValue(p?.AreaValue)
          ?? formatIfcValue(p?.VolumeValue)
          ?? formatIfcValue(p?.WeightValue)
          ?? formatIfcValue(p?.CountValue);
        if (value !== null) items.push({ name: pName, value });
      }
      if (items.length) psets.push({ group: def?.Name?.value || "Propriedades", items });
    } catch { /* pset ilegível, segue */ }
  }

  return { name, typeName, globalId, objectType, storey: findStoreyName(tree, id), material, psets };
}

// Mapas expressID ↔ GlobalId dos elementos com geometria. O GlobalId é a
// chave persistida das fases (estável entre reexportações); o expressID só
// vale para o modelo aberto em memória e nunca é gravado.
interface GidMaps {
  byExpress: Map<number, string>;
  byGlobalId: Map<string, number>;
}

function buildGlobalIdMaps(
  api: IfcAPI,
  modelID: number,
  meshMap: Map<number, THREE.Mesh[]>,
): GidMaps {
  const byExpress = new Map<number, string>();
  const byGlobalId = new Map<string, number>();
  meshMap.forEach((_meshes, id) => {
    try {
      const gid = api.GetLine(modelID, id)?.GlobalId?.value;
      if (typeof gid === "string" && gid) {
        byExpress.set(id, gid);
        byGlobalId.set(gid, id);
      }
    } catch { /* elemento sem linha legível */ }
  });
  return { byExpress, byGlobalId };
}

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
  selectedId, onSelect, forceOpen, ancestorIds, selectedProps,
  clientMode, phaseData, phaseIdx, onPhaseSelect, progressPct, selectedPhaseName,
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
  selectedProps: ElementProps | null;
  clientMode: boolean;
  phaseData: PhaseLookup | null;
  phaseIdx: number;
  onPhaseSelect: (idx: number) => void;
  progressPct: number;
  selectedPhaseName?: string;
}) {
  if (clientMode) {
    return (
      <>
        {/* Progresso no lugar de honra */}
        {phaseData && (
        <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
          <p className="text-[10px] font-bold text-zinc-500 mb-1 tracking-widest">PROGRESSO DA OBRA</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-primary leading-none">{progressPct}%</span>
            <span className="text-[10px] text-zinc-500 mb-0.5">concluído</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          <p className="text-[10px] font-bold text-zinc-500 mb-2 tracking-widest">ETAPAS DA OBRA</p>
          {!phaseData && !loading && (
            <p className="text-xs text-zinc-400 px-2 py-3">Etapas ainda não definidas para este projeto.</p>
          )}
          {phaseData?.phases.map((p, i) => {
            const status = i < phaseIdx ? "done" : i === phaseIdx ? "current" : "future";
            const StatusIcon = status === "done" ? CheckCircle2 : status === "current" ? Hammer : Circle;
            return (
              <button
                key={p.seq}
                onClick={() => onPhaseSelect(i)}
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors mb-1 ${
                  status === "current"
                    ? "bg-primary/15 ring-1 ring-primary/40"
                    : "hover:bg-zinc-50 dark:hover:bg-white/5"
                }`}
              >
                <StatusIcon
                  size={15}
                  className={`shrink-0 ${
                    status === "done" ? "text-green-500" : status === "current" ? "text-primary" : "text-zinc-400"
                  }`}
                />
                <span className={`text-xs font-bold flex-1 ${
                  status === "future" ? "text-zinc-400" : "text-navy dark:text-white"
                }`}>
                  {p.name}
                </span>
                <span className="text-[9px] font-bold text-zinc-400">
                  {status === "done" ? "Concluída" : status === "current" ? "Em andamento" : "Prevista"}
                </span>
              </button>
            );
          })}
        </div>

        {selectedProps && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 shrink-0">
            <p className="text-[10px] font-bold text-zinc-500 mb-2 tracking-widest">ITEM SELECIONADO</p>
            <div className="text-[10px] space-y-1">
              {([
                ["Nome", selectedProps.name],
                ["Etapa", selectedPhaseName],
                ["Pavimento", selectedProps.storey],
                ["Material", selectedProps.material],
              ] as const).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-zinc-500 shrink-0">{label}</span>
                  <span className="text-navy dark:text-white text-right truncate" title={value}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

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

      {selectedProps && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 max-h-64 overflow-y-auto shrink-0">
          <p className="text-[10px] font-bold text-zinc-500 mb-2 tracking-widest">PROPRIEDADES</p>
          <div className="text-[10px] space-y-1">
            {([
              ["Nome", selectedProps.name],
              ["Tipo", selectedProps.typeName],
              ["Categoria", selectedProps.objectType],
              ["Pavimento", selectedProps.storey],
              ["Material", selectedProps.material],
              ["GlobalId", selectedProps.globalId],
            ] as const).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-zinc-500 shrink-0">{label}</span>
                <span className="text-navy dark:text-white text-right truncate" title={value}>{value}</span>
              </div>
            ))}
          </div>
          {selectedProps.psets.map(g => (
            <div key={g.group} className="mt-2">
              <p className="text-[9px] font-bold text-zinc-400 mb-1 truncate">{g.group}</p>
              {g.items.map(it => (
                <div key={it.name} className="flex justify-between gap-2 text-[10px]">
                  <span className="text-zinc-500 truncate">{it.name}</span>
                  <span className="text-navy dark:text-white text-right truncate" title={it.value}>{it.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

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
// Alternância Modo Cliente ↔ Modo Técnico
const BIM_MODE_KEY = "vertice-bim-mode";

function ModeToggle({
  clientMode, onChange,
}: { clientMode: boolean; onChange: (client: boolean) => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 shadow-lg shrink-0">
      {([[true, "CLIENTE"], [false, "TÉCNICO"]] as const).map(([isClient, label]) => (
        <button
          key={label}
          onClick={() => onChange(isClient)}
          className={`px-3 py-2 text-[10px] font-bold transition-colors ${
            clientMode === isClient
              ? "bg-primary text-white"
              : "bg-white dark:bg-navy-light/80 text-zinc-500 hover:text-navy dark:hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Painel de curadoria de fases (admin): seleção múltipla no 3D → atribuir
// GlobalIds à fase escolhida; sinaliza elementos órfãos (sem fase).
function CurationPanel({
  active, onToggle, selCount, phases, onAssign, onDeletePhase,
  newPhaseName, setNewPhaseName, onCreatePhase,
  orphanCount, showOrphans, onToggleOrphans, onSelectOrphans, onClearSel,
  disabled,
}: {
  active: boolean;
  onToggle: () => void;
  selCount: number;
  phases: BimPhase[];
  onAssign: (phaseId: string) => void;
  onDeletePhase: (id: string) => void;
  newPhaseName: string;
  setNewPhaseName: (v: string) => void;
  onCreatePhase: () => void;
  orphanCount: number;
  showOrphans: boolean;
  onToggleOrphans: () => void;
  onSelectOrphans: () => void;
  onClearSel: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mb-4 p-3 rounded-xl border border-amber-300/50 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 shrink-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-zinc-500 tracking-widest">CURADORIA DE FASES</p>
        <button
          onClick={onToggle}
          disabled={disabled}
          className={`px-2 py-1 text-[9px] font-bold rounded transition-colors disabled:opacity-40 ${
            active ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-navy dark:hover:text-white"
          }`}
        >
          {active ? "ATIVA" : "ATIVAR"}
        </button>
      </div>

      {disabled && (
        <p className="text-[10px] text-zinc-500">
          Disponível apenas para modelos vinculados a um projeto.
        </p>
      )}

      {!disabled && orphanCount > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
          <AlertTriangle size={12} className="shrink-0" />
          <span className="flex-1">{orphanCount} elemento(s) sem fase</span>
          <button onClick={onToggleOrphans} className={`px-1.5 py-0.5 rounded ${showOrphans ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-white/10 text-zinc-500"}`}>
            Destacar
          </button>
          {active && (
            <button onClick={onSelectOrphans} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-navy dark:hover:text-white">
              Selecionar
            </button>
          )}
        </div>
      )}

      {!disabled && active && (
        <>
          <div className="flex items-center gap-2 mb-2 text-[10px]">
            <span className="flex-1 text-zinc-500">
              <strong className="text-navy dark:text-white">{selCount}</strong> selecionado(s) — clique nos elementos no 3D
            </span>
            {selCount > 0 && (
              <button onClick={onClearSel} className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-navy dark:hover:text-white font-bold">
                Limpar
              </button>
            )}
          </div>

          {phases.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 mb-1 text-[10px]">
              <span className="flex-1 truncate text-navy dark:text-white font-bold">
                {p.seq}. {p.name}
                <span className="ml-1 font-normal text-zinc-400">({p.elements.length})</span>
              </span>
              <button
                onClick={() => onAssign(p.id)}
                disabled={selCount === 0}
                className="px-2 py-0.5 rounded bg-primary/15 text-primary font-bold disabled:opacity-40 hover:bg-primary/25 transition-colors"
              >
                Atribuir
              </button>
              <button
                onClick={() => onDeletePhase(p.id)}
                className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors"
                aria-label={`Excluir fase ${p.name}`}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onCreatePhase(); }}
              placeholder="Nova fase..."
              className="flex-1 min-w-0 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded px-2 py-1 text-[10px] text-navy dark:text-white focus:outline-none focus:border-primary"
            />
            <button
              onClick={onCreatePhase}
              disabled={!newPhaseName.trim()}
              className="px-2 py-1 rounded bg-primary text-white disabled:opacity-40 flex items-center gap-1 text-[10px] font-bold"
            >
              <Plus size={11} /> Criar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Botão compacto das ferramentas de visibilidade
function ToolBtn({
  children, onClick, active = false,
}: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border shadow-lg transition-colors ${
        active
          ? "bg-primary text-white border-primary"
          : "bg-white dark:bg-navy-light/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

// Forma mínima de projeto que o workspace precisa (portal e HQ)
export interface BimWorkspaceProject {
  id: string | null;
  name: string;
  ifc_url?: string | null;
}

// Viewer BIM completo, reutilizado pela página do portal (cliente) e pela
// aba BIM do HQ (admin, com curadoria de fases)
export function BimWorkspace({
  project,
  projectLoading = false,
  adminMode = false,
  variant = "portal",
}: {
  project: BimWorkspaceProject | null;
  projectLoading?: boolean;
  adminMode?: boolean;
  variant?: "portal" | "hq";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef    = useRef<HTMLDivElement>(null);
  const {
    modelGroup, fitToModel, fitToBox, clearModel, pick, setView, setClipping, screenshot,
  } = useThreeScene(containerRef);

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
  const [selectedProps, setSelectedProps] = useState<ElementProps | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const [visMode, setVisMode] = useState<{ mode: "all" | "isolate" | "ghost"; ids: Set<number> }>(
    { mode: "all", ids: new Set() },
  );
  const [clip, setClip] = useState<{ axis: "x" | "y" | "z" | null; t: number }>({ axis: null, t: 0.5 });
  const [phaseIdx, setPhaseIdx] = useState(0); // índice em phaseLookup.phases
  const [gidMaps, setGidMaps]   = useState<GidMaps | null>(null);
  const [clientMode, setClientMode] = useState<boolean>(
    () => !adminMode && localStorage.getItem(BIM_MODE_KEY) !== "tecnico",
  );

  // Curadoria (admin): seleção múltipla por expressID + destaque de órfãos
  const [curation, setCuration]       = useState(false);
  const [curationSel, setCurationSel] = useState<Set<number>>(new Set());
  const [showOrphans, setShowOrphans] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  // Fonte de verdade das fases: tabela bim_phases (curadoria manual por
  // GlobalId). O demo, sem projeto no banco, usa a curadoria estática gerada.
  const { phases: dbPhases, createPhase, deletePhase, assignElements } =
    useBimPhases(project?.id ?? null);

  const handleModeChange = useCallback((client: boolean) => {
    setClientMode(client);
    localStorage.setItem(BIM_MODE_KEY, client ? "cliente" : "tecnico");
    if (client) setSearch(""); // limpa filtro/highlight técnico ao humanizar
  }, []);

  const meshMapRef = useRef<Map<number, THREE.Mesh[]>>(new Map());
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const ifcRef = useRef<{ api: IfcAPI; modelID: number; defs: DefinitionMaps } | null>(null);

  // Fecha o modelo IFC ao desmontar a página
  useEffect(() => () => {
    const h = ifcRef.current;
    if (h) { try { h.api.CloseModel(h.modelID); } catch { /* já fechado */ } }
    ifcRef.current = null;
  }, []);

  const phaseAssignments: PhaseAssignment[] = isProjectModel ? dbPhases : DEMO_PHASES;
  const phaseLookup = useMemo(() => buildPhaseLookup(phaseAssignments), [phaseAssignments]);

  // Nova curadoria ou novo modelo: timeline volta para a última fase
  useEffect(() => {
    setPhaseIdx(phaseLookup ? phaseLookup.phases.length - 1 : 0);
  }, [phaseLookup]);

  // Órfãos: GlobalIds presentes no modelo carregado sem fase atribuída
  // (cobre elementos novos/alterados após reexportação do IFC)
  const orphanGids = useMemo(() => {
    if (!gidMaps) return [];
    return findOrphans(gidMaps.byExpress.values(), phaseLookup);
  }, [gidMaps, phaseLookup]);

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
    if (showOrphans && gidMaps) {
      orphanGids.forEach(gid => {
        const id = gidMaps.byGlobalId.get(gid);
        if (id === undefined) return;
        meshMapRef.current.get(id)?.forEach(m => {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.6;
        });
      });
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
    curationSel.forEach(id => meshMapRef.current.get(id)?.forEach(m => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x22c55e);
      mat.emissiveIntensity = 0.9;
    }));
  }, [query, selectedId, tree, info, curationSel, showOrphans, orphanGids, gidMaps]);

  // Propriedades IFC do elemento selecionado (consulta o modelo aberto)
  useEffect(() => {
    const h = ifcRef.current;
    if (selectedId === null || !h) { setSelectedProps(null); return; }
    try {
      setSelectedProps(getElementProps(h.api, h.modelID, selectedId, h.defs, tree));
    } catch {
      setSelectedProps(null);
    }
  }, [selectedId, tree]);

  // Visibilidade: linha do tempo (por GlobalId) + ocultos + isolar/fantasma
  useEffect(() => {
    const currentSeq = phaseLookup
      ? phaseLookup.phases[Math.min(phaseIdx, phaseLookup.phases.length - 1)]?.seq ?? Infinity
      : Infinity;
    meshMapRef.current.forEach((meshes, id) => {
      const gid = gidMaps?.byExpress.get(id);
      const seq = gid !== undefined ? phaseLookup?.byGlobalId.get(gid) : undefined;
      const phaseHidden = seq !== undefined && seq > currentSeq;
      meshes.forEach(m => {
        const mat = m.material as THREE.MeshStandardMaterial;
        const hidden = phaseHidden
          || hiddenIds.has(id)
          || (visMode.mode === "isolate" && !visMode.ids.has(id));
        m.visible = !hidden;
        if (visMode.mode === "ghost" && !visMode.ids.has(id)) {
          mat.transparent = true;
          mat.opacity = 0.12;
          mat.depthWrite = false;
        } else {
          mat.transparent = !!m.userData.origTransparent;
          mat.opacity = (m.userData.origOpacity as number) ?? 1;
          mat.depthWrite = true;
        }
      });
    });
  }, [hiddenIds, visMode, info, phaseLookup, phaseIdx, gidMaps]);

  // Nome da etapa do elemento selecionado (rótulo amigável do modo cliente)
  const selectedPhaseName = useMemo(() => {
    if (!phaseLookup || !gidMaps || selectedId === null) return undefined;
    const gid = gidMaps.byExpress.get(selectedId);
    const seq = gid ? phaseLookup.byGlobalId.get(gid) : undefined;
    return phaseLookup.phases.find(p => p.seq === seq)?.name;
  }, [phaseLookup, gidMaps, selectedId]);

  // % da obra: fases liberadas / total de fases cadastradas
  const progressPct = useMemo(() => {
    if (!phaseLookup || phaseLookup.phases.length === 0) return 100;
    return Math.round(((phaseIdx + 1) / phaseLookup.phases.length) * 100);
  }, [phaseLookup, phaseIdx]);

  // Plano de corte
  useEffect(() => {
    setClipping(clip.axis, clip.t);
  }, [clip, setClipping, info]);

  // Ids da seleção atual (elemento + descendentes)
  const currentSelectionIds = useCallback((): Set<number> => {
    if (selectedId === null) return new Set();
    const node = tree ? findNode(tree, selectedId) : null;
    return new Set(node ? collectIds(node) : [selectedId]);
  }, [selectedId, tree]);

  const isolateSelection = useCallback(() => {
    const ids = currentSelectionIds();
    if (ids.size) setVisMode({ mode: "isolate", ids });
  }, [currentSelectionIds]);

  const ghostSelection = useCallback(() => {
    const ids = currentSelectionIds();
    if (ids.size) setVisMode({ mode: "ghost", ids });
  }, [currentSelectionIds]);

  const hideSelection = useCallback(() => {
    const ids = currentSelectionIds();
    if (!ids.size) return;
    setHiddenIds(prev => new Set([...prev, ...ids]));
    setSelectedId(null);
  }, [currentSelectionIds]);

  const showAll = useCallback(() => {
    setHiddenIds(new Set());
    setVisMode({ mode: "all", ids: new Set() });
  }, []);

  // ── Curadoria de fases (admin) ────────────────────────────────────────────
  const curationGids = useMemo(() => {
    if (!gidMaps) return [] as string[];
    return [...curationSel]
      .map(id => gidMaps.byExpress.get(id))
      .filter((g): g is string => !!g);
  }, [curationSel, gidMaps]);

  const toggleCuration = useCallback(() => {
    setCuration(v => !v);
    setCurationSel(new Set());
    setSelectedId(null);
  }, []);

  const handleAssign = useCallback(async (phaseId: string) => {
    if (!curationGids.length) return;
    const { error } = await assignElements(phaseId, curationGids);
    if (error) {
      toast.error("Falha ao salvar atribuição: " + error);
      return;
    }
    toast.success(`${curationGids.length} elemento(s) atribuído(s) à fase.`);
    setCurationSel(new Set());
  }, [curationGids, assignElements]);

  const handleCreatePhase = useCallback(async () => {
    const name = newPhaseName.trim();
    if (!name) return;
    const phase = await createPhase(name);
    if (!phase) {
      toast.error("Falha ao criar fase.");
      return;
    }
    setNewPhaseName("");
    toast.success(`Fase "${name}" criada.`);
  }, [newPhaseName, createPhase]);

  const handleDeletePhase = useCallback(async (id: string) => {
    const phase = dbPhases.find(p => p.id === id);
    if (!phase) return;
    if (!window.confirm(`Excluir a fase "${phase.name}"? Os ${phase.elements.length} elementos dela voltam a ficar sem fase.`)) return;
    const { error } = await deletePhase(id);
    if (error) toast.error("Falha ao excluir fase: " + error);
  }, [dbPhases, deletePhase]);

  const selectOrphans = useCallback(() => {
    if (!gidMaps) return;
    const ids = orphanGids
      .map(g => gidMaps.byGlobalId.get(g))
      .filter((i): i is number => i !== undefined);
    setCurationSel(new Set(ids));
  }, [gidMaps, orphanGids]);

  const handleScreenshot = useCallback(() => {
    const url = screenshot();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `vertice-bim-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.click();
  }, [screenshot]);

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
    // Curadoria ativa: cliques acumulam/removem da seleção múltipla
    if (adminMode && curation) {
      if (id === null) return;
      setCurationSel(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    if (id === null) setSelectedId(null);
    else setSelectedId(prev => (prev === id ? null : id));
  }, [pick, adminMode, curation]);

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
    setHiddenIds(new Set());
    setVisMode({ mode: "all", ids: new Set() });
    setClip({ axis: null, t: 0.5 });
    setCurationSel(new Set());
    setShowOrphans(false);
    setGidMaps(null);
    clearModel();
    meshMapRef.current.clear();
    const prev = ifcRef.current;
    if (prev) {
      ifcRef.current = null;
      try { prev.api.CloseModel(prev.modelID); } catch { /* já fechado */ }
    }
    try {
      const data = new Uint8Array(buffer);
      const result = await loadIfcIntoGroup(data, modelGroup, meshMapRef.current, setProgress);
      const defs = buildDefinitionMaps(result.api, result.modelID);
      ifcRef.current = { api: result.api, modelID: result.modelID, defs };
      setGidMaps(buildGlobalIdMaps(result.api, result.modelID, meshMapRef.current));
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
      await loadFromBuffer(buf, "Residência Vértice (demo)", false);
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
    <div className={variant === "portal"
      ? "flex flex-col h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] -mx-3 -mt-[4.5rem] -mb-24 pt-14 lg:m-0 lg:pt-0 lg:h-[calc(100vh-6rem)] w-auto lg:w-full font-mono text-zinc-300 relative gap-0 lg:gap-6"
      : "flex flex-col h-[75vh] w-full font-mono text-zinc-300 relative gap-4"
    }>

      {/* Header */}
      {variant === "portal" && (
      <div className="hidden lg:flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-accent/20 text-accent px-3 py-1 rounded-[0.25rem] font-bold text-sm">[ IFC ]</div>
          <h1 className="text-3xl font-black tracking-tighter text-navy dark:text-white uppercase font-sans">
            Modelo BIM Integrado
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <ModeToggle clientMode={clientMode} onChange={handleModeChange} />
          <button
            onClick={fitToModel}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Maximize2 size={14} /> ENQUADRAR
          </button>
        </div>
      </div>
      )}

      <div className="flex flex-1 gap-0 lg:gap-6 min-h-0">

        {/* Sidebar / Tree View */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-4 flex-col shadow-lg overflow-hidden">
          {adminMode && (
            <CurationPanel
              active={curation}
              onToggle={toggleCuration}
              selCount={curationSel.size}
              phases={dbPhases}
              onAssign={handleAssign}
              onDeletePhase={handleDeletePhase}
              newPhaseName={newPhaseName}
              setNewPhaseName={setNewPhaseName}
              onCreatePhase={handleCreatePhase}
              orphanCount={orphanGids.length}
              showOrphans={showOrphans}
              onToggleOrphans={() => setShowOrphans(v => !v)}
              onSelectOrphans={selectOrphans}
              onClearSel={() => setCurationSel(new Set())}
              disabled={!project?.id || !isProjectModel}
            />
          )}
          <PanelContent
            search={search} setSearch={setSearch}
            tree={displayTree} hasModel={!!tree} info={info} loading={loading}
            selectedId={selectedId} onSelect={handleSelectNode}
            forceOpen={!!query} ancestorIds={ancestorIds}
            selectedProps={selectedProps}
            clientMode={clientMode} phaseData={phaseLookup} phaseIdx={phaseIdx}
            onPhaseSelect={setPhaseIdx} progressPct={progressPct}
            selectedPhaseName={selectedPhaseName}
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
            <div className="flex flex-col gap-2 items-start">
              {/* Toggle de modo (portal: só mobile, desktop fica no header; HQ: sempre) */}
              <div className={variant === "hq" ? "pointer-events-auto" : "lg:hidden pointer-events-auto"}>
                <ModeToggle clientMode={clientMode} onChange={handleModeChange} />
              </div>
              {clientMode ? (
                info && phaseLookup && (
                  <div className="bg-white/80 dark:bg-black/60 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-3 rounded-lg hidden lg:block pointer-events-auto shadow-lg">
                    <p className="text-[10px] text-zinc-500">PROGRESSO DA OBRA</p>
                    <p className="text-sm font-black text-primary">
                      {progressPct}%
                      <span className="ml-2 text-xs font-bold text-navy dark:text-white">
                        {phaseLookup.phases[phaseIdx]?.name}
                      </span>
                    </p>
                  </div>
                )
              ) : (
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
              )}
            </div>

            <div className="ml-auto flex flex-col gap-2 pointer-events-auto">
              <button onClick={fitToModel} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title="Enquadrar">
                <Maximize2 size={16} />
              </button>
              <button onClick={toggleFullscreen} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title={fullscreenActive ? "Sair da tela cheia" : "Tela cheia"}>
                {fullscreenActive ? <Shrink size={16} /> : <Expand size={16} />}
              </button>
              <button onClick={handleScreenshot} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title="Capturar PNG">
                <Camera size={16} />
              </button>
              <div className="flex flex-col gap-1 mt-1">
                {([["top", "TOPO"], ["front", "FRENTE"], ["iso", "ISO"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="w-10 h-7 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg text-[8px] font-bold text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg"
                    title={`Vista ${label.toLowerCase()}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ferramentas de visibilidade (com seleção ativa ou estado alterado) */}
          {(selectedId !== null || visMode.mode !== "all" || hiddenIds.size > 0) && (
            <div className="absolute bottom-14 lg:bottom-4 left-4 z-10 flex flex-wrap gap-1.5 pointer-events-auto max-w-[60%]">
              {selectedId !== null && (
                <>
                  <ToolBtn onClick={isolateSelection} active={visMode.mode === "isolate"}>ISOLAR</ToolBtn>
                  <ToolBtn onClick={ghostSelection} active={visMode.mode === "ghost"}>FANTASMA</ToolBtn>
                  <ToolBtn onClick={hideSelection}>OCULTAR</ToolBtn>
                </>
              )}
              {(visMode.mode !== "all" || hiddenIds.size > 0) && (
                <ToolBtn onClick={showAll}>MOSTRAR TUDO</ToolBtn>
              )}
            </div>
          )}

          {/* Plano de corte */}
          {info && (
            <div className="absolute bottom-24 lg:bottom-4 right-4 z-10 pointer-events-auto bg-white/90 dark:bg-black/60 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <span className="text-[9px] font-bold text-zinc-500 tracking-widest">CORTE</span>
              {(["x", "y", "z"] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setClip(c => ({ axis: c.axis === a ? null : a, t: c.t }))}
                  className={`w-6 h-6 text-[10px] font-bold rounded transition-colors ${
                    clip.axis === a
                      ? "bg-primary text-white"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-500 hover:text-navy dark:hover:text-white"
                  }`}
                >
                  {a.toUpperCase()}
                </button>
              ))}
              {clip.axis && (
                <input
                  type="range" min={0} max={100} value={clip.t * 100}
                  onChange={e => setClip(c => ({ ...c, t: Number(e.target.value) / 100 }))}
                  className="w-24 lg:w-32 accent-primary"
                  aria-label="Posição do plano de corte"
                />
              )}
            </div>
          )}

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

      {/* Linha do tempo de marcos */}
      {phaseLookup && phaseLookup.phases.length > 1 && (
        <div className={`flex items-center gap-3 lg:gap-5 bg-white dark:bg-navy-light/60 border-t lg:border border-zinc-200 dark:border-white/15 rounded-none lg:rounded-2xl px-4 lg:px-6 py-2.5 lg:py-3 shadow-lg shrink-0 ${variant === "portal" ? "mb-10 lg:mb-0" : ""}`}>
          <span className="hidden sm:block text-[9px] font-bold text-zinc-500 tracking-widest shrink-0">
            LINHA DO TEMPO
          </span>
          <input
            type="range"
            min={0}
            max={phaseLookup.phases.length - 1}
            step={1}
            value={phaseIdx}
            onChange={e => setPhaseIdx(Number(e.target.value))}
            className="flex-1 min-w-0 accent-primary"
            aria-label="Fase da obra"
          />
          <div className="hidden lg:flex gap-1 shrink-0">
            {phaseLookup.phases.map((p, i) => (
              <button
                key={p.seq}
                onClick={() => setPhaseIdx(i)}
                className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${
                  i <= phaseIdx
                    ? "bg-primary/15 text-primary"
                    : "bg-zinc-100 dark:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="shrink-0 text-right w-24 lg:w-28">
            <p className="text-xs font-bold text-navy dark:text-white truncate">
              {phaseLookup.phases[phaseIdx]?.name}
            </p>
            <p className="text-[10px] text-primary font-bold">{progressPct}% da obra</p>
          </div>
        </div>
      )}

      {variant === "portal" && (
        <BimBottomSheet>
          <PanelContent
            search={search} setSearch={setSearch}
            tree={displayTree} hasModel={!!tree} info={info} loading={loading}
            selectedId={selectedId} onSelect={handleSelectNode}
            forceOpen={!!query} ancestorIds={ancestorIds}
            selectedProps={selectedProps}
            clientMode={clientMode} phaseData={phaseLookup} phaseIdx={phaseIdx}
            onPhaseSelect={setPhaseIdx} progressPct={progressPct}
            selectedPhaseName={selectedPhaseName}
          />
        </BimBottomSheet>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página do portal: o cliente vê o modelo do próprio projeto (ou o demo)
// ─────────────────────────────────────────────────────────────────────────────
export default function BimViewer() {
  const { project, loading } = useClientProject();
  return (
    <BimWorkspace
      project={project ? { id: project.id, name: project.name, ifc_url: project.ifc_url } : null}
      projectLoading={loading}
    />
  );
}
