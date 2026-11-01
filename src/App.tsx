import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChevronUp,
  Globe2,
  Handshake,
  KeyRound,
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
  Save,
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
type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  office: string;
  payment_permission: string;
  status: 'Attivo' | 'Inattivo';
  practice_count: number;
  created_at: string;
};
type StaffForm = Omit<StaffMember, 'id' | 'created_at'>;
type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
};
type ServiceItem = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  credit_cost: number | null;
  euro_cost: number | null;
  status: 'Attivo' | 'Inattivo';
  instructions: string;
  required_documents: string;
  sort_order: number;
};
type ServiceForm = Omit<ServiceItem, 'id' | 'sort_order'>;
type OfficeCreditAccount = {
  id: string;
  office_id: string;
  available_credits: number;
  credits_received: number;
  credits_used: number;
  credits_refunded: number;
  last_recharge_at: string | null;
};
type CreditRequest = {
  id: string;
  office_id: string;
  requested_credits: number;
  note: string;
  status: 'In attesa' | 'Approvata' | 'Rifiutata';
  requested_at: string;
};
type CreditPayment = {
  id: string;
  office_id: string;
  credits: number;
  amount: number;
  payment_method: string;
  reference: string;
  status: 'In attesa' | 'Pagato' | 'Annullato';
  paid_at: string | null;
  created_at: string;
};
type AgendaEvent = {
  id: string;
  title: string;
  work_type: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  office: string;
  notes: string;
  reminder_enabled: boolean;
  reminder_minutes: number;
  status: 'Pianificata' | 'Completata' | 'Annullata';
  created_at: string;
  updated_at: string;
};
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
  { label: 'Controllo', items: [{ label: 'Agenda', icon: CalendarDays }, { label: 'Impostazioni', icon: Settings }] },
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

  const activeSubtitle = useMemo(() => activePage === 'Dashboard' ? 'Panoramica di sistema' : activePage === 'Nuova Pratica' ? 'Invia una nuova pratica al team back-office.' : activePage === 'Uffici CAF' ? 'Gestisci le sedi CAF che collaborano con il tuo ufficio.' : activePage === 'Clienti' ? 'Gestisci i clienti e tutte le loro informazioni.' : activePage === 'Utenti e Ruoli' ? 'Gestisci accessi, ruoli e assegnazioni del team.' : activePage === 'Servizi e Prezzi' ? 'Configura il catalogo dei servizi disponibili per le pratiche.' : activePage === 'Gestione Crediti' ? 'Ricarica, controlla e gestisci i crediti degli uffici esterni.' : activePage === 'Agenda' ? 'Organizza appuntamenti, scadenze e attività del team.' : 'Sezione in preparazione', [activePage]);
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
        <main className="mx-auto max-w-[1440px] p-5 md:p-8"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-blue-600"><SlidersHorizontal size={13} /> Area amministrativa</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-[28px]">{activePage}</h1><p className="mt-1 text-sm text-slate-500">{activeSubtitle}</p></div>{activePage === 'Dashboard' && <button onClick={() => selectPage('Nuova Pratica')} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25"><FilePlus2 size={17} /> Nuova Pratica</button>}</div>{activePage === 'Dashboard' ? <Dashboard /> : activePage === 'Nuova Pratica' ? <NewPractice /> : activePage === 'Tutte le Pratiche' ? <AllPractices /> : activePage === 'Uffici CAF' ? <CafOffices /> : activePage === 'Clienti' ? <Clients /> : activePage === 'Utenti e Ruoli' ? <UsersRoles /> : activePage === 'Servizi e Prezzi' ? <ServicesCatalog /> : activePage === 'Gestione Crediti' ? <CreditManagement /> : activePage === 'Agenda' ? <Agenda /> : activePage === 'Profilo' ? <Profile /> : <PlaceholderPage page={activePage} />}</main>
      </div>
    </div>
  );
}

