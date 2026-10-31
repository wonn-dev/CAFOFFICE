import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Eye,
  ClipboardList,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileStack,
  FolderKanban,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type NavItem = { label: string; icon: LucideIcon };
type PracticeStatus = 'Nuova' | 'In lavorazione' | 'Completata' | 'Annullata';
type DocumentKey = 'permesso' | 'identita' | 'sanitaria' | 'passaporto' | 'altri';
type DocumentFiles = Record<DocumentKey, File | null>;
type CafOffice = {
  id: string;
  name: string;
  address: string;
  vat_number: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
};
type OfficeForm = Omit<CafOffice, 'id' | 'created_at'>;
type Client = {
  id: string;
  first_name: string;
  last_name: string;
  tax_code: string;
  email: string;
  phone: string;
  notes: string;
  address: string;
  street_number: string;
  postal_code: string;
  city: string;
  province: string;
  province_code: string;
  region: string;
  country: string;
  office: string;
  created_at: string;
};
type ClientForm = Omit<Client, 'id' | 'created_at'>;
type StoredPractice = {
  id: string;
  protocol: string;
  client_name: string;
  tax_code: string;
  category: string;
  service: string;
  deadline: string | null;
  priority: 'Urgente' | 'Normale';
  payment_status: string;
  office: string;
  operator: string;
  status: PracticeStatus;
  overdue: boolean;
  created_at: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  { label: 'Operatività', items: [{ label: 'Dashboard', icon: LayoutDashboard }, { label: 'Nuova Pratica', icon: FilePlus2 }, { label: 'Tutte le Pratiche', icon: ClipboardList }, { label: 'Il Mio Lavoro', icon: BriefcaseBusiness }] },
  { label: 'Organizzazione', items: [{ label: 'Uffici CAF', icon: FolderKanban }, { label: 'Clienti', icon: UsersRound }, { label: 'Utenti e Ruoli', icon: ShieldCheck }, { label: 'Servizi e Prezzi', icon: Wrench }, { label: 'Gestione Crediti', icon: CircleDollarSign }] },
  { label: 'Controllo', items: [{ label: 'Agenda', icon: CalendarDays }, { label: 'Statistiche', icon: Gauge }, { label: 'Impostazioni', icon: Settings }] },
];

const statistics = [
  { label: 'Pratiche Totali', value: '16', icon: FileStack, tone: 'blue' },
  { label: 'Nuove', value: '10', icon: FileCheck2, tone: 'cyan' },
  { label: 'In Lavorazione', value: '1', icon: Clock3, tone: 'amber' },
  { label: 'In Attesa Doc.', value: '0', icon: FilePlus2, tone: 'orange' },
  { label: 'Inviata / Attesa Esito', value: '0', icon: Zap, tone: 'violet' },
  { label: 'Completate', value: '2', icon: Check, tone: 'green' },
  { label: 'Scadute', value: '10', icon: AlertTriangle, tone: 'red' },
];

const toneStyles: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', cyan: 'bg-cyan-50 text-cyan-600', amber: 'bg-amber-50 text-amber-600', orange: 'bg-orange-50 text-orange-600', violet: 'bg-sky-50 text-sky-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' };

const documentTypes: { key: DocumentKey; label: string; icon: LucideIcon }[] = [
  { key: 'permesso', label: 'Permesso di Soggiorno', icon: FileStack },
  { key: 'identita', label: 'Carta di Identità', icon: FolderOpen },
  { key: 'sanitaria', label: 'Tessera Sanitaria', icon: ShieldCheck },
  { key: 'passaporto', label: 'Passaporto', icon: FileCheck2 },
  { key: 'altri', label: 'Altri Documenti', icon: FolderOpen },
];

const emptyDocuments: DocumentFiles = { permesso: null, identita: null, sanitaria: null, passaporto: null, altri: null };

