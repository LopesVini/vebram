#!/usr/bin/env python3
"""Gera public/models/demo.ifc — residência unifamiliar de 2 pavimentos.

Modelo demo coerente para o viewer BIM do portal: terreno, fundação
(sapatas + baldrames), estrutura (pilares/vigas/lajes), alvenaria com
vãos reais, telhado de duas águas e esquadrias. Cada elemento carrega o
pset "Vertice_Execucao" com as propriedades Fase (inteiro) e Etapa
(rótulo), consumidas pela linha do tempo de marcos do viewer.

Uso: python3 scripts/generate_demo_ifc.py
"""
import math
import random
import string
from pathlib import Path

random.seed(42)

OUT = Path(__file__).resolve().parent.parent / "public" / "models" / "demo.ifc"

lines: list[str] = []


def w(entity: str) -> str:
    idx = len(lines) + 1
    lines.append(f"#{idx}={entity};")
    return f"#{idx}"


GUID_ALPHABET = string.digits + string.ascii_uppercase + string.ascii_lowercase + "_$"


def guid() -> str:
    return "'" + "".join(random.choice(GUID_ALPHABET) for _ in range(22)) + "'"


def num(v: float) -> str:
    return f"{v:.5f}".rstrip("0").rstrip(".") + ("." if f"{v:.5f}".rstrip("0").rstrip(".").find(".") < 0 else "")


def pt3(x, y, z):
    return w(f"IFCCARTESIANPOINT(({num(x)},{num(y)},{num(z)}))")


def pt2(x, y):
    return w(f"IFCCARTESIANPOINT(({num(x)},{num(y)}))")


def dir3(x, y, z):
    return w(f"IFCDIRECTION(({num(x)},{num(y)},{num(z)}))")


def ax3(loc, axis="$", ref="$"):
    return w(f"IFCAXIS2PLACEMENT3D({loc},{axis},{ref})")


def lp(rel_to, ax):
    return w(f"IFCLOCALPLACEMENT({rel_to},{ax})")


# ── Unidades, contexto, projeto ──────────────────────────────────────────────
u_len = w("IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)")
u_area = w("IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)")
u_vol = w("IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)")
u_ang = w("IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)")
units = w(f"IFCUNITASSIGNMENT(({u_len},{u_area},{u_vol},{u_ang}))")

wcs = ax3(pt3(0, 0, 0))
CTX = w(f"IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,{wcs},$)")

project = w(
    f"IFCPROJECT({guid()},$,'Residencia Vertice',"
    f"'Residencia unifamiliar de 2 pavimentos - modelo demo',$,$,$,({CTX}),{units})"
)

DIR_Z = dir3(0, 0, 1)

# ── Estrutura espacial ───────────────────────────────────────────────────────
site_lp = lp("$", ax3(pt3(0, 0, 0)))
site = w(f"IFCSITE({guid()},$,'Terreno',$,$,{site_lp},$,$,.ELEMENT.,$,$,$,$,$)")

bldg_lp = lp(site_lp, ax3(pt3(0, 0, 0)))
building = w(f"IFCBUILDING({guid()},$,'Residencia Vertice',$,$,{bldg_lp},$,$,.ELEMENT.,$,$,$)")

STOREYS = [
    ("Fundacao", -0.60),
    ("Terreo", 0.00),
    ("Pavimento Superior", 3.00),
    ("Cobertura", 6.00),
]
storey_refs = []
storey_lps = []
for name, elev in STOREYS:
    slp = lp(bldg_lp, ax3(pt3(0, 0, 0)))
    storey_lps.append(slp)
    storey_refs.append(
        w(f"IFCBUILDINGSTOREY({guid()},$,'{name}',$,$,{slp},$,$,.ELEMENT.,{num(elev)})")
    )

# ── Estilos (cores) ──────────────────────────────────────────────────────────
def style(name, r, g, b, transparency=0.0):
    col = w(f"IFCCOLOURRGB($,{num(r)},{num(g)},{num(b)})")
    shading = w(f"IFCSURFACESTYLESHADING({col},{num(transparency)})")
    return w(f"IFCSURFACESTYLE('{name}',.BOTH.,({shading}))")


ST_CONCRETO = style("Concreto", 0.72, 0.71, 0.69)
ST_FUNDACAO = style("Concreto fundacao", 0.58, 0.57, 0.55)
ST_PAREDE = style("Alvenaria", 0.93, 0.90, 0.84)
ST_TELHA = style("Telha ceramica", 0.62, 0.28, 0.19)
ST_VIDRO = style("Vidro", 0.52, 0.70, 0.85, 0.45)
ST_MADEIRA = style("Madeira", 0.45, 0.30, 0.17)
ST_TERRENO = style("Terreno", 0.42, 0.51, 0.36)

