import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box, Layers, Loader2, Maximize2, Search, ChevronRight, Eye, AlertCircle,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { IfcAPI, FlatMesh } from "web-ifc";
import { useClientProject } from "@/hooks/data/useClientProject";

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

  return { modelGroup: modelGroupRef.current, fitToModel, clearModel };
}

// ─────────────────────────────────────────────────────────────────────────────
// IFC loader: parse via web-ifc → cria meshes Three.js
// ─────────────────────────────────────────────────────────────────────────────
async function loadIfcIntoGroup(
  data: Uint8Array,
  group: THREE.Group,
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
      group.add(threeMesh);

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

// Constrói uma árvore espacial básica (Site → Building → Storey)
function buildSpatialTree(api: IfcAPI, modelID: number): SpatialNode | null {
  try {
    // IFCSITE = 4097777520, IFCBUILDING = 1095909175, IFCBUILDINGSTOREY = 3124254112, IFCSPACE = 3856911033
    const sites    = api.GetLineIDsWithType(modelID, 4097777520);
    if (sites.size() === 0) return null;

    const getName = (id: number, fallback: string) => {
      try {
        const ent = api.GetLine(modelID, id);
        return ent?.Name?.value || fallback;
      } catch { return fallback; }
    };

    const siteId = sites.get(0);
    const root: SpatialNode = {
      id: siteId, name: getName(siteId, "Site"), type: "site", children: [],
    };

    const buildings = api.GetLineIDsWithType(modelID, 1095909175);
    for (let b = 0; b < buildings.size(); b++) {
      const bId = buildings.get(b);
      const bNode: SpatialNode = {
        id: bId, name: getName(bId, "Edifício"), type: "building", children: [],
      };
      root.children.push(bNode);

      const storeys = api.GetLineIDsWithType(modelID, 3124254112);
      for (let s = 0; s < storeys.size(); s++) {
        const sId = storeys.get(s);
        bNode.children.push({
          id: sId, name: getName(sId, `Pavimento ${s + 1}`), type: "storey", children: [],
        });
      }
    }

    return root;
  } catch (e) {
    console.warn("Falha ao construir árvore IFC:", e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree node UI
// ─────────────────────────────────────────────────────────────────────────────
function TreeNodeView({ node, depth = 0 }: { node: SpatialNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const Icon = node.type === "storey" ? Layers : Box;

  return (
    <div className="mb-1">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 p-1.5 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors group text-navy dark:text-white"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {node.children.length > 0
          ? <ChevronRight size={13} className={`text-zinc-500 transition-transform ${open ? "rotate-90" : ""}`} />
          : <span className="w-[13px]" />}
        <Icon size={13} className="text-primary shrink-0" />
        <span className="text-xs font-bold truncate">{node.name}</span>
      </div>
      {open && node.children.map(c => (
        <TreeNodeView key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function BimViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { modelGroup, fitToModel, clearModel } = useThreeScene(containerRef);
  const { project, loading: projectLoading } = useClientProject();

  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<ModelInfo | null>(null);
  const [tree, setTree]         = useState<SpatialNode | null>(null);
  const [search, setSearch]     = useState("");
  const [isProjectModel, setIsProjectModel] = useState(false);

  const loadFromBuffer = useCallback(async (buffer: ArrayBuffer, sourceName: string, fromProject = false) => {
    setLoading(true);
    setError(null);
    clearModel();
    try {
      const data = new Uint8Array(buffer);
      const result = await loadIfcIntoGroup(data, modelGroup, setProgress);
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
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full font-mono text-zinc-300 relative gap-6">

      {/* Header */}
      <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4 mb-2">
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

      <div className="flex flex-1 gap-6 min-h-0">

        {/* Sidebar / Tree View */}
        <div className="w-80 bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-4 flex flex-col shadow-lg overflow-hidden">
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
              <p className="text-xs text-zinc-400 px-2 py-3">Sem modelo carregado.</p>
            )}
            {tree && <TreeNodeView node={tree} />}
          </div>

          {info && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 text-[10px] text-zinc-500 space-y-1">
              <div className="flex justify-between"><span>Arquivo</span><span className="text-navy dark:text-white truncate ml-2 max-w-[180px]" title={info.name}>{info.name}</span></div>
              <div className="flex justify-between"><span>Meshes</span><span className="text-navy dark:text-white">{info.meshCount}</span></div>
              <div className="flex justify-between"><span>Triângulos</span><span className="text-navy dark:text-white">{info.triangleCount.toLocaleString("pt-BR")}</span></div>
              <div className="flex justify-between"><span>Dimensões</span><span className="text-navy dark:text-white">{info.bbox.width.toFixed(1)} × {info.bbox.height.toFixed(1)} × {info.bbox.depth.toFixed(1)} m</span></div>
            </div>
          )}
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 bg-zinc-100 dark:bg-[#0A0A0E] border border-zinc-200 dark:border-white/15 rounded-2xl relative overflow-hidden shadow-inner">
          <div ref={containerRef} className="absolute inset-0" />

          {/* Overlay info */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="bg-white/80 dark:bg-black/60 backdrop-blur-md border border-zinc-200 dark:border-white/10 p-3 rounded-lg flex items-center gap-4 pointer-events-auto shadow-lg">
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

            <div className="flex flex-col gap-2 pointer-events-auto">
              <button onClick={fitToModel} className="w-10 h-10 bg-white dark:bg-navy-light/80 border border-zinc-200 dark:border-white/10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white hover:border-primary transition-colors shadow-lg" title="Enquadrar">
                <Maximize2 size={16} />
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
    </div>
  );
}
