/*
# Create service categories and service catalog

1. New Tables
- `service_categories` stores the five main service areas shown in the administration screen.
- `service_categories.id` is the generated category identifier.
- `service_categories.name` is the category label.
- `service_categories.slug` is the stable unique category key.
- `service_categories.description` is the short explanatory text shown below the label.
- `service_categories.icon` stores the presentation icon key.
- `service_categories.sort_order` controls the display order.
- `service_catalog` stores the individual services belonging to a category.
- `service_catalog.id` is the generated service identifier.
- `service_catalog.category_id` links each service to its category.
- `service_catalog.name` stores the service name.
- `service_catalog.description` stores the short service explanation.
- `service_catalog.credit_cost` stores the optional internal credit cost.
- `service_catalog.euro_cost` stores the optional reference price in euros.
- `service_catalog.status` stores whether the service is active or inactive.
- `service_catalog.instructions` stores optional operating instructions.
- `service_catalog.sort_order` controls the display order within a category.

2. Security
- Row level security is enabled on both tables.
- Anonymous and authenticated roles can read and manage the shared catalog because this app has no sign-in screen.
- Separate CRUD policies and Data API grants are included for both tables.

3. Initial Data
- All five requested categories are created in the reference order.
- All 36 requested services are inserted under their matching category.
- Costs and instructions start empty, while every seeded service starts active.
*/

CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'folder',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  credit_cost integer,
  euro_cost numeric(10, 2),
  status text NOT NULL DEFAULT 'Attivo' CHECK (status IN ('Attivo', 'Inattivo')),
  instructions text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalog TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
CREATE POLICY "Public can view service categories" ON public.service_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create service categories" ON public.service_categories;
CREATE POLICY "Public can create service categories" ON public.service_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update service categories" ON public.service_categories;
CREATE POLICY "Public can update service categories" ON public.service_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete service categories" ON public.service_categories;
CREATE POLICY "Public can delete service categories" ON public.service_categories FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can view service catalog" ON public.service_catalog;
CREATE POLICY "Public can view service catalog" ON public.service_catalog FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create service catalog" ON public.service_catalog;
CREATE POLICY "Public can create service catalog" ON public.service_catalog FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update service catalog" ON public.service_catalog;
CREATE POLICY "Public can update service catalog" ON public.service_catalog FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete service catalog" ON public.service_catalog;
CREATE POLICY "Public can delete service catalog" ON public.service_catalog FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.service_categories (name, slug, description, icon, sort_order)
VALUES
  ('Servizi Patronato', 'patronato', 'Servizi di patronato per pensioni, disoccupazione, famiglia e previdenza', 'handshake', 1),
  ('Servizi CAF', 'caf', 'Servizi CAF fiscali: ISEE, 730, redditi, IMU/TARI, locazioni, lavoro domestico', 'calculator', 2),
  ('Immigrazione e Cittadinanza', 'immigrazione-cittadinanza', 'Permesso di soggiorno, cittadinanza, ricongiungimento familiare', 'globe', 3),
  ('Servizi Imprese e Partita IVA', 'imprese-partita-iva', 'Partita IVA, Camera di Commercio, INPS/INAIL, fatturazione elettronica', 'building', 4),
  ('Identità Digitale e Servizi Accessori', 'identita-digitale', 'SPID, firma digitale, PEC, visure, pagamenti PagoPA', 'key', 5)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

