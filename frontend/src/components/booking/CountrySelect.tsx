"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { IconCheck, IconChevronDown, IconGlobe } from "@/components/account/icons";

/*!
 * CountrySelect — a searchable dropdown instead of the browser's native
 * select (which looks broken on a dark theme). Type to filter 195+ countries,
 * arrow keys to move, Enter to pick, Esc to close. Arabic countries lead.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select your country…",
  required = false,
}: {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset the filter + cursor each time it opens, and focus the search box.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(Math.max(0, filtered.indexOf(value)));
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the active option visible while arrowing through the list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(country: string) {
    onChange(country);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field-input rounded-lg pl-11 pr-10 py-3 text-sm outline-none w-full text-left flex items-center justify-between gap-2"
        style={{
          background: "var(--surface)",
          color: value ? "var(--paper)" : "rgba(245,241,232,0.35)",
          border: "1px solid rgba(245,241,232,0.15)",
        }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="text-paper/40 pointer-events-none shrink-0"><IconGlobe width={16} height={16} /></span>
          <span className="truncate">{value || placeholder}</span>
        </span>
        <IconChevronDown
          width={16}
          height={16}
          className={`shrink-0 text-paper/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-full rounded-xl overflow-hidden booking-rise"
          style={{
            background: "#141414",
            border: "1px solid rgba(245,241,232,0.18)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7)",
          }}
        >
          <div className="p-2.5 border-b" style={{ borderColor: "rgba(245,241,232,0.1)" }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search countries…"
              className="w-full bg-void border border-paper/15 rounded-lg px-3 py-2 text-sm text-paper placeholder-paper/30 focus:outline-none focus:ring-2 focus:ring-orange/60"
            />
          </div>
          <ul ref={listRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-paper/40">No country matches “{query}”.</li>
            )}
            {filtered.map((country, i) => {
              const selected = country === value;
              return (
                <li key={country}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(country)}
                    className="w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-3 transition-colors"
                    style={{
                      background: i === active ? "rgba(255,106,0,0.10)" : "transparent",
                      color: selected ? "var(--orange)" : "var(--paper)",
                    }}
                  >
                    <span className="truncate">{country}</span>
                    {selected && <IconCheck width={14} height={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {required && <input type="hidden" required value={value} />}
    </div>
  );
}