function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);

  const activeSubtitle = useMemo(() => activePage === 'Dashboard' ? 'Panoramica di sistema' : activePage === 'Nuova Pratica' ? 'Invia una nuova pratica al team back-office.' : activePage === 'Uffici CAF' ? 'Gestisci le sedi CAF che collaborano con il tuo ufficio.' : activePage === 'Clienti' ? 'Gestisci i clienti e tutte le loro informazioni.' : 'Sezione in preparazione', [activePage]);
  const selectPage = (page: string) => { setActivePage(page); setSidebarOpen(false); };

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[#101a2e] text-slate-300 transition-transform duration-300 lg:translate-x-0 ${sidebarCompact ? 'lg:w-[84px]' : ''} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex h-[76px] items-center border-b border-white/10 px-5 ${sidebarCompact ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 ${sidebarCompact ? 'lg:hidden' : ''}`}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-950/30">CP</div><div><p className="text-[15px] font-semibold tracking-tight text-white">CAF &amp; Patronato</p><p className="mt-0.5 text-[11px] text-slate-400">Gestione Pratiche</p></div></div>
          <div className={`${sidebarCompact ? 'hidden' : 'hidden lg:block'}`}><button onClick={() => setSidebarCompact(true)} aria-label="Riduci menu" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"><PanelLeftClose size={17} /></button></div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Chiudi menu" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"><X size={18} /></button>
          {sidebarCompact && <button onClick={() => setSidebarCompact(false)} aria-label="Espandi menu" className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:block"><PanelLeftOpen size={18} /></button>}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {navGroups.map((group) => <div key={group.label} className="mb-6"><p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ${sidebarCompact ? 'lg:hidden' : ''}`}>{group.label}</p>{group.items.map(({ label, icon: Icon }) => <button key={label} onClick={() => selectPage(label)} title={sidebarCompact ? label : undefined} className={`group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${activePage === label ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/20' : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'} ${sidebarCompact ? 'lg:justify-center lg:px-0' : ''}`}><Icon size={17} strokeWidth={activePage === label ? 2.4 : 1.8} /><span className={sidebarCompact ? 'lg:hidden' : ''}>{label}</span>{activePage === label && !sidebarCompact && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}</button>)}</div>)}
          <div className="border-t border-white/10 pt-5"><button onClick={() => selectPage('Notifiche')} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${activePage === 'Notifiche' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'} ${sidebarCompact ? 'lg:justify-center lg:px-0' : ''}`}><Bell size={17} strokeWidth={1.8} /><span className={sidebarCompact ? 'lg:hidden' : ''}>Notifiche</span><span className={`ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white ${sidebarCompact ? 'lg:hidden' : ''}`}>9</span></button><button onClick={() => selectPage('Profilo')} className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${activePage === 'Profilo' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'} ${sidebarCompact ? 'lg:justify-center lg:px-0' : ''}`}><UserRound size={17} strokeWidth={1.8} /><span className={sidebarCompact ? 'lg:hidden' : ''}>Profilo</span></button></div>
        </nav>
        <div className={`border-t border-white/10 p-4 ${sidebarCompact ? 'lg:px-3' : ''}`}><div className={`flex items-center gap-3 ${sidebarCompact ? 'lg:justify-center' : ''}`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-white ring-2 ring-slate-600">MS</div><div className={sidebarCompact ? 'lg:hidden' : ''}><p className="truncate text-xs font-semibold text-white">Md Shawon Ahmed</p><p className="mt-0.5 text-[10px] text-slate-400">Amministratore Principale</p></div></div><button className={`mt-4 flex items-center gap-3 px-1 text-xs font-medium text-slate-400 transition hover:text-white ${sidebarCompact ? 'lg:mx-auto' : ''}`}><LogOut size={16} /><span className={sidebarCompact ? 'lg:hidden' : ''}>Esci</span></button></div>
      </aside>
      {sidebarOpen && <button aria-label="Chiudi menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <div className={`transition-[padding] duration-300 ${sidebarCompact ? 'lg:pl-[84px]' : 'lg:pl-[264px]'}`}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} aria-label="Apri menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><div><p className="hidden text-[11px] font-medium text-slate-400 sm:block">Amministratore Principale</p><p className="text-sm font-semibold text-slate-900">{activePage === 'Dashboard' ? 'Pannello di Controllo' : activePage}</p></div></div><div className="flex items-center gap-4 md:gap-6"><button aria-label="Cerca" className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:block"><Search size={18} /></button><button aria-label="Notifiche" className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><Bell size={19} /><span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">9</span></button><div className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101a2e] text-[11px] font-bold text-white">MS</div><div className="hidden lg:block"><p className="text-xs font-semibold text-slate-800">Md Shawon Ahmed</p><p className="mt-0.5 text-[10px] text-slate-400">shawon.soluzionecentro@gmail.com</p></div><ChevronDown size={15} className="hidden text-slate-400 lg:block" /></div></div></header>
        <main className="mx-auto max-w-[1440px] p-5 md:p-8"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-blue-600"><SlidersHorizontal size={13} /> Area amministrativa</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-[28px]">{activePage}</h1><p className="mt-1 text-sm text-slate-500">{activeSubtitle}</p></div>{activePage === 'Dashboard' && <button onClick={() => selectPage('Nuova Pratica')} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25"><FilePlus2 size={17} /> Nuova Pratica</button>}</div>{activePage === 'Dashboard' ? <Dashboard /> : activePage === 'Nuova Pratica' ? <NewPractice /> : activePage === 'Tutte le Pratiche' ? <AllPractices /> : activePage === 'Uffici CAF' ? <CafOffices /> : activePage === 'Clienti' ? <Clients /> : <PlaceholderPage page={activePage} />}</main>
      </div>
    </div>
  );
}

function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>({ first_name: '', last_name: '', tax_code: '', email: '', phone: '', notes: '', address: '', street_number: '', postal_code: '', city: '', province: '', province_code: '', region: '', country: 'Italia', office: '' });

  useEffect(() => {
    const loadClients = async () => {
      const { data, error } = await supabase.from('clients').select('id, first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office, created_at').order('created_at', { ascending: false });
      if (error) setErrorMessage('Non è stato possibile caricare i clienti.');
      setClients((data as Client[]) ?? []);
      setLoading(false);
    };
    void loadClients();
  }, []);

  const openNewClient = () => {
    setEditingClient(null);
    setClientForm({ first_name: '', last_name: '', tax_code: '', email: '', phone: '', notes: '', address: '', street_number: '', postal_code: '', city: '', province: '', province_code: '', region: '', country: 'Italia', office: '' });
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({ first_name: client.first_name, last_name: client.last_name, tax_code: client.tax_code, email: client.email, phone: client.phone, notes: client.notes, address: client.address, street_number: client.street_number, postal_code: client.postal_code, city: client.city, province: client.province, province_code: client.province_code, region: client.region, country: client.country, office: client.office });
    setErrorMessage('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    if (editingClient) {
      const { error } = await supabase.from('clients').update(clientForm).eq('id', editingClient.id);
      if (error) setErrorMessage('Non è stato possibile aggiornare il cliente.');
      else {
        setClients((current) => current.map((client) => client.id === editingClient.id ? { ...client, ...clientForm } : client));
        setModalOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('clients').insert(clientForm).select('id, first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office, created_at').maybeSingle();
      if (error || !data) setErrorMessage('Non è stato possibile aggiungere il cliente.');
      else {
        setClients((current) => [data as Client, ...current]);
        setModalOpen(false);
      }
    }
    setSaving(false);
  };

  const removeClient = async (client: Client) => {
    if (!window.confirm(`Eliminare ${client.first_name} ${client.last_name}?`)) return;
    const { error } = await supabase.from('clients').delete().eq('id', client.id);
    if (error) { setErrorMessage('Non è stato possibile eliminare il cliente.'); return; }
    setClients((current) => current.filter((item) => item.id !== client.id));
  };

  const fullAddress = (client: Client) => [client.address, client.street_number, client.postal_code, client.city].filter(Boolean).join(', ') || '—';

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{clients.length} clienti</span> registrati nel sistema</p></div><button type="button" onClick={openNewClient} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Nuovo Cliente</button></div>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento clienti...</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1040px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><th className="px-4 py-3.5 md:px-5">Nome</th><th className="px-4 py-3.5">Tax code</th><th className="px-4 py-3.5">Email</th><th className="px-4 py-3.5">Indirizzo</th><th className="px-4 py-3.5">Phone</th><th className="px-4 py-3.5">Ufficio</th><th className="px-4 py-3.5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{clients.length === 0 ? <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">Nessun cliente registrato.</td></tr> : clients.map((client) => <tr key={client.id} className="transition hover:bg-blue-50/30"><td className="px-4 py-4 md:px-5"><p className="text-xs font-bold uppercase text-slate-800">{client.first_name} {client.last_name}</p><p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400">{client.notes || 'Nessuna nota'}</p></td><td className="px-4 py-4 text-xs text-slate-500">{client.tax_code || '—'}</td><td className="px-4 py-4 text-xs text-slate-600">{client.email || '—'}</td><td className="max-w-[210px] px-4 py-4 text-xs text-slate-600">{fullAddress(client)}</td><td className="px-4 py-4 text-xs text-slate-600">{client.phone || '—'}</td><td className="px-4 py-4 text-xs text-slate-600">{client.office || '—'}</td><td className="px-4 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditClient(client)} aria-label={`Visualizza ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></button><button type="button" onClick={() => openEditClient(client)} aria-label={`Modifica ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button><button type="button" onClick={() => removeClient(client)} aria-label={`Elimina ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="client-modal-title" className="max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="client-modal-title" className="text-xl font-bold text-slate-900">{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div><form onSubmit={saveClient} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input required value={clientForm.last_name} onChange={(event) => setClientForm((current) => ({ ...current, last_name: event.target.value }))} placeholder="Cognome" className="input" /><input required value={clientForm.first_name} onChange={(event) => setClientForm((current) => ({ ...current, first_name: event.target.value }))} placeholder="Nome" className="input" /></div><input value={clientForm.tax_code} onChange={(event) => setClientForm((current) => ({ ...current, tax_code: event.target.value }))} placeholder="Codice Fiscale" className="input" /><div className="grid gap-3 sm:grid-cols-2"><input type="email" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="input" /><input value={clientForm.phone} onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefono" className="input" /></div><textarea value={clientForm.notes} onChange={(event) => setClientForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Note" className="input resize-y" /><div className="border-t border-slate-100 pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"><MapPin size={15} className="text-blue-600" /> Indirizzo</div><input value={clientForm.address} onChange={(event) => setClientForm((current) => ({ ...current, address: event.target.value }))} placeholder="Cerca indirizzo (es. Via Prenestina, Roma)..." className="input" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={clientForm.street_number} onChange={(event) => setClientForm((current) => ({ ...current, street_number: event.target.value }))} placeholder="N. civico" className="input" /><input value={clientForm.postal_code} onChange={(event) => setClientForm((current) => ({ ...current, postal_code: event.target.value }))} placeholder="CAP" className="input" /><input value={clientForm.city} onChange={(event) => setClientForm((current) => ({ ...current, city: event.target.value }))} placeholder="Comune" className="input" /></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={clientForm.province} onChange={(event) => setClientForm((current) => ({ ...current, province: event.target.value }))} placeholder="Provincia" className="input" /><input value={clientForm.province_code} onChange={(event) => setClientForm((current) => ({ ...current, province_code: event.target.value }))} placeholder="Sigla" className="input" /><input value={clientForm.region} onChange={(event) => setClientForm((current) => ({ ...current, region: event.target.value }))} placeholder="Regione" className="input" /></div><input value={clientForm.country} onChange={(event) => setClientForm((current) => ({ ...current, country: event.target.value }))} placeholder="Paese" className="input mt-3" /></div><input value={clientForm.office} onChange={(event) => setClientForm((current) => ({ ...current, office: event.target.value }))} placeholder="Ufficio CAF" className="input" /><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Salvataggio...' : 'Salva'}</button></div></form></div></div>}</section>;
}

function CafOffices() {
  const [offices, setOffices] = useState<CafOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<CafOffice | null>(null);
  const [saving, setSaving] = useState(false);
  const [officeForm, setOfficeForm] = useState<OfficeForm>({ name: '', address: '', vat_number: '', email: '', phone: '', is_active: true });

  useEffect(() => {
    const loadOffices = async () => {
      const { data, error } = await supabase.from('caf_offices').select('id, name, address, vat_number, email, phone, is_active, created_at').order('name');
      if (error) setFormError('Non è stato possibile caricare gli uffici.');
      setOffices((data as CafOffice[]) ?? []);
      setLoading(false);
    };
    void loadOffices();
  }, []);

  const openNewOffice = () => {
    setEditingOffice(null);
    setOfficeForm({ name: '', address: '', vat_number: '', email: '', phone: '', is_active: true });
    setFormError('');
    setModalOpen(true);
  };

  const openEditOffice = (office: CafOffice) => {
    setEditingOffice(office);
    setOfficeForm({ name: office.name, address: office.address, vat_number: office.vat_number, email: office.email, phone: office.phone, is_active: office.is_active });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const saveOffice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    if (editingOffice) {
      const { error } = await supabase.from('caf_offices').update(officeForm).eq('id', editingOffice.id);
      if (error) setFormError('Non è stato possibile aggiornare l’ufficio.');
      else {
        setOffices((current) => current.map((office) => office.id === editingOffice.id ? { ...office, ...officeForm } : office));
        setModalOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('caf_offices').insert(officeForm).select('id, name, address, vat_number, email, phone, is_active, created_at').maybeSingle();
      if (error || !data) setFormError('Non è stato possibile aggiungere l’ufficio.');
      else {
        setOffices((current) => [...current, data as CafOffice].sort((first, second) => first.name.localeCompare(second.name)));
        setModalOpen(false);
      }
    }
    setSaving(false);
  };

  const toggleOffice = async (office: CafOffice) => {
    const nextActive = !office.is_active;
    const { error } = await supabase.from('caf_offices').update({ is_active: nextActive }).eq('id', office.id);
    if (error) { setFormError('Non è stato possibile modificare lo stato dell’ufficio.'); return; }
    setOffices((current) => current.map((item) => item.id === office.id ? { ...item, is_active: nextActive } : item));
  };

  const removeOffice = async (office: CafOffice) => {
    if (!window.confirm(`Eliminare ${office.name}?`)) return;
    const { error } = await supabase.from('caf_offices').delete().eq('id', office.id);
    if (error) { setFormError('Non è stato possibile eliminare l’ufficio.'); return; }
    setOffices((current) => current.filter((item) => item.id !== office.id));
  };

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{offices.length} uffici</span> gestiti dal sistema</p></div><button type="button" onClick={openNewOffice} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Aggiungi Ufficio</button></div>{formError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{formError}</p>}{loading ? <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento uffici...</div> : offices.length === 0 ? <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><div><Building2 className="mx-auto mb-3 text-blue-600" size={28} /><p className="text-sm font-semibold text-slate-800">Nessun ufficio configurato</p><p className="mt-1 text-xs text-slate-400">Aggiungi il primo ufficio CAF per iniziare.</p></div></div> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{offices.map((office) => <article key={office.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#101a2e] text-white"><Building2 size={19} /></div><div className="min-w-0"><h2 className="truncate text-[15px] font-bold text-slate-900">{office.name}</h2><span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${office.is_active ? 'text-emerald-600' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${office.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{office.is_active ? 'Attivo' : 'Disattivato'}</span></div></div><button type="button" onClick={() => openEditOffice(office)} aria-label={`Modifica ${office.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={17} /></button></div><div className="mt-5 space-y-1.5 text-sm leading-5 text-slate-600"><p>{office.address || 'Indirizzo non inserito'}</p>{office.vat_number && <p className="text-slate-400">VAT: {office.vat_number}</p>}{office.email && <p className="break-all">{office.email}</p>}{office.phone && <p>{office.phone}</p>}</div><div className="mt-5 flex gap-2"><button type="button" onClick={() => toggleOffice(office)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600">{office.is_active ? 'Disattiva' : 'Attiva'}</button><button type="button" onClick={() => removeOffice(office)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"><Trash2 size={14} /> Elimina</button></div></article>)}</div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="office-modal-title" className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="office-modal-title" className="text-xl font-bold text-slate-900">{editingOffice ? 'Modifica Ufficio' : 'Nuovo Ufficio'}</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div><form onSubmit={saveOffice} className="space-y-3"><input required value={officeForm.name} onChange={(event) => setOfficeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome ufficio" className="input" /><input value={officeForm.address} onChange={(event) => setOfficeForm((current) => ({ ...current, address: event.target.value }))} placeholder="Indirizzo" className="input" /><input value={officeForm.vat_number} onChange={(event) => setOfficeForm((current) => ({ ...current, vat_number: event.target.value }))} placeholder="Partita IVA / Codice fiscale" className="input" /><div className="grid gap-3 sm:grid-cols-2"><input type="email" value={officeForm.email} onChange={(event) => setOfficeForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="input" /><input value={officeForm.phone} onChange={(event) => setOfficeForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Numero di telefono" className="input" /></div><label className="flex items-center gap-2 py-1 text-sm text-slate-600"><input type="checkbox" checked={officeForm.is_active} onChange={(event) => setOfficeForm((current) => ({ ...current, is_active: event.target.checked }))} className="h-4 w-4 accent-blue-600" /> Attivo</label><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Salvataggio...' : 'Salva'}</button></div></form></div></div>}</section>;
}

function Dashboard() {
  const [rows, setRows] = useState<StoredPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadRecentPractices = async () => {
      const { data, error: queryError } = await supabase.from('pratiche').select('id, protocol, client_name, tax_code, category, service, deadline, priority, payment_status, office, operator, status, overdue, created_at').order('created_at', { ascending: false }).limit(5);
      if (queryError) setError(true);
      else setRows((data as StoredPractice[]) ?? []);
      setLoading(false);
    };
    void loadRecentPractices();
  }, []);

  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

  return <><section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">{statistics.map(({ label, value, icon: Icon, tone }) => <div key={label} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="mb-4 flex items-start justify-between gap-2"><p className="min-h-8 text-[11px] font-medium leading-4 text-slate-500">{label}</p><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}><Icon size={15} /></span></div><p className="text-[26px] font-semibold leading-none tracking-tight text-slate-950">{value}</p></div>)}</section><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center md:px-6"><div><h2 className="text-base font-semibold text-slate-950">Pratiche Recenti</h2><p className="mt-1 text-xs text-slate-400">Le ultime attività registrate nel sistema</p></div><button className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800">Vedi tutte <ArrowRight size={14} /></button></div>{loading ? <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-400">Caricamento pratiche...</div> : error ? <div className="flex min-h-[260px] items-center justify-center text-sm text-red-600">Non è stato possibile caricare le pratiche.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-3.5 md:px-6">Protocollo</th><th className="px-4 py-3.5">Cliente</th><th className="px-4 py-3.5">Servizio</th><th className="px-4 py-3.5">Ufficio CAF</th><th className="px-4 py-3.5">Operatore</th><th className="px-4 py-3.5">Stato</th><th className="px-4 py-3.5">Priorità</th><th className="px-4 py-3.5">Scadenza</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((practice) => <tr key={practice.id} className="group transition hover:bg-blue-50/30"><td className="px-5 py-4 md:px-6"><span className="text-xs font-bold text-slate-800">{practice.protocol}</span></td><td className="px-4 py-4"><p className="whitespace-nowrap text-xs font-medium capitalize text-slate-700">{practice.client_name}</p><p className="mt-1 text-[10px] text-slate-400">{practice.tax_code}</p></td><td className="max-w-[245px] px-4 py-4 text-xs leading-5 text-slate-600">{practice.service}</td><td className="px-4 py-4 text-xs text-slate-600">{practice.office}</td><td className="px-4 py-4 text-xs text-slate-500">{practice.operator}</td><td className="px-4 py-4"><StatusBadge status={practice.status} /></td><td className="px-4 py-4"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${practice.priority === 'Urgente' ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100' : 'bg-slate-100 text-slate-500'}`}>{practice.priority}</span></td><td className={`whitespace-nowrap px-4 py-4 text-xs font-medium ${practice.overdue ? 'text-red-600' : 'text-slate-500'}`}>{practice.overdue && <AlertTriangle size={12} className="mr-1 inline" />}{formatDate(practice.deadline)}</td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 md:px-6"><p className="text-xs text-slate-400">Visualizzate <span className="font-semibold text-slate-600">{rows.length}</span> pratiche recenti</p><button className="text-xs font-semibold text-blue-600 hover:text-blue-800">Apri archivio completo</button></div></section></>;
}

function AllPractices() {
  const [rows, setRows] = useState<StoredPractice[]>([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [ascending, setAscending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadPractices = async () => {
      const { data, error: queryError } = await supabase.from('pratiche').select('id, protocol, client_name, tax_code, category, service, deadline, priority, payment_status, office, operator, status, overdue, created_at').order('created_at', { ascending: false });
      if (!active) return;
      if (queryError) { setError(true); setLoading(false); return; }
      setRows((data as StoredPractice[]) ?? []);
      setLoading(false);
    };
    void loadPractices();
    return () => { active = false; };
  }, []);

  const allRows = useMemo(() => rows, [rows]);
  const sortedRows = useMemo(() => [...allRows].sort((first, second) => {
    const firstValue = sortValue(first, sortBy);
    const secondValue = sortValue(second, sortBy);
    return firstValue.localeCompare(secondValue, 'it', { numeric: true }) * (ascending ? 1 : -1);
  }), [allRows, ascending, sortBy]);

  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6"><div><h2 className="text-base font-semibold text-slate-950">Tutte le Pratiche</h2><p className="mt-1 text-xs text-slate-400">Tutte le pratiche create nel sistema</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-xs font-medium text-slate-500">Ordina per<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"><option value="protocol">Protocollo</option><option value="service">Servizio</option><option value="client">Cliente</option><option value="created_at">Data</option><option value="office">Ufficio CAF</option></select></label><button type="button" onClick={() => setAscending((current) => !current)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-600">{ascending ? 'Crescente' : 'Decrescente'}</button></div></div>{loading ? <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-400">Caricamento pratiche...</div> : error ? <div className="flex min-h-[260px] items-center justify-center px-6 text-center text-sm text-red-600">Non è stato possibile caricare le pratiche.</div> : sortedRows.length === 0 ? <div className="flex min-h-[260px] items-center justify-center px-6 text-center"><div><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardList size={22} /></div><p className="text-sm font-semibold text-slate-800">Nessuna pratica ancora creata</p><p className="mt-1 text-xs text-slate-400">Le pratiche salvate dalla schermata Nuova Pratica appariranno qui.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><th className="px-5 py-3.5 md:px-6">Protocollo</th><th className="px-4 py-3.5">Cliente</th><th className="px-4 py-3.5">Servizio</th><th className="px-4 py-3.5">Origine</th><th className="px-4 py-3.5">Ufficio CAF</th><th className="px-4 py-3.5">Operatore</th><th className="px-4 py-3.5">Stato</th><th className="px-4 py-3.5">Priorità</th><th className="px-4 py-3.5">Scadenza</th></tr></thead><tbody className="divide-y divide-slate-100">{sortedRows.map((practice) => <tr key={practice.id} className="transition hover:bg-blue-50/30"><td className="px-5 py-4 md:px-6"><span className="text-xs font-bold text-slate-800">{practice.protocol ?? `PRAT-${practice.id.slice(0, 8).toUpperCase()}`}</span><p className="mt-1 text-[10px] text-slate-400">{formatDate(practice.created_at)}</p></td><td className="px-4 py-4"><p className="whitespace-nowrap text-xs font-medium uppercase text-slate-700">{practice.client_name}</p><p className="mt-1 text-[10px] text-slate-400">{practice.category}</p></td><td className="max-w-[245px] px-4 py-4 text-xs leading-5 text-slate-600">{practice.service}</td><td className="px-4 py-4"><span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-100">Ufficio Interno</span></td><td className="px-4 py-4 text-xs text-slate-600">{practice.office}</td><td className="px-4 py-4 text-xs text-slate-500">{practice.operator}</td><td className="px-4 py-4"><StatusBadge status={practice.status} /></td><td className="px-4 py-4"><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${practice.priority === 'Urgente' ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-100' : 'bg-slate-100 text-slate-500'}`}>{practice.priority}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-slate-500">{formatDate(practice.deadline)}</td></tr>)}</tbody></table></div>}<div className="border-t border-slate-100 px-5 py-4 md:px-6"><p className="text-xs text-slate-400">Visualizzate <span className="font-semibold text-slate-600">{sortedRows.length}</span> pratiche</p></div></section>;
}

function sortValue(practice: StoredPractice, sortBy: string) {
  if (sortBy === 'protocol') return practice.protocol ?? `PRAT-${practice.id.slice(0, 8).toUpperCase()}`;
  if (sortBy === 'service') return practice.service;
  if (sortBy === 'client') return practice.client_name;
  if (sortBy === 'office') return practice.office;
  return practice.created_at;
}

function NewPractice() {
  const [client, setClient] = useState('');
  const [category, setCategory] = useState('');
  const [service, setService] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Normale');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Nessun importo');
  const [documents, setDocuments] = useState<DocumentFiles>(emptyDocuments);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (key: DocumentKey, event: ChangeEvent<HTMLInputElement>) => setDocuments((current) => ({ ...current, [key]: event.target.files?.[0] ?? null }));
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const documentNames = Object.fromEntries(Object.entries(documents).map(([key, file]) => [key, file?.name ?? null]));
    const { error } = await supabase.from('pratiche').insert({ client_name: client, category, service, deadline: deadline || null, priority, description, amount_received: Number(amount.replace(',', '.')) || 0, payment_status: paymentStatus, documents: documentNames });
    setSaving(false);
    if (error) { setMessage({ type: 'error', text: 'Non è stato possibile salvare la pratica. Riprova.' }); return; }
    setMessage({ type: 'success', text: 'Pratica creata correttamente e inviata al team back-office.' });
    setClient(''); setCategory(''); setService(''); setDeadline(''); setPriority('Normale'); setDescription(''); setAmount(''); setPaymentStatus('Nessun importo'); setDocuments(emptyDocuments);
  };

  return <form onSubmit={handleSubmit} className="mx-auto max-w-[1040px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:p-8"><div className="mb-7 flex items-start justify-between border-b border-slate-100 pb-5"><div><h2 className="text-xl font-bold tracking-tight text-slate-950">Nuova Pratica</h2><p className="mt-1 text-sm text-slate-500">Ufficio CAF: <span className="font-medium text-slate-700">CAF Roma Eur</span></p></div><button type="button" className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-600 sm:flex"><UserRound size={15} /> Nuovo cliente</button></div>
    <div className="space-y-6"><Field label="Cliente"><select required value={client} onChange={(event) => setClient(event.target.value)} className="input"><option value="">Seleziona un cliente...</option><option>Md Shawon Ahmed</option><option>Niaj Mohahbd</option><option>Maria Rossi</option></select></Field><Field label="Categoria"><select required value={category} onChange={(event) => { setCategory(event.target.value); setService(''); }} className="input"><option value="">Seleziona una categoria...</option><option>Immigrazione</option><option>Previdenza</option><option>Fiscale</option><option>Servizi al cittadino</option></select></Field><div className="grid gap-6 md:grid-cols-2"><Field label="Servizio"><select required disabled={!category} value={service} onChange={(event) => setService(event.target.value)} className="input disabled:bg-slate-50 disabled:text-slate-400"><option value="">{category ? 'Seleziona un servizio...' : 'Prima seleziona una categoria'}</option><option>Permesso di Soggiorno</option><option>Rinnovo Documenti</option><option>Assegno Unico e Universale (AUU)</option><option>Pagamenti PagoPA e Bollettini</option></select></Field><Field label="Priorità"><select value={priority} onChange={(event) => setPriority(event.target.value)} className="input"><option>Normale</option><option>Urgente</option></select></Field></div><Field label="Scadenza (opzionale)"><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="input" /></Field><Field label="Descrizione / Note"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Aggiungi dettagli per il team back-office..." className="input resize-y" /></Field>
      <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CircleDollarSign size={18} className="text-blue-600" /> Importo Ricevuto dal Cliente (€)</div><p className="mt-2 text-xs leading-5 text-slate-500">Registra l’importo effettivamente ricevuto dal tuo cliente. Questo importo è indipendente dal costo interno in crediti e non viene derivato automaticamente.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Importo (€)"><input type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="input bg-white" /></Field><Field label="Stato Pagamento Cliente"><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="input bg-white"><option>Nessun importo</option><option>Parziale</option><option>Pagato</option></select></Field></div></section>
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Check size={18} className="text-blue-600" /> Pratica Interna</div><p className="mt-2 text-xs leading-5 text-slate-600">Questa pratica verrà creata come <strong>pratica interna</strong> per il tuo ufficio. Non è richiesto alcun addebito di crediti. Il prezzo del servizio viene salvato come riferimento storico ma non viene addebitato.</p></section>
      <section><div><h3 className="text-sm font-bold text-slate-900">Documenti</h3><p className="mt-1 text-xs leading-5 text-slate-500">Carica i documenti del cliente nelle categorie appropriate. Formati supportati: PDF, JPG, PNG. Massimo 15 MB per file.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{documentTypes.map(({ key, label, icon: Icon }) => <DocumentUpload key={key} id={`document-${key}`} label={label} icon={Icon} file={documents[key]} onChange={(event) => handleFile(key, event)} />)}</div></section>
    </div><div className="mt-8 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button type="button" onClick={() => { setClient(''); setCategory(''); setService(''); setDeadline(''); setDescription(''); setAmount(''); setDocuments(emptyDocuments); setMessage(null); }} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Salvataggio...' : <><Check size={16} /> Crea Pratica</>}</button></div>{message && <p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}</form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">{label}</span>{children}</label>; }
function DocumentUpload({ id, label, icon: Icon, file, onChange }: { id: string; label: string; icon: LucideIcon; file: File | null; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) { return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3"><Icon size={16} className="text-slate-500" /><span className="text-xs font-semibold text-slate-800">{label}</span></div><label htmlFor={id} className="m-3 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 px-3 text-center transition hover:border-blue-300 hover:bg-blue-50/40"><Upload size={20} className="mb-2 text-slate-400" /><span className="text-xs font-medium text-slate-600">{file ? file.name : 'Carica File'}</span>{file && <span className="mt-1 max-w-full truncate text-[10px] text-emerald-600">Documento selezionato</span>}<input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onChange} className="sr-only" /></label></div>; }
function StatusBadge({ status }: { status: PracticeStatus }) { const styles: Record<PracticeStatus, string> = { Nuova: 'bg-blue-50 text-blue-600 ring-blue-100', 'In lavorazione': 'bg-amber-50 text-amber-700 ring-amber-100', Completata: 'bg-emerald-50 text-emerald-600 ring-emerald-100', Annullata: 'bg-slate-100 text-slate-500 ring-slate-200' }; return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>; }
function PlaceholderPage({ page }: { page: string }) { return <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white"><div className="max-w-sm px-6 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Settings size={24} /></div><h2 className="text-lg font-semibold text-slate-900">{page}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Questa sezione sarà disponibile nella prossima versione di CAFStream.</p></div></div>; }

export default App;