WITH categories AS (SELECT id, slug FROM public.service_categories)
INSERT INTO public.service_catalog (category_id, name, description, sort_order)
VALUES
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Assegno Unico e Universale (AUU)', 'Assegno Unico e Universale per figli a carico', 1),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Dimissioni Volontarie Telematiche', 'Dimissioni volontarie telematiche dal rapporto di lavoro', 2),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Estratto Conto Previdenziale e Ricongiunzione Contributi', 'Estratto conto previdenziale e ricongiunzione contributi INPS', 3),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Indennità di Accompagnamento', 'Indennità di accompagnamento per invalidità civile', 4),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Maternità / Paternità e Bonus Nido', 'Maternità, paternità, bonus nido e bonus nascita', 5),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'NASpI / DIS-COLL', 'Indennità di disoccupazione NASpI e DIS-COLL', 6),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Pensione di Inabilità / Invalidità Civile e L. 104', 'Pensione di inabilità, invalidità civile e accertamento handicap L. 104', 7),
  ((SELECT id FROM categories WHERE slug = 'patronato'), 'Pensione di Vecchiaia, Anticipata, Quota 103, Opzione Donna', 'Pensione di vecchiaia, anticipata, quota 103 e opzione donna', 8),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Calcolo e Modelli F24 per IMU e TARI', 'Calcolo e modelli F24 per IMU e TARI', 1),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Contabilità e Gestione Lavoro Domestico (Colf & Badanti)', 'Contabilità e gestione del lavoro domestico', 2),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Family Benefits (ISEE)', 'Supporto per prestazioni e benefici familiari', 3),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Modello 730 (Dipendenti e Pensionati)', 'Modello 730 per dipendenti e pensionati', 4),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Modello ISEE / ISEE Universitario / ISEE Corrente', 'Modello ISEE nelle sue diverse tipologie', 5),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Modello Redditi PF', 'Modello Redditi per persone fisiche', 6),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Redditi Personale Spettante (RED / ICRIC / ICLAV / ACCAS-PS)', 'Dichiarazioni reddituali e di responsabilità', 7),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Registrazione, Chiusura e Proroga Contratti di Locazione (RLI)', 'Gestione dei contratti di locazione', 8),
  ((SELECT id FROM categories WHERE slug = 'caf'), 'Tax Return (730)', 'Assistenza per dichiarazione dei redditi 730', 9),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Attestazione di Idoneità Alloggiativa', 'Richiesta attestazione di idoneità alloggiativa', 1),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Prenotazione Appuntamenti Questura / Prefettura', 'Prenotazione appuntamenti presso Questura e Prefettura', 2),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Prenotazione Test di Lingua Italiana (CEFR)', 'Prenotazione del test di lingua italiana', 3),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Richiesta Cittadinanza Italiana', 'Richiesta di cittadinanza italiana', 4),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Richiesta e Rinnovo Permesso di Soggiorno / Carta di Soggiorno', 'Richiesta e rinnovo dei documenti di soggiorno', 5),
  ((SELECT id FROM categories WHERE slug = 'immigrazione-cittadinanza'), 'Ricongiungimento Familiare (Nulla Osta SUI)', 'Pratiche per ricongiungimento familiare', 6),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Apertura, Modifica e Chiusura Partita IVA', 'Gestione apertura, modifica e chiusura della partita IVA', 1),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Company Accounting', 'Servizi di contabilità aziendale', 2),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Fatturazione Elettronica e Corrispettivi Telematizzati', 'Fatturazione elettronica e corrispettivi telematici', 3),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Gestione INPS e INAIL Artigiani & Commercianti / Gestione Separata', 'Gestione delle posizioni INPS e INAIL', 4),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Iscrizione / Variazione / Cancellazione Registro Imprese', 'Pratiche presso il Registro Imprese', 5),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'Pratiche ComUnica e SCIA Comunale', 'Pratiche ComUnica e SCIA comunale', 6),
  ((SELECT id FROM categories WHERE slug = 'imprese-partita-iva'), 'VAT Registration', 'Supporto per registrazione IVA', 7),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Attivazione e Gestione Casella PEC', 'Attivazione e gestione della casella PEC', 1),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Pagamenti PagoPA e Bollettini', 'Pagamenti PagoPA e bollettini', 2),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Rilascio Firma Digitale (CNS / Smart Card / Token USB)', 'Rilascio e gestione della firma digitale', 3),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Rilascio e Attivazione SPID', 'Rilascio e attivazione SPID', 4),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Visure Camerali e Protesti', 'Visure camerali e protesti', 5),
  ((SELECT id FROM categories WHERE slug = 'identita-digitale'), 'Visure Catastali e Ipotecarie', 'Visure catastali e ipotecarie', 6)
ON CONFLICT (category_id, name) DO NOTHING;
