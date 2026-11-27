/* PastPost: community layer.
   Sign in (email link), profile, add a photo, community pins, reporting, and an admin review queue.
   Loaded after the main map script; uses its globals (map, L, dnav, dpanel, buildNav, openPanel, IC, esc, toast, closeDrawer, openDrawer). */
(function () {
  const SB = 'https://iurancbmhdizoafdhctq.supabase.co';
  const KEY = 'sb_publishable_bdXBpE0UULjIjYDNrHg83g_DsW0WUsb';
  const PUB = SB + '/storage/v1/object/public/uploads/';
  // Sign-in options shown on the login screen. Apple and Facebook turn on once they're set up in Supabase.
  const SSO = { apple: false, google: true, facebook: false };
  const ALOGO = '<svg width="18" height="18" viewBox="0 0 814 1000" aria-hidden="true"><path fill="#000" d="M788 340c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-166 41s-106-57-156-128C44 788 0 668 0 554 0 371 119 274 236 274c62 0 114 41 153 41 37 0 95-43 166-43 27 0 124 2 188 93zM554 159c29-35 50-83 50-131 0-7-1-14-2-19-48 2-104 32-138 72-27 30-52 78-52 127 0 7 1 15 2 17 3 1 8 1 13 1 43 0 97-29 127-67z"/></svg>';
  const FLOGO = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0866FF" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/><path fill="#fff" d="M16.7 15.5l.5-3.5h-3.4V9.7c0-1 .5-1.9 2-1.9h1.5V4.9s-1.4-.2-2.7-.2c-2.8 0-4.5 1.7-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.7 0v-8.4z"/></svg>';
  const SUPPORT_ON = false; // set by build_pages.py when a Stripe link exists
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const APP_CB = 'com.petesamuel.pastpost://auth';
  const backTo = () => NATIVE ? APP_CB : location.origin + location.pathname;
  const C = { sb: null, user: null, prof: null, posts: [], layer: null, mode: 'archive', pending: 0 };
  const ADD = { kind: '', file: null, preview: '', title: '', year: '', approx: false, desc: '', rights: '', place: '', ll: null, method: '' };
  const KINDS = [['p', 'Photo'], ['c', 'Postcard'], ['i', 'Illustration or print'], ['m', 'Map'], ['b', 'Blueprint or plan'], ['d', 'Document']];
  const RIGHTS = [['own_photo', 'I took this photo'], ['family_photo', 'It is from my family’s collection'], ['permission', 'I have the owner’s permission'], ['public_domain', 'It is in the public domain']];
  const ICU = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>';
  const ICP = '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/></svg>';
  const ICS = '<svg viewBox="0 0 24 24"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/></svg>';

  // ---------- styles ----------
  document.head.insertAdjacentHTML('beforeend', `<style>
  .cf{display:grid;gap:12px;padding:8px 20px 20px}
  .cf label{display:grid;gap:5px;font-size:13px;font-weight:600;color:var(--ink)}
  .cf label small{font-weight:400;color:var(--muted)}
  .cf input[type=text],.cf input[type=email],.cf input[type=number],.cf select,.cf textarea{width:100%;box-sizing:border-box;min-height:40px;border:1px solid var(--line);border-radius:12px;padding:9px 12px;font:inherit;font-size:15px;background:var(--paper);color:var(--ink)}
  .cf textarea{min-height:80px;resize:vertical}
  .cf .chk{display:flex;gap:8px;align-items:center;font-weight:400}
  .cf .row{display:flex;gap:8px;flex-wrap:wrap}
  .cf .note{font-size:13px;color:var(--muted);line-height:1.5;margin:0}
  .cf .ok{background:var(--soft);border-radius:12px;padding:12px;font-size:14px;line-height:1.5}
  .cf .err{color:#b3261e;font-size:13px}
  .cdrop{display:grid;place-items:center;gap:6px;border:2px dashed var(--line);border-radius:12px;min-height:150px;cursor:pointer;color:var(--muted);font-size:14px;text-align:center;overflow:hidden;background:var(--soft)}
  .cdrop img{width:100%;max-height:260px;object-fit:contain;background:#000}
  .cpill{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:12px;background:var(--soft);color:var(--muted);margin-left:6px}
  .cpill.approved{background:#e3f4e8;color:#1b6b36}.cpill.rejected,.cpill.removed{background:#fbe4e2;color:#a3261d}
  #cpick{position:fixed;inset:0;z-index:3400;pointer-events:none}
  #cpick .x{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-34px 0 0 -17px}
  #cpick .bar{pointer-events:auto;position:absolute;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:440px;margin:0 auto;background:var(--paper);border-radius:12px;box-shadow:var(--shadow);padding:14px;display:grid;gap:10px;font-size:14px}
  #cpick .bar div{display:flex;gap:8px}
  #cmode{position:fixed;z-index:1000;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom));display:flex;background:var(--paper);border-radius:12px;box-shadow:var(--shadow);padding:3px}
  #cmode button{border:0;background:none;font:600 13px Figtree,sans-serif;color:var(--muted);height:34px;padding:0 14px;border-radius:9px;cursor:pointer}
  #cmode button.on{background:var(--ink);color:var(--paper)}
  .cpopw .leaflet-popup-content-wrapper{background:var(--paper);color:var(--ink)}
  .cpopw .leaflet-popup-content{width:min(calc(100vw - 48px),320px)!important}
  .cpop{padding:12px}
  .cpop .row{gap:10px}
  .cpop img{width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block;background:var(--soft)}
  .cpop b{display:block;margin:8px 0 2px;font-size:14px}.cpop span{font-size:12.5px;color:var(--muted)}
  .cpop .row{display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px}
  .cpop button{border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:0}
  .cadm{padding:10px 20px;border-bottom:1px solid var(--line)}
  .cadm img{width:100%;max-height:240px;object-fit:contain;background:#000;border-radius:12px}
  .cadm b{display:block;margin-top:8px}.cadm p{margin:4px 0;font-size:13px;color:var(--muted)}
  .cadm .row{display:flex;gap:8px;margin-top:8px}
  .cmsg{padding:10px 20px;border-bottom:1px solid var(--line);font-size:13.5px;line-height:1.45}
  .cmsg small{color:var(--muted);display:block}
  #cadd{position:fixed;inset:0;z-index:3500;background:var(--paper);display:flex;flex-direction:column}
  #cadd[hidden]{display:none}
  #cadd header{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;height:calc(54px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 6px 0;border-bottom:1px solid var(--line);font-weight:700;font-size:16px;text-align:center;color:var(--ink)}
  #cadd header button{width:44px;height:44px;border:0;background:none;color:var(--ink);cursor:pointer;display:grid;place-items:center;border-radius:12px}
  #cadd .cb{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;width:100%;max-width:560px;margin:0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
  .cfab{width:40px;height:40px;border-radius:12px;border:0;background:var(--accent,#f2b705);color:#1d1c1a;box-shadow:var(--shadow);display:grid;place-items:center;cursor:pointer;padding:0}
  .cfab:active{transform:scale(.96)}
  .cfab:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
  .acts{flex-wrap:wrap}
  #cprof{position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}
  #cprof[hidden]{display:none}
  #cprof .sh{background:var(--paper);color:var(--ink);width:100%;max-width:520px;max-height:85vh;border-radius:12px 12px 0 0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}
  @media (min-width:700px){#cprof{align-items:center}#cprof .sh{border-radius:12px;max-height:75vh}}
  #cprof header{display:flex;align-items:center;justify-content:center;position:relative;height:50px;border-bottom:1px solid var(--line);font-weight:700}
  #cprof header button{position:absolute;right:8px;top:7px;width:36px;height:36px;border:0;background:none;color:var(--ink);border-radius:12px;cursor:pointer;display:grid;place-items:center}
  #cprof .pb{overflow:auto;padding:16px}
  .ph{display:flex;gap:14px;align-items:center}.ph b{display:block;font-size:18px}.ph small{color:var(--muted);font-size:13px}
  .av.lg{width:64px;height:64px;font-size:26px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700;flex:none}
  .pbio{font-size:14px;line-height:1.5;margin:12px 0 0;white-space:pre-wrap}
  .pst{font-size:13px;color:var(--muted);margin:12px 0}
  .pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
  .pgrid button{border:0;padding:0;aspect-ratio:1;background:var(--soft);cursor:pointer;overflow:hidden}
  .pgrid img{width:100%;height:100%;object-fit:cover;display:block}
  .pfoot{text-align:center;margin:16px 0 0}.pfoot button,.cpop [data-prof]{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer}
  .pfoot button{color:var(--muted);font-size:12.5px;text-decoration:underline}
  .cpop [data-prof]{font-weight:600;text-decoration:none!important;color:var(--ink)!important}
  .row2 .rm{margin-left:auto;flex:none}
  .cdanger{border:0;background:none;padding:0;font:inherit;font-size:14px;color:#b3261e;cursor:pointer;text-decoration:underline}
  .cstats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 20px}
  .cstats div{background:var(--soft);border-radius:12px;padding:10px;display:grid;gap:2px}
  .cstats b{font-size:20px}.cstats span{font-size:12px;color:var(--muted)}.cstats small{font-size:11px;color:#1b6b36}
  .cask{position:fixed;inset:0;z-index:7000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;padding:0 8px calc(8px + env(safe-area-inset-bottom))}
  @media (min-width:700px){.cask{align-items:center}}
  .cask .box{width:100%;max-width:400px;display:grid;gap:8px}
  .cask .box>h3,.cask .box>p,.cask .box>textarea,.cask .opts{background:var(--paper);color:var(--ink)}
  .cask h3{margin:0;padding:16px 16px 0;border-radius:12px 12px 0 0;font-size:15px;text-align:center}
  .cask h3+p,.cask h3+.opts{margin-top:-8px}
  .cask p{margin:0;padding:6px 16px 14px;font-size:13px;color:var(--muted)!important;text-align:center;line-height:1.45}
  .cask textarea{margin-top:-8px;border:0;border-top:1px solid var(--line);padding:12px 16px;font:inherit;font-size:15px;resize:none}
  .cask .opts{margin-top:-8px;border-radius:0 0 12px 12px;overflow:hidden;display:grid}
  .cask .box>.opts:first-child{margin-top:0;border-radius:12px}
  .cask .opts button,.cask .cn{border:0;border-top:1px solid var(--line);background:var(--paper);color:#0a66c2;font:inherit;font-size:16px;height:50px;cursor:pointer}
  .cask .opts button.dg{color:#c62828;font-weight:600}
  .cask .cn{border:0;border-radius:12px;font-weight:600;color:var(--ink)}
  #ccm{position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}
  #ccm[hidden]{display:none}
  #ccm .sh{background:var(--paper);color:var(--ink);width:100%;max-width:520px;max-height:80vh;border-radius:12px 12px 0 0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}
  @media (min-width:700px){#ccm{align-items:center}#ccm .sh{border-radius:12px;max-height:70vh}}
  #ccm header{display:flex;align-items:center;justify-content:center;position:relative;height:50px;border-bottom:1px solid var(--line);font-weight:700}
  #ccm header button{position:absolute;right:8px;top:7px;width:36px;height:36px;border:0;background:none;color:var(--ink);border-radius:12px;cursor:pointer;display:grid;place-items:center}
  #ccm .cl{flex:1;overflow:auto;padding:6px 0}
  .cm{display:flex;gap:10px;padding:10px 16px}
  .cm .av{width:32px;height:32px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-weight:700;font-size:13px;flex:none}
  .cmb{flex:1;min-width:0}.cmb b{font-size:13.5px}.cmb small{color:var(--muted);font-size:12px}
  .cmb p{margin:2px 0 0;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .cma{display:flex;gap:12px;margin-top:4px}.cma button{border:0;background:none;padding:0;color:var(--muted);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
  #ccm footer{border-top:1px solid var(--line);padding:10px 12px}
  .cin{display:flex;gap:8px;align-items:flex-end}
  .cin textarea{flex:1;resize:none;border:1px solid var(--line);border-radius:12px;padding:9px 14px;font:inherit;font-size:15px;max-height:120px;background:var(--paper);color:var(--ink)}
  .cin button{border:0;background:none;color:#0a66c2;font:inherit;font-weight:700;font-size:15px;padding:9px 6px;cursor:pointer}
  .cin button:disabled{color:var(--muted);opacity:.6;cursor:default}
  .cfoot-login{width:100%;height:44px;border:0;border-radius:12px;background:var(--ink);color:var(--paper);font:inherit;font-weight:600;cursor:pointer}
  #cauth{position:fixed;inset:0;z-index:6100;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}
  #cauth[hidden]{display:none}
  #cauth .box{background:#fff;color:#222;width:100%;max-width:420px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);overflow:hidden;font-family:Figtree,system-ui,sans-serif}
  #cauth header{position:relative;display:flex;align-items:center;justify-content:center;height:56px;border-bottom:1px solid #ebebeb;font-weight:700;font-size:16px}
  #cauth header button{position:absolute;left:12px;top:10px;width:36px;height:36px;border:0;background:none;border-radius:12px;cursor:pointer;display:grid;place-items:center}
  #cauth header button:hover{background:#f2f2f2}
  #cauth .in{padding:24px}
  #cauth h2{font-size:22px;margin:0 0 6px;font-weight:700}
  #cauth p{margin:0 0 18px;font-size:14px;color:#6a6a6a;line-height:1.45}
  .sso{display:grid;gap:10px}
  .ahero{width:56px;height:56px;border-radius:12px;background:var(--soft,#f5f4f1);color:var(--ink,#1d1c1a);display:grid;place-items:center;margin:0 0 16px}
  .ahero svg{display:block}
  .gbtn-g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:44px;border:1px solid #747775;border-radius:12px;background:#fff;color:#1f1f1f;font:500 14px Roboto,Arial,sans-serif;cursor:pointer}
  .gbtn-g:hover{background:#f8f9fa;box-shadow:0 1px 2px rgba(60,64,67,.3)}
  .gbtn-g svg{width:20px;height:20px}
  #cauth .or{display:flex;align-items:center;gap:12px;margin:18px 0;color:#6a6a6a;font-size:12px}
  #cauth .or:before,#cauth .or:after{content:"";flex:1;height:1px;background:#ebebeb}
  #cauth input{width:100%;box-sizing:border-box;height:48px;border:1px solid #b0b0b0;border-radius:12px;padding:0 14px;font:inherit;font-size:16px}
  #cauth input:focus{outline:none;border-color:#222;box-shadow:0 0 0 1px #222}
  #cauth .pri{width:100%;height:48px;margin-top:12px;border:0;border-radius:12px;background:#1d1c1a;color:#fff;font:inherit;font-weight:600;font-size:15px;cursor:pointer}
  #cauth .pri:disabled{opacity:.5}
  #cauth .fine{font-size:12px;color:#6a6a6a;margin:16px 0 0;line-height:1.5}
  #cauth .fine a{color:#222}
  #cauth .err{color:#c13515;font-size:13px;margin-top:8px}
  #cauth .lnk{border:0;background:none;padding:0;font:inherit;font-size:14px;font-weight:600;text-decoration:underline;cursor:pointer;color:#222}
  @media (max-width:560px){#cauth{align-items:flex-end;padding:0}#cauth .box{max-width:none;border-radius:12px 12px 0 0;padding-bottom:env(safe-area-inset-bottom)}}
  @media (prefers-reduced-motion:reduce){#cmode button{transition:none}}
  </style>`);


  // ---------- standard confirm / choice sheet (replaces browser confirm and prompt boxes) ----------
  function ask(o) {
    return new Promise(res => {
      const el = document.createElement('div'); el.className = 'cask'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
      const opts = o.options || [{ label: o.ok || 'OK', value: true, danger: o.danger }];
      el.innerHTML = `<div class="box">${o.title ? `<h3>${esc(o.title)}</h3>` : ''}${o.message ? `<p>${esc(o.message)}</p>` : ''}
        ${o.input ? `<textarea rows="2" maxlength="300" placeholder="${esc(o.input.placeholder || '')}">${esc(o.input.value || '')}</textarea>` : ''}
        <div class="opts">${opts.map((x, i) => `<button type="button" data-i="${i}" class="${x.danger ? 'dg' : ''}">${esc(x.label)}</button>`).join('')}</div>
        <button type="button" class="cn">Cancel</button></div>`;
      document.body.appendChild(el);
      const done = v => { el.remove(); document.removeEventListener('keydown', key, true); res(v); };
      const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
      document.addEventListener('keydown', key, true);
      el.addEventListener('click', e => {
        if (e.target === el || e.target.closest('.cn')) return done(null);
        const b = e.target.closest('[data-i]'); if (!b) return;
        const v = opts[+b.dataset.i].value; const ta = el.querySelector('textarea');
        done(o.input ? { value: v, text: ta.value.trim() } : v);
      });
      setTimeout(() => (el.querySelector('textarea') || el.querySelector('[data-i]')).focus(), 30);
    });
  }

  // ---------- supabase ----------
  function loadSB() {
    if (C.sbP) return C.sbP;
    C.sbP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/supabase.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      .then(() => {
        C.sb = supabase.createClient(SB, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
        C.sb.auth.onAuthStateChange((ev, session) => { C.user = session ? session.user : null; if (C.user) loadProfile(); else { C.prof = null; refreshNav(); } });
        return C.sb.auth.getSession().then(({ data }) => { C.user = data.session ? data.session.user : null; if (C.user) return loadProfile(); });
      }).then(() => C.sb);
    return C.sbP;
  }
  async function loadProfile() {
    const { data } = await C.sb.from('profiles').select('*').eq('id', C.user.id).single();
    C.prof = data;
    if (C.prof && C.prof.role === 'admin') { const r = await C.sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending'); C.pending = r.count || 0; }
    refreshNav(); syncDown(); notifyStatus();
    if (location.hash.includes('access_token')) { history.replaceState(null, '', location.pathname + location.search); toast('You’re signed in'); }
  }
  function refreshNav() { if (!dpanel.hidden) return; buildNav(); }
  const BLK = { get() { try { return JSON.parse(localStorage.getItem('cblocked') || '[]'); } catch (e) { return []; } }, has(id) { return this.get().includes(id); },
    add(id) { const a = this.get(); if (!a.includes(id)) a.push(id); try { localStorage.setItem('cblocked', JSON.stringify(a)); } catch (e) {} if (typeof touchPrefs === 'function') touchPrefs(); } };
  function hasSession() { try { return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch (e) { return false; } }
  // public reads without the SDK
  const rest = (path) => fetch(SB + '/rest/v1/' + path, { headers: { apikey: KEY } }).then(r => r.ok ? r.json() : []);

  // ---------- menu ----------
  const _buildNav = buildNav;
  buildNav = function () {
    _buildNav();
    const who = C.prof ? (C.prof.display_name || '@' + C.prof.username) : '';
    const top = `<button class="ditem" data-p="account">${ICU}${C.user ? esc(who) : 'Log in or sign up'}</button>
      ${C.prof && C.prof.role === 'admin' ? `<button class="ditem" data-p="admin">${ICS}Review and inbox<span class="n">${C.pending || ''}</span></button><a class="ditem" href="admin/">${ICS}Admin dashboard</a>` : ''}
      <div class="dsep"></div>`;
    dnav.insertAdjacentHTML('afterbegin', top);
    const IOS = NATIVE && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios';
    if (SUPPORT_ON && !IOS) dnav.insertAdjacentHTML('beforeend', `<div class="dsep"></div><a class="ditem" href="support/">${IC.heart || ''}Support PastPost</a>`);
  };
  const _openPanel = openPanel;
  openPanel = function (p) {
    if (p === 'addphoto') { openAdd(); return; }
    if (p === 'account' && !C.user && !hasSession()) { openAuth(''); return; }
    if (p === 'account' || p === 'admin') {
      const body = dpanel.querySelector('.dbody'), title = dpanel.querySelector('.back span');
      dnav.hidden = true; dpanel.hidden = false;
      body.innerHTML = '<p class="empty">Loading…</p>';
      loadSB().then(() => { if (p === 'account') accountPanel(body, title); else adminPanel(body, title); })
        .catch(() => { body.innerHTML = '<p class="empty">Couldn’t connect. Check your connection and try again.</p>'; });
      return;
    }
    _openPanel(p);
  };

  // ---------- account ----------
  const GLOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const XICO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#222" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  let AUTH = null;
  // What the login screen says depends on why it opened, like other apps do
  const AUTH_CTX = {
    post: { icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.75" r="3.25"/></svg>',
      title: 'Share your photos of the city', text: 'Log in to add your own photos to the map and pin them to the corner where they were taken.' },
    comment: { icon: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4.5 20l1-4.2A7.5 7.5 0 1 1 20 12.5z"/></svg>',
      title: 'Join the conversation', text: 'Log in to comment on photos and share what you know about a place.' },
    '': { icon: '', title: 'Welcome to PastPost', text: 'Log in to share your own photos of the city and see them on the map.' }
  };
  AUTH_CTX[''].icon = "<svg viewBox=\"0 0 1983 1535\" width=\"30\" height=\"23.2\" aria-hidden=\"true\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M697.8 1534.0C674.5 1529.9 660.0 1514.4 660.0 1493.6C660.0 1484.6 661.3 1480.1 669.5 1460.5C673.2 1451.7 677.4 1441.1 679.0 1437.0C680.6 1432.9 686.9 1417.1 693.0 1402.0C699.1 1386.9 707.7 1365.5 712.1 1354.5C716.5 1343.5 720.5 1333.6 721.0 1332.5C723.1 1327.9 730.0 1311.0 732.5 1304.5C735.2 1297.4 741.3 1282.4 751.3 1258.5C754.3 1251.3 759.5 1238.8 762.8 1230.5C766.1 1222.2 771.6 1208.8 775.0 1200.5C778.4 1192.2 783.6 1179.4 786.6 1172.0C789.7 1164.6 794.4 1153.1 797.2 1146.5C800.0 1139.9 804.5 1128.9 807.2 1122.0C810.0 1115.1 815.0 1102.8 818.5 1094.5C822.0 1086.2 827.5 1073.0 830.8 1065.0C834.1 1057.0 839.9 1043.3 843.5 1034.5C847.2 1025.7 852.6 1012.7 855.5 1005.5C858.3 998.4 864.2 984.2 868.5 974.0C887.5 928.8 898.1 903.5 903.5 890.5C906.6 882.8 910.9 872.7 913.1 868.0C919.0 854.9 926.1 837.7 926.3 836.0C926.6 833.8 914.7 833.6 878.5 834.9C827.4 836.8 793.9 838.0 758.0 839.0C739.0 839.5 710.7 840.4 695.0 841.0C679.3 841.5 642.4 842.5 613.0 843.1C583.6 843.7 558.7 844.7 557.8 845.2C555.4 846.4 555.5 850.9 557.9 858.5C559.0 861.8 568.0 888.6 578.0 918.0C619.7 1040.7 618.8 1037.5 616.9 1047.6C615.6 1054.6 611.5 1060.0 605.0 1063.3C599.9 1065.9 598.8 1066.1 590.5 1065.7C580.6 1065.3 579.9 1065.0 541.0 1046.2C531.9 1041.9 522.0 1037.2 519.0 1035.8C503.9 1028.8 498.0 1026.0 480.0 1017.3C469.3 1012.0 457.4 1006.3 453.5 1004.5C449.6 1002.7 442.4 999.3 437.5 997.0C432.6 994.7 425.4 991.3 421.5 989.5C410.7 984.5 395.6 977.2 370.6 965.1C358.1 959.0 347.6 954.0 347.5 954.0C347.3 954.0 342.1 951.6 335.9 948.6C329.6 945.7 320.7 941.4 316.0 939.2C311.3 937.0 293.8 928.6 277.1 920.6C260.4 912.6 246.6 906.0 246.4 906.0C246.3 906.0 237.2 901.7 226.3 896.4C204.7 885.9 186.6 877.2 172.5 870.5C167.6 868.1 155.0 862.1 144.7 857.1C134.3 852.1 125.7 848.0 125.5 848.0C124.9 848.0 107.8 839.9 84.8 828.6C72.8 822.8 62.8 818.0 62.6 818.0C62.4 818.0 50.4 812.2 35.9 805.1C2.9 789.0 0.0 786.3 0.0 772.2C0.0 763.9 3.0 757.0 9.1 751.5C11.7 749.2 23.4 742.9 40.7 734.4C55.8 727.0 68.4 721.0 68.5 721.0C68.7 721.0 84.9 713.1 104.7 703.4C124.4 693.7 143.0 684.7 146.0 683.3C149.0 681.9 167.9 672.8 188.0 663.0C208.1 653.3 229.0 643.1 234.5 640.5C249.8 633.2 276.6 620.2 296.0 610.8C313.2 602.4 328.2 595.2 351.0 584.3C357.3 581.3 372.2 574.0 384.0 568.1C395.8 562.3 409.8 555.5 415.0 553.1C428.0 547.1 443.9 539.5 473.5 525.0C487.2 518.3 503.5 510.4 509.5 507.5C515.5 504.6 527.5 498.9 536.0 494.8C544.5 490.7 554.4 486.0 558.0 484.4C561.6 482.8 573.0 477.2 583.5 471.9C605.8 460.7 613.1 458.0 621.5 458.0C629.0 458.0 636.9 461.7 641.3 467.2C645.6 472.6 646.1 481.1 642.7 490.5C640.1 497.8 633.1 513.7 625.3 530.0C622.8 535.2 618.6 544.5 616.0 550.5C613.4 556.5 608.4 567.6 605.0 575.0C601.6 582.4 595.1 596.8 590.6 607.0C586.0 617.2 580.0 630.8 577.0 637.3C573.4 645.4 572.1 649.5 572.8 650.2C573.5 650.9 642.0 650.9 788.4 650.3C976.9 649.6 1003.1 649.3 1004.3 648.0C1005.1 647.2 1010.6 635.9 1016.5 623.0C1026.0 602.2 1034.3 585.0 1052.3 548.1C1062.8 526.9 1088.0 479.7 1104.5 450.5C1173.5 328.8 1236.2 242.2 1303.9 175.1C1352.1 127.3 1393.9 94.6 1442.2 67.0C1495.4 36.4 1541.8 19.0 1600.5 7.6C1675.3 -6.9 1762.9 -0.2 1826.7 25.0C1856.6 36.8 1888.7 56.9 1909.4 76.9C1950.8 116.8 1975.1 166.7 1981.6 225.5C1984.3 250.1 1982.6 286.5 1977.6 309.0C1969.5 345.9 1959.3 374.4 1943.3 405.5C1939.5 412.7 1939.0 413.8 1932.5 425.5C1901.5 481.2 1845.8 542.1 1781.5 590.7C1709.4 645.1 1616.9 694.6 1524.5 728.3C1480.3 744.5 1475.2 746.1 1430.0 758.3C1396.9 767.3 1379.5 771.4 1346.5 777.9C1287.2 789.7 1256.3 794.1 1182.0 801.1C1169.4 802.3 1158.9 803.8 1158.2 804.4C1157.5 805.1 1156.1 807.8 1155.1 810.5C1154.1 813.3 1150.1 823.4 1146.3 833.0C1142.5 842.6 1137.4 855.5 1135.1 861.5C1132.7 867.5 1128.9 877.2 1126.5 883.0C1124.1 888.8 1121.0 896.6 1119.5 900.5C1113.0 917.4 1109.7 926.0 1107.0 932.5C1105.4 936.4 1103.0 942.4 1101.7 946.0C1098.8 953.6 1092.3 970.2 1083.5 992.5C1071.8 1022.2 1065.8 1037.5 1063.8 1043.0C1062.7 1046.0 1061.0 1050.3 1060.0 1052.5C1057.7 1057.7 1043.0 1094.9 1043.0 1095.5C1043.0 1095.8 1038.2 1108.0 1032.4 1122.7C1026.6 1137.5 1020.3 1153.3 1018.5 1158.0C1016.7 1162.7 1012.3 1173.9 1008.7 1183.0C1005.1 1192.1 1000.1 1204.9 997.5 1211.5C986.9 1238.6 975.6 1267.1 972.0 1276.0C969.8 1281.2 966.1 1290.7 963.7 1297.0C961.2 1303.3 957.5 1313.0 955.3 1318.5C953.1 1324.0 949.4 1333.5 947.0 1339.5C944.7 1345.5 939.6 1358.4 935.8 1368.0C931.9 1377.6 925.7 1393.6 922.0 1403.5C918.2 1413.4 912.5 1428.0 909.3 1436.0C906.0 1444.0 898.9 1461.7 893.5 1475.4C888.1 1489.1 882.0 1502.8 880.0 1505.9C874.9 1513.8 865.6 1521.9 856.4 1526.7C841.2 1534.6 845.5 1534.2 770.0 1534.5C732.9 1534.7 700.4 1534.5 697.8 1534.0ZM1248.1 624.0C1265.4 620.7 1272.9 619.1 1288.0 615.4C1293.8 613.9 1300.1 612.4 1302.0 612.0C1303.9 611.6 1311.6 609.6 1319.0 607.6C1326.4 605.7 1333.6 603.8 1335.0 603.4C1342.6 601.5 1370.0 593.0 1387.0 587.3C1419.3 576.5 1433.5 571.0 1478.5 551.7C1487.4 547.9 1527.2 527.8 1537.0 522.2C1571.0 502.7 1587.8 492.1 1611.8 475.1C1673.5 431.3 1727.9 375.0 1755.2 326.5C1766.0 307.3 1772.3 293.5 1776.0 280.5C1780.4 265.0 1781.1 243.0 1777.6 229.5C1775.2 220.6 1768.3 207.6 1762.2 200.9C1752.4 190.1 1736.7 180.9 1720.4 176.6C1711.1 174.0 1687.5 171.0 1677.4 171.0C1657.1 171.0 1628.1 176.2 1605.0 184.1C1551.8 202.1 1503.2 232.5 1453.2 278.9C1441.2 290.0 1413.1 319.4 1401.4 333.1C1379.5 358.7 1352.4 395.9 1334.8 424.5C1331.7 429.4 1325.4 439.6 1320.8 447.0C1304.5 472.9 1255.5 565.3 1244.7 590.5C1242.8 594.9 1240.1 601.0 1238.7 604.0C1228.4 626.3 1228.2 627.0 1231.4 627.0C1232.1 627.0 1239.6 625.7 1248.1 624.0Z\"/></svg>";
  function openAuth(why) {
    const cx = AUTH_CTX[why] || Object.assign({}, AUTH_CTX[''], why ? { text: why } : {});
    closeDrawer();
    if (!AUTH) {
      AUTH = document.createElement('div'); AUTH.id = 'cauth'; AUTH.setAttribute('role', 'dialog'); AUTH.setAttribute('aria-modal', 'true'); AUTH.setAttribute('aria-label', 'Log in or sign up');
      document.body.appendChild(AUTH);
      AUTH.addEventListener('click', e => { if (e.target === AUTH) closeAuth(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && AUTH && !AUTH.hidden) closeAuth(); });
    }
    AUTH.hidden = false;
    AUTH.innerHTML = `<div class="box"><header><button type="button" data-x aria-label="Close">${XICO}</button>Log in or sign up</header><div class="in">
      <div class="ahero">${cx.icon}</div>
      <h2>${cx.title}</h2>
      <p>${cx.text}</p>
      <div class="sso">${SSO.apple ? `<button type="button" class="gbtn-g" data-sso="apple">${ALOGO}<span>Continue with Apple</span></button>` : ''}${SSO.google ? `<button type="button" class="gbtn-g" data-sso="google">${GLOGO}<span>Continue with Google</span></button>` : ''}${SSO.facebook ? `<button type="button" class="gbtn-g" data-sso="facebook">${FLOGO}<span>Continue with Facebook</span></button>` : ''}</div>
      <div class="or">or</div>
      <label for="cEmail" style="position:absolute;left:-9999px">Email</label>
      <input type="email" id="cEmail" autocomplete="email" placeholder="Email" inputmode="email">
      <button type="button" class="pri" data-email>Continue with email</button>
      <div class="err" id="cErr" role="alert"></div>
      <p class="fine">By continuing, you agree to the <a href="terms/">Terms of Use</a> and acknowledge the <a href="privacy/">Privacy Policy</a>.</p>
    </div></div>`;
    AUTH.querySelector('[data-x]').onclick = closeAuth;
    AUTH.querySelectorAll('[data-sso]').forEach(b => b.onclick = async () => {
      await loadSB();
      const { data, error } = await C.sb.auth.signInWithOAuth({ provider: b.dataset.sso, options: { redirectTo: backTo(), skipBrowserRedirect: NATIVE } });
      if (error) { AUTH.querySelector('#cErr').textContent = error.message; return; }
      if (NATIVE && data && data.url) window.Capacitor.Plugins.Browser.open({ url: data.url, presentationStyle: 'popover' });
    });
    const go = async () => {
      const email = AUTH.querySelector('#cEmail').value.trim(), errEl = AUTH.querySelector('#cErr'), btn = AUTH.querySelector('[data-email]');
      if (!/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = 'Enter a valid email address.'; return; }
      btn.disabled = true; errEl.textContent = '';
      await loadSB();
      const { error } = await C.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: backTo() } });
      btn.disabled = false;
      if (error) { errEl.textContent = /rate limit/i.test(error.message) ? 'We can\u2019t send more emails right now. Try Continue with Google, or try again later.' : error.message; return; }
      AUTH.querySelector('.in').innerHTML = `<h2>Check your email</h2><p>We sent a sign-in link and a 6-digit code to <b style="color:#222">${esc(email)}</b>. Tap the link, or enter the code here. It can take a minute, and might land in spam.</p><input type="text" id="cCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" style="text-align:center;font-size:20px"><button type="button" class="pri" data-code>Sign in</button><div class="err" id="cErr" role="alert"></div><p class="fine"><button type="button" class="lnk" data-back>Use a different email</button></p>`;
      const codeEl = AUTH.querySelector('#cCode'), codeBtn = AUTH.querySelector('[data-code]');
      const verify = async () => {
        const token = codeEl.value.replace(/\D/g, ''), err = AUTH.querySelector('#cErr');
        if (token.length !== 6) { err.textContent = 'Enter the 6-digit code from the email.'; return; }
        codeBtn.disabled = true; err.textContent = '';
        const { error } = await C.sb.auth.verifyOtp({ email, token, type: 'email' });
        codeBtn.disabled = false;
        if (error) { err.textContent = /expired|invalid/i.test(error.message) ? 'That code didn\u2019t work or has expired. Check the newest email, or go back and send a new one.' : error.message; return; }
        closeAuth();
      };
      codeBtn.onclick = verify;
      codeEl.oninput = () => { codeEl.value = codeEl.value.replace(/\D/g, '').slice(0, 6); codeEl.style.letterSpacing = codeEl.value ? '6px' : ''; if (codeEl.value.length === 6) verify(); };
      setTimeout(() => codeEl.focus(), 50);
      AUTH.querySelector('[data-back]').onclick = () => openAuth(why);
    };
    AUTH.querySelector('[data-email]').onclick = go;
    AUTH.querySelector('#cEmail').onkeydown = e => { if (e.key === 'Enter') go(); };
    if (!(window.matchMedia && matchMedia('(pointer:coarse)').matches)) setTimeout(() => { const f = AUTH.querySelector('[data-sso]'); if (f) f.focus(); }, 50);
  }
  function closeAuth() { if (AUTH) AUTH.hidden = true; }
  function signInForm(body, why) { showNavSafe(); openAuth(why); }
  function showNavSafe() { try { document.getElementById('dback').click(); } catch (e) {} }

  async function accountPanel(body, title) {
    title.textContent = C.user ? 'Your account' : 'Sign in';
    if (!C.user) { signInForm(body); return; }
    const p = C.prof || {};
    const { data: mine } = await C.sb.from('posts').select('id,title,status,thumb_key,image_key,created_at,mod_note,lat,lon').eq('user_id', C.user.id).order('created_at', { ascending: false });
    body.innerHTML = `<div class="cf">
      <p class="note">Logged in as ${esc(C.user.email || '')}</p>
      <label>Username <small>3 to 24 lowercase letters, numbers or _</small><input type="text" id="pUser" value="${esc(p.username || '')}" autocapitalize="off"></label>
      <label>Display name<input type="text" id="pName" maxlength="60" value="${esc(p.display_name || '')}"></label>
      <label>Neighborhood <small>optional</small><input type="text" id="pHood" maxlength="60" value="${esc(p.neighborhood || '')}" placeholder="e.g. Bed-Stuy"></label>
      <label>About you <small>optional</small><textarea id="pBio" maxlength="300">${esc(p.bio || '')}</textarea></label>
      <div class="row"><button class="btn" id="pSave">Save profile</button><button class="btn ghost" id="pOut">Log out</button></div>
      <div id="pMsg"></div></div>
      <div class="about" style="padding-top:0"><p><b>Your photos</b></p></div>
      ${(mine || []).length ? mine.map(m => `<div class="row2" data-cpost="${m.id}"><img src="${PUB + esc(m.thumb_key || m.image_key)}" alt=""><div><b>${esc(m.title)}<span class="cpill ${m.status}">${{ pending: 'In review', approved: 'Live', rejected: 'Not approved', removed: 'Removed' }[m.status]}</span></b><span>${new Date(m.created_at).toLocaleDateString()}${m.mod_note ? ' · ' + esc(m.mod_note) : ''}</span></div><button class="rm" data-delpost="${m.id}" aria-label="Delete photo">${IC.x}</button></div>`).join('') : '<p class="empty">Photos you add show up here. <a href="#" data-goadd>Add your first photo</a>.</p>'}`;
    body.querySelector('#pSave').onclick = async () => {
      const u = body.querySelector('#pUser').value.trim().toLowerCase(), msg = body.querySelector('#pMsg');
      if (!/^[a-z0-9_]{3,24}$/.test(u)) { msg.innerHTML = '<p class="err">Usernames are 3 to 24 lowercase letters, numbers or underscores.</p>'; return; }
      const upd = { username: u, display_name: body.querySelector('#pName').value.trim() || null, neighborhood: body.querySelector('#pHood').value.trim() || null, bio: body.querySelector('#pBio').value.trim() || null };
      const { error } = await C.sb.from('profiles').update(upd).eq('id', C.user.id);
      if (error) { msg.innerHTML = `<p class="err">${error.code === '23505' ? 'That username is taken. Try another.' : esc(error.message)}</p>`; return; }
      Object.assign(C.prof, upd); msg.innerHTML = '<p class="ok">Saved.</p>';
    };
    body.insertAdjacentHTML('beforeend', `<div class="about"><p><button class="cdanger" id="pDel">Delete account</button></p></div>`);
    body.querySelector('#pDel').onclick = async () => {
      if (!await ask({ title: 'Delete your account?', message: 'This permanently removes your profile, the photos you shared, your comments and your saved shots. This can\u2019t be undone.', ok: 'Delete account', danger: true })) return;
      try {
        const { data: files } = await C.sb.storage.from('uploads').list(C.user.id, { limit: 1000 });
        if (files && files.length) await C.sb.storage.from('uploads').remove(files.map(f => C.user.id + '/' + f.name));
      } catch (e) {}
      const { error } = await C.sb.rpc('delete_my_account');
      if (error) {
        await C.sb.from('feedback').insert({ user_id: C.user.id, email: C.user.email, type: 'Delete my account', message: 'Please delete my account and everything I shared.' });
        toast('Request sent. Your account will be deleted soon.');
      } else toast('Your account was deleted');
      await C.sb.auth.signOut(); C.user = null; C.prof = null; SYNC.ready = false; closeDrawer(); buildNav();
    };
    body.querySelector('#pOut').onclick = async () => { await C.sb.auth.signOut(); C.user = null; C.prof = null; SYNC.ready = false; toast('Logged out'); showNav(); buildNav(); };
    const ga = body.querySelector('[data-goadd]'); if (ga) ga.onclick = e => { e.preventDefault(); openAdd(); };
    body.querySelectorAll('[data-delpost]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      if (!await ask({ title: 'Delete this photo?', message: 'It will be removed from the map. This can\u2019t be undone.', ok: 'Delete', danger: true })) return;
      const m = mine.find(x => x.id === b.dataset.delpost);
      const { error } = await C.sb.from('posts').delete().eq('id', m.id);
      if (error) { toast('Couldn\u2019t delete it'); return; }
      await C.sb.storage.from('uploads').remove([m.image_key, m.thumb_key].filter(Boolean));
      C.posts = C.posts.filter(x => x.id !== m.id); if (C.layer) drawPosts();
      b.closest('.row2').remove(); toast('Photo deleted');
    });
    body.querySelectorAll('[data-cpost]').forEach(r => r.onclick = () => { const m0 = (mine || []).find(x => x.id === r.dataset.cpost); const post = C.posts.find(x => x.id === r.dataset.cpost) || m0; if (post) { closeDrawer(); setMode(C.mode === 'archive' ? 'both' : C.mode); map.setView([post.lat, post.lon], 18); } });
  }

  // ---------- add a photo ----------
  function addPanel(body, title) {
    title.textContent = 'Add a photo';
    if (!C.user) { signInForm(body, 'post'); return; }
    body.innerHTML = `<div class="cf">
      <p class="note">Share an old photo of the city, or one you took. It goes on the map after a quick review.</p>
      <label class="cdrop" id="aDrop">${ADD.preview ? `<img src="${ADD.preview}" alt="">` : `${ICP}<span>Choose a photo<br><small>JPG, PNG or WebP</small></span>`}<input type="file" id="aFile" accept="image/jpeg,image/png,image/webp" hidden></label>
      <label>Title<input type="text" id="aTitle" maxlength="120" value="${esc(ADD.title)}" placeholder="e.g. Coney Island boardwalk"></label>
      <label>What is it?<select id="aKind"><option value="">Choose a type</option>${KINDS.map(([v, l]) => `<option value="${v}" ${ADD.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="row"><label style="flex:1">Year taken <small>optional</small><input type="number" id="aYear" min="1830" max="2100" value="${esc(ADD.year)}" placeholder="1978"></label>
      <label class="chk" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="aApprox" ${ADD.approx ? 'checked' : ''}>Roughly</label></div>
      <label>Where was it taken?<input type="text" id="aPlace" value="${esc(ADD.place)}" placeholder="An address, or two cross streets like Bedford Ave and N 7th St"></label>
      <div class="row"><button class="btn ghost" id="aFind">Find it</button><button class="btn ghost" id="aPick">Pick on the map</button><button class="btn ghost" id="aHere">Use my location</button></div>
      <p class="note" id="aWhere">${ADD.ll ? `Pinned at ${ADD.ll[0].toFixed(5)}, ${ADD.ll[1].toFixed(5)}. <a href="#" id="aAdjust">Adjust on the map</a>` : 'No spot chosen yet.'}</p>
      <label>Story or details <small>optional</small><textarea id="aDesc" maxlength="2000" placeholder="Who took it, what was going on, what's there now">${esc(ADD.desc)}</textarea></label>
      <label>Whose photo is this?<select id="aRights"><option value="">Choose one</option>${RIGHTS.map(([v, l]) => `<option value="${v}" ${ADD.rights === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="note">Only share photos you have the right to share. By submitting you let PastPost show it on the map, credited to your username. You can delete it any time.</p>
      <button class="btn" id="aSend">Submit for review</button>
      <div id="aMsg"></div></div>`;
    const $ = s => body.querySelector(s);
    const keep = () => { ADD.kind = $('#aKind').value; ADD.title = $('#aTitle').value; ADD.year = $('#aYear').value; ADD.approx = $('#aApprox').checked; ADD.place = $('#aPlace').value; ADD.desc = $('#aDesc').value; ADD.rights = $('#aRights').value; };
    body.oninput = keep; body.onchange = keep;
    $('#aFile').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 25e6) { $('#aMsg').innerHTML = '<p class="err">That file is too big. Try one under 25 MB.</p>'; return; } ADD.file = f; ADD.preview = URL.createObjectURL(f); keep(); addPanel(body, title); };
    const setLL = (ll, method) => { ADD.ll = ll; ADD.method = method; keep(); addPanel(body, title); };
    $('#aFind').onclick = async () => {
      keep(); const q = ADD.place.trim(); if (!q) { $('#aMsg').innerHTML = '<p class="err">Type an address or two cross streets first.</p>'; return; }
      $('#aWhere').textContent = 'Looking…';
      const isX = /\s(&|and|at|\/)\s/i.test(q);
      const qq = q.replace(/\s(&|at|\/)\s/i, ' and ');
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=-74.27,40.92,-73.68,40.49&bounded=1&q=' + encodeURIComponent(qq + ', New York City'));
        const d = await r.json();
        if (d[0]) { setLL([+d[0].lat, +d[0].lon], isX ? 'intersection' : 'address'); map.setView(ADD.ll, 17); }
        else $('#aWhere').innerHTML = 'Couldn’t find that. Try another spelling, or <a href="#" id="aPick2">pick it on the map</a>.';
        const p2 = $('#aPick2'); if (p2) p2.onclick = e => { e.preventDefault(); pick(); };
      } catch (e) { $('#aWhere').textContent = 'Search isn’t working right now. Pick the spot on the map instead.'; }
    };
    const pick = () => { keep(); startPick(ADD.ll, ll => { setLL(ll, 'manual'); }); };
    $('#aPick').onclick = pick;
    const adj = $('#aAdjust'); if (adj) adj.onclick = e => { e.preventDefault(); pick(); };
    $('#aHere').onclick = () => { keep(); locate(ll => { setLL(ll, 'manual'); startPick(ll, l2 => setLL(l2, 'manual')); }); };
    $('#aSend').onclick = () => { keep(); submit($, body, title); };
  }
  function startPick(start, done) {
    ADDV.hidden = true; document.body.style.overflow = '';
    if (start) map.setView(start, 18);
    const el = document.createElement('div'); el.id = 'cpick';
    el.innerHTML = `<svg class="x" viewBox="0 0 24 34"><path d="M12 33s11-12.4 11-21A11 11 0 0 0 1 12c0 8.6 11 21 11 21z" fill="#1d1c1a" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#f2b705"/></svg>
      <div class="bar"><span>Move the map so the pin sits where the photo was taken.</span><div><button class="btn" id="cpOk">Use this spot</button><button class="btn ghost" id="cpNo">Cancel</button></div></div>`;
    document.body.appendChild(el);
    const end = ok => { const c = map.getCenter(); el.remove(); ADDV.hidden = false; document.body.style.overflow = 'hidden'; if (ok) done([c.lat, c.lng]); else addPanel(ADDB, ADDT); };
    el.querySelector('#cpOk').onclick = () => end(true);
    el.querySelector('#cpNo').onclick = () => end(false);
  }
  function shrink(file, max, q) {
    return new Promise((res, rej) => {
      const img = new Image(); img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => b ? res({ blob: b, w: c.width, h: c.height }) : rej(new Error('Could not read the photo')), 'image/jpeg', q);
      }; img.onerror = () => rej(new Error('Could not read the photo')); img.src = URL.createObjectURL(file);
    });
  }
  async function submit($, body, title) {
    const msg = $('#aMsg'), err = t => { msg.innerHTML = `<p class="err">${t}</p>`; };
    if (!ADD.file) return err('Choose a photo first.');
    if (!ADD.title.trim()) return err('Give it a title.');
    if (!ADD.kind) return err('Choose what type of image it is.');
    if (!ADD.ll) return err('Choose where it was taken.');
    if (ADD.ll[0] < 40.4 || ADD.ll[0] > 41 || ADD.ll[1] < -74.3 || ADD.ll[1] > -73.6) return err('That spot is outside New York City.');
    if (!ADD.rights) return err('Tell us whose photo it is.');
    const yr = ADD.year ? parseInt(ADD.year, 10) : null;
    if (yr && (yr < 1830 || yr > new Date().getFullYear())) return err('Check the year.');
    const btn = $('#aSend'); btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      const big = await shrink(ADD.file, 2000, 0.86), small = await shrink(ADD.file, 480, 0.8);
      const id = crypto.randomUUID(), key = `${C.user.id}/${id}.jpg`, tkey = `${C.user.id}/${id}_t.jpg`;
      let r = await C.sb.storage.from('uploads').upload(key, big.blob, { contentType: 'image/jpeg', upsert: false }); if (r.error) throw r.error;
      r = await C.sb.storage.from('uploads').upload(tkey, small.blob, { contentType: 'image/jpeg', upsert: false }); if (r.error) throw r.error;
      r = await C.sb.from('posts').insert({ user_id: C.user.id, title: ADD.title.trim(), description: ADD.desc.trim() || null, year_taken: yr, year_approx: ADD.approx, lat: ADD.ll[0], lon: ADD.ll[1], place_label: ADD.place.trim() || null, pin_method: ADD.method || 'manual', image_key: key, thumb_key: tkey, width: big.w, height: big.h, rights: ADD.rights, kind: ADD.kind });
      if (r.error) throw r.error;
      Object.assign(ADD, { kind: '', file: null, preview: '', title: '', year: '', approx: false, desc: '', rights: '', place: '', ll: null, method: '' });
      body.innerHTML = `<div class="cf"><p class="ok"><b>Thanks, it’s in.</b><br>Your photo will show on the map once it’s reviewed. You can see its status under Your account.</p><div class="row"><button class="btn" id="aMore">Add another</button><button class="btn ghost" id="aAcct">Your account</button></div></div>`;
      body.querySelector('#aMore').onclick = () => addPanel(ADDB, ADDT);
      body.querySelector('#aAcct').onclick = () => { closeAdd(); openDrawer(); openPanel('account'); };
      if (C.prof && C.prof.role === 'admin') C.pending++;
    } catch (e) { btn.disabled = false; btn.textContent = 'Submit for review'; err(esc(e.message || 'Upload failed. Try again.')); }
  }


  // ---------- full screen "New photo" + plus button ----------
  const ADDV = document.createElement('div'); ADDV.id = 'cadd'; ADDV.hidden = true; ADDV.setAttribute('role', 'dialog'); ADDV.setAttribute('aria-modal', 'true'); ADDV.setAttribute('aria-label', 'New photo');
  ADDV.innerHTML = `<header><button type="button" data-x aria-label="Close"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span>New photo</span><i></i></header><div class="cb"></div>`;
  document.body.appendChild(ADDV);
  const ADDB = ADDV.querySelector('.cb'), ADDT = ADDV.querySelector('header span');
  ADDV.querySelector('[data-x]').onclick = () => closeAdd();
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ADDV.hidden) closeAdd(); });
  function openAdd() {
    if (!C.user && !hasSession()) { openAuth('post'); return; }
    closeDrawer(); ADDV.hidden = false; document.body.style.overflow = 'hidden';
    ADDB.innerHTML = '<p class="empty">Loading\u2026</p>';
    loadSB().then(() => { ADDT.textContent = 'New photo'; if (!C.user) { closeAdd(); openAuth('post'); return; } addPanel(ADDB, ADDT); ADDT.textContent = 'New photo'; });
  }
  function closeAdd() { ADDV.hidden = true; document.body.style.overflow = ''; }
  const Fab = L.Control.extend({ options: { position: 'bottomright' }, onAdd() {
    const b = L.DomUtil.create('button', 'cfab'); b.type = 'button'; b.setAttribute('aria-label', 'Add a photo'); b.title = 'Add a photo';
    b.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    L.DomEvent.disableClickPropagation(b); L.DomEvent.on(b, 'click', e => { L.DomEvent.preventDefault(e); openAdd(); }); return b; } });
  const fab = new Fab().addTo(map); const corner = fab.getContainer().parentNode; corner.appendChild(fab.getContainer());

  // ---------- community pins + mode switch ----------
  const CM = document.createElement('div'); CM.id = 'cmode'; CM.setAttribute('role', 'group'); CM.setAttribute('aria-label', 'What to show');
  CM.innerHTML = '<button data-m="archive" class="on">Archive</button><button data-m="community">Community</button><button data-m="both">Both</button>';
  document.body.appendChild(CM);
  CM.onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  function archivePanes(show) { document.querySelectorAll('.leaflet-overlay-pane canvas, .leaflet-marker-pane, .leaflet-shadow-pane').forEach(el => { if (!el.closest('#cpick')) el.style.visibility = show ? '' : 'hidden'; }); }
  function setMode(m) {
    C.mode = m; CM.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    archivePanes(m !== 'community');
    if (m === 'archive') { if (C.layer) C.layer.remove(); return; }
    loadPosts().then(() => { if (!C.layer) C.layer = L.layerGroup(); C.layer.addTo(map); if (m === 'community' && !C.posts.length) toast('No community photos yet. Be the first: Menu, Add a photo'); });
  }
  async function loadPosts() {
    if (C.loaded) return; C.loaded = true;
    C.posts = await rest('posts?select=id,user_id,kind,title,description,year_taken,year_approx,lat,lon,place_label,image_key,thumb_key,created_at,profiles(username,display_name)&status=eq.approved&order=created_at.desc&limit=5000');
    drawPosts();
  }
  function drawPosts() {
    if (!C.layer) C.layer = L.layerGroup();
    C.layer.clearLayers();
    const sel = (typeof KINDSEL !== 'undefined') ? KINDSEL : new Set();
    C.posts.filter(p => (!sel.size || sel.has(p.kind || 'p')) && !BLK.has(p.user_id)).forEach(p => {
      const m = L.circleMarker([p.lat, p.lon], { pane: 'cpane', radius: 8, weight: 3, color: '#f2b705', fillColor: '#1d1c1a', fillOpacity: 1 });
      m.bindPopup(() => postPopup(p), { maxWidth: 300, minWidth: 240, className: 'cpopw' });
      C.layer.addLayer(m);
    });
  }
  if (typeof render === 'function') { const _aa = render; render = function () { const r = _aa.apply(this, arguments); if (C.loaded && C.posts.length) drawPosts(); return r; }; }
  map.createPane('cpane'); map.getPane('cpane').style.zIndex = 640;
  function postPopup(p) {
    const by = p.profiles ? (p.profiles.display_name || '@' + p.profiles.username) : 'a contributor';
    const yr = p.year_taken ? (p.year_approx ? 'around ' : '') + p.year_taken : '';
    const d = document.createElement('div'); d.className = 'cpop';
    d.innerHTML = `<a href="${PUB + esc(p.image_key)}" target="_blank" rel="noopener"><img src="${PUB + esc(p.thumb_key || p.image_key)}" alt="${esc(p.title)}"></a>
      <b>${esc(p.title)}</b><span>${[(KINDS.find(k => k[0] === p.kind) || [0, ''])[1], yr, p.place_label].filter(Boolean).map(esc).join(' · ')}</span>
      ${p.description ? `<p style="font-size:13px;margin:6px 0 0;line-height:1.45">${esc(p.description)}</p>` : ''}
      <div class="row"><span>Shared by <button data-prof>${esc(by)}</button></span><span><button data-cm>Comments</button> · <button data-rep>Report</button></span></div>`;
    d.querySelector('[data-rep]').onclick = () => report('post', p.id);
    d.querySelector('[data-cm]').onclick = () => openComments('post', p.id);
    d.querySelector('[data-prof]').onclick = () => openProfile(p.user_id);
    return d;
  }
  async function report(type, id) {
    const r0 = await ask({ title: 'Why are you reporting this?', message: 'Your report is anonymous to the person who posted it.', options: [['wrong_location', 'Wrong location'], ['copyright', 'It\u2019s my photo or copyrighted'], ['offensive', 'Offensive or hateful'], ['spam', 'Spam'], ['privacy', 'Shows private information'], ['other', 'Something else']].map(([value, label]) => ({ value, label })) });
    if (!r0) return; const reason = r0;
    const r = await fetch(SB + '/rest/v1/reports', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(C.sb && C.user ? { Authorization: 'Bearer ' + (await C.sb.auth.getSession()).data.session.access_token } : {}) }, body: JSON.stringify({ target_type: type, target_id: id, reason, reporter_id: C.user ? C.user.id : null }) });
    toast(r.ok ? 'Thanks, I’ll take a look' : 'Couldn’t send the report');
  }


  // ---------- comments ----------
  const ICC = '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>';
  const ago = d => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: s > 31536000 ? 'numeric' : undefined }); };
  const CMV = document.createElement('div'); CMV.id = 'ccm'; CMV.hidden = true; CMV.setAttribute('role', 'dialog'); CMV.setAttribute('aria-modal', 'true'); CMV.setAttribute('aria-label', 'Comments');
  CMV.innerHTML = `<div class="sh"><header><span>Comments</span><button type="button" data-x aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="cl"></div><footer></footer></div>`;
  document.body.appendChild(CMV);
  CMV.addEventListener('click', e => { if (e.target === CMV || e.target.closest('[data-x]')) CMV.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !CMV.hidden) { CMV.hidden = true; e.stopPropagation(); } }, true);
  async function openComments(type, id) {
    CMV.hidden = false; const list = CMV.querySelector('.cl'), foot = CMV.querySelector('footer');
    list.innerHTML = '<p class="empty">Loading…</p>'; foot.innerHTML = '';
    let rows = await rest(`comments?select=id,body,created_at,user_id,profiles(username,display_name)&target_type=eq.${type}&target_id=eq.${encodeURIComponent(id)}&status=eq.visible&order=created_at.asc&limit=500`);
    const me = C.user ? C.user.id : null, admin = C.prof && C.prof.role === 'admin';
    rows = rows.filter(r => !BLK.has(r.user_id));
    list.innerHTML = rows.length ? rows.map(r => { const n = r.profiles ? (r.profiles.display_name || r.profiles.username) : 'Someone'; return `<div class="cm" data-id="${r.id}"><div class="av">${esc((n || '?')[0].toUpperCase())}</div><div class="cmb"><div><b>${esc(n)}</b> <small>${ago(r.created_at)}</small></div><p>${esc(r.body)}</p><div class="cma">${r.user_id === me || admin ? '<button data-del>Delete</button>' : ''}${r.user_id !== me ? `<button data-rep>Report</button><button data-blk="${r.user_id}">Block</button>` : ''}</div></div></div>`; }).join('') : '<p class="empty">No comments yet. Know something about this spot? Start the conversation.</p>';
    if (!C.user && !hasSession()) { foot.innerHTML = `<button type="button" class="cfoot-login">Log in to comment</button>`; foot.querySelector('button').onclick = () => { CMV.hidden = true; openAuth('comment'); }; }
    else {
      foot.innerHTML = `<div class="cin"><textarea rows="1" maxlength="1000" placeholder="Add a comment…" aria-label="Add a comment"></textarea><button type="button" disabled>Post</button></div>`;
      const ta = foot.querySelector('textarea'), btn = foot.querySelector('button');
      ta.oninput = () => { btn.disabled = !ta.value.trim(); ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'; };
      btn.onclick = async () => {
        await loadSB(); if (!C.user) { CMV.hidden = true; openAuth('Log in to join the conversation.'); return; }
        btn.disabled = true;
        const { error } = await C.sb.from('comments').insert({ user_id: C.user.id, target_type: type, target_id: String(id), body: ta.value.trim() });
        if (error) { toast(/Slow down/.test(error.message) ? 'Slow down a little' : 'Couldn’t post that'); btn.disabled = false; return; }
        openComments(type, id); CCOUNT.delete(type + id);
      };
    }
    list.onclick = async e => {
      const row = e.target.closest('.cm'); if (!row) return;
      if (e.target.closest('[data-del]')) { if (!await confirmDel()) return; await loadSB(); const { error } = await C.sb.from('comments').delete().eq('id', row.dataset.id); if (error && admin) await C.sb.from('comments').update({ status: 'hidden' }).eq('id', row.dataset.id); row.remove(); CCOUNT.delete(type + id); }
      if (e.target.closest('[data-rep]')) report('comment', row.dataset.id);
      const bk = e.target.closest('[data-blk]'); if (bk && await ask({ title: 'Block this person?', message: 'You won\u2019t see their comments or photos anymore.', ok: 'Block', danger: true })) { BLK.add(bk.dataset.blk); openComments(type, id); if (C.layer) drawPosts(); toast('Blocked'); }
    };
  }
  function confirmDel() { return ask({ title: 'Delete this comment?', ok: 'Delete', danger: true }); }
  const CCOUNT = new Map();
  async function commentCount(type, id) {
    const k = type + id; if (CCOUNT.has(k)) return CCOUNT.get(k);
    const r = await fetch(`${SB}/rest/v1/comments?select=id&target_type=eq.${type}&target_id=eq.${encodeURIComponent(id)}&status=eq.visible`, { method: 'HEAD', headers: { apikey: KEY, Prefer: 'count=exact' } });
    const n = parseInt((r.headers.get('content-range') || '/0').split('/')[1], 10) || 0; CCOUNT.set(k, n); return n;
  }
  // add a Comment button next to Like / Save / Share on every photo
  if (typeof actsHTML === 'function') {
    const _acts = actsHTML;
    actsHTML = function (it, dark) {
      const h = _acts(it, dark), key = 'archive' + it.u, n = CCOUNT.get(key);
      if (!CCOUNT.has(key)) commentCount('archive', it.u).then(c => { if (c) document.querySelectorAll('[data-cmt]').forEach(b => { if (b.dataset.cmt === it.u) b.querySelector('span').textContent = 'Comments (' + c + ')'; }); });
      return h.replace(/<\/div>$/, `<button class="act" data-cmt="${esc(it.u)}">${ICC}<span>${n ? 'Comments (' + n + ')' : 'Comment'}</span></button></div>`);
    };
  }
  if (typeof doAct === 'function') {
    const _do = doAct;
    doAct = function (btn, it, ll) { if (btn.dataset.cmt !== undefined) { openComments('archive', it.u); return; } return _do(btn, it, ll); };
  }

  // ---------- keep everything in sync with the account (website and phone apps) ----------
  // Likes and saves live in the reactions table. Addresses, recently viewed and blocked users live in user_prefs.
  // Each device remembers what it last synced, so a removal on one device is removed everywhere.
  const SYNC = { ready: false };
  const SKEY = k => 'nycmap.synced.' + (C.user ? C.user.id : '') + '.' + k;
  const sget = k => { try { const v = localStorage.getItem(SKEY(k)); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const sput = (k, v) => { try { localStorage.setItem(SKEY(k), JSON.stringify(v)); } catch (e) {} };
  const snapMeta = r => { if (!r) return null; const m = {}; for (const k of ['u', 'i', 't', 'l', 's', 'll']) if (r[k] !== undefined) m[k] = r[k]; return m; };
  async function upsertReaction(kind, u, meta) {
    let r = await C.sb.from('reactions').upsert({ user_id: C.user.id, kind, target_type: 'archive', target_id: u, meta }, { onConflict: 'user_id,kind,target_type,target_id' });
    if (r.error && /meta/.test(r.error.message)) r = await C.sb.from('reactions').upsert({ user_id: C.user.id, kind, target_type: 'archive', target_id: u }, { onConflict: 'user_id,kind,target_type,target_id' });
  }
  const delReaction = (kind, u) => C.sb.from('reactions').delete().match({ user_id: C.user.id, kind, target_type: 'archive', target_id: u });
  async function syncDown() {
    if (!C.user || SYNC.ready) return;
    SYNC.ready = 'busy';
    let r = await C.sb.from('reactions').select('kind,target_id,meta').eq('user_id', C.user.id).eq('target_type', 'archive');
    if (r.error && /meta/.test(r.error.message)) r = await C.sb.from('reactions').select('kind,target_id').eq('user_id', C.user.id).eq('target_type', 'archive');
    if (r.error) { SYNC.ready = false; return; }
    const server = r.data || [], local = { like: LIKES, save: SAVES };
    const onServer = { like: new Set(), save: new Set() };
    for (const x of server) if (onServer[x.kind]) onServer[x.kind].add(x.target_id);
    let changed = false;
    for (const kind of ['like', 'save']) {
      const prev = sget(kind) ? new Set(sget(kind)) : null, o = local[kind];
      for (const u of Object.keys(o)) {
        if (onServer[kind].has(u)) continue;
        if (prev && prev.has(u)) { delete o[u]; changed = true; }      // removed on another device
        else upsertReaction(kind, u, snapMeta(o[u]));                 // new on this device
      }
      for (const x of server) if (x.kind === kind && !o[x.target_id]) {
        if (x.meta && x.meta.u) { o[x.target_id] = x.meta; changed = true; }
        else if (prev && prev.has(x.target_id)) delReaction(kind, x.target_id); // removed here while offline
      }
      sput(kind, Object.keys(o));
    }
    SYNC.last = { like: new Set(Object.keys(LIKES)), save: new Set(Object.keys(SAVES)) };
    SYNC.ready = true;
    if (changed) { _set('likes', LIKES); _set('saves', SAVES); if (dpanel.hidden) buildNav(); }
    syncPrefs();
  }
  // Addresses, recently viewed, blocked users: whichever device changed them last wins.
  const PREF = { t: 0 };
  const prefData = () => ({ places: PLACES, recent: RECENT.slice(0, 40), blocked: BLK.get() });
  function localPrefTime() { try { return +localStorage.getItem(SKEY('prefs_t')) || 0; } catch (e) { return 0; } }
  function touchPrefs() { try { localStorage.setItem(SKEY('prefs_t'), String(Date.now())); } catch (e) {} pushPrefs(); }
  async function syncPrefs() {
    if (!C.user) return;
    const { data, error } = await C.sb.from('user_prefs').select('data,updated_at').eq('user_id', C.user.id).maybeSingle();
    if (error) return;
    const st = data ? Date.parse(data.updated_at) : 0, lt = localPrefTime();
    if (data && (st >= lt || !lt)) {
      const d = data.data || {};
      if (!lt) { // first sync on this device: keep anything saved here before signing in
        const key = p => p.name + '|' + (p.ll || []).join(',');
        const seen = new Set((d.places || []).map(key));
        d.places = [...(d.places || []), ...PLACES.filter(p => !seen.has(key(p)))];
        const ru = new Set(); d.recent = [...RECENT, ...(d.recent || [])].filter(x => x && x.u && !ru.has(x.u) && ru.add(x.u)).slice(0, 40);
        d.blocked = [...new Set([...(d.blocked || []), ...BLK.get()])];
      }
      PLACES = d.places || []; RECENT = d.recent || [];
      _set('places', PLACES); _set('recent', RECENT);
      try { localStorage.setItem('cblocked', JSON.stringify(d.blocked || [])); } catch (e) {}
      try { localStorage.setItem(SKEY('prefs_t'), String(Math.max(st, Date.now()))); } catch (e) {}
      if (!lt) pushPrefs(true);
      if (dpanel.hidden) buildNav();
      if (C.layer) drawPosts();
    } else pushPrefs(true);
  }
  function pushPrefs(now) {
    if (SYNC.ready !== true || !C.user) return;
    clearTimeout(PREF.t);
    PREF.t = setTimeout(() => C.sb.from('user_prefs').upsert({ user_id: C.user.id, data: prefData(), updated_at: new Date().toISOString() }), now ? 0 : 1200);
  }
  const _set = store.set.bind(store);
  store.set = function (k, v) {
    _set(k, v);
    if (SYNC.ready !== true || !C.user) return;
    if (k === 'places' || k === 'recent') { touchPrefs(); return; }
    if (k !== 'likes' && k !== 'saves') return;
    const kind = k === 'likes' ? 'like' : 'save', now = new Set(Object.keys(v)), prev = SYNC.last[kind];
    for (const u of now) if (!prev.has(u)) upsertReaction(kind, u, snapMeta(v[u]));
    for (const u of prev) if (!now.has(u)) delReaction(kind, u);
    SYNC.last[kind] = now; sput(kind, [...now]);
  };
  // Pick up changes made on another device when coming back to this tab or app
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && C.user && SYNC.ready === true) { SYNC.ready = false; syncDown(); } });


  // ---------- public profiles ----------
  const PRV = document.createElement('div'); PRV.id = 'cprof'; PRV.hidden = true; PRV.setAttribute('role', 'dialog'); PRV.setAttribute('aria-modal', 'true'); PRV.setAttribute('aria-label', 'Profile');
  PRV.innerHTML = `<div class="sh"><header><span>Profile</span><button type="button" data-x aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="pb"></div></div>`;
  document.body.appendChild(PRV);
  PRV.addEventListener('click', e => { if (e.target === PRV || e.target.closest('[data-x]')) PRV.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !PRV.hidden) { PRV.hidden = true; e.stopPropagation(); } }, true);
  async function openProfile(uid) {
    if (!uid) return;
    PRV.hidden = false; const b = PRV.querySelector('.pb'); b.innerHTML = '<p class="empty">Loading…</p>';
    const [pr, ps] = await Promise.all([rest(`profiles?select=username,display_name,bio,neighborhood,created_at&id=eq.${uid}`), rest(`posts?select=id,title,thumb_key,image_key,lat,lon,year_taken&user_id=eq.${uid}&status=eq.approved&order=created_at.desc&limit=300`)]);
    const p = pr[0]; if (!p) { b.innerHTML = '<p class="empty">This profile isn’t available.</p>'; return; }
    const name = p.display_name || p.username;
    b.innerHTML = `<div class="ph"><div class="av lg">${esc(name[0].toUpperCase())}</div><div><b>${esc(name)}</b><small>@${esc(p.username)}${p.neighborhood ? ' · ' + esc(p.neighborhood) : ''}</small></div></div>
      ${p.bio ? `<p class="pbio">${esc(p.bio)}</p>` : ''}
      <div class="pst"><b>${ps.length}</b> ${ps.length === 1 ? 'photo' : 'photos'} · Joined ${new Date(p.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
      ${ps.length ? `<div class="pgrid">${ps.map(x => `<button data-go="${x.id}" aria-label="${esc(x.title)}"><img src="${PUB + esc(x.thumb_key || x.image_key)}" alt="" loading="lazy"></button>`).join('')}</div>` : '<p class="empty">No photos yet.</p>'}
      <p class="pfoot"><button data-rep>Report this profile</button> \u00b7 <button data-blk>Block</button></p>`;
    b.querySelectorAll('[data-go]').forEach(el => el.onclick = () => { const x = ps.find(q => q.id === el.dataset.go); PRV.hidden = true; if (C.mode === 'archive') setMode('both'); map.setView([x.lat, x.lon], 18); });
    b.querySelector('[data-rep]').onclick = () => report('profile', uid);
    b.querySelector('[data-blk]').onclick = async () => { if (!await ask({ title: 'Block this person?', message: 'You won\u2019t see their comments or photos anymore.', ok: 'Block', danger: true })) return; BLK.add(uid); PRV.hidden = true; if (C.layer) drawPosts(); toast('Blocked'); };
  }


  // ---------- tell uploaders when a photo goes live or is declined ----------
  async function notifyStatus() {
    if (!C.user) return;
    const key = 'cseen_' + C.user.id; let seen = {};
    try { seen = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    const { data } = await C.sb.from('posts').select('id,title,status').eq('user_id', C.user.id).in('status', ['approved', 'rejected']);
    const fresh = (data || []).filter(p => seen[p.id] !== p.status);
    const first = !Object.keys(seen).length && !localStorage.getItem(key);
    (data || []).forEach(p => seen[p.id] = p.status);
    try { localStorage.setItem(key, JSON.stringify(seen)); } catch (e) {}
    if (first || !fresh.length) return;
    const live = fresh.filter(p => p.status === 'approved'), no = fresh.filter(p => p.status === 'rejected');
    setTimeout(() => toast(live.length ? (live.length === 1 ? `\u201c${live[0].title}\u201d is live on the map` : `${live.length} of your photos are live on the map`) : (no.length === 1 ? `\u201c${no[0].title}\u201d wasn\u2019t approved. See Your account` : `${no.length} photos weren\u2019t approved. See Your account`)), 1500);
  }

  // ---------- admin ----------
  async function adminPanel(body, title) {
    title.textContent = 'Review and inbox';
    if (!C.prof || C.prof.role !== 'admin') { body.innerHTML = '<p class="empty">This area is for the map’s admin.</p>'; return; }
    const [pend, fb, td, rp] = await Promise.all([
      C.sb.from('posts').select('*,profiles(username)').eq('status', 'pending').order('created_at'),
      C.sb.from('feedback').select('*').eq('status', 'new').order('created_at', { ascending: false }).limit(50),
      C.sb.from('takedown_requests').select('*').in('status', ['new', 'in_progress']).order('created_at', { ascending: false }),
      C.sb.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(50)]);
    C.pending = (pend.data || []).length;
    const sec = (t, n) => `<div class="about" style="padding-bottom:4px"><p><b>${t}</b> <span class="cpill">${n}</span></p></div>`;
    const st = (await C.sb.rpc('admin_stats')).data;
    const statsHTML = st ? `<div class="cstats">${[['Accounts', st.users, st.users_7d ? '+' + st.users_7d + ' this week' : ''], ['Live photos', st.posts_live, ''], ['Comments', st.comments, st.comments_7d ? '+' + st.comments_7d + ' this week' : ''], ['Likes', st.likes, ''], ['Saves', st.saves, ''], ['Open reports', st.reports_open, '']].map(([l, n, d]) => `<div><b>${n}</b><span>${l}</span>${d ? `<small>${d}</small>` : ''}</div>`).join('')}</div>` : '';
    body.innerHTML = statsHTML +
      sec('Photos waiting for review', (pend.data || []).length) +
      ((pend.data || []).map(p => `<div class="cadm" data-id="${p.id}"><a href="${PUB + esc(p.image_key)}" target="_blank" rel="noopener"><img src="${PUB + esc(p.thumb_key || p.image_key)}" alt=""></a>
        <b>${esc(p.title)}</b><p>${[p.year_taken, p.place_label, '@' + (p.profiles ? p.profiles.username : '?'), { own_photo: 'Took it', family_photo: 'Family photo', permission: 'Has permission', public_domain: 'Public domain' }[p.rights]].filter(Boolean).map(esc).join(' · ')}</p>
        ${p.description ? `<p>${esc(p.description)}</p>` : ''}
        <div class="row"><button class="btn" data-ap>Approve</button><button class="btn ghost" data-rj>Reject</button><button class="btn ghost" data-see>See spot</button></div></div>`).join('') || '<p class="empty">Nothing waiting.</p>') +
      sec('Removal requests', (td.data || []).length) +
      ((td.data || []).map(t => `<div class="cmsg"><b>${esc(t.name)}</b> ${t.org ? '(' + esc(t.org) + ')' : ''} <a href="mailto:${esc(t.email)}">${esc(t.email)}</a><small>${new Date(t.created_at).toLocaleString()} · ${esc(t.ask)}</small><div>${esc(t.images)}</div>${t.notes ? `<small>${esc(t.notes)}</small>` : ''}${t.goodfaith && t.perjury && t.signature ? `<small><b>Formal DMCA notice</b>, signed ${esc(t.signature)}${t.contact ? ' · ' + esc(t.contact) : ''}. Remove the material quickly and tell the uploader.</small>` : ''}<div class="row" style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost" data-done="takedown_requests" data-id="${t.id}">Mark done</button></div></div>`).join('') || '<p class="empty">None.</p>') +
      sec('Reports', (rp.data || []).length) +
      ((rp.data || []).map(r => `<div class="cmsg"><b>${esc(r.reason.replace('_', ' '))}</b> on ${esc(r.target_type)} <small>${esc(r.target_id)}</small>${r.details ? `<div>${esc(r.details)}</div>` : ''}<div style="display:flex;gap:8px;margin-top:6px">${r.target_type === 'post' ? `<button class="btn ghost" data-rmpost="${esc(r.target_id)}" data-rid="${r.id}" data-copy="${r.reason === 'copyright' ? 1 : ''}">Remove photo</button>` : ''}<button class="btn ghost" data-done="reports" data-id="${r.id}">Resolve</button></div></div>`).join('') || '<p class="empty">None.</p>') +
      sec('Feedback', (fb.data || []).length) +
      ((fb.data || []).map(f => `<div class="cmsg"><b>${esc(f.type)}</b>${f.email ? ` · <a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}<small>${new Date(f.created_at).toLocaleString()}</small><div>${esc(f.message)}</div>${f.link ? `<small><a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.link)}</a></small>` : ''}<div style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost" data-done="feedback" data-id="${f.id}">Done</button></div></div>`).join('') || '<p class="empty">No new feedback.</p>');
    body.onclick = async e => {
      const card = e.target.closest('.cadm');
      if (card) {
        const id = card.dataset.id, post = (pend.data || []).find(x => x.id === id);
        if (e.target.closest('[data-see]')) { closeDrawer(); map.setView([post.lat, post.lon], 18); return; }
        if (e.target.closest('[data-ap]')) { const { error } = await C.sb.from('posts').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id); if (error) return toast(error.message); card.remove(); C.loaded = false; if (C.layer) C.layer.clearLayers(); toast('Approved, it’s live'); }
        const rmb = e.target.closest('[data-rmpost]');
        if (rmb) {
          const a = await ask({ title: 'Remove this photo?', message: 'It comes off the map. Copyright removals count as a strike, and 3 strikes closes the account.', options: [{ label: 'Copyright: takedown or not theirs', value: 'Copyright: removed after a rights complaint' }, { label: 'Breaks the rules', value: 'Breaks the rules' }, { label: 'Wrong location or other', value: 'Removed by moderator' }] });
          if (!a) return;
          const { error } = await C.sb.from('posts').update({ status: 'removed', mod_note: a }).eq('id', rmb.dataset.rmpost);
          if (error) return toast(error.message);
          await C.sb.from('reports').update({ status: 'resolved' }).eq('id', rmb.dataset.rid);
          rmb.closest('.cmsg').remove(); C.posts = (C.posts || []).filter(x => x.id !== rmb.dataset.rmpost); if (C.layer) drawPosts(); toast('Photo removed'); return;
        }
        if (e.target.closest('[data-rj]')) { const a = await ask({ title: 'Reject this photo?', message: 'Pick a reason. The uploader sees it.', options: ['Not in New York City', 'Wrong or unclear location', 'Copyright: not theirs to share', 'Low quality or duplicate', 'Breaks the rules'].map(v => ({ label: v, value: v })), input: { placeholder: 'Add a note (optional)' } }); if (!a) return; const note = a.text ? a.value + '. ' + a.text : a.value; const { error } = await C.sb.from('posts').update({ status: 'rejected', mod_note: note }).eq('id', id); if (error) return toast(error.message); card.remove(); toast('Rejected'); }
        C.pending = body.querySelectorAll('.cadm').length; return;
      }
      const d = e.target.closest('[data-done]');
      if (d) { const t = d.dataset.done, st = t === 'reports' ? 'resolved' : 'done'; const { error } = await C.sb.from(t).update({ status: st }).eq('id', d.dataset.id); if (error) return toast(error.message); d.closest('.cmsg').remove(); }
    };
  }

  // ---------- phone app: finish sign in when Google or the email link sends people back ----------
  if (NATIVE && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.startsWith(APP_CB)) return;
      try { window.Capacitor.Plugins.Browser.close(); } catch (e) {}
      await loadSB();
      const frag = new URLSearchParams(url.split('#')[1] || ''), q = new URLSearchParams((url.split('?')[1] || '').split('#')[0]);
      let r = {};
      if (frag.get('access_token')) r = await C.sb.auth.setSession({ access_token: frag.get('access_token'), refresh_token: frag.get('refresh_token') });
      else if (q.get('code')) r = await C.sb.auth.exchangeCodeForSession(q.get('code'));
      if (r.error) toast('Couldn\u2019t finish logging in'); else { closeAuth(); toast('You\u2019re logged in'); }
    });
  }

  if (NATIVE && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios') document.head.insertAdjacentHTML('beforeend', '<style>a[href*="support/"]{display:none!important}</style>');

  // ---------- start ----------
  if (/access_token|error_description/.test(location.hash)) loadSB();
  else {
    let lsHas = false; try { lsHas = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch (e) {}
    if (lsHas) (window.requestIdleCallback || setTimeout)(() => loadSB());
  }
})();
