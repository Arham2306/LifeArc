import React, { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Loader2, Search, Check } from 'lucide-react'

interface CartoonComboboxProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

const MAX_VISIBLE_OPTIONS = 150;

/**
 * Searchable cartoon dropdown capable of filtering through 20,000+ cities smoothly.
 */
export const CartoonCombobox: React.FC<CartoonComboboxProps> = ({
  label,
  icon,
  value,
  options,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options.slice(0, MAX_VISIBLE_OPTIONS);

    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const opt of options) {
      const lower = opt.toLowerCase();
      if (lower.startsWith(trimmed)) {
        startsWith.push(opt);
      } else if (lower.includes(trimmed)) {
        contains.push(opt);
      }
      if (startsWith.length >= MAX_VISIBLE_OPTIONS) break;
    }

    return [...startsWith, ...contains].slice(0, MAX_VISIBLE_OPTIONS);
  }, [options, query]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1 w-full relative">
      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 px-1">
        {icon && <span className="text-slate-500">{icon}</span>}
        <span>{label}</span>
      </label>

      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          w-full py-2.5 pl-3.5 pr-9 text-left text-sm font-bold text-slate-900 bg-white
          rounded-2xl border-[2.5px] border-slate-900 shadow-[2px_2.5px_0_#1e293b]
          focus:outline-none focus:border-amber-500 focus:shadow-[3px_4px_0_#1e293b]
          disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-400 disabled:shadow-none
          relative cursor-pointer transition-all duration-100 truncate
        `}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {isLoading ? 'Loading...' : value || placeholder}
        </span>

        {isLoading ? (
          <Loader2 className="w-4 h-4 stroke-[2.5] absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        ) : (
          <ChevronDown
            className={`
              w-4 h-4 stroke-[3] absolute right-3 top-1/2 -translate-y-1/2 transition-transform
              ${disabled ? 'text-slate-400' : 'text-slate-800'}
              ${isOpen ? 'rotate-180' : ''}
            `}
          />
        )}
      </button>

      {isOpen && !disabled && !isLoading && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border-[2.5px] border-slate-900 shadow-[4px_5px_0_#0f172a] overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-2 border-b-2 border-slate-200 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs font-bold text-slate-400">
                No matching cities found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors
                      ${isSelected ? 'bg-amber-100 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'}
                    `}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 stroke-[3] flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