# ── Solidos ──────────────────────────────────────────────────────────────────
def box(cx, cy, xdim, ydim, z0, h, st, placement=None):
    """Caixa extrudada; por padrao alinhada ao mundo, com base em z0."""
    ppos = w(f"IFCAXIS2PLACEMENT2D({pt2(cx, cy)},$)")
    prof = w(f"IFCRECTANGLEPROFILEDEF(.AREA.,$,{ppos},{num(xdim)},{num(ydim)})")
    pos = placement if placement else ax3(pt3(0, 0, z0))
    solid = w(f"IFCEXTRUDEDAREASOLID({prof},{pos},{DIR_Z},{num(h)})")
    w(f"IFCSTYLEDITEM({solid},({st}),$)")
    return solid


def tri_prism(points2d, placement, depth, st):
    """Prisma de perfil poligonal fechado extrudado no eixo local Z."""
    pts = [pt2(u, v) for (u, v) in points2d + [points2d[0]]]
    poly = w(f"IFCPOLYLINE(({','.join(pts)}))")
    prof = w(f"IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,{poly})")
    solid = w(f"IFCEXTRUDEDAREASOLID({prof},{placement},{DIR_Z},{num(depth)})")
    w(f"IFCSTYLEDITEM({solid},({st}),$)")
    return solid


# ── Registro de elementos ────────────────────────────────────────────────────
by_storey: dict[int, list[str]] = {i: [] for i in range(len(STOREYS))}
by_fase: dict[int, list[str]] = {}
by_material: dict[str, list[str]] = {}

FASES = {
    0: "Terreno",
    1: "Fundacao",
    2: "Estrutura",
    3: "Alvenaria",
    4: "Cobertura",
    5: "Esquadrias",
}


def element(cls, name, solids, storey_idx, fase, material, extra=""):
    rep = w(f"IFCSHAPEREPRESENTATION({CTX},'Body','SweptSolid',({','.join(solids)}))")
    pds = w(f"IFCPRODUCTDEFINITIONSHAPE($,$,({rep}))")
    place = lp(storey_lps[storey_idx], ax3(pt3(0, 0, 0)))
    tail = f",{extra}" if extra else ""
    ref = w(f"{cls}({guid()},$,'{name}',$,$,{place},{pds},$" + tail + ")")
    by_storey[storey_idx].append(ref)
    by_fase.setdefault(fase, []).append(ref)
    by_material.setdefault(material, []).append(ref)
    return ref


# ── Geometria da casa ────────────────────────────────────────────────────────
# Planta 10 x 8 m; eixos de pilares x {0.3, 5.0, 9.7}, y {0.3, 7.7}
COL_X = [0.3, 5.0, 9.7]
COL_Y = [0.3, 7.7]
WALL_T = 0.15

# Terreno (fase 0)
element("IFCSLAB", "Terreno", [box(5.0, 4.0, 16.0, 13.0, -0.75, 0.15, ST_TERRENO)],
        0, 0, "Solo compactado", ".BASESLAB.")

# Fundacao (fase 1): sapatas sob cada pilar + baldrames nas linhas de eixo
n = 1
for cy in COL_Y:
    for cx in COL_X:
        element("IFCFOOTING", f"Sapata S{n}",
                [box(cx, cy, 1.2, 1.2, -0.6, 0.4, ST_FUNDACAO)],
                0, 1, "Concreto armado", ".PAD_FOOTING.")
        n += 1

BEAM_LINES_X = [(0.15, 9.85, 0.3), (0.15, 9.85, 7.7)]          # ao longo de x, em y fixo
BEAM_LINES_Y = [(0.15, 7.85, 0.3), (0.15, 7.85, 5.0), (0.15, 7.85, 9.7)]  # ao longo de y, em x fixo

n = 1
for (x0, x1, yc) in BEAM_LINES_X:
    element("IFCBEAM", f"Baldrame B{n}",
            [box((x0 + x1) / 2, yc, x1 - x0, 0.2, -0.45, 0.45, ST_FUNDACAO)],
            0, 1, "Concreto armado", ".BEAM.")
    n += 1
for (y0, y1, xc) in BEAM_LINES_Y:
    element("IFCBEAM", f"Baldrame B{n}",
            [box(xc, (y0 + y1) / 2, 0.2, y1 - y0, -0.45, 0.45, ST_FUNDACAO)],
            0, 1, "Concreto armado", ".BEAM.")
    n += 1

