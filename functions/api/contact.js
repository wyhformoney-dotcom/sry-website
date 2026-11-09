// Cloudflare Pages Function: POST /api/contact
// Sends contact form submissions to our inbox through Resend.
// Requires the RESEND_API_KEY environment variable in the Pages project settings.

const TO = 'wangyanhui@sryinteractive.com';
const FROM = 'SRY Website <website@sryinteractive.com>';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }

  // Honeypot: real visitors never fill this hidden field
  if (d.website) return json({ ok: true });

  const name = String(d.name || '').trim().slice(0, 200);
  const email = String(d.email || '').trim().slice(0, 200);
  const company = String(d.company || '').trim().slice(0, 200);
  const game = String(d.game || '').trim().slice(0, 500);
  const topic = String(d.topic || '').trim().slice(0, 100);
  const message = String(d.message || '').trim().slice(0, 5000);

  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'missing fields' }, 400);
  }
  if (!env.RESEND_API_KEY) return json({ ok: false, error: 'not configured' }, 500);

  const rows = [
    ['Name', name], ['Email', email], ['Studio', company], ['Game', game], ['Topic', topic],
  ].filter(([, v]) => v);

  const html =
    '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
    rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('') +
    '</table>' +
    `<p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px">${esc(message)}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `Website inquiry: ${topic || 'General'} — ${name}${company ? ' (' + company + ')' : ''}`,
      html,
    }),
  });

  if (!res.ok) return json({ ok: false, error: 'send failed' }, 502);
  return json({ ok: true });
}
