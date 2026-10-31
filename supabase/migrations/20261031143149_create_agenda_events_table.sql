/*
# Create agenda events

1. New Table
- `agenda_events` stores appointments and work items that need to be completed at a specific date and time.
- `id` is the generated event identifier.
- `title` is the short appointment or task name.
- `work_type` identifies the kind of work to perform.
- `event_date` stores the scheduled calendar date.
- `start_time` stores the scheduled starting time.
- `end_time` stores the optional ending time.
- `office` stores the related office or location.
- `notes` stores additional work details.
- `reminder_enabled` controls whether a reminder is configured.
- `reminder_minutes` stores how many minutes before the appointment the reminder should appear.
- `status` tracks whether the item is planned, completed, or cancelled.

2. Security
- Row level security is enabled on the new table.
- Anonymous and authenticated roles can manage shared agenda items because this app has no sign-in screen.
- Separate CRUD policies and Data API grants are included.

3. Data Integrity
- Titles, work types, dates, and start times are required.
- Reminder timing is limited to practical non-negative values.
*/

CREATE TABLE IF NOT EXISTS public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  work_type text NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  office text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_minutes integer NOT NULL DEFAULT 30 CHECK (reminder_minutes >= 0 AND reminder_minutes <= 10080),
  status text NOT NULL DEFAULT 'Pianificata' CHECK (status IN ('Pianificata', 'Completata', 'Annullata')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_events TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view agenda events" ON public.agenda_events;
CREATE POLICY "Public can view agenda events" ON public.agenda_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create agenda events" ON public.agenda_events;
CREATE POLICY "Public can create agenda events" ON public.agenda_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update agenda events" ON public.agenda_events;
CREATE POLICY "Public can update agenda events" ON public.agenda_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete agenda events" ON public.agenda_events;
CREATE POLICY "Public can delete agenda events" ON public.agenda_events FOR DELETE TO anon, authenticated USING (true);