# Estrutura (fase 2)
element("IFCSLAB", "Laje Terreo", [box(5.0, 4.0, 10.0, 8.0, 0.0, 0.15, ST_CONCRETO)],
        1, 2, "Concreto armado", ".FLOOR.")

n = 1
for cy in COL_Y:
    for cx in COL_X:
        element("IFCCOLUMN", f"Pilar P{n} (Terreo)",
                [box(cx, cy, 0.3, 0.3, 0.0, 3.0, ST_CONCRETO)],
                1, 2, "Concreto armado", ".COLUMN.")
        n += 1

n = 1
for (x0, x1, yc) in BEAM_LINES_X:
    element("IFCBEAM", f"Viga V{n} (Terreo)",
            [box((x0 + x1) / 2, yc, x1 - x0, 0.2, 2.7, 0.3, ST_CONCRETO)],
            1, 2, "Concreto armado", ".BEAM.")
    n += 1
for (y0, y1, xc) in BEAM_LINES_Y:
    element("IFCBEAM", f"Viga V{n} (Terreo)",
            [box(xc, (y0 + y1) / 2, 0.2, y1 - y0, 2.7, 0.3, ST_CONCRETO)],
            1, 2, "Concreto armado", ".BEAM.")
    n += 1

element("IFCSLAB", "Laje Pavimento Superior", [box(5.0, 4.0, 10.0, 8.0, 3.0, 0.15, ST_CONCRETO)],
        2, 2, "Concreto armado", ".FLOOR.")

n = 1
for cy in COL_Y:
    for cx in COL_X:
        element("IFCCOLUMN", f"Pilar P{n} (Superior)",
                [box(cx, cy, 0.3, 0.3, 3.0, 2.85, ST_CONCRETO)],
                2, 2, "Concreto armado", ".COLUMN.")
        n += 1

n = 1
for (x0, x1, yc) in BEAM_LINES_X:
    element("IFCBEAM", f"Viga V{n} (Superior)",
            [box((x0 + x1) / 2, yc, x1 - x0, 0.2, 5.55, 0.3, ST_CONCRETO)],
            2, 2, "Concreto armado", ".BEAM.")
    n += 1
for (y0, y1, xc) in BEAM_LINES_Y:
    element("IFCBEAM", f"Viga V{n} (Superior)",
            [box(xc, (y0 + y1) / 2, 0.2, y1 - y0, 5.55, 0.3, ST_CONCRETO)],
            2, 2, "Concreto armado", ".BEAM.")
    n += 1

element("IFCSLAB", "Laje de Forro", [box(5.0, 4.0, 10.0, 8.0, 5.85, 0.15, ST_CONCRETO)],
        3, 2, "Concreto armado", ".FLOOR.")

# Alvenaria (fase 3) — paredes com vaos reais (peitoril/verga em janelas, verga em portas)
def wall_along_x(name, yc, x0, x1, z0, z1, openings, storey, fase):
    """openings: lista de (a0, a1, tipo, sill, top) em x; tipo 'porta'|'janela'."""
    solids = []
    cur = x0
    for (a0, a1, kind, sill, top) in sorted(openings):
        if a0 > cur:
            solids.append(box((cur + a0) / 2, yc, a0 - cur, WALL_T, z0, z1 - z0, ST_PAREDE))
        if kind == "porta":
            solids.append(box((a0 + a1) / 2, yc, a1 - a0, WALL_T, top, z1 - top, ST_PAREDE))
        else:
            solids.append(box((a0 + a1) / 2, yc, a1 - a0, WALL_T, z0, sill - z0, ST_PAREDE))
            solids.append(box((a0 + a1) / 2, yc, a1 - a0, WALL_T, top, z1 - top, ST_PAREDE))
        cur = a1
    if cur < x1:
        solids.append(box((cur + x1) / 2, yc, x1 - cur, WALL_T, z0, z1 - z0, ST_PAREDE))
    return element("IFCWALL", name, solids, storey, fase, "Alvenaria ceramica", ".SOLIDWALL.")


def wall_along_y(name, xc, y0, y1, z0, z1, openings, storey, fase):
    solids = []
    cur = y0
    for (a0, a1, kind, sill, top) in sorted(openings):
        if a0 > cur:
            solids.append(box(xc, (cur + a0) / 2, WALL_T, a0 - cur, z0, z1 - z0, ST_PAREDE))
        if kind == "porta":
            solids.append(box(xc, (a0 + a1) / 2, WALL_T, a1 - a0, top, z1 - top, ST_PAREDE))
        else:
            solids.append(box(xc, (a0 + a1) / 2, WALL_T, a1 - a0, z0, sill - z0, ST_PAREDE))
            solids.append(box(xc, (a0 + a1) / 2, WALL_T, a1 - a0, top, z1 - top, ST_PAREDE))
        cur = a1
    if cur < y1:
        solids.append(box(xc, (cur + y1) / 2, WALL_T, y1 - cur, z0, z1 - z0, ST_PAREDE))
    return element("IFCWALL", name, solids, storey, fase, "Alvenaria ceramica", ".SOLIDWALL.")


