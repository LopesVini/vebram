import { useRef, useState } from "react";
import { avatarColor, initials, profileName, profileRole } from "@/lib/theVertice";
import { TheVerticeProfile } from "@/hooks/data/useTheVertice";

/**
 * Textarea com autocomplete de @menções, portado do comportamento do app original.
 * Sugere apenas sócios/equipe (profiles com role admin).
 */
export function MentionTextarea({
  value,
  onChange,
  profiles,
  placeholder,
  rows = 3,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  profiles: TheVerticeProfile[];
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [items, setItems] = useState<TheVerticeProfile[]>([]);
  const [sel, setSel] = useState(0);
  const [start, setStart] = useState(-1);

  const team = profiles.filter((p) => p.role === "admin");

  function onInput(v: string) {
    onChange(v);
    const pos = ref.current?.selectionStart ?? v.length;
    const m = v.slice(0, pos).match(/(?:^|\s)@([\wÀ-ÿ ]*)$/);
    if (!m) {
      setItems([]);
      return;
    }
    const q = m[1].toLowerCase();
    const found = team.filter((u) => profileName(u).toLowerCase().includes(q)).slice(0, 6);
    setItems(found);
    setSel(0);
    setStart(pos - m[1].length - 1);
  }

  function pick(u: TheVerticeProfile) {
    const ta = ref.current;
    if (!ta || start < 0) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(pos);
    const insert = "@" + profileName(u) + " ";
    const next = before + insert + after;
    onChange(next);
    setItems([]);
    const np = (before + insert).length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(np, np);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(items[sel]);
    } else if (e.key === "Escape") {
      setItems([]);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setItems([]), 150)}
        className={`w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400 resize-y ${className}`}
      />
      {items.length > 0 && (
        <div className="absolute z-30 mt-1 w-64 max-h-60 overflow-y-auto bg-white dark:bg-navy border border-zinc-200 dark:border-white/10 rounded-xl shadow-2xl p-1.5">
          {items.map((u, i) => (
            <button
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left ${
                i === sel ? "bg-green-50 dark:bg-green-500/10" : "hover:bg-zinc-50 dark:hover:bg-white/5"
              }`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: avatarColor(u.id) }}
              >
                {initials(profileName(u))}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-navy dark:text-white truncate">{profileName(u)}</span>
                <span className="block text-[11px] text-zinc-500 truncate">{profileRole(u)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