function UsersRoles() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tutti gli stati');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [memberForm, setMemberForm] = useState<StaffForm>({ name: '', email: '', phone: '', role: 'Operatore Ufficio CAF', office: 'Nessun ufficio', payment_permission: 'Solo Crediti', status: 'Attivo', practice_count: 0 });
  const roles = ['Amministratore', 'Operatore Back-Office', 'Admin Ufficio CAF', 'Operatore Ufficio CAF', 'In Attesa di Approvazione'];
  const offices = ['Nessun ufficio', 'CAF Roma Eur', 'CAF Prenestina', 'torpignattara'];

  useEffect(() => {
    const loadMembers = async () => {
      const { data, error } = await supabase.from('staff_members').select('id, name, email, phone, role, office, payment_permission, status, practice_count, created_at').order('created_at', { ascending: false });
      if (error) setErrorMessage('Non è stato possibile caricare gli utenti.');
      setMembers((data as StaffMember[]) ?? []);
      setLoading(false);
    };
    void loadMembers();
  }, []);

  const openNewMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', email: '', phone: '', role: 'Operatore Ufficio CAF', office: 'Nessun ufficio', payment_permission: 'Solo Crediti', status: 'Attivo', practice_count: 0 });
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditMember = (member: StaffMember) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, email: member.email, phone: member.phone, role: member.role, office: member.office, payment_permission: member.payment_permission, status: member.status, practice_count: member.practice_count });
    setErrorMessage('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const saveMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    if (editingMember) {
      const { error } = await supabase.from('staff_members').update(memberForm).eq('id', editingMember.id);
      if (error) setErrorMessage('Non è stato possibile aggiornare l’utente.');
      else {
        setMembers((current) => current.map((member) => member.id === editingMember.id ? { ...member, ...memberForm } : member));
        setModalOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('staff_members').insert(memberForm).select('id, name, email, phone, role, office, payment_permission, status, practice_count, created_at').maybeSingle();
      if (error || !data) setErrorMessage('Non è stato possibile aggiungere l’utente.');
      else {
        setMembers((current) => [data as StaffMember, ...current]);
        setModalOpen(false);
      }
    }
    setSaving(false);
  };

  const updateMember = async (member: StaffMember, changes: Partial<StaffMember>) => {
    const { error } = await supabase.from('staff_members').update(changes).eq('id', member.id);
    if (error) { setErrorMessage('Non è stato possibile salvare la modifica.'); return; }
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...changes } : item));
  };

  const removeMember = async (member: StaffMember) => {
    if (!window.confirm(`Eliminare ${member.name}?`)) return;
    const { error } = await supabase.from('staff_members').delete().eq('id', member.id);
    if (error) { setErrorMessage('Non è stato possibile eliminare l’utente.'); return; }
    setMembers((current) => current.filter((item) => item.id !== member.id));
  };

  const visibleMembers = members.filter((member) => {
    const matchesSearch = `${member.name} ${member.email}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'Tutti gli stati' || member.status === statusFilter);
  });

  return <section><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{members.length} utenti</span> gestiti nel sistema</p></div><button type="button" onClick={openNewMember} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Nuovo Utente</button></div><div className="mb-4 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca per nome o email..." className="input pl-10" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input sm:w-44"><option>Tutti gli stati</option><option>Attivo</option><option>Inattivo</option></select></div>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento utenti...</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1180px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><th className="px-4 py-3.5 md:px-5">Nome</th><th className="px-4 py-3.5">Email</th><th className="px-4 py-3.5">Ruolo</th><th className="px-4 py-3.5">Ufficio CAF</th><th className="px-4 py-3.5">Permesso Pagamento</th><th className="px-4 py-3.5">Stato</th><th className="px-4 py-3.5">Pratiche</th><th className="px-4 py-3.5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleMembers.length === 0 ? <tr><td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-400">Nessun utente trovato.</td></tr> : visibleMembers.map((member) => <tr key={member.id} className="transition hover:bg-blue-50/30"><td className="px-4 py-4 md:px-5"><p className="text-xs font-bold uppercase text-slate-800">{member.name}</p>{member.phone && <p className="mt-1 text-[10px] text-slate-400">{member.phone}</p>}</td><td className="px-4 py-4 text-xs text-slate-600">{member.email || '—'}</td><td className="px-4 py-4"><select value={member.role} onChange={(event) => void updateMember(member, { role: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-blue-400">{roles.map((role) => <option key={role}>{role}</option>)}</select></td><td className="px-4 py-4"><select value={member.office} onChange={(event) => void updateMember(member, { office: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-blue-400">{offices.map((office) => <option key={office}>{office}</option>)}</select></td><td className="px-4 py-4 text-xs font-medium text-blue-600">{member.payment_permission === 'Solo Crediti' ? <span className="rounded-md bg-blue-50 px-2 py-1 ring-1 ring-inset ring-blue-100">Solo Crediti</span> : 'N/A'}</td><td className="px-4 py-4"><button type="button" onClick={() => void updateMember(member, { status: member.status === 'Attivo' ? 'Inattivo' : 'Attivo' })} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${member.status === 'Attivo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{member.status}</button></td><td className="px-4 py-4 text-xs font-semibold text-slate-600">{member.practice_count}</td><td className="px-4 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditMember(member)} aria-label={`Modifica ${member.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button><button type="button" onClick={() => removeMember(member)} aria-label={`Elimina ${member.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="staff-modal-title" className="text-xl font-bold text-slate-900">{editingMember ? 'Modifica Utente' : 'Nuovo Utente'}</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div><form onSubmit={saveMember} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input required value={memberForm.name} onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nome" className="input" /><input type="email" required value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="input" /></div><input value={memberForm.phone} onChange={(event) => setMemberForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefono" className="input" /><div className="grid gap-3 sm:grid-cols-2"><select value={memberForm.role} onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))} className="input">{roles.map((role) => <option key={role}>{role}</option>)}</select><select value={memberForm.office} onChange={(event) => setMemberForm((current) => ({ ...current, office: event.target.value }))} className="input">{offices.map((office) => <option key={office}>{office}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2"><select value={memberForm.payment_permission} onChange={(event) => setMemberForm((current) => ({ ...current, payment_permission: event.target.value }))} className="input"><option>N/A</option><option>Solo Crediti</option></select><select value={memberForm.status} onChange={(event) => setMemberForm((current) => ({ ...current, status: event.target.value as StaffMember['status'] }))} className="input"><option>Attivo</option><option>Inattivo</option></select></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Salvataggio...' : 'Salva'}</button></div></form></div></div>}</section>;
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

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{clients.length} clienti</span> registrati nel sistema</p></div><button type="button" onClick={openNewClient} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Nuovo Cliente</button></div>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento clienti...</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1040px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><th className="px-4 py-3.5 md:px-5">Nome</th><th className="px-4 py-3.5">Tax code</th><th className="px-4 py-3.5">Email</th><th className="px-4 py-3.5">Indirizzo</th><th className="px-4 py-3.5">Phone</th><th className="px-4 py-3.5">Ufficio</th><th className="px-4 py-3.5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{clients.length === 0 ? <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">Nessun cliente registrato.</td></tr> : clients.map((client) => <tr key={client.id} className="transition hover:bg-blue-50/30"><td className="px-4 py-4 md:px-5"><p className="text-xs font-bold uppercase text-slate-800">{client.first_name} {client.last_name}</p><p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400">{client.notes || 'Nessuna nota'}</p></td><td className="px-4 py-4 text-xs text-slate-500">{client.tax_code || '—'}</td><td className="px-4 py-4 text-xs text-slate-600">{client.email || '—'}</td><td className="max-w-[210px] px-4 py-4 text-xs text-slate-600">{fullAddress(client)}</td><td className="px-4 py-4 text-xs text-slate-600">{client.phone || '—'}</td><td className="px-4 py-4 text-xs text-slate-600">{client.office || '—'}</td><td className="px-4 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => openEditClient(client)} aria-label={`Visualizza ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></button><button type="button" onClick={() => openEditClient(client)} aria-label={`Modifica ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button><button type="button" onClick={() => removeClient(client)} aria-label={`Elimina ${client.first_name} ${client.last_name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="client-modal-title" className="max-h-[calc(100vh-32px)] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="client-modal-title" className="text-xl font-bold text-slate-900">{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div><form onSubmit={saveClient} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input required value={clientForm.last_name} onChange={(event) => setClientForm((current) => ({ ...current, last_name: event.target.value }))} placeholder="Cognome" className="input" /><input required value={clientForm.first_name} onChange={(event) => setClientForm((current) => ({ ...current, first_name: event.target.value }))} placeholder="Nome" className="input" /></div><input value={clientForm.tax_code} onChange={(event) => setClientForm((current) => ({ ...current, tax_code: event.target.value }))} placeholder="Codice Fiscale" className="input" /><div className="grid gap-3 sm:grid-cols-2"><input type="email" value={clientForm.email} onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="input" /><input value={clientForm.phone} onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefono" className="input" /></div><textarea value={clientForm.notes} onChange={(event) => setClientForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Note" className="input resize-y" /><div className="border-t border-slate-100 pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"><MapPin size={15} className="text-blue-600" /> Indirizzo</div><input value={clientForm.address} onChange={(event) => setClientForm((current) => ({ ...current, address: event.target.value }))} placeholder="Cerca indirizzo (es. Via Prenestina, Roma)..." className="input" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={clientForm.street_number} onChange={(event) => setClientForm((current) => ({ ...current, street_number: event.target.value }))} placeholder="N. civico" className="input" /><input value={clientForm.postal_code} onChange={(event) => setClientForm((current) => ({ ...current, postal_code: event.target.value }))} placeholder="CAP" className="input" /><input value={clientForm.city} onChange={(event) => setClientForm((current) => ({ ...current, city: event.target.value }))} placeholder="Comune" className="input" /></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={clientForm.province} onChange={(event) => setClientForm((current) => ({ ...current, province: event.target.value }))} placeholder="Provincia" className="input" /><input value={clientForm.province_code} onChange={(event) => setClientForm((current) => ({ ...current, province_code: event.target.value }))} placeholder="Sigla" className="input" /><input value={clientForm.region} onChange={(event) => setClientForm((current) => ({ ...current, region: event.target.value }))} placeholder="Regione" className="input" /></div><input value={clientForm.country} onChange={(event) => setClientForm((current) => ({ ...current, country: event.target.value }))} placeholder="Paese" className="input mt-3" /></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Salvataggio...' : 'Salva'}</button></div></form></div></div>}</section>;
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

function Agenda() {
  const today = new Date().toISOString().slice(0, 10);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'Tutti' | 'Pianificate' | 'Completate'>('Tutti');
  const [form, setForm] = useState({ title: '', work_type: 'Appuntamento cliente', event_date: today, start_time: '09:00', end_time: '10:00', office: 'CAF Roma Eur', notes: '', reminder_enabled: true, reminder_minutes: 30 });
  const workTypes = ['Appuntamento cliente', 'Chiamata', 'Consegna documenti', 'Scadenza pratica', 'Lavoro amministrativo', 'Altro'];

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error } = await supabase.from('agenda_events').select('id, title, work_type, event_date, start_time, end_time, office, notes, reminder_enabled, reminder_minutes, status, created_at, updated_at').order('event_date').order('start_time');
      if (error) setErrorMessage('Non è stato possibile caricare l’agenda.');
      setEvents((data as AgendaEvent[]) ?? []);
      setLoading(false);
    };
    void loadEvents();
  }, []);

  const openNew = () => { setEditingEvent(null); setForm({ title: '', work_type: 'Appuntamento cliente', event_date: today, start_time: '09:00', end_time: '10:00', office: 'CAF Roma Eur', notes: '', reminder_enabled: true, reminder_minutes: 30 }); setErrorMessage(''); setModalOpen(true); };
  const openEdit = (event: AgendaEvent) => { setEditingEvent(event); setForm({ title: event.title, work_type: event.work_type, event_date: event.event_date, start_time: event.start_time.slice(0, 5), end_time: event.end_time?.slice(0, 5) ?? '', office: event.office, notes: event.notes, reminder_enabled: event.reminder_enabled, reminder_minutes: event.reminder_minutes }); setErrorMessage(''); setModalOpen(true); };
  const closeModal = () => { if (!saving) setModalOpen(false); };
  const saveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const payload = { ...form, end_time: form.end_time || null, updated_at: new Date().toISOString() };
    if (editingEvent) {
      const { error } = await supabase.from('agenda_events').update(payload).eq('id', editingEvent.id);
      if (error) setErrorMessage('Non è stato possibile aggiornare l’attività.');
      else { setEvents((current) => current.map((item) => item.id === editingEvent.id ? { ...item, ...payload, end_time: payload.end_time } : item)); setModalOpen(false); }
    } else {
      const { data, error } = await supabase.from('agenda_events').insert(payload).select('id, title, work_type, event_date, start_time, end_time, office, notes, reminder_enabled, reminder_minutes, status, created_at, updated_at').maybeSingle();
      if (error || !data) setErrorMessage('Non è stato possibile salvare l’attività.');
      else { setEvents((current) => [...current, data as AgendaEvent].sort((first, second) => `${first.event_date}${first.start_time}`.localeCompare(`${second.event_date}${second.start_time}`))); setModalOpen(false); }
    }
    setSaving(false);
  };
  const updateStatus = async (item: AgendaEvent, status: AgendaEvent['status']) => {
    const { error } = await supabase.from('agenda_events').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (error) { setErrorMessage('Non è stato possibile aggiornare lo stato.'); return; }
    setEvents((current) => current.map((event) => event.id === item.id ? { ...event, status } : event));
  };
  const removeEvent = async (item: AgendaEvent) => {
    if (!window.confirm(`Eliminare ${item.title}?`)) return;
    const { error } = await supabase.from('agenda_events').delete().eq('id', item.id);
    if (error) { setErrorMessage('Non è stato possibile eliminare l’attività.'); return; }
    setEvents((current) => current.filter((event) => event.id !== item.id));
  };
  const visibleEvents = events.filter((event) => filter === 'Tutti' || (filter === 'Pianificate' ? event.status === 'Pianificata' : event.status === 'Completata'));
  const formatDay = (value: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  const formatShortDay = (value: string) => new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`));
  const groupedEvents = visibleEvents.reduce<Record<string, AgendaEvent[]>>((groups, event) => { groups[event.event_date] = [...(groups[event.event_date] ?? []), event]; return groups; }, {});
  const pendingCount = events.filter((event) => event.status === 'Pianificata').length;

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={17} className="text-blue-600" /> {pendingCount} attività pianificate</div><p className="mt-1 text-sm text-slate-500">Appuntamenti, scadenze e attività organizzate per giornata.</p></div><button type="button" onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Nuovo appuntamento</button></div><div className="mb-5 flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setFilter('Tutti')} className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${filter === 'Tutti' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Tutti</button><button type="button" onClick={() => setFilter('Pianificate')} className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${filter === 'Pianificate' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Pianificate</button><button type="button" onClick={() => setFilter('Completate')} className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${filter === 'Completate' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Completate</button></div></div>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento agenda...</div> : Object.keys(groupedEvents).length === 0 ? <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><div><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays size={22} /></div><p className="text-sm font-semibold text-slate-800">Nessuna attività in agenda</p><p className="mt-1 text-xs text-slate-400">Crea il primo appuntamento o inserisci una scadenza da ricordare.</p><button type="button" onClick={openNew} className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800">Aggiungi attività</button></div></div> : <div className="space-y-5">{Object.entries(groupedEvents).map(([date, dayEvents]) => <div key={date} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4"><div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-blue-600 text-white"><span className="text-[9px] font-semibold uppercase">{formatShortDay(date).split(' ')[1]}</span><span className="text-sm font-bold leading-4">{date.slice(8, 10)}</span></div><div><h2 className="text-sm font-bold capitalize text-slate-900">{formatDay(date)}</h2><p className="mt-0.5 text-xs text-slate-400">{dayEvents.length} {dayEvents.length === 1 ? 'attività' : 'attività'}</p></div></div><div className="divide-y divide-slate-100">{dayEvents.map((item) => <article key={item.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-blue-50/20 md:flex-row md:items-center"><div className="flex w-24 shrink-0 items-center gap-2 text-sm font-bold text-slate-700"><Clock3 size={16} className="text-blue-500" /> {item.start_time.slice(0, 5)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`text-sm font-semibold ${item.status === 'Completata' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.title}</h3><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">{item.work_type}</span>{item.reminder_enabled && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"><Bell size={11} /> {item.reminder_minutes} min prima</span>}</div><p className="mt-1 text-xs text-slate-500">{item.office || 'Nessun ufficio'}{item.end_time ? ` · fino alle ${item.end_time.slice(0, 5)}` : ''}{item.notes ? ` · ${item.notes}` : ''}</p></div><div className="flex items-center gap-2 md:justify-end"><button type="button" onClick={() => void updateStatus(item, item.status === 'Completata' ? 'Pianificata' : 'Completata')} className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition ${item.status === 'Completata' ? 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>{item.status === 'Completata' ? 'Riapri' : 'Completa'}</button><button type="button" onClick={() => openEdit(item)} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button><button type="button" onClick={() => void removeEvent(item)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></article>)}</div></div>)}</div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="agenda-modal-title" className="w-full max-w-[620px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 id="agenda-modal-title" className="text-xl font-bold text-slate-900">{editingEvent ? 'Modifica attività' : 'Nuovo appuntamento'}</h2><p className="mt-1 text-xs text-slate-400">Inserisci cosa devi fare e quando ricordartelo.</p></div><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={saveEvent} className="space-y-4"><Field label="Titolo attività"><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="input" placeholder="Es. Chiamare il cliente Rossi" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo di lavoro"><select value={form.work_type} onChange={(event) => setForm((current) => ({ ...current, work_type: event.target.value }))} className="input">{workTypes.map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Ufficio / luogo"><input value={form.office} onChange={(event) => setForm((current) => ({ ...current, office: event.target.value }))} className="input" placeholder="Es. CAF Roma Eur" /></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Data"><input required type="date" value={form.event_date} onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))} className="input" /></Field><Field label="Ora inizio"><input required type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} className="input" /></Field><Field label="Ora fine"><input type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} className="input" /></Field></div><Field label="Cosa devi fare"><textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} className="input resize-y" placeholder="Descrivi il lavoro, i documenti da preparare o le informazioni importanti..." /></Field><section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={form.reminder_enabled} onChange={(event) => setForm((current) => ({ ...current, reminder_enabled: event.target.checked }))} className="h-4 w-4 accent-blue-600" /><span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Bell size={16} className="text-amber-600" /> Imposta promemoria</span></label>{form.reminder_enabled && <div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><span>Ricordami</span><select value={form.reminder_minutes} onChange={(event) => setForm((current) => ({ ...current, reminder_minutes: Number(event.target.value) }))} className="rounded-lg border border-amber-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700"><option value={0}>All’ora dell’appuntamento</option><option value={15}>15 minuti prima</option><option value={30}>30 minuti prima</option><option value={60}>1 ora prima</option><option value={1440}>1 giorno prima</option></select></div>}</section><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Salvataggio...' : editingEvent ? 'Salva modifiche' : 'Crea appuntamento'}</button></div></form></div></div>}</section>;
}