# Terreo: paredes de 0.15 a 2.7; janelas 1.15..2.35; porta 0.15..2.25
wall_along_x("Parede Frontal (Terreo)", 0.3, 0.15, 9.85, 0.15, 2.7,
             [(1.3, 2.3, "porta", 0, 2.25),
              (4.0, 5.5, "janela", 1.15, 2.35),
              (7.0, 8.5, "janela", 1.15, 2.35)], 1, 3)
wall_along_x("Parede Fundos (Terreo)", 7.7, 0.15, 9.85, 0.15, 2.7,
             [(2.0, 3.5, "janela", 1.15, 2.35)], 1, 3)
wall_along_y("Parede Oeste (Terreo)", 0.3, 0.45, 7.55, 0.15, 2.7,
             [(3.0, 4.5, "janela", 1.15, 2.35)], 1, 3)
wall_along_y("Parede Leste (Terreo)", 9.7, 0.45, 7.55, 0.15, 2.7,
             [(3.0, 4.5, "janela", 1.15, 2.35)], 1, 3)
wall_along_y("Parede Interna (Terreo)", 5.0, 0.45, 7.55, 0.15, 2.7,
             [(3.5, 4.5, "porta", 0, 2.25)], 1, 3)

# Superior: paredes de 3.15 a 5.55; janelas 4.15..5.35
wall_along_x("Parede Frontal (Superior)", 0.3, 0.15, 9.85, 3.15, 5.55,
             [(2.0, 3.2, "janela", 4.15, 5.35),
              (6.8, 8.0, "janela", 4.15, 5.35)], 2, 3)
wall_along_x("Parede Fundos (Superior)", 7.7, 0.15, 9.85, 3.15, 5.55, [], 2, 3)
wall_along_y("Parede Oeste (Superior)", 0.3, 0.45, 7.55, 3.15, 5.55, [], 2, 3)
wall_along_y("Parede Leste (Superior)", 9.7, 0.45, 7.55, 3.15, 5.55, [], 2, 3)

# Cobertura (fase 4): duas aguas + empenas
RISE, RUN = 1.75, 4.3
SLOPE = math.hypot(RUN, RISE)
SIN, COS = RISE / SLOPE, RUN / SLOPE

roof_a = ax3(pt3(-0.3, -0.3, 6.0), dir3(0, -SIN, COS), dir3(1, 0, 0))
prof_pos_a = w(f"IFCAXIS2PLACEMENT2D({pt2(5.3, SLOPE / 2)},$)")
prof_a = w(f"IFCRECTANGLEPROFILEDEF(.AREA.,$,{prof_pos_a},{num(10.6)},{num(SLOPE)})")
solid_a = w(f"IFCEXTRUDEDAREASOLID({prof_a},{roof_a},{DIR_Z},{num(0.12)})")
w(f"IFCSTYLEDITEM({solid_a},({ST_TELHA}),$)")
element("IFCSLAB", "Telhado - Agua Sul", [solid_a], 3, 4, "Telha ceramica", ".ROOF.")

roof_b = ax3(pt3(10.3, 8.3, 6.0), dir3(0, SIN, COS), dir3(-1, 0, 0))
prof_pos_b = w(f"IFCAXIS2PLACEMENT2D({pt2(5.3, SLOPE / 2)},$)")
prof_b = w(f"IFCRECTANGLEPROFILEDEF(.AREA.,$,{prof_pos_b},{num(10.6)},{num(SLOPE)})")
solid_b = w(f"IFCEXTRUDEDAREASOLID({prof_b},{roof_b},{DIR_Z},{num(0.12)})")
w(f"IFCSTYLEDITEM({solid_b},({ST_TELHA}),$)")
element("IFCSLAB", "Telhado - Agua Norte", [solid_b], 3, 4, "Telha ceramica", ".ROOF.")

