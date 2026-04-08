import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { SKU_PREFIXES, CORES_TECIDO } from "@/data/skuDatabase";

interface SkuInputProps {
  value: string;
  onChange: (value: string) => void;
}

function generateSuggestions(query: string): string[] {
  if (query.length < 3) return [];
  const upper = query.toUpperCase();
  const suggestions: string[] = [];

  for (const p of SKU_PREFIXES) {
    if (p.prefix.startsWith(upper) || upper.startsWith(p.prefix)) {
      for (const cor of CORES_TECIDO) {
        const sizes = ["220X130", "260X130", "260X180", "300X250", "300X270", "400X250", "400X270", "500X270", "600X270"];
        for (const size of sizes) {
          const sku = `${p.prefix}${size}${cor.toUpperCase()}`;
          if (sku.startsWith(upper)) {
            suggestions.push(sku);
          }
        }
      }
    }
  }

  return suggestions.slice(0, 8);
}

export function SkuInput({ value, onChange }: SkuInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (val: string) => {
    const upper = val.toUpperCase();
    onChange(upper);
    setSuggestions(generateSuggestions(upper));
    setShowSuggestions(true);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder="Ex: CBTS300X270BRANCO"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        className="font-mono text-sm"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-accent transition-colors"
              onClick={() => {
                onChange(s);
                setShowSuggestions(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
