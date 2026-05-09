import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";
import { Search, X } from "lucide-react";

interface CurtainSearchProps {
  onSelect: (sku: string) => void;
}

interface SearchResult {
  name: string;
  sku: string;
  prefix: string;
  tipo: string; // "Dupla Flamê c/ Blackout" | "Blackout" | "Flamê" | "Oxford"
  superior: string; // "Ilhós" | "Wave" | "Trilho Suiço" | "Trilho Duplo"
  cor: string;
  tamanho: string;
  searchable: string; // pré-normalizada
}

const SIZES = [
  { label: "2,20 x 1,30", code: "220X130" },
  { label: "2,60 x 1,30", code: "260X130" },
  { label: "2,60 x 1,80", code: "260X180" },
  { label: "2,00 x 2,50", code: "200X250" },
  { label: "3,00 x 2,50", code: "300X250" },
  { label: "3,00 x 2,70", code: "300X270" },
  { label: "3,00 x 2,80", code: "300X280" },
  { label: "4,00 x 2,50", code: "400X250" },
  { label: "4,00 x 2,70", code: "400X270" },
  { label: "4,00 x 2,80", code: "400X280" },
  { label: "5,00 x 2,50", code: "500X250" },
  { label: "5,00 x 2,70", code: "500X270" },
  { label: "5,00 x 2,80", code: "500X280" },
  { label: "6,00 x 2,70", code: "600X270" },
  { label: "6,00 x 2,80", code: "600X280" },
];

// Remove acentos e baixa caixa
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Sinônimos: mapeia variações comuns para a forma canônica (já normalizada).
const SYNONYMS: Record<string, string> = {
  ilhos: "ilhos",
  ilhoses: "ilhos",
  ilhoz: "ilhos",
  flame: "flame",
  black: "blackout",
  suico: "suico",
  cromado: "ilhos",
};

function expandTerm(t: string): string {
  const n = norm(t);
  return SYNONYMS[n] ?? n;
}

function shortTipo(p: typeof SKU_PREFIXES[number]): string {
  if (p.isDupla) return `Dupla ${p.duplaType}`;
  return p.modelo;
}

function shortSuperior(s: string): string {
  if (s.toLowerCase().includes("ilhós") || s.toLowerCase().includes("ilhos")) return "Ilhós";
  return s;
}

function buildCatalog(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const p of SKU_PREFIXES) {
    const tipo = shortTipo(p);
    const superior = shortSuperior(p.parteSuperior);
    for (const cor of CORES_TECIDO) {
      for (const size of SIZES) {
        const sku = `${p.prefix}${size.code}${cor.toUpperCase()}`;
        const name = p.isDupla
          ? `Cortina Dupla ${p.duplaType} + Flamê ${cor} - ${p.parteSuperior} - ${size.label}`
          : `Cortina ${p.modelo} ${cor} - ${p.parteSuperior} - ${size.label}`;
        const searchable = norm(`${name} ${sku} cortina ${tipo} ${superior} ${cor} ${size.label}`);
        results.push({
          name,
          sku,
          prefix: p.prefix,
          tipo,
          superior,
          cor,
          tamanho: size.label,
          searchable,
        });
      }
    }
  }
  return results;
}

const CATALOG = buildCatalog();

function filterCatalog(query: string): SearchResult[] {
  const terms = query.split(/\s+/).filter(Boolean).map(expandTerm);
  if (terms.length === 0) return CATALOG;
  return CATALOG.filter((item) => terms.every((t) => item.searchable.includes(t)));
}

interface FacetGroup {
  label: string;
  values: string[];
}

function buildFacets(filtered: SearchResult[], query: string): FacetGroup[] {
  const queryNorm = norm(query);
  const has = (val: string) => queryNorm.includes(norm(val));

  const tipos = new Set<string>();
  const superiores = new Set<string>();
  const cores = new Set<string>();
  const tamanhos = new Set<string>();

  for (const item of filtered) {
    tipos.add(item.tipo);
    superiores.add(item.superior);
    cores.add(item.cor);
    tamanhos.add(item.tamanho);
  }

  const groups: FacetGroup[] = [];
  const tiposArr = Array.from(tipos).filter((v) => !has(v));
  if (tiposArr.length > 1 || (tiposArr.length === 1 && tipos.size > 1))
    groups.push({ label: "Tipo", values: tiposArr });

  const supArr = Array.from(superiores).filter((v) => !has(v));
  if (supArr.length > 1 || (supArr.length === 1 && superiores.size > 1))
    groups.push({ label: "Acabamento", values: supArr });

  const corArr = Array.from(cores).filter((v) => !has(v));
  if (corArr.length > 1 || (corArr.length === 1 && cores.size > 1))
    groups.push({ label: "Cor", values: corArr });

  const tamArr = Array.from(tamanhos).filter((v) => !has(v));
  if (tamArr.length > 1 || (tamArr.length === 1 && tamanhos.size > 1))
    groups.push({ label: "Tamanho", values: tamArr });

  // Limita por grupo para não estourar a UI
  return groups.map((g) => ({ ...g, values: g.values.slice(0, 8) }));
}

export function CurtainSearch({ onSelect }: CurtainSearchProps) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => filterCatalog(query), [query]);
  const facets = useMemo(() => buildFacets(filtered, query), [filtered, query]);
  const visibleResults = useMemo(() => {
    if (query.trim().length < 2 && facets.length > 0) return [];
    return filtered.slice(0, 10);
  }, [filtered, query, facets]);

  const addTerm = (term: string) => {
    const trimmed = query.trim();
    setQuery(trimmed.length === 0 ? term : `${trimmed} ${term}`);
    setShow(true);
  };

  const open = show && (facets.length > 0 || visibleResults.length > 0 || query.length > 0);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar... ex: cortina dupla ilhós"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShow(true);
          }}
          onFocus={() => setShow(true)}
          className="pl-8 pr-8 text-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setShow(true);
            }}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-80 overflow-auto">
          {facets.length > 0 && (
            <div className="p-2 border-b space-y-2 bg-muted/30">
              {facets.map((g) => (
                <div key={g.label} className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                    {g.label}
                  </span>
                  {g.values.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => addTerm(v)}
                      className="px-2 py-0.5 text-[11px] rounded-full border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {visibleResults.length > 0 ? (
            <>
              {visibleResults.map((r) => (
                <button
                  key={r.sku}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex flex-col gap-0.5 border-b last:border-b-0"
                  onClick={() => {
                    onSelect(r.sku);
                    setQuery("");
                    setShow(false);
                  }}
                >
                  <span className="text-xs font-medium">{r.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{r.sku}</span>
                </button>
              ))}
              {filtered.length > visibleResults.length && (
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-center bg-muted/30">
                  +{filtered.length - visibleResults.length} resultados — refine usando os chips acima
                </div>
              )}
            </>
          ) : (
            query.length >= 2 &&
            facets.length === 0 && (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                Nenhum produto encontrado
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
