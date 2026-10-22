// viewer/resources-page.js — the Patient and Family Resource Page (2026-10-22 `resqr`).
//
// The page a family's phone opens from the ▦ QR the doctor shows on the Extra tab's 📚 Resources (or on his
// watch). The link is `<this page>#R1.<code>.<code>…`; the codes name entries of resource-catalogue.js (a copy
// of utility/shared/resource-catalogue.js — scripts/build-resource-catalogue.mjs keeps it identical). Nothing is
// fetched but this site's own files: each card's preview (previews/<code>.<lang>.webp) and, on a tap, the hosted
// PDF (docs/<code>.<lang>.pdf) — or, for a resource that IS a web page, that page. No server, no patient, no
// expiry; nothing is kept on the phone. English or French as the doctor's link says (else the phone's language), switchable at the top.
(function () {
  'use strict';
  const C = window.AnotaResourceCatalogue;

  const W = {
    en: {
      title: 'Patient and Family Resource Page',
      lede1: 'One document chosen for you by your care team.',
      ledeN: '{n} documents chosen for you by your care team.',
      tap: 'Tap a card to open it.',
      pdf: 'PDF', page: 'Web page', frOnly: 'In French',
      keep: 'Keep this page', keepP: 'Bookmark it or send it to yourself — the link does not expire.',
      copied: 'Link copied', share: 'Share',
      foot: 'Nothing about your child is on this page, and nothing is kept on your phone.',
      lang: 'Language', open: 'Open', emptyH: 'This link is incomplete',
      emptyP: 'Scan the code again, or ask the clinic to show it again.',
      yours: 'From your care team',
    },
    fr: {
      title: 'Page de ressources pour patients et familles',
      lede1: 'Un document choisi pour vous par votre équipe soignante.',
      ledeN: '{n} documents choisis pour vous par votre équipe soignante.',
      tap: 'Touchez une carte pour l’ouvrir.',
      pdf: 'PDF', page: 'Page Web', frOnly: 'En français',
      keep: 'Garder cette page', keepP: 'Ajoutez-la à vos favoris ou envoyez-la-vous — le lien n’expire pas.',
      copied: 'Lien copié', share: 'Partager',
      foot: 'Rien sur votre enfant ne figure sur cette page, et rien n’est gardé sur votre téléphone.',
      lang: 'Langue', open: 'Ouvrir', emptyH: 'Ce lien est incomplet',
      emptyP: 'Balayez le code de nouveau, ou demandez à la clinique de le montrer encore.',
      yours: 'De votre équipe soignante',
    },
  };
  // The page's language: the one the doctor's link names (`#R1.fr.…` — Settings › Patient Handouts; French unless he
  // chose otherwise), else the phone's. `?lang=` (a test address) outranks both. The family switches at the top; a
  // new link (a hash change) opens in ITS language again. Nothing is kept on the phone.
  const phoneFr = /^fr\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '');
  let lang = phoneFr ? 'fr' : 'en';
  let forced = '';
  try { const q = new URLSearchParams(location.search).get('lang'); if (q) forced = lang = /^fr/i.test(q) ? 'fr' : 'en'; } catch (_) {}
  let langHash = null;   // the link whose language `lang` was last set from
  const t = (k, v) => String((W[lang] || W.en)[k] || W.en[k] || k).replace(/\{(\w+)\}/g, (m, n) => (v && v[n] != null ? v[n] : m));

  const ICON = {
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8M9.5 8H16v6.5"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14.5V4M8.2 7.6 12 3.8l3.8 3.8"/><path d="M8 10.5H6.6A1.6 1.6 0 0 0 5 12.1v6.8a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6v-6.8a1.6 1.6 0 0 0-1.6-1.6H16"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3.5H7.2a1.7 1.7 0 0 0-1.7 1.7v13.6a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8z"/><path d="M14 3.5V8h4.5M8.8 12.2h6.4M8.8 15.6h4.4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/></svg>',
  };

  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const matches = (hash) => /^#R1\./i.test(String(hash || '').trim());

  function cardFor(r) {
    const known = !!(r.c && C.byCode[r.c]);
    const w = known ? C.inLang(r, lang) : { title: r.title || r.url, url: r.url, onlyFr: false };
    const hosted = known ? C.hostedPath(r, lang) : '';
    const href = hosted || w.url;
    const isPdf = !!hosted || r.kind === 'pdf';
    const cat = (C.CATS[r.cat] || C.CATS.Other);
    const src = r.src && C.SOURCES[r.src] ? (lang === 'fr' ? C.SOURCES[r.src].name_fr : C.SOURCES[r.src].name) : (function () { try { return new URL(w.url).hostname.replace(/^www\./, ''); } catch (_) { return ''; } })();

    const a = el('a', 'rp-card'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.style.setProperty('--cat', cat.color);
    a.setAttribute('aria-label', w.title + (src ? ' — ' + src : '') + ' · ' + (isPdf ? t('pdf') : t('page')));
    if (r.c) a.dataset.code = r.c;

    const prev = el('div', 'rp-prev');
    const fallback = () => {
      prev.classList.add('is-tile'); prev.innerHTML = '';
      const ic = el('span', 'rp-tile-ic'); ic.innerHTML = isPdf ? ICON.doc : ICON.globe; prev.appendChild(ic);
      const nm = el('span', 'rp-tile-src', src); prev.appendChild(nm);
    };
    if (known) {
      const img = new Image(); img.alt = ''; img.decoding = 'async'; img.loading = eager-- > 0 ? 'eager' : 'lazy';
      img.width = 720; img.height = 450;
      img.onerror = fallback; img.src = C.previewPath(r, lang);
      prev.appendChild(img);
    } else fallback();
    a.appendChild(prev);

    // the words under the picture: the title, then one quiet line — where it is from · what it is (· in French)
    const body = el('div', 'rp-body');
    const text = el('div', 'rp-text');
    text.appendChild(el('div', 'rp-t', w.title));
    const meta = el('div', 'rp-meta');
    const bits = [src, isPdf ? t('pdf') : t('page')].filter(Boolean);
    bits.forEach((b, i) => { if (i) meta.appendChild(el('span', 'rp-dot', '·')); meta.appendChild(el('span', i ? 'rp-kind' : 'rp-src', b)); });
    if (w.onlyFr) { meta.appendChild(el('span', 'rp-dot', '·')); meta.appendChild(el('span', 'rp-fr', t('frOnly'))); }
    text.appendChild(meta);
    body.appendChild(text);
    const go = el('span', 'rp-go'); go.innerHTML = isPdf ? ICON.open : ICON.out; body.appendChild(go);
    a.appendChild(body);
    return a;
  }

  let eager = 0;   // the first cards' previews load at once; the rest as they scroll near
  function render(hash, root) {
    eager = 4;
    if (hash !== langHash) {
      langHash = hash;
      const L = !forced && C && C.langOf ? C.langOf(hash) : '';
      if (L) lang = L;
    }
    const items = (C && C.parseFragment(hash)) || [];
    root.innerHTML = '';
    document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en';
    document.title = t('title');

    const hero = el('header', 'rp-hero');
    const top = el('div', 'rp-top');
    top.appendChild(el('span', 'rp-brand', t('yours')));
    const seg = el('div', 'rp-lang'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', t('lang'));
    for (const L of ['en', 'fr']) {
      const b = el('button', 'rp-lang-b' + (L === lang ? ' is-on' : ''), L.toUpperCase()); b.type = 'button';
      b.setAttribute('aria-pressed', String(L === lang)); b.lang = L;
      b.addEventListener('click', () => { if (lang === L) return; lang = L; render(location.hash, root); });
      seg.appendChild(b);
    }
    top.appendChild(seg);
    hero.appendChild(top);
    hero.appendChild(el('h1', 'rp-h', t('title')));
    if (items.length) hero.appendChild(el('p', 'rp-lede', (items.length === 1 ? t('lede1') : t('ledeN', { n: items.length })) + ' ' + t('tap')));
    root.appendChild(hero);

    if (!items.length) {
      const box = el('section', 'rp-empty');
      box.appendChild(el('h2', 'rp-empty-h', t('emptyH')));
      box.appendChild(el('p', 'rp-empty-p', t('emptyP')));
      root.appendChild(box);
      return;
    }

    // A long list is grouped by family (the catalogue's order); a short one keeps the doctor's order.
    const cats = new Set(items.map((r) => r.cat || 'Other'));
    const grouped = items.length >= 5 && cats.size >= 2;
    const list = el('div', 'rp-list');
    if (!grouped) { for (const r of items) list.appendChild(cardFor(r)); root.appendChild(list); }
    else {
      for (const k of C.CAT_ORDER) {
        const rs = items.filter((r) => (r.cat || 'Other') === k); if (!rs.length) continue;
        const sec = el('section', 'rp-sec');
        const cat = C.CATS[k] || C.CATS.Other;
        const h = el('h2', 'rp-sec-h', lang === 'fr' ? cat.fam_fr : cat.fam); h.style.setProperty('--cat', cat.color);
        sec.appendChild(h);
        const l2 = el('div', 'rp-list'); for (const r of rs) l2.appendChild(cardFor(r)); sec.appendChild(l2);
        root.appendChild(sec);
      }
    }

    const foot = el('footer', 'rp-foot');
    const keep = el('button', 'rp-keep'); keep.type = 'button';
    keep.innerHTML = ICON.share; keep.appendChild(el('span', '', t('keep')));
    keep.addEventListener('click', async () => {
      const url = location.href;
      try { if (navigator.share) { await navigator.share({ title: t('title'), url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(url); const s = keep.querySelector('span'); s.textContent = '✓ ' + t('copied'); setTimeout(() => { s.textContent = t('keep'); }, 1800); } catch (_) {}
    });
    foot.appendChild(keep);
    foot.appendChild(el('p', 'rp-keep-p', t('keepP')));
    foot.appendChild(el('p', 'rp-priv', t('foot')));
    root.appendChild(foot);
  }

  window.AnotaResourcePage = { matches, render, _words: W, setLang: (L) => { lang = L === 'fr' ? 'fr' : 'en'; } };
})();
