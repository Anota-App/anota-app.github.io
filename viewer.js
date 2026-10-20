// viewer/viewer.js — the family's page for a ▦ QR for parent (2026-10-16 sharecap Round 2).
//
// The link is <this page>#h1.<id: 16 bytes, base64url>.<key: 32 bytes, base64url>. The id goes to the clinic's
// database (public.open_handout — Database/migrations/0025_handouts.sql) with the publishable key of
// config.js and nothing else; the answer is the ciphertext, which this page decrypts here with the key from
// the fragment (AES-GCM-256; 'AH1' + a 12-byte IV in front, 'AH1' also the additional data — the format of
// utility/shared/handouts.js, of which this is the reading half). The handout (HTML + SVG) is shown in a
// sandboxed frame that runs no script; its PDF, when the doctor's computer made one, is saved or shared as
// those very bytes. Nothing is stored on the phone; nothing but the id and a code leaves it.
(function () {
  'use strict';

  // ── words (the phone's language: French or English) ──
  const FR = /^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '');
  const W = {
    en: {
      what: 'For the family',
      opening: 'Opening…', openingP: 'The document is decrypted on this phone.',
      codeH: 'Enter the code', codeP: 'The clinic said a 4-digit code aloud.', codeGo: 'Open',
      wrong1: 'Wrong code — 1 try left.', wrongN: 'Wrong code — {n} tries left.',
      lockedH: 'This link is locked', lockedP: 'Too many wrong codes. Ask the clinic for a new link.',
      goneH: 'This link no longer opens', goneP: 'It has expired, or the clinic revoked it. Ask the clinic for a new one.',
      brokenH: 'This link is incomplete', brokenP: 'Scan the code again, or ask the clinic to send the link again.',
      damagedH: 'This document cannot be opened', damagedP: 'The link and the document do not match. Ask the clinic for a new link.',
      offlineH: 'No connection', offlineP: 'The page could not reach the clinic’s server. Check the connection, then try again.',
      setupH: 'This page is not set up yet', setupP: 'The clinic has not finished installing it (config.js).',
      retry: 'Try again',
      until: 'Opens on this link until {d}',
      save: 'Save PDF', share: 'Share', print: 'Print or save as PDF',
      saved: 'Saved', cantShare: 'This phone cannot share the file — use Save PDF.',
      foot: 'Encrypted for you by the clinic. This page keeps nothing on your phone.',
      doc: 'The document',
    },
    fr: {
      what: 'Pour la famille',
      opening: 'Ouverture…', openingP: 'Le document est déchiffré sur ce téléphone.',
      codeH: 'Entrez le code', codeP: 'La clinique vous a dit un code à 4 chiffres.', codeGo: 'Ouvrir',
      wrong1: 'Code erroné — encore 1 essai.', wrongN: 'Code erroné — encore {n} essais.',
      lockedH: 'Ce lien est verrouillé', lockedP: 'Trop de codes erronés. Demandez un nouveau lien à la clinique.',
      goneH: 'Ce lien ne s’ouvre plus', goneP: 'Il a expiré, ou la clinique l’a révoqué. Demandez-en un nouveau à la clinique.',
      brokenH: 'Ce lien est incomplet', brokenP: 'Balayez le code de nouveau, ou demandez à la clinique de renvoyer le lien.',
      damagedH: 'Ce document ne peut pas s’ouvrir', damagedP: 'Le lien et le document ne correspondent pas. Demandez un nouveau lien à la clinique.',
      offlineH: 'Aucune connexion', offlineP: 'La page n’a pas pu joindre le serveur de la clinique. Vérifiez la connexion, puis réessayez.',
      setupH: 'Cette page n’est pas encore prête', setupP: 'La clinique n’a pas fini de l’installer (config.js).',
      retry: 'Réessayer',
      until: 'Ce lien s’ouvre jusqu’au {d}',
      save: 'Enregistrer le PDF', share: 'Partager', print: 'Imprimer ou enregistrer en PDF',
      saved: 'Enregistré', cantShare: 'Ce téléphone ne peut pas partager le fichier — utilisez Enregistrer le PDF.',
      foot: 'Chiffré pour vous par la clinique. Cette page ne garde rien sur votre téléphone.',
      doc: 'Le document',
    },
  };
  const L = FR ? W.fr : W.en;
  const t = (k, v) => String(L[k] || W.en[k] || k).replace(/\{(\w+)\}/g, (m, n) => (v && v[n] != null ? v[n] : m));
  document.documentElement.lang = FR ? 'fr-CA' : 'en';

  const $ = (id) => document.getElementById(id);
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
  function clean(html) {
    const d = new DOMParser().parseFromString(html, 'text/html');
    d.querySelectorAll('script, base, link, meta[http-equiv], iframe, frame, object, embed, form, portal').forEach((n) => n.remove());
    d.querySelectorAll('*').forEach((el) => {
      for (const a of Array.from(el.attributes)) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*(javascript|vbscript|data:text\/html)/i.test(a.value)) el.removeAttribute(a.name);
      }
    });
    return '<!doctype html>' + d.documentElement.outerHTML;
  }

  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(FR ? 'fr-CA' : undefined, { weekday: 'long', day: 'numeric', month: 'long' }); } catch (_) { return String(iso || '').slice(0, 10); }
  }
  const fileOf = (obj) => String(obj.fileName || 'Anota').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Anota';

  // ── the document on screen ──
  function present(obj, expires) {
    $('hv-title').textContent = obj.title || t('doc');
    $('hv-until').textContent = expires ? t('until', { d: fmtDate(expires) }) : '';
    $('hv-foot').textContent = t('foot');
    document.title = (obj.title || t('doc')) + ' · Anota';
    const frame = $('hv-doc'); frame.title = obj.title || t('doc');
    const fit = () => {
      try {
        const de = frame.contentDocument && frame.contentDocument.documentElement; if (!de) return;
        const h = Math.max(de.scrollHeight, (frame.contentDocument.body && frame.contentDocument.body.scrollHeight) || 0);
        if (h > 0) frame.style.height = Math.ceil(h) + 'px';
      } catch (_) {}
    };
    frame.addEventListener('load', () => { fit(); setTimeout(fit, 120); setTimeout(fit, 600); }, { once: true });
    addEventListener('resize', () => { frame.style.height = ''; requestAnimationFrame(fit); });
    frame.srcdoc = clean(obj.html);

    let pdf = null;
    if (obj.pdf) { try { pdf = unb64(obj.pdf); if (!(pdf.length > 5 && pdf[0] === 0x25 && pdf[1] === 0x50 && pdf[2] === 0x44 && pdf[3] === 0x46)) pdf = null; } catch (_) { pdf = null; } }   // '%PDF'
    const name = fileOf(obj) + '.pdf';
    const save = $('hv-save'), share = $('hv-share'), print = $('hv-print');
    if (pdf) {
      const blob = new Blob([pdf], { type: 'application/pdf' });
      save.hidden = false; save.textContent = t('save');
      save.onclick = () => {
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 60000);
        save.textContent = '✓ ' + t('saved'); setTimeout(() => { save.textContent = t('save'); }, 1800);
      };
      let file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (_) {}
      const canFile = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
      if (canFile) {
        share.hidden = false; share.textContent = t('share');
        share.onclick = async () => { try { await navigator.share({ files: [file], title: obj.title || t('doc') }); } catch (e) { if (!e || e.name !== 'AbortError') alertSoft(t('cantShare')); } };
      }
    } else {
      print.hidden = false; print.textContent = t('print');
      print.onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { try { window.print(); } catch (__) {} } };
    }
    state('shown'); show('hv-shown');
  }
  function alertSoft(text) { const f = $('hv-foot'); f.textContent = text; f.classList.add('is-warn'); setTimeout(() => { f.textContent = t('foot'); f.classList.remove('is-warn'); }, 4000); }

  // ── the flow ──
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
      state('gone'); return msg('⌛', t('goneH'), t('goneP'));
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

  $('hv-what').textContent = t('what');
  addEventListener('hashchange', () => run());
  run();
  window.__anotaViewer = { parseLink, unseal, clean };   // the suites read these; nothing else does
})();