function CreditManagement() {
  const [offices, setOffices] = useState<CafOffice[]>([]);
  const [accounts, setAccounts] = useState<OfficeCreditAccount[]>([]);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'Saldi' | 'Richieste' | 'Pagamenti'>('Saldi');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Attivi');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modal, setModal] = useState<'recharge' | 'request' | null>(null);
  const [saving, setSaving] = useState(false);
  const [rechargeForm, setRechargeForm] = useState({ officeId: '', credits: '', amount: '', paymentMethod: 'Bonifico', reference: '', note: '' });
  const [requestForm, setRequestForm] = useState({ officeId: '', credits: '', note: '' });

  useEffect(() => {
    const loadCreditData = async () => {
      const [officeResult, accountResult, requestResult, paymentResult] = await Promise.all([
        supabase.from('caf_offices').select('id, name, address, vat_number, email, phone, is_active, created_at').order('name'),
        supabase.from('office_credit_accounts').select('id, office_id, available_credits, credits_received, credits_used, credits_refunded, last_recharge_at'),
        supabase.from('credit_requests').select('id, office_id, requested_credits, note, status, requested_at').order('requested_at', { ascending: false }),
        supabase.from('credit_payments').select('id, office_id, credits, amount, payment_method, reference, status, paid_at, created_at').order('created_at', { ascending: false }),
      ]);
      if (officeResult.error || accountResult.error || requestResult.error || paymentResult.error) setErrorMessage('Non è stato possibile caricare la gestione crediti.');
      const loadedOffices = (officeResult.data as CafOffice[]) ?? [];
      setOffices(loadedOffices);
      setAccounts((accountResult.data as OfficeCreditAccount[]) ?? []);
      setRequests((requestResult.data as CreditRequest[]) ?? []);
      setPayments((paymentResult.data as CreditPayment[]) ?? []);
      setLoading(false);
    };
    void loadCreditData();
  }, []);

  const officeName = (officeId: string) => offices.find((office) => office.id === officeId)?.name ?? 'Ufficio non disponibile';
  const visibleOffices = offices.filter((office) => {
    const account = accounts.find((item) => item.office_id === office.id);
    const matchesSearch = `${office.name} ${office.vat_number}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'Tutti gli stati' || (statusFilter === 'Attivi' ? office.is_active : !office.is_active)) && account;
  });
  const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
  const closeModal = () => { if (!saving) setModal(null); };
  const openRecharge = (officeId = visibleOffices[0]?.id ?? '') => { setRechargeForm({ officeId, credits: '', amount: '', paymentMethod: 'Bonifico', reference: '', note: '' }); setErrorMessage(''); setModal('recharge'); };
  const openRequest = (officeId = visibleOffices[0]?.id ?? '') => { setRequestForm({ officeId, credits: '', note: '' }); setErrorMessage(''); setModal('request'); };

  const saveRecharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credits = Number(rechargeForm.credits);
    const amount = Number(rechargeForm.amount.replace(',', '.'));
    if (!rechargeForm.officeId || !Number.isFinite(credits) || credits <= 0 || !Number.isFinite(amount) || amount < 0) { setErrorMessage('Inserisci una quantità di crediti e un importo validi.'); return; }
    const account = accounts.find((item) => item.office_id === rechargeForm.officeId);
    if (!account) { setErrorMessage('L’account crediti dell’ufficio non è disponibile.'); return; }
    setSaving(true);
    const { data: payment, error: paymentError } = await supabase.from('credit_payments').insert({ office_id: rechargeForm.officeId, credits, amount, payment_method: rechargeForm.paymentMethod, reference: rechargeForm.reference, status: 'Pagato', paid_at: new Date().toISOString() }).select('id, office_id, credits, amount, payment_method, reference, status, paid_at, created_at').maybeSingle();
    const { data: transaction, error: transactionError } = await supabase.from('credit_transactions').insert({ office_id: rechargeForm.officeId, transaction_type: 'recharge', credits, note: rechargeForm.note || 'Ricarica crediti' }).select('id').maybeSingle();
    const { error: accountError } = await supabase.from('office_credit_accounts').update({ available_credits: account.available_credits + credits, credits_received: account.credits_received + credits, last_recharge_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', account.id);
    if (paymentError || transactionError || accountError || !payment || !transaction) setErrorMessage('Non è stato possibile completare la ricarica.');
    else { setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, available_credits: item.available_credits + credits, credits_received: item.credits_received + credits, last_recharge_at: new Date().toISOString() } : item)); setPayments((current) => [payment as CreditPayment, ...current]); setModal(null); }
    setSaving(false);
  };

  const saveRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const credits = Number(requestForm.credits);
    if (!requestForm.officeId || !Number.isFinite(credits) || credits <= 0) { setErrorMessage('Inserisci una quantità di crediti valida.'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('credit_requests').insert({ office_id: requestForm.officeId, requested_credits: credits, note: requestForm.note }).select('id, office_id, requested_credits, note, status, requested_at').maybeSingle();
    if (error || !data) setErrorMessage('Non è stato possibile inviare la richiesta.');
    else { setRequests((current) => [data as CreditRequest, ...current]); setModal(null); setActiveTab('Richieste'); }
    setSaving(false);
  };

  const updateRequest = async (request: CreditRequest, status: CreditRequest['status']) => {
    const { error } = await supabase.from('credit_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', request.id);
    if (error) { setErrorMessage('Non è stato possibile aggiornare la richiesta.'); return; }
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
  };

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Controlla i saldi, ricarica gli uffici e gestisci le richieste di credito.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openRequest()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><ArrowUpRight size={17} /> Richiedi Crediti</button><button type="button" onClick={() => openRecharge()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Ricarica Ufficio</button></div></div><div className="mb-5 flex flex-col gap-2 sm:flex-row"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input sm:w-40"><option>Attivi</option><option>Tutti gli stati</option><option>Inattivi</option></select><label className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca nome, città, P.IVA..." className="input pl-10" /></label></div><div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><button type="button" onClick={() => setActiveTab('Saldi')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'Saldi' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Saldi Uffici</button><button type="button" onClick={() => setActiveTab('Richieste')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'Richieste' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Richieste {requests.filter((request) => request.status === 'In attesa').length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">{requests.filter((request) => request.status === 'In attesa').length}</span>}</button><button type="button" onClick={() => setActiveTab('Pagamenti')} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'Pagamenti' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Pagamenti</button></div>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento crediti...</div> : activeTab === 'Saldi' ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1050px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400"><th className="px-4 py-3.5">Nome Ufficio CAF</th><th className="px-4 py-3.5">Città</th><th className="px-4 py-3.5">Stato Account</th><th className="px-4 py-3.5 text-right">Crediti Disponibili</th><th className="px-4 py-3.5 text-right">Crediti Ricevuti</th><th className="px-4 py-3.5 text-right">Crediti Utilizzati</th><th className="px-4 py-3.5 text-right">Crediti Rimborsati</th><th className="px-4 py-3.5">Ultima Ricarica</th><th className="px-4 py-3.5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleOffices.length === 0 ? <tr><td colSpan={9} className="px-6 py-16 text-center text-sm text-slate-400">Nessun ufficio trovato.</td></tr> : visibleOffices.map((office) => { const account = accounts.find((item) => item.office_id === office.id); if (!account) return null; return <tr key={office.id} className="transition hover:bg-blue-50/20"><td className="px-4 py-4 text-sm font-semibold text-slate-800">{office.name}</td><td className="px-4 py-4 text-sm text-slate-500">—</td><td className="px-4 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-100">{office.is_active ? 'Attivo' : 'Inattivo'}</span></td><td className="px-4 py-4 text-right text-sm font-bold text-blue-600">{account.available_credits}</td><td className="px-4 py-4 text-right text-sm font-semibold text-emerald-600">{account.credits_received}</td><td className="px-4 py-4 text-right text-sm text-orange-500">{account.credits_used}</td><td className="px-4 py-4 text-right text-sm text-violet-600">{account.credits_refunded}</td><td className="px-4 py-4 text-sm text-slate-500">{formatDate(account.last_recharge_at)}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => openRecharge(office.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition hover:text-blue-800">Assegna Crediti <ArrowRight size={14} /></button></td></tr>; })}</tbody></table></div> : activeTab === 'Richieste' ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400"><th className="px-5 py-3.5">Ufficio</th><th className="px-4 py-3.5">Crediti Richiesti</th><th className="px-4 py-3.5">Nota</th><th className="px-4 py-3.5">Data</th><th className="px-4 py-3.5">Stato</th><th className="px-4 py-3.5 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{requests.length === 0 ? <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-slate-400">Nessuna richiesta di credito.</td></tr> : requests.map((request) => <tr key={request.id}><td className="px-5 py-4 text-sm font-semibold text-slate-800">{officeName(request.office_id)}</td><td className="px-4 py-4 text-sm font-bold text-blue-600">{request.requested_credits}</td><td className="px-4 py-4 text-xs text-slate-500">{request.note || '—'}</td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(request.requested_at)}</td><td className="px-4 py-4"><span className="text-xs font-semibold text-slate-600">{request.status}</span></td><td className="px-4 py-4 text-right">{request.status === 'In attesa' && <span className="inline-flex gap-2"><button type="button" onClick={() => void updateRequest(request, 'Rifiutata')} className="text-xs font-semibold text-slate-500 hover:text-red-600">Rifiuta</button><button type="button" onClick={() => void updateRequest(request, 'Approvata')} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Approva</button></span>}</td></tr>)}</tbody></table></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/80"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400"><th className="px-5 py-3.5">Ufficio</th><th className="px-4 py-3.5">Crediti</th><th className="px-4 py-3.5">Importo</th><th className="px-4 py-3.5">Metodo</th><th className="px-4 py-3.5">Riferimento</th><th className="px-4 py-3.5">Stato</th><th className="px-4 py-3.5">Data</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.length === 0 ? <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-400">Nessun pagamento registrato.</td></tr> : payments.map((payment) => <tr key={payment.id}><td className="px-5 py-4 text-sm font-semibold text-slate-800">{officeName(payment.office_id)}</td><td className="px-4 py-4 text-sm font-bold text-blue-600">{payment.credits}</td><td className="px-4 py-4 text-sm text-slate-600">€{payment.amount.toFixed(2).replace('.', ',')}</td><td className="px-4 py-4 text-xs text-slate-500">{payment.payment_method}</td><td className="px-4 py-4 text-xs text-slate-500">{payment.reference || '—'}</td><td className="px-4 py-4 text-xs font-semibold text-emerald-600">{payment.status}</td><td className="px-4 py-4 text-xs text-slate-500">{formatDate(payment.paid_at ?? payment.created_at)}</td></tr>)}</tbody></table></div>}{modal === 'recharge' && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="recharge-title" className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><div><h2 id="recharge-title" className="text-xl font-bold text-slate-900">Ricarica Ufficio</h2><p className="mt-1 text-xs text-slate-400">Assegna crediti e registra il pagamento.</p></div><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={saveRecharge} className="space-y-4"><Field label="Ufficio CAF"><select required value={rechargeForm.officeId} onChange={(event) => setRechargeForm((current) => ({ ...current, officeId: event.target.value }))} className="input"><option value="">Seleziona un ufficio...</option>{offices.filter((office) => office.is_active).map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Crediti"><input required type="number" min="1" value={rechargeForm.credits} onChange={(event) => setRechargeForm((current) => ({ ...current, credits: event.target.value }))} className="input" /></Field><Field label="Importo (€)"><input required type="text" inputMode="decimal" value={rechargeForm.amount} onChange={(event) => setRechargeForm((current) => ({ ...current, amount: event.target.value }))} className="input" placeholder="0,00" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Metodo pagamento"><select value={rechargeForm.paymentMethod} onChange={(event) => setRechargeForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="input"><option>Bonifico</option><option>Carta</option><option>Contanti</option><option>Altro</option></select></Field><Field label="Riferimento"><input value={rechargeForm.reference} onChange={(event) => setRechargeForm((current) => ({ ...current, reference: event.target.value }))} className="input" placeholder="Es. RIC-2026-002" /></Field></div><Field label="Nota"><textarea value={rechargeForm.note} onChange={(event) => setRechargeForm((current) => ({ ...current, note: event.target.value }))} rows={3} className="input resize-y" /></Field><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Salvataggio...' : 'Conferma ricarica'}</button></div></form></div></div>}{modal === 'request' && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="request-title" className="w-full max-w-[500px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="request-title" className="text-xl font-bold text-slate-900">Richiedi Crediti</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div><form onSubmit={saveRequest} className="space-y-4"><Field label="Ufficio CAF"><select required value={requestForm.officeId} onChange={(event) => setRequestForm((current) => ({ ...current, officeId: event.target.value }))} className="input"><option value="">Seleziona un ufficio...</option>{offices.filter((office) => office.is_active).map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></Field><Field label="Crediti richiesti"><input required type="number" min="1" value={requestForm.credits} onChange={(event) => setRequestForm((current) => ({ ...current, credits: event.target.value }))} className="input" /></Field><Field label="Nota"><textarea value={requestForm.note} onChange={(event) => setRequestForm((current) => ({ ...current, note: event.target.value }))} rows={4} className="input resize-y" placeholder="Perché servono questi crediti?" /></Field><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Invio...' : 'Invia richiesta'}</button></div></form></div></div>}</section>;
}

function ServicesCatalog() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ServiceForm>({ category_id: '', name: '', description: '', credit_cost: null, euro_cost: null, status: 'Attivo', instructions: '', required_documents: '' });
  const iconMap: Record<string, LucideIcon> = { handshake: Handshake, calculator: Calculator, globe: Globe2, building: Building2, key: KeyRound };

  useEffect(() => {
    const loadCatalog = async () => {
      const [categoryResult, serviceResult] = await Promise.all([
        supabase.from('service_categories').select('id, name, slug, description, icon, sort_order').order('sort_order'),
        supabase.from('service_catalog').select('id, category_id, name, description, credit_cost, euro_cost, status, instructions, required_documents, sort_order').order('sort_order'),
      ]);
      if (categoryResult.error || serviceResult.error) setErrorMessage('Non è stato possibile caricare il catalogo dei servizi.');
      const loadedCategories = (categoryResult.data as ServiceCategory[]) ?? [];
      setCategories(loadedCategories);
      setServices((serviceResult.data as ServiceItem[]) ?? []);
      setExpanded(Object.fromEntries(loadedCategories.map((category) => [category.id, false])));
      setLoading(false);
    };
    void loadCatalog();
  }, []);

  const filteredServices = services.filter((service) => `${service.name} ${service.description}`.toLowerCase().includes(search.toLowerCase()));
  const getCategoryServices = (categoryId: string) => filteredServices.filter((service) => service.category_id === categoryId).sort((first, second) => first.sort_order - second.sort_order);
  const toggleAll = (value: boolean) => setExpanded(Object.fromEntries(categories.map((category) => [category.id, value])));
  const openNewService = (categoryId = categories[0]?.id ?? '') => {
    setEditingService(null);
    setForm({ category_id: categoryId, name: '', description: '', credit_cost: null, euro_cost: null, status: 'Attivo', instructions: '', required_documents: '' });
    setErrorMessage('');
    setModalOpen(true);
  };
  const openEditService = (service: ServiceItem) => {
    setEditingService(service);
    setForm({ category_id: service.category_id, name: service.name, description: service.description, credit_cost: service.credit_cost, euro_cost: service.euro_cost, status: service.status, instructions: service.instructions, required_documents: service.required_documents });
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeModal = () => { if (!saving) setModalOpen(false); };
  const saveService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    const payload = { ...form, credit_cost: form.credit_cost === null || Number.isNaN(form.credit_cost) ? null : form.credit_cost, euro_cost: form.euro_cost === null || Number.isNaN(form.euro_cost) ? null : form.euro_cost };
    if (editingService) {
      const { error } = await supabase.from('service_catalog').update(payload).eq('id', editingService.id);
      if (error) setErrorMessage('Non è stato possibile aggiornare il servizio.');
      else { setServices((current) => current.map((service) => service.id === editingService.id ? { ...service, ...payload } : service)); setModalOpen(false); }
    } else {
      const categoryServices = services.filter((service) => service.category_id === payload.category_id);
      const { data, error } = await supabase.from('service_catalog').insert({ ...payload, sort_order: categoryServices.length + 1 }).select('id, category_id, name, description, credit_cost, euro_cost, status, instructions, required_documents, sort_order').maybeSingle();
      if (error || !data) setErrorMessage('Non è stato possibile aggiungere il servizio.');
      else { setServices((current) => [...current, data as ServiceItem]); setExpanded((current) => ({ ...current, [payload.category_id]: true })); setModalOpen(false); }
    }
    setSaving(false);
  };
  const updateService = async (service: ServiceItem, changes: Partial<ServiceItem>) => {
    const { error } = await supabase.from('service_catalog').update(changes).eq('id', service.id);
    if (error) { setErrorMessage('Non è stato possibile salvare la modifica.'); return; }
    setServices((current) => current.map((item) => item.id === service.id ? { ...item, ...changes } : item));
  };
  const removeService = async (service: ServiceItem) => {
    if (!window.confirm(`Eliminare ${service.name}?`)) return;
    const { error } = await supabase.from('service_catalog').delete().eq('id', service.id);
    if (error) { setErrorMessage('Non è stato possibile eliminare il servizio.'); return; }
    setServices((current) => current.filter((item) => item.id !== service.id));
  };
  const formatEuro = (value: number | null) => value === null ? '—' : `€${value.toFixed(2).replace('.', ',')}`;

  return <section><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">{categories.length} categorie · {services.length} servizi totali</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleAll(true)} className="px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-blue-600">Espandi tutte</button><button type="button" onClick={() => toggleAll(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 transition hover:text-blue-600">Comprimi tutte</button><button type="button" onClick={() => openNewService()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><Plus size={17} /> Nuovo Servizio</button></div></div><label className="relative mb-5 block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cerca un servizio per nome..." className="input pl-10" /></label>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorMessage}</p>}{loading ? <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-400">Caricamento servizi...</div> : <div className="space-y-3">{categories.map((category) => { const categoryServices = getCategoryServices(category.id); const allCategoryServices = services.filter((service) => service.category_id === category.id); const activeCount = allCategoryServices.filter((service) => service.status === 'Attivo').length; const isOpen = expanded[category.id] || search.trim().length > 0; const Icon = iconMap[category.icon] ?? FolderKanban; return <div key={category.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={() => setExpanded((current) => ({ ...current, [category.id]: !isOpen }))} className="flex min-w-0 items-center gap-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={19} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{category.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{category.description}</span></span></button><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="whitespace-nowrap rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{allCategoryServices.length} servizi{activeCount !== allCategoryServices.length ? ` · ${activeCount} attivi` : ''}</span><button type="button" onClick={() => openNewService(category.id)} className="hidden text-xs font-medium text-slate-400 transition hover:text-blue-600 sm:block">Aggiungi servizio</button><button type="button" onClick={() => setExpanded((current) => ({ ...current, [category.id]: !isOpen }))} aria-label={isOpen ? 'Comprimi categoria' : 'Espandi categoria'} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700">{isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div></div>{isOpen && <div className="border-t border-slate-100">{categoryServices.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">Nessun servizio trovato in questa categoria.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead className="bg-slate-50/70"><tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400"><th className="px-5 py-3">Servizio</th><th className="px-4 py-3">Costo (crediti)</th><th className="px-4 py-3">Costo (€)</th><th className="px-4 py-3">Stato</th><th className="px-4 py-3">Istruzioni</th><th className="px-4 py-3 text-right">Azioni</th></tr></thead><tbody className="divide-y divide-slate-100">{categoryServices.map((service) => <tr key={service.id} className="transition hover:bg-blue-50/20"><td className="max-w-[390px] px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{service.name}</p><p className="mt-1 text-[11px] leading-4 text-slate-400">{service.description}</p></td><td className="px-4 py-3.5 text-xs font-semibold text-slate-700">{service.credit_cost === null ? 'Non configurato' : service.credit_cost}</td><td className="px-4 py-3.5 text-xs text-slate-600">{formatEuro(service.euro_cost)}</td><td className="px-4 py-3.5"><span className={`text-xs font-semibold ${service.status === 'Attivo' ? 'text-emerald-600' : 'text-slate-400'}`}>{service.status}</span></td><td className="px-4 py-3.5 text-xs">{service.instructions ? <span className="text-blue-600">Configurate</span> : <span className="text-slate-400">Nessuna</span>}<span className="mx-1 text-slate-300">·</span>{service.required_documents ? <span className="text-blue-600">Documenti configurati</span> : <span className="text-slate-400">Documenti mancanti</span>}</td><td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button type="button" onClick={() => void updateService(service, { status: service.status === 'Attivo' ? 'Inattivo' : 'Attivo' })} className="px-2 text-xs font-medium text-slate-500 transition hover:text-blue-600">{service.status === 'Attivo' ? 'Disattiva' : 'Attiva'}</button><button type="button" onClick={() => openEditService(service)} aria-label={`Modifica ${service.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button><button type="button" onClick={() => removeService(service)} aria-label={`Elimina ${service.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}<button type="button" onClick={() => openNewService(category.id)} className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50/40"><Plus size={16} /> Aggiungi servizio in questa categoria</button></div>}</div>; })}</div>}{modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><div role="dialog" aria-modal="true" aria-labelledby="service-modal-title" className="w-full max-w-[620px] rounded-2xl bg-white p-6 shadow-2xl sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 id="service-modal-title" className="text-xl font-bold text-slate-900">{editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}</h2><button type="button" onClick={closeModal} aria-label="Chiudi" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button></div><form onSubmit={saveService} className="space-y-4"><Field label="Categoria"><select required value={form.category_id} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))} className="input">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Nome servizio"><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="input" /></Field><Field label="Documenti Necessari"><textarea value={form.required_documents} onChange={(event) => setForm((current) => ({ ...current, required_documents: event.target.value }))} rows={4} placeholder="Elenca i documenti richiesti, uno per riga..." className="input resize-y" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Costo in crediti"><input type="number" min="0" value={form.credit_cost ?? ''} onChange={(event) => setForm((current) => ({ ...current, credit_cost: event.target.value === '' ? null : Number(event.target.value) }))} className="input" placeholder="Non configurato" /></Field><Field label="Costo in euro"><input type="number" min="0" step="0.01" value={form.euro_cost ?? ''} onChange={(event) => setForm((current) => ({ ...current, euro_cost: event.target.value === '' ? null : Number(event.target.value) }))} className="input" placeholder="Non configurato" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Stato"><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ServiceItem['status'] }))} className="input"><option>Attivo</option><option>Inattivo</option></select></Field><Field label="Istruzioni"><input value={form.instructions} onChange={(event) => setForm((current) => ({ ...current, instructions: event.target.value }))} className="input" placeholder="Nessuna" /></Field></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? 'Salvataggio...' : 'Salva servizio'}</button></div></form></div></div>}</section>;
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
  const [submitted, setSubmitted] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientSaving, setNewClientSaving] = useState(false);
  const [newClientError, setNewClientError] = useState('');
  const [newClientForm, setNewClientForm] = useState<ClientForm>({ first_name: '', last_name: '', tax_code: '', email: '', phone: '', notes: '', address: '', street_number: '', postal_code: '', city: '', province: '', province_code: '', region: '', country: 'Italia', office: '' });
  const selectedService = availableServices.find((item) => item.name === service);

  useEffect(() => {
    const loadServices = async () => {
      const [categoryResult, serviceResult, clientResult] = await Promise.all([
        supabase.from('service_categories').select('id, name, slug, description, icon, sort_order').order('sort_order'),
        supabase.from('service_catalog').select('id, category_id, name, description, credit_cost, euro_cost, status, instructions, required_documents, sort_order').eq('status', 'Attivo').order('sort_order'),
        supabase.from('clients').select('id, first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office, created_at').order('created_at', { ascending: false }),
      ]);
      setServiceCategories((categoryResult.data as ServiceCategory[]) ?? []);
      setAvailableServices((serviceResult.data as ServiceItem[]) ?? []);
      setClients((clientResult.data as Client[]) ?? []);
    };
    void loadServices();
  }, []);

  const handleFile = (key: DocumentKey, event: ChangeEvent<HTMLInputElement>) => setDocuments((current) => ({ ...current, [key]: event.target.files?.[0] ?? null }));
  const saveNewClient = async () => {
    setNewClientSaving(true);
    setNewClientError('');
    const { data, error } = await supabase.from('clients').insert(newClientForm).select('id, first_name, last_name, tax_code, email, phone, notes, address, street_number, postal_code, city, province, province_code, region, country, office, created_at').maybeSingle();
    setNewClientSaving(false);
    if (error || !data) { setNewClientError('Non è stato possibile salvare il cliente.'); return; }
    const savedClient = data as Client;
    setClients((current) => [savedClient, ...current]);
    setClient(`${savedClient.first_name} ${savedClient.last_name}`.trim());
    setNewClientForm({ first_name: '', last_name: '', tax_code: '', email: '', phone: '', notes: '', address: '', street_number: '', postal_code: '', city: '', province: '', province_code: '', region: '', country: 'Italia', office: '' });
    setNewClientOpen(false);
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const documentNames = Object.fromEntries(Object.entries(documents).map(([key, file]) => [key, file?.name ?? null]));
    const { error } = await supabase.from('pratiche').insert({ client_name: client, category, service, deadline: deadline || null, priority, description, amount_received: Number(amount.replace(',', '.')) || 0, payment_status: paymentStatus, documents: documentNames });
    setSaving(false);
    if (error) { setMessage({ type: 'error', text: 'Non è stato possibile salvare la pratica. Riprova.' }); return; }
    setMessage({ type: 'success', text: 'Pratica creata correttamente e inviata al team back-office.' });
    setSubmitted(true);
    setClient(''); setCategory(''); setService(''); setDeadline(''); setPriority('Normale'); setDescription(''); setAmount(''); setPaymentStatus('Nessun importo'); setDocuments(emptyDocuments);
  };

  if (submitted) return <section className="mx-auto max-w-[1040px] rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm sm:p-12"><div className="flex flex-col items-center justify-center text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={34} strokeWidth={2.5} /></div><h2 className="mt-5 text-xl font-bold tracking-tight text-slate-950">Pratica completata</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">La pratica è stata creata correttamente e inviata al team back-office.</p><button type="button" onClick={() => { setSubmitted(false); setMessage(null); }} className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"><FilePlus2 size={17} /> Crea nuova pratica</button></div></section>;

  return <form onSubmit={handleSubmit} className="mx-auto max-w-[1040px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 md:p-8"><div className="mb-7 flex items-start justify-between border-b border-slate-100 pb-5"><div><h2 className="text-xl font-bold tracking-tight text-slate-950">Nuova Pratica</h2><p className="mt-1 text-sm text-slate-500">Ufficio CAF: <span className="font-medium text-slate-700">CAF Roma Eur</span></p></div><button type="button" onClick={() => { setNewClientOpen((current) => !current); setNewClientError(''); }} className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-600 sm:flex"><UserRound size={15} /> Nuovo cliente</button></div>{newClientOpen && <section className="mb-7 rounded-xl border border-blue-100 bg-slate-50/70 p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Nuovo cliente</h3><p className="mt-1 text-xs text-slate-500">Salva un nuovo cliente senza uscire dalla pratica.</p></div><button type="button" onClick={() => setNewClientOpen(false)} className="text-xs font-semibold text-slate-500 transition hover:text-slate-900">Chiudi</button></div><div className="grid gap-3 sm:grid-cols-2"><input required value={newClientForm.first_name} onChange={(event) => setNewClientForm((current) => ({ ...current, first_name: event.target.value }))} placeholder="Nome" className="input" /><input required value={newClientForm.last_name} onChange={(event) => setNewClientForm((current) => ({ ...current, last_name: event.target.value }))} placeholder="Cognome" className="input" /></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={newClientForm.tax_code} onChange={(event) => setNewClientForm((current) => ({ ...current, tax_code: event.target.value }))} placeholder="Codice Fiscale" className="input" /><input type="email" value={newClientForm.email} onChange={(event) => setNewClientForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="input" /></div><input value={newClientForm.phone} onChange={(event) => setNewClientForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefono" className="input mt-3" /><textarea value={newClientForm.notes} onChange={(event) => setNewClientForm((current) => ({ ...current, notes: event.target.value }))} rows={2} placeholder="Note" className="input mt-3 resize-y" /><div className="mt-4 border-t border-slate-200 pt-4"><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"><MapPin size={15} className="text-blue-600" /> Indirizzo cliente</div><input value={newClientForm.address} onChange={(event) => setNewClientForm((current) => ({ ...current, address: event.target.value }))} placeholder="Indirizzo" className="input" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={newClientForm.street_number} onChange={(event) => setNewClientForm((current) => ({ ...current, street_number: event.target.value }))} placeholder="N. civico" className="input" /><input value={newClientForm.postal_code} onChange={(event) => setNewClientForm((current) => ({ ...current, postal_code: event.target.value }))} placeholder="CAP" className="input" /><input value={newClientForm.city} onChange={(event) => setNewClientForm((current) => ({ ...current, city: event.target.value }))} placeholder="Comune" className="input" /></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><input value={newClientForm.province} onChange={(event) => setNewClientForm((current) => ({ ...current, province: event.target.value }))} placeholder="Provincia" className="input" /><input value={newClientForm.province_code} onChange={(event) => setNewClientForm((current) => ({ ...current, province_code: event.target.value }))} placeholder="Sigla" className="input" /><input value={newClientForm.region} onChange={(event) => setNewClientForm((current) => ({ ...current, region: event.target.value }))} placeholder="Regione" className="input" /></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><input value={newClientForm.country} onChange={(event) => setNewClientForm((current) => ({ ...current, country: event.target.value }))} placeholder="Paese" className="input" /><input value={newClientForm.office} onChange={(event) => setNewClientForm((current) => ({ ...current, office: event.target.value }))} placeholder="Ufficio" className="input" /></div></div>{newClientError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{newClientError}</p>}<div className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" onClick={() => setNewClientOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button type="button" onClick={() => void saveNewClient()} disabled={newClientSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{newClientSaving ? 'Salvataggio...' : 'Salva cliente'}</button></div></section>}<div className="space-y-6"><Field label="Cliente"><select required value={client} onChange={(event) => setClient(event.target.value)} className="input"><option value="">Seleziona un cliente...</option>{clients.map((item) => <option key={item.id} value={`${item.first_name} ${item.last_name}`.trim()}>{`${item.first_name} ${item.last_name}`.trim()}</option>)}</select></Field><Field label="Categoria"><select required value={category} onChange={(event) => { setCategory(event.target.value); setService(''); }} className="input"><option value="">Seleziona una categoria...</option>{serviceCategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field><div className="grid gap-6 md:grid-cols-2"><Field label="Servizio"><select required disabled={!category} value={service} onChange={(event) => setService(event.target.value)} className="input disabled:bg-slate-50 disabled:text-slate-400"><option value="">{category ? 'Seleziona un servizio...' : 'Prima seleziona una categoria'}</option>{availableServices.filter((item) => serviceCategories.find((categoryItem) => categoryItem.name === category)?.id === item.category_id).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field><Field label="Priorità"><select value={priority} onChange={(event) => setPriority(event.target.value)} className="input"><option>Normale</option><option>Urgente</option></select></Field></div>{selectedService?.required_documents.trim() && <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileStack size={18} className="text-amber-600" /> Documenti Necessari</div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{selectedService.required_documents}</p></section>}<Field label="Scadenza (opzionale)"><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="input" /></Field><Field label="Descrizione / Note"><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Aggiungi dettagli per il team back-office..." className="input resize-y" /></Field>
      <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CircleDollarSign size={18} className="text-blue-600" /> Importo Ricevuto dal Cliente (€)</div><p className="mt-2 text-xs leading-5 text-slate-500">Registra l’importo effettivamente ricevuto dal tuo cliente. Questo importo è indipendente dal costo interno in crediti e non viene derivato automaticamente.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Importo (€)"><input type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="input bg-white" /></Field><Field label="Stato Pagamento Cliente"><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="input bg-white"><option>Nessun importo</option><option>Parziale</option><option>Pagato</option></select></Field></div></section>
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Check size={18} className="text-blue-600" /> Pratica Interna</div><p className="mt-2 text-xs leading-5 text-slate-600">Questa pratica verrà creata come <strong>pratica interna</strong> per il tuo ufficio. Non è richiesto alcun addebito di crediti. Il prezzo del servizio viene salvato come riferimento storico ma non viene addebitato.</p></section>
      <section><div><h3 className="text-sm font-bold text-slate-900">Documenti</h3><p className="mt-1 text-xs leading-5 text-slate-500">Carica i documenti del cliente nelle categorie appropriate. Formati supportati: PDF, JPG, PNG. Massimo 15 MB per file.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{documentTypes.map(({ key, label, icon: Icon }) => <DocumentUpload key={key} id={`document-${key}`} label={label} icon={Icon} file={documents[key]} onChange={(event) => handleFile(key, event)} />)}</div></section>
    </div><div className="mt-8 flex flex-col-reverse items-stretch justify-end gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center"><button type="button" onClick={() => { setClient(''); setCategory(''); setService(''); setDeadline(''); setDescription(''); setAmount(''); setDocuments(emptyDocuments); setMessage(null); }} className="px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900">Annulla</button><button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Salvataggio...' : <><Check size={16} /> Crea Pratica</>}</button></div>{message && <p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}</form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-700">{label}</span>{children}</label>; }
function DocumentUpload({ id, label, icon: Icon, file, onChange }: { id: string; label: string; icon: LucideIcon; file: File | null; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) { return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3"><Icon size={16} className="text-slate-500" /><span className="text-xs font-semibold text-slate-800">{label}</span></div><label htmlFor={id} className="m-3 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/60 px-3 text-center transition hover:border-blue-300 hover:bg-blue-50/40"><Upload size={20} className="mb-2 text-slate-400" /><span className="text-xs font-medium text-slate-600">{file ? file.name : 'Carica File'}</span>{file && <span className="mt-1 max-w-full truncate text-[10px] text-emerald-600">Documento selezionato</span>}<input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onChange} className="sr-only" /></label></div>; }
function StatusBadge({ status }: { status: PracticeStatus }) { const styles: Record<PracticeStatus, string> = { Nuova: 'bg-blue-50 text-blue-600 ring-blue-100', 'In lavorazione': 'bg-amber-50 text-amber-700 ring-amber-100', Completata: 'bg-emerald-50 text-emerald-600 ring-emerald-100', Annullata: 'bg-slate-100 text-slate-500 ring-slate-200' }; return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>; }
function Profile() {
  const [name, setName] = useState('Md Shawon Ahmed');
  const [phone, setPhone] = useState('349 7654321');
  const [saved, setSaved] = useState(false);

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return <section className="mx-auto max-w-[720px]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="mb-7 flex items-center gap-4 border-b border-slate-100 pb-6"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#101a2e] text-xl font-bold text-white">MS</div><div className="min-w-0"><h2 className="text-lg font-bold text-slate-950">{name}</h2><p className="mt-1 text-sm text-slate-500">shawon.soluzionecentro@gmail.com</p><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Amministratore</span></div></div><form onSubmit={saveProfile} className="space-y-5"><Field label="Nome completo"><input required value={name} onChange={(event) => setName(event.target.value)} className="input" /></Field><Field label="Email"><input value="shawon.soluzionecentro@gmail.com" disabled className="input bg-slate-50 text-slate-400" /></Field><Field label="Telefono"><input value={phone} onChange={(event) => setPhone(event.target.value)} className="input" /></Field><Field label="Ufficio CAF"><input value="CAF Roma Eur" disabled className="input bg-slate-50 text-slate-400" /></Field><Field label="Indirizzo ufficio"><input value="Viale Europa 45, Roma" disabled className="input bg-slate-50 text-slate-400" /></Field><div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5"><span className={`text-xs font-medium text-emerald-600 transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>Profilo salvato</span><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#101a2e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"><Save size={16} /> Salva</button></div></form></div></section>;
}

function PlaceholderPage({ page }: { page: string }) { return <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white"><div className="max-w-sm px-6 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Settings size={24} /></div><h2 className="text-lg font-semibold text-slate-900">{page}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Questa sezione sarà disponibile nella prossima versione di CAFStream.</p></div></div>; }

export default App;
