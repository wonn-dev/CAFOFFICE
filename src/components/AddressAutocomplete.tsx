import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X } from 'lucide-react';

const PROVINCE_CODES: Record<string, string> = {
  'Agrigento': 'AG', 'Alessandria': 'AL', 'Ancona': 'AN', 'Aosta': 'AO', "L'Aquila": 'AQ',
  'Arezzo': 'AR', 'Ascoli Piceno': 'AP', 'Asti': 'AT', 'Avellino': 'AV', 'Bari': 'BA',
  'Barletta-Andria-Trani': 'BT', 'Belluno': 'BL', 'Benevento': 'BN', 'Bergamo': 'BG',
  'Biella': 'BI', 'Bologna': 'BO', 'Bolzano': 'BZ', 'Brescia': 'BS', 'Brindisi': 'BR',
  'Cagliari': 'CA', 'Caltanissetta': 'CL', 'Campobasso': 'CB', 'Carbonia-Iglesias': 'CI',
  'Caserta': 'CE', 'Catania': 'CT', 'Catanzaro': 'CZ', 'Chieti': 'CH', 'Como': 'CO',
  'Cosenza': 'CS', 'Cremona': 'CR', 'Crotone': 'KR', 'Cuneo': 'CN', 'Enna': 'EN',
  'Fermo': 'FM', 'Ferrara': 'FE', 'Firenze': 'FI', 'Foggia': 'FG', 'Forlì-Cesena': 'FC',
  'Frosinone': 'FR', 'Genova': 'GE', 'Gorizia': 'GO', 'Grosseto': 'GR', 'Imperia': 'IM',
  'Isernia': 'IS', 'La Spezia': 'SP', 'Latina': 'LT', 'Lecce': 'LE', 'Lecco': 'LC',
  'Livorno': 'LI', 'Lodi': 'LO', 'Lucca': 'LU', 'Macerata': 'MC', 'Mantova': 'MN',
  'Massa-Carrara': 'MS', 'Matera': 'MT', 'Messina': 'ME', 'Milano': 'MI', 'Modena': 'MO',
  'Monza e Brianza': 'MB', 'Napoli': 'NA', 'Novara': 'NO', 'Nuoro': 'NU',
  'Olbia-Tempio': 'OT', 'Oristano': 'OR', 'Padova': 'PD', 'Palermo': 'PA', 'Parma': 'PR',
  'Pavia': 'PV', 'Perugia': 'PG', 'Pesaro e Urbino': 'PU', 'Pescara': 'PE', 'Piacenza': 'PC',
  'Pisa': 'PI', 'Pistoia': 'PT', 'Pordenone': 'PN', 'Potenza': 'PZ', 'Prato': 'PO',
  'Ragusa': 'RG', 'Ravenna': 'RA', 'Reggio Calabria': 'RC', 'Reggio Emilia': 'RE',
  'Rieti': 'RI', 'Rimini': 'RN', 'Roma': 'RM', 'Rovigo': 'RO', 'Salerno': 'SA',
  'Sassari': 'SS', 'Savona': 'SV', 'Siena': 'SI', 'Siracusa': 'SR', 'Sondrio': 'SO',
  'Sud Sardegna': 'SU', 'Taranto': 'TA', 'Teramo': 'TE', 'Terni': 'TR', 'Torino': 'TO',
  'Trani': 'BT', 'Trapani': 'TP', 'Trento': 'TN', 'Treviso': 'TV', 'Trieste': 'TS',
  'Udine': 'UD', 'Varese': 'VA', 'Venezia': 'VE', 'Verbano-Cusio-Ossola': 'VB',
  'Vercelli': 'VC', 'Verona': 'VR', 'Vibo Valentia': 'VV', 'Vicenza': 'VI', 'Viterbo': 'VT',
  'Medio Campidano': 'VS', 'Ogliastra': 'OG',
};

interface NominatimResult {
  display_name: string;
  address?: {
    road?: string;
    pedestrian?: string;
    footway?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    suburb?: string;
    county?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

export interface AddressResult {
  address: string;
  street_number: string;
  postal_code: string;
  city: string;
  province: string;
  province_code: string;
  region: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
}

export function AddressAutocomplete({ value, onChange, onSelect, placeholder = 'Inizia a digitare l\'indirizzo...' }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchAddress = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=6&countrycodes=it`,
        { signal: abortRef.current.signal, headers: { 'Accept-Language': 'it' } },
      );
      if (!response.ok) return;
      const data = await response.json() as NominatimResult[];
      setSuggestions(data);
      setOpen(true);
      setHighlightedIndex(-1);
    } catch {
      /* aborted or network error - ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setQuery(newValue);
    onChange(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void searchAddress(newValue), 350);
  };

  const parseResult = (result: NominatimResult): AddressResult => {
    const a = result.address ?? {};
    const cityName = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? '';
    const county = a.county ?? a.state_district ?? '';
    const provinceCode = PROVINCE_CODES[county] ?? '';
    return {
      address: a.road ?? a.pedestrian ?? a.footway ?? '',
      street_number: a.house_number ?? '',
      postal_code: a.postcode ?? '',
      city: cityName,
      province: county,
      province_code: provinceCode,
      region: a.state ?? '',
      country: a.country ?? 'Italia',
    };
  };

  const selectSuggestion = (result: NominatimResult) => {
    const parsed = parseResult(result);
    setQuery(parsed.address || result.display_name.split(',')[0]);
    onChange(parsed.address || result.display_name.split(',')[0]);
    onSelect(parsed);
    setOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => prev < suggestions.length - 1 ? prev + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => prev > 0 ? prev - 1 : suggestions.length - 1);
    } else if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const clearInput = () => {
    setQuery('');
    onChange('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          autoComplete="off"
          className="input pl-10 pr-9"
        />
        {query && (
          <button type="button" onClick={clearInput} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700">
            <X size={16} />
          </button>
        )}
        {loading && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/8">
          {suggestions.map((result, index) => {
            const a = result.address ?? {};
            const cityPart = a.city ?? a.town ?? a.village ?? a.municipality ?? '';
            const postcodePart = a.postcode ?? '';
            const summary = [postcodePart, cityPart].filter(Boolean).join(' · ');
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(result)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${highlightedIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <MapPin size={16} className={`mt-0.5 shrink-0 ${highlightedIndex === index ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800">{result.display_name.split(',').slice(0, 2).join(',')}</span>
                    {summary && <span className="mt-0.5 block truncate text-xs text-slate-500">{summary}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