# Empenas (triangulos de alvenaria nas extremidades, plano YZ)
empena_pts = [(0.15, 0.0), (7.85, 0.0), (4.0, 1.68)]
emp_w = tri_prism(empena_pts, ax3(pt3(0.15, 0, 6.0), dir3(1, 0, 0), dir3(0, 1, 0)), 0.15, ST_PAREDE)
element("IFCWALL", "Empena Oeste", [emp_w], 3, 4, "Alvenaria ceramica", ".SOLIDWALL.")
emp_e = tri_prism(empena_pts, ax3(pt3(9.7, 0, 6.0), dir3(1, 0, 0), dir3(0, 1, 0)), 0.15, ST_PAREDE)
element("IFCWALL", "Empena Leste", [emp_e], 3, 4, "Alvenaria ceramica", ".SOLIDWALL.")

# Esquadrias (fase 5)
def window(name, cx, cy_or_cx_fixed, along, sill, top, width, storey):
    h, wd = top - sill, width
    if along == "x":
        solid = box(cx, cy_or_cx_fixed, wd, 0.08, sill, h, ST_VIDRO)
    else:
        solid = box(cy_or_cx_fixed, cx, 0.08, wd, sill, h, ST_VIDRO)
    element("IFCWINDOW", name, [solid], storey, 5, "Vidro temperado",
            f"{num(h)},{num(wd)},.WINDOW.,.NOTDEFINED.,$")


window("Janela J1 (Sala)", 4.75, 0.3, "x", 1.15, 2.35, 1.5, 1)
window("Janela J2 (Cozinha)", 7.75, 0.3, "x", 1.15, 2.35, 1.5, 1)
window("Janela J3 (Servico)", 2.75, 7.7, "x", 1.15, 2.35, 1.5, 1)
window("Janela J4 (Escritorio)", 3.75, 0.3, "y", 1.15, 2.35, 1.5, 1)
window("Janela J5 (Banheiro)", 3.75, 9.7, "y", 1.15, 2.35, 1.5, 1)
window("Janela J6 (Quarto 1)", 2.6, 0.3, "x", 4.15, 5.35, 1.2, 2)
window("Janela J7 (Quarto 2)", 7.4, 0.3, "x", 4.15, 5.35, 1.2, 2)

element("IFCDOOR", "Porta de Entrada",
        [box(1.8, 0.3, 1.0, 0.07, 0.15, 2.1, ST_MADEIRA)],
        1, 5, "Madeira macica", f"{num(2.1)},{num(1.0)},.DOOR.,.NOTDEFINED.,$")
element("IFCDOOR", "Porta Interna",
        [box(5.0, 4.0, 0.07, 1.0, 0.15, 2.1, ST_MADEIRA)],
        1, 5, "Madeira macica", f"{num(2.1)},{num(1.0)},.DOOR.,.NOTDEFINED.,$")

# ── Relacoes ─────────────────────────────────────────────────────────────────
w(f"IFCRELAGGREGATES({guid()},$,$,$,{project},({site}))")
w(f"IFCRELAGGREGATES({guid()},$,$,$,{site},({building}))")
w(f"IFCRELAGGREGATES({guid()},$,$,$,{building},({','.join(storey_refs)}))")

for i, storey in enumerate(storey_refs):
    if by_storey[i]:
        w(f"IFCRELCONTAINEDINSPATIALSTRUCTURE({guid()},$,$,$,({','.join(by_storey[i])}),{storey})")

# Pset de fase compartilhado por etapa
for fase, members in sorted(by_fase.items()):
    p_num = w(f"IFCPROPERTYSINGLEVALUE('Fase',$,IFCINTEGER({fase}),$)")
    p_name = w(f"IFCPROPERTYSINGLEVALUE('Etapa',$,IFCLABEL('{FASES[fase]}'),$)")
    pset = w(f"IFCPROPERTYSET({guid()},$,'Vertice_Execucao',$,({p_num},{p_name}))")
    w(f"IFCRELDEFINESBYPROPERTIES({guid()},$,$,$,({','.join(members)}),{pset})")

# Materiais
for mat_name, members in sorted(by_material.items()):
    mat = w(f"IFCMATERIAL('{mat_name}',$,$)")
    w(f"IFCRELASSOCIATESMATERIAL({guid()},$,$,$,({','.join(members)}),{mat})")

# ── Arquivo ──────────────────────────────────────────────────────────────────
header = """ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_NAME('demo.ifc','2026-07-06T00:00:00',('Vertice Engenharia'),('Vertice Engenharia'),'','generate_demo_ifc.py','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
"""
footer = """ENDSEC;
END-ISO-10303-21;
"""

OUT.write_text(header + "\n".join(lines) + "\n" + footer, encoding="utf-8")
total_elements = sum(len(v) for v in by_storey.values())
print(f"OK: {OUT} ({OUT.stat().st_size / 1024:.1f} KB, {total_elements} elementos, {len(lines)} entidades)")
