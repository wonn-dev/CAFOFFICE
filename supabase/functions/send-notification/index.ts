import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ADMIN_EMAIL = 'shawon.soluzionicentro@gmail.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'CAF Notifiche <onboarding@resend.dev>';

type PracticePayload = {
  type: 'practice';
  protocol: string;
  clientName: string;
  category: string;
  service: string;
  office: string;
  operator: string;
  priority: string;
  deadline: string | null;
};

type CreditRequestPayload = {
  type: 'credit_request';
  officeName: string;
  credits: number;
  note: string;
  operatorName: string;
};

type NotificationPayload = PracticePayload | CreditRequestPayload;

// Every field below arrives from the browser, so it is coerced, length-bounded
// and HTML-escaped before it is placed into the notification email.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function text(value: unknown, max = 200): string {
  if (value === null || value === undefined) return '';
  return escapeHtml(String(value).slice(0, max));
}

function plain(value: unknown, max = 200): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\r\n]+/g, ' ').slice(0, max);
}

function wholeNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1000000, Math.trunc(parsed)));
}

function buildEmail(payload: NotificationPayload): { subject: string; html: string } {
  const wrap = (title: string, bodyHtml: string) => `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#1e3a5f;padding:28px 32px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Sistema CAF</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">Notifica automatica</p>
        </td></tr>
        <tr><td style="padding:32px">
          <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px">${title}</h2>
          ${bodyHtml}
          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px">
            Questa è una notifica automatica generata dal sistema di gestione pratiche CAF.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  if (payload.type === 'practice') {
    const rows = [
      ['Protocollo', text(payload.protocol, 64)],
      ['Cliente', text(payload.clientName) || '—'],
      ['Categoria', text(payload.category, 120)],
      ['Servizio', text(payload.service, 120)],
      ['Ufficio', text(payload.office, 120)],
      ['Operatore', text(payload.operator) || '—'],
      ['Priorità', text(payload.priority, 32)],
      ['Scadenza', text(payload.deadline, 32) || '—'],
    ];
    const body = `
      <p style="margin:0 0 20px;color:#475569;font-size:15px">Una nuova pratica è stata appena creata nel sistema.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">
        ${rows.map(([label, value]) => `
          <tr>
            <td style="padding:10px 0;color:#64748b;font-weight:600;width:140px;vertical-align:top">${label}</td>
            <td style="padding:10px 0;color:#0f172a">${value}</td>
          </tr>`).join('')}
      </table>
      <a href="${Deno.env.get('SUPABASE_URL') ?? ''}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600">Vai alla dashboard</a>`;
    return { subject: `Nuova pratica creata: ${plain(payload.protocol, 64)}`, html: wrap('Nuova Pratica Registrata', body) };
  }

  const body = `
    <p style="margin:0 0 20px;color:#475569;font-size:15px">Un operatore ha inviato una nuova richiesta di ricarica crediti.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">
      <tr><td style="padding:10px 0;color:#64748b;font-weight:600;width:140px;vertical-align:top">Ufficio</td><td style="padding:10px 0;color:#0f172a">${text(payload.officeName, 120)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;font-weight:600;vertical-align:top">Crediti richiesti</td><td style="padding:10px 0;color:#2563eb;font-weight:700;font-size:18px">${wholeNumber(payload.credits)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;font-weight:600;vertical-align:top">Operatore</td><td style="padding:10px 0;color:#0f172a">${text(payload.operatorName) || '—'}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;font-weight:600;vertical-align:top">Nota</td><td style="padding:10px 0;color:#0f172a">${text(payload.note, 500) || '—'}</td></tr>
    </table>
    <a href="${Deno.env.get('SUPABASE_URL') ?? ''}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600">Rivedi la richiesta</a>`;
  return { subject: `Richiesta ricarica crediti: ${wholeNumber(payload.credits)} crediti da ${plain(payload.officeName, 120)}`, html: wrap('Nuova Richiesta di Ricarica Crediti', body) };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = await req.json() as NotificationPayload;

    if (payload.type !== 'practice' && payload.type !== 'credit_request') {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { subject, html } = buildEmail(payload);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured — email not sent for:', subject);
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend API error:', resendResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Notification function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
