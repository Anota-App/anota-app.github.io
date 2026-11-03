// viewer/viewer.js — the family's page for a ▦ QR for parent (2026-10-16 sharecap Round 2).
//
// The link is <this page>#h1.<id: 16 bytes, base64url>.<key: 32 bytes, base64url>. The id goes to the clinic's
// database (public.open_handout — Database/migrations/0025_handouts.sql) with the publishable key of
// config.js and nothing else; the answer is the ciphertext, which this page decrypts here with the key from
// the fragment (AES-GCM-256; 'AH1' + a 12-byte IV in front, 'AH1' also the additional data — the format of
// utility/shared/handouts.js, of which this is the reading half). The handout (HTML + SVG) is shown in a
// sandboxed frame that runs no script; its PDF, when the doctor's computer made one, is saved or shared as
// those very bytes. Nothing is stored on the phone; nothing but the id and a code leaves it.
//
// 2026-10-27 (grfr, per user: "French version of the growth card we give to patient's families" + "parents should
// be able to toggle, default french"). A card may carry the same handout in another language (`alt`: [{ lang, title,
// fileName, html, pdf }] — still format v1). It opens in the language the clinic chose (the card's own, French unless
// the doctor chose otherwise; `open: 'phone'` = the phone's), and an EN · FR switch at the top — the resource page's
// — swaps the card, its PDF and this page's words. The choice is not kept: a new open starts in the clinic's.
(function () {
  'use strict';

  // ── words (the phone's language: French or English — until a card in two languages names its own) ──
  const FR = /^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '');
  const W = {
    en: {
      what: 'From your care team',
      opening: 'Opening…', openingP: 'The document is decrypted on this phone.',
      codeH: 'Enter the code', codeP: 'The clinic said a 4-digit code aloud.', codeGo: 'Open',
      wrong1: 'Wrong code — 1 try left.', wrongN: 'Wrong code — {n} tries left.',
      lockedH: 'This link is locked', lockedP: 'Too many wrong codes. Ask the clinic for a new link.',
      goneH: 'This link is not open', goneP: 'It has expired, the clinic closed it, or it has not been sent yet — a card made with no internet is sent as soon as the clinic’s computer is back online. Try again later, or ask the clinic.',
      brokenH: 'This link is incomplete', brokenP: 'Scan the code again, or ask the clinic to send the link again.',
      damagedH: 'This document cannot be opened', damagedP: 'The link and the document do not match. Ask the clinic for a new link.',
      offlineH: 'No connection', offlineP: 'The page could not reach the clinic’s server. Check the connection, then try again.',
      setupH: 'This page is not set up yet', setupP: 'The clinic has not finished installing it (config.js).',
      retry: 'Try again',
      until: 'Opens on this link until {d}.', untilT: 'Opens on this link until {d}.',
      keepPdf: 'Save the PDF to keep it.', keepPrint: 'Print it, or save it as a PDF, to keep it.',
      save: 'Save PDF', share: 'Share', print: 'Print or save as PDF',
      saved: 'Saved', cantShare: 'This phone cannot share the file — use Save PDF.',
      foot: 'Encrypted for you by the clinic. This page keeps nothing on your phone.',
      doc: 'The document',
      lang: 'Language',
    },
    fr: {
      what: 'De votre équipe soignante',
      opening: 'Ouverture…', openingP: 'Le document est déchiffré sur ce téléphone.',
      codeH: 'Entrez le code', codeP: 'La clinique vous a dit un code à 4 chiffres.', codeGo: 'Ouvrir',
      wrong1: 'Code erroné — encore 1 essai.', wrongN: 'Code erroné — encore {n} essais.',
      lockedH: 'Ce lien est verrouillé', lockedP: 'Trop de codes erronés. Demandez un nouveau lien à la clinique.',
      goneH: 'Ce lien n’est pas ouvert', goneP: 'Il a expiré, la clinique l’a fermé, ou il n’a pas encore été envoyé — une carte faite sans Internet est envoyée dès que l’ordinateur de la clinique est de nouveau en ligne. Réessayez plus tard, ou demandez à la clinique.',
      brokenH: 'Ce lien est incomplet', brokenP: 'Balayez le code de nouveau, ou demandez à la clinique de renvoyer le lien.',
      damagedH: 'Ce document ne peut pas s’ouvrir', damagedP: 'Le lien et le document ne correspondent pas. Demandez un nouveau lien à la clinique.',
      offlineH: 'Aucune connexion', offlineP: 'La page n’a pas pu joindre le serveur de la clinique. Vérifiez la connexion, puis réessayez.',
      setupH: 'Cette page n’est pas encore prête', setupP: 'La clinique n’a pas fini de l’installer (config.js).',
      retry: 'Réessayer',
      until: 'Ce lien s’ouvre jusqu’au {d}.', untilT: 'Ce lien s’ouvre jusqu’à {d}.',
      keepPdf: 'Enregistrez le PDF pour le conserver.', keepPrint: 'Imprimez-le, ou enregistrez-le en PDF, pour le conserver.',
      save: 'Enregistrer le PDF', share: 'Partager', print: 'Imprimer ou enregistrer en PDF',
      saved: 'Enregistré', cantShare: 'Ce téléphone ne peut pas partager le fichier — utilisez Enregistrer le PDF.',
      foot: 'Chiffré pour vous par la clinique. Cette page ne garde rien sur votre téléphone.',
      doc: 'Le document',
      lang: 'Langue',
    },
  };
  let lang = FR ? 'fr' : 'en';   // grfr — the page's words; a card in two languages sets it to the one on screen
  const t = (k, v) => String((W[lang] || W.en)[k] || W.en[k] || k).replace(/\{(\w+)\}/g, (m, n) => (v && v[n] != null ? v[n] : m));
  const setLang = (l) => { lang = l === 'fr' ? 'fr' : 'en'; document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en'; };
  setLang(lang);

  const $ = (id) => document.getElementById(id);
  // 2026-10-22 (qrshare) — the actions are pills with a drawn mark, as on the resource page (one stroke, currentColor)
  const ICON = {
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2v10.3M7.9 10.6 12 14.7l4.1-4.1"/><path d="M5 15.8v2.4A1.8 1.8 0 0 0 6.8 20h10.4a1.8 1.8 0 0 0 1.8-1.8v-2.4"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5V4M8.2 7.6 12 3.8l3.8 3.8"/><path d="M8 10.5H6.6A1.6 1.6 0 0 0 5 12.1v6.8a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-6.8a1.6 1.6 0 0 0-1.6-1.6H16"/></svg>',
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 8.4V4h9.6v4.4"/><path d="M7.2 16.6H5.7A1.7 1.7 0 0 1 4 14.9V10.1a1.7 1.7 0 0 1 1.7-1.7h12.6a1.7 1.7 0 0 1 1.7 1.7v4.8a1.7 1.7 0 0 1-1.7 1.7h-1.5"/><path d="M7.2 13.4h9.6V20H7.2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.6l4.1 4.1 8.9-9"/></svg>',
  };
  function label(b, ico, text) { b.innerHTML = ICON[ico] || ''; const s = document.createElement('span'); s.textContent = text; b.appendChild(s); }
  const show = (which) => { for (const id of ['hv-msg', 'hv-code', 'hv-shown']) $(id).hidden = id !== which; };
  function msg(ico, h, p, retry) {
    $('hv-msg-ico').textContent = ico; $('hv-msg-h').textContent = h; $('hv-msg-p').textContent = p;
    const b = $('hv-retry'); b.hidden = !retry; b.textContent = t('retry'); b.onclick = retry || null;
    show('hv-msg');   // the caller names the state (state() before or after) — never cleared here
  }
  const state = (s) => { $('hv').dataset.state = s; };

  // ── the link ──
  function unb64url(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8;
  }
  function unb64(s) { const bin = atob(String(s || '')); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
  function parseLink(hash) {
    const m = /^#h1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(String(hash || '').trim());
    if (!m) return null;
    try {
      const idB = unb64url(m[1]), key = unb64url(m[2]);
      if (idB.length !== 16 || key.length !== 32) return null;
      const h = Array.from(idB, (x) => x.toString(16).padStart(2, '0')).join('');
      return { id: h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20), key };
    } catch (_) { return null; }
  }

  // ── the seal (the reading half of utility/shared/handouts.js) ──
  const MAGIC = new Uint8Array([0x41, 0x48, 0x31]);   // 'AH1'
  async function unseal(payload, key) {
    const u8 = unb64(payload);
    if (u8.length < 3 + 12 + 16 || u8[0] !== MAGIC[0] || u8[1] !== MAGIC[1] || u8[2] !== MAGIC[2]) throw new Error('not a handout');
    const k = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.subarray(3, 15), additionalData: MAGIC }, k, u8.subarray(15));
    const obj = JSON.parse(new TextDecoder().decode(pt));
    if (!obj || obj.f !== 'anota-handout' || obj.v !== 1 || typeof obj.html !== 'string') throw new Error('not a handout');
    // grfr — the other languages, when the card carries them: only whole entries in a language this page speaks
    obj.alt = Array.isArray(obj.alt) ? obj.alt.filter((a) => a && typeof a.html === 'string' && (a.lang === 'fr' || a.lang === 'en') && a.lang !== obj.lang) : [];
    return obj;
  }

  // ── the clinic's database: one call, the publishable key only ──
  async function openHandout(cfg, id, code) {
    const url = String(cfg.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/rpc/open_handout';
    const r = await fetch(url, {
      method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
      body: JSON.stringify({ p_id: id, p_code: code == null ? null : String(code) }),
    });
    if (!r.ok) { const e = new Error('http ' + r.status); e.status = r.status; throw e; }
    return r.json();
  }

  // ── what the frame may hold: the document's markup, no script, no navigation ──
  function clean(html, lang) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    if (lang && !d.documentElement.getAttribute('lang')) d.documentElement.setAttribute('lang', lang === 'fr' ? 'fr-CA' : 'en');   // grfr — hyphenation, a screen reader
    d.querySelectorAll('script, base, link, meta[http-equiv], iframe, frame, object, embed, form, portal').forEach((n) => n.remove());
    d.querySelectorAll('*').forEach((el) => {
      for (const a of Array.from(el.attributes)) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value)) el.removeAttribute(a.name);
      }
    });
    return '<!doctype html>' + d.documentElement.outerHTML;
  }

  // the dates in the page's language: French in fr-CA; English in the phone's own form (an English card on a French
  // phone in en-CA, never English words in a French date)
  const locOf = () => (lang === 'fr' ? 'fr-CA' : (FR ? 'en-CA' : undefined));
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(locOf(), { weekday: 'long', day: 'numeric', month: 'long' }); } catch (_) { return String(iso || '').slice(0, 10); }
  }
  // A link that stops opening within a day and a half says its time (2026-10-22 qrshare — the sheet offers 1 h ·
  // 2 h · 12 h): "until 3:42 PM", "until Friday 2:15 AM"; a longer one its date, as before.
  function fmtUntil(iso) {
    const at = new Date(iso); if (isNaN(at)) return null;
    if (at.getTime() - Date.now() > 36 * 3600000) return { k: 'until', d: fmtDate(iso) };
    const loc = locOf();
    let tm = ''; try { tm = at.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' }); } catch (_) {}
    let wd = ''; try { if (at.toDateString() !== new Date().toDateString()) wd = at.toLocaleDateString(loc, { weekday: 'long' }) + ' '; } catch (_) {}
    return { k: 'untilT', d: wd + tm };
  }
  const fileOf = (obj) => String(obj.fileName || 'Anota').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Anota';

  // ── the document on screen ──
  // grfr — `docs`: the card in each language it carries ({ lang, title, fileName, html, pdf }), the clinic's first.
  let _frameWired = false, _expires = null;
  function present(obj, expires) {
    _expires = expires;
    const docs = [{ lang: obj.lang, title: obj.title, fileName: obj.fileName, html: obj.html, pdf: obj.pdf }].concat(obj.alt || []);
    const multi = docs.length > 1 && docs.every((d) => d.lang === 'fr' || d.lang === 'en');
    let first = docs[0];
    if (multi && obj.open === 'phone') first = docs.find((d) => d.lang === (FR ? 'fr' : 'en')) || first;
    const sw = langSwitch(multi ? docs : null, (d) => paint(d));
    paint(first);
    state('shown'); show('hv-shown');

    function paint(d) {
      if (multi) setLang(d.lang);   // a card in two languages: this page speaks the one on screen
      $('hv-what').textContent = t('what');
      // The name large; what follows its first " · " (the age) in the softer ink, kept on one line.
      const ttl = String(d.title || t('doc')), ti = $('hv-title'), cut = ttl.indexOf(' · ');
      ti.textContent = '';
      if (cut > 0) {
        const a = document.createElement('span'); a.className = 'hv-tt'; a.textContent = ttl.slice(0, cut);
        const b = document.createElement('span'); b.className = 'hv-tt-sub'; b.textContent = ttl.slice(cut + 1);
        ti.append(a, ' ', b);
      } else ti.textContent = ttl;
      const u = _expires ? fmtUntil(_expires) : null;
      $('hv-until').textContent = u ? t(u.k, { d: u.d }) : '';
      $('hv-foot').textContent = t('foot'); $('hv-foot').classList.remove('is-warn');
      document.title = (d.title || t('doc')) + ' · Anota';
      const frame = $('hv-doc'); frame.title = d.title || t('doc');
      wireFrame(frame);
      frame.srcdoc = clean(d.html, d.lang);   // a swap keeps the frame's height until the new card has laid out
      actions(d, frame);
      if (sw) sw.paint(d.lang);
    }
  }
  function wireFrame(frame) {
    if (_frameWired) return; _frameWired = true;
    const fit = () => {
      try {
        const de = frame.contentDocument && frame.contentDocument.documentElement; if (!de) return;
        const h = Math.max(de.scrollHeight, (frame.contentDocument.body && frame.contentDocument.body.scrollHeight) || 0);
        if (h > 0) frame.style.height = Math.ceil(h) + 'px';
      } catch (_) {}
    };
    frame.addEventListener('load', () => { fit(); setTimeout(fit, 120); setTimeout(fit, 600); });
    addEventListener('resize', () => { frame.style.height = ''; requestAnimationFrame(fit); });
  }
  // the actions for the card on screen: its own PDF (saved / shared as those bytes), else the print dialog
  function actions(d, frame) {
    let pdf = null;
    if (d.pdf) { try { pdf = unb64(d.pdf); if (!(pdf.length > 5 && pdf[0] === 0x25 && pdf[1] === 0x50 && pdf[2] === 0x44 && pdf[3] === 0x46)) pdf = null; } catch (_) { pdf = null; } }   // '%PDF'
    const name = fileOf(d) + '.pdf';
    const save = $('hv-save'), share = $('hv-share'), print = $('hv-print');
    save.hidden = share.hidden = print.hidden = true;
    save.onclick = share.onclick = print.onclick = null;
    $('hv-keep').textContent = t(pdf ? 'keepPdf' : 'keepPrint');
    if (pdf) {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      save.hidden = false; label(save, 'save', t('save'));
      save.onclick = () => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 60000);
        label(save, 'check', t('saved')); setTimeout(() => { if (save.onclick === mine) label(save, 'save', t('save')); }, 1800);
      };
      const mine = save.onclick;
      let file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (_) {}
      const canFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      if (canFile) {
        share.hidden = false; label(share, 'share', t('share'));
        share.onclick = async () => { try { await navigator.share({ files: [file], title: d.title || t('doc') }); } catch (e) { if (!e || e.name !== 'AbortError') alertSoft(t('cantShare')); } };
      }
    } else {
      print.hidden = false; label(print, 'print', t('print'));
      print.onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { try { window.print(); } catch (__) {} } };
    }
  }
  // grfr — the EN · FR switch at the top (the resource page's own: .rp-lang), for a card in two languages.
  // Returns { paint(lang) } or null (one language: no switch).
  function langSwitch(docs, go) {
    const top = document.querySelector('.hv-top');
    let seg = document.getElementById('hv-lang');
    if (!docs) { if (seg) seg.hidden = true; if (top) top.classList.remove('has-lang'); return null; }
    if (!seg) {
      seg = document.createElement('div'); seg.id = 'hv-lang'; seg.className = 'rp-lang hv-lang'; seg.setAttribute('role', 'group');
      if (top) top.appendChild(seg);
    }
    seg.hidden = false; if (top) top.classList.add('has-lang');
    seg.innerHTML = '';
    const by = {}; for (const d of docs) by[d.lang] = d;
    const btns = [];
    for (const L of ['en', 'fr']) {
      if (!by[L]) continue;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rp-lang-b'; b.lang = L; b.textContent = L.toUpperCase();
      b.dataset.lang = L;
      b.addEventListener('click', () => { if (b.getAttribute('aria-pressed') === 'true') return; go(by[L]); });
      seg.appendChild(b); btns.push(b);
    }
    return {
      paint(cur) {
        seg.setAttribute('aria-label', t('lang'));
        for (const b of btns) { const on = b.dataset.lang === cur; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); }
      },
    };
  }
  function alertSoft(text) { const f = $('hv-foot'); f.textContent = text; f.classList.add('is-warn'); setTimeout(() => { f.textContent = t('foot'); f.classList.remove('is-warn'); }, 4000); }

  // ── the flow ──
  let _askedAgain = false;
  async function run(code) {
    const cfg = window.ANOTA_VIEWER;
    const link = parseLink(location.hash);
    if (!link) { state('broken'); return msg('🔗', t('brokenH'), t('brokenP')); }
    if (!cfg || !/^https?:\/\//i.test(String(cfg.supabaseUrl || '')) || !cfg.anonKey) { state('setup'); return msg('🛠', t('setupH'), t('setupP')); }
    if (!(window.crypto && crypto.subtle)) { state('damaged'); return msg('⚠️', t('damagedH'), t('damagedP')); }
    if (code == null) { msg('⏳', t('opening'), t('openingP')); state('opening'); }
    let r;
    try { r = await openHandout(cfg, link.id, code); }
    catch (e) { state('offline'); return msg('📶', t('offlineH'), t('offlineP'), () => run(code)); }
    if (!r || r.ok !== true) {
      const why = r && r.reason;
      if (why === 'code' || why === 'wrong') return askCode(why === 'wrong' ? r.left : null);
      if (why === 'locked') { state('locked'); return msg('🔒', t('lockedH'), t('lockedP')); }
      // 2026-10-24 (qroff) — the clinic draws the QR as soon as the card is sealed and sends it a moment later (or,
      // with no internet, once its computer is back online): a first "not open" is asked again once, quietly; then
      // the one answer for unknown / expired / closed / not yet sent (no oracle), with Try again.
      if (!_askedAgain) { _askedAgain = true; setTimeout(() => run(code), 3500); return; }
      state('gone'); return msg('⌛', t('goneH'), t('goneP'), () => run(code));
    }
    let obj;
    try { obj = await unseal(r.payload, link.key); }
    catch (_) { state('damaged'); return msg('⚠️', t('damagedH'), t('damagedP')); }
    present(obj, r.expires_at);
  }
  function askCode(left) {
    state('code');
    $('hv-code-h').textContent = t('codeH'); $('hv-code-p').textContent = t('codeP');
    const go = $('hv-code-go'), inp = $('hv-code-in'), err = $('hv-code-err');
    go.textContent = t('codeGo'); inp.setAttribute('aria-label', t('codeH'));
    if (left != null) { err.hidden = false; err.textContent = left === 1 ? t('wrong1') : t('wrongN', { n: left }); } else err.hidden = true;
    inp.value = ''; show('hv-code');
    const submit = () => { if (go.disabled) return; const v = inp.value.replace(/\D/g, ''); if (v.length !== 4) { inp.focus(); return; } go.disabled = true; run(v).finally(() => { go.disabled = false; }); };
    go.onclick = submit;
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
    inp.oninput = () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); if (inp.value.length === 4) submit(); };
    setTimeout(() => { try { inp.focus(); } catch (_) {} }, 50);
  }

  // 2026-10-22 (resqr) — a link ending #R1.<codes> is the Patient and Family Resource Page: no server, no key —
  // resources-page.js draws it from the catalogue this site carries. Every other link is a sealed handout.
  function route() {
    const rp = window.AnotaResourcePage, box = document.getElementById('rp');
    if (rp && box && rp.matches(location.hash)) {
      $('hv').hidden = true; box.hidden = false; document.body.classList.add('is-rp');
      rp.render(location.hash, box);
      return;
    }
    if (box) { box.hidden = true; $('hv').hidden = false; document.body.classList.remove('is-rp'); }
    $('hv-what').textContent = t('what');
    run();
  }
  addEventListener('hashchange', route);
  route();
  window.__anotaViewer = { parseLink, unseal, clean };   // the suites read these; nothing else does
})();
