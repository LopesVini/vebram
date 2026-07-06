import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useTheVertice, TheVerticeEvent } from "@/hooks/data/useTheVertice";
import { EVENT_TYPES, EventType, ymd, todayStr, profileName } from "@/lib/theVertice";
import { Avatar, PageHeader, Card } from "@/components/hq/thevertice/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PRESETS_COLORS = [
  "#7e22ce", // Roxo/Violeta
  "#db2777", // Rosa/Rose
  "#4f46e5", // Indigo
  "#0ea5e9", // Azul/Cyan
  "#0d9488", // Teal
  "#10b981", // Verde/Emerald
  "#d97706", // Laranja/Amber
  "#ef4444", // Vermelho
];

export default function HqCalendar() {
  const { events, profiles, myProfile, addEvent, deleteEvent } = useTheVertice();
  const [ref, setRef] = useState(new Date());
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [type, setType] = useState<string>("disponivel");
  const [customType, setCustomType] = useState("");
  const [selectedColor, setSelectedColor] = useState("#7e22ce");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const userName = (id: string) => profileName(profiles.find((p) => p.id === id));

  function move(d: number) {
    const n = new Date(ref);
    n.setMonth(n.getMonth() + d);
    setRef(n);
  }

  function openDay(ds: string) {
    setDayOpen(ds);
    setType("disponivel");
    setNote("");
    setCustomType("");
    setSelectedColor("#7e22ce");
  }

  async function save() {
    if (!dayOpen) return;
    const finalType = type === "custom" ? customType.trim() : type;
    if (type === "custom" && !finalType) {
      alert("Por favor, digite o nome da categoria.");
      return;
    }
    setSaving(true);
    const finalColor = type === "custom" ? selectedColor : null;
    const { error } = await addEvent(dayOpen, finalType, note.trim() || null, finalColor);
    setSaving(false);
    if (error) return alert(error.message);
    setNote("");
    setCustomType("");
    setDayOpen(null);
  }

  const y = ref.getFullYear();
  const m = ref.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  const ts = todayStr();

  const cells: { date: Date; other: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ date: new Date(y, m - 1, prevDays - i), other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(y, m, d), other: false });
  const trailing = (7 - ((startDow + daysInMonth) % 7)) % 7;
  for (let d = 1; d <= trailing; d++) cells.push({ date: new Date(y, m + 1, d), other: true });

  const dayEvents = (ds: string) => events.filter((e) => e.date === ds);

  const customCategories = useMemo(() => {
    const categories: { label: string; color: string }[] = [];
    const seen = new Set<string>();
    events.forEach((e) => {
      if (!EVENT_TYPES[e.type as EventType] && e.type) {
        const key = `${e.type}-${e.color || "#7c3aed"}`;
        if (!seen.has(key)) {
          seen.add(key);
          categories.push({
            label: e.type,
            color: e.color || "#7c3aed",
          });
        }
      }
    });
    return categories;
  }, [events]);

  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="Agenda da equipe"
        title="Calendário"
        action={
          <button
            onClick={() => openDay(todayStr())}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors"
          >
            <Plus size={16} /> Marcar disponibilidade
          </button>
        }
      />

      {/* Barra de navegação do mês */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => move(-1)}
          className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-navy-light/40 flex items-center justify-center text-navy dark:text-white hover:shadow-md transition-shadow"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-lg font-bold capitalize min-w-[180px] text-navy dark:text-white">
          {ref.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </div>
        <button
          onClick={() => move(1)}
          className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-navy-light/40 flex items-center justify-center text-navy dark:text-white hover:shadow-md transition-shadow"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex gap-4 ml-auto flex-wrap">
          {(Object.keys(EVENT_TYPES) as EventType[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
              <span className="w-3 h-3 rounded" style={{ background: EVENT_TYPES[k].color }} />
              {EVENT_TYPES[k].label}
            </div>
          ))}
          {customCategories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
              <span className="w-3 h-3 rounded" style={{ background: cat.color }} />
              {cat.label}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-7 mb-1.5">
          {DOW.map((d) => (
            <span key={d} className="text-center text-[11px] font-bold uppercase tracking-wide text-zinc-400 py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map(({ date, other }, i) => {
            const ds = ymd(date);
            const evs = dayEvents(ds);
            const isToday = ds === ts;
            return (
              <button
                key={i}
                onClick={() => openDay(ds)}
                className={`min-h-[84px] rounded-xl border p-1.5 flex flex-col gap-1 text-left transition-colors ${
                  other ? "opacity-40" : ""
                } ${
                  isToday
                    ? "border-green-500 ring-2 ring-green-500/15"
                    : "border-zinc-200 dark:border-white/10 hover:border-green-400/60 hover:bg-zinc-50 dark:hover:bg-white/5"
                }`}
              >
                <span className={`text-xs font-bold ${isToday ? "text-green-600" : "text-navy dark:text-white"}`}>
                  {date.getDate()}
                </span>
                {evs.slice(0, 3).map((e) => {
                  const t = EVENT_TYPES[e.type as EventType] || {
                    label: e.type,
                    color: e.color || "#7c3aed",
                    bg: (e.color || "#7c3aed") + "1a",
                  };
                  return (
                    <span
                      key={e.id}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded truncate"
                      style={{ background: t?.bg, color: t?.color }}
                    >
                      {userName(e.user_id).split(" ")[0]} · {t?.label}
                    </span>
                  );
                })}
                {evs.length > 3 && <span className="text-[10px] text-zinc-400 font-semibold">+{evs.length - 3} mais</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Modal do dia */}
      <Dialog open={!!dayOpen} onOpenChange={(o) => !o && setDayOpen(null)}>
        <DialogContent className="bg-white dark:bg-navy border-zinc-200 dark:border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy dark:text-white capitalize">
              {dayOpen &&
                new Date(dayOpen + "T00:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {dayOpen && dayEvents(dayOpen).length === 0 && (
              <p className="text-sm text-zinc-500 py-2">Nenhuma marcação neste dia ainda.</p>
            )}
            {dayOpen &&
              dayEvents(dayOpen).map((e: TheVerticeEvent) => {
                const t = EVENT_TYPES[e.type as EventType] || {
                  label: e.type,
                  color: e.color || "#7c3aed",
                  bg: (e.color || "#7c3aed") + "1a",
                };
                return (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-white/5">
                    <Avatar id={e.user_id} name={userName(e.user_id)} size={30} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-navy dark:text-white flex items-center gap-2">
                        {userName(e.user_id)}
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: t?.bg, color: t?.color }}
                        >
                          {t?.label}
                        </span>
                      </div>
                      {e.note && <div className="text-xs text-zinc-500">{e.note}</div>}
                    </div>
                    {e.user_id === myProfile?.id && (
                      <button
                        onClick={() => deleteEvent(e.id)}
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-white/10 text-red-500 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                        title="Remover"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Adicionar marcação (como você)</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-green-400"
              >
                <option value="disponivel">🔵 Disponível</option>
                <option value="ocupado">🔴 Ocupado / Compromisso</option>
                <option value="ferias">🌴 Férias</option>
                <option value="custom">✨ Outro (Personalizado)</option>
              </select>
            </div>

            {type === "custom" && (
              <div className="space-y-3 animate-fade-up">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Nome da Categoria</label>
                  <input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Ex: Home Office, Viagem, Reunião"
                    className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-green-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Escolha uma Cor</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {PRESETS_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          selectedColor === c
                            ? "border-navy dark:border-white scale-110 shadow-sm"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <div className="relative w-7 h-7 rounded-full border-2 border-dashed border-zinc-300 dark:border-white/20 hover:scale-105 overflow-hidden flex items-center justify-center" title="Cor personalizada">
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="absolute inset-0 w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-[10px] pointer-events-none text-zinc-400">+</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Observação (opcional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Visita técnica obra Silva"
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-green-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDayOpen(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300"
              >
                Fechar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
              >
                {saving ? "Adicionando…" : "Adicionar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
