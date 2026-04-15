import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";
import { Search } from "lucide-react";

interface CurtainSearchProps {
  onSelect: (sku: string) => void;
}

interface SearchResult {
  name: string;
  sku: string;
  prefix: string;
}

const SIZES = [
  { label: "2,20 x 1,30", code: "220X130" },
  { label: "2,60 x 1,30", code: "260X130" },
  { label: "2,60 x 1,80", code: "260X180" },
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

function buildCatalog(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const p of SKU_PREFIXES) {
    for (const cor of CORES_TECIDO) {
      for (const size of SIZES) {
        const sku = `${p.prefix}${size.code}${cor.toUpperCase()}`;
        const name = p.isDupla
          ? `Cortina Dupla ${p.duplaType} + Flamê ${cor} - ${p.parteSuperior} - ${size.label}`
          : `Cortina ${p.modelo} ${cor} - ${p.parteSuperior} - ${size.label}`;
        results.push({ name, sku, prefix: p.prefix });
      }
    }
  }
  return results;
}

const CATALOG = buildCatalog();

function searchCatalog(query: string): SearchResult[] {
  if (query.length < 2) return [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return CATALOG.filter((item) => {
    const searchable = `${item.name} ${item.sku}`.toLowerCase();
    return terms.every((t) => searchable.includes(t));
  }).slice(0, 8);
}

export function CurtainSearch({ onSelect }: CurtainSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const handleChange = (val: string) => {
    setQuery(val);
    setResults(searchCatalog(val));
    setShow(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome... ex: Blackout Branco Trilho"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShow(true)}
          className="pl-8 text-xs"
        />
      </div>
      {show && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-56 overflow-auto">
          {results.map((r) => (
            <button
              key={r.sku}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex flex-col gap-0.5"
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
        </div>
      )}
    </div>
  );
}
