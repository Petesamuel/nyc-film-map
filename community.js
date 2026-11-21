/* NYC Then and Now: community layer.
   Sign in (email link), profile, add a photo, community pins, reporting, and an admin review queue.
   Loaded after the main map script; uses its globals (map, L, dnav, dpanel, buildNav, openPanel, IC, esc, toast, closeDrawer, openDrawer). */
(function () {
  const SB = 'https://iurancbmhdizoafdhctq.supabase.co';
  const KEY = 'sb_publishable_bdXBpE0UULjIjYDNrHg83g_DsW0WUsb';
  const PUB = SB + '/storage/v1/object/public/uploads/';
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
  .cf input[type=text],.cf input[type=email],.cf input[type=number],.cf select,.cf textarea{width:100%;box-sizing:border-box;min-height:40px;border:1px solid var(--line);border-radius:10px;padding:9px 12px;font:inherit;font-size:15px;background:var(--paper);color:var(--ink)}
  .cf textarea{min-height:80px;resize:vertical}
  .cf .chk{display:flex;gap:8px;align-items:center;font-weight:400}
  .cf .row{display:flex;gap:8px;flex-wrap:wrap}
  .cf .note{font-size:13px;color:var(--muted);line-height:1.5;margin:0}
  .cf .ok{background:var(--soft);border-radius:10px;padding:12px;font-size:14px;line-height:1.5}
  .cf .err{color:#b3261e;font-size:13px}
  .cdrop{display:grid;place-items:center;gap:6px;border:2px dashed var(--line);border-radius:12px;min-height:150px;cursor:pointer;color:var(--muted);font-size:14px;text-align:center;overflow:hidden;background:var(--soft)}
  .cdrop img{width:100%;max-height:260px;object-fit:contain;background:#000}
  .cpill{display:inline-block;font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--soft);color:var(--muted);margin-left:6px}
  .cpill.approved{background:#e3f4e8;color:#1b6b36}.cpill.rejected,.cpill.removed{background:#fbe4e2;color:#a3261d}
  #cpick{position:fixed;inset:0;z-index:3400;pointer-events:none}
  #cpick .x{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-34px 0 0 -17px}
  #cpick .bar{pointer-events:auto;position:absolute;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom));max-width:440px;margin:0 auto;background:var(--paper);border-radius:16px;box-shadow:var(--shadow);padding:14px;display:grid;gap:10px;font-size:14px}
  #cpick .bar div{display:flex;gap:8px}
  #cmode{position:fixed;z-index:1000;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom));display:flex;background:var(--paper);border-radius:20px;box-shadow:var(--shadow);padding:3px}
  #cmode button{border:0;background:none;font:600 13px Figtree,sans-serif;color:var(--muted);height:32px;padding:0 14px;border-radius:16px;cursor:pointer}
  #cmode button.on{background:var(--ink);color:var(--paper)}
  .cpop img{width:100%;max-height:220px;object-fit:cover;border-radius:8px;display:block;background:var(--soft)}
  .cpop b{display:block;margin:8px 0 2px;font-size:14px}.cpop span{font-size:12.5px;color:var(--muted)}
  .cpop .row{display:flex;justify-content:space-between;margin-top:8px;font-size:12.5px}
  .cpop button{border:0;background:none;color:var(--muted);font:inherit;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:0}
  .cadm{padding:10px 20px;border-bottom:1px solid var(--line)}
  .cadm img{width:100%;max-height:240px;object-fit:contain;background:#000;border-radius:8px}
  .cadm b{display:block;margin-top:8px}.cadm p{margin:4px 0;font-size:13px;color:var(--muted)}
  .cadm .row{display:flex;gap:8px;margin-top:8px}
  .cmsg{padding:10px 20px;border-bottom:1px solid var(--line);font-size:13.5px;line-height:1.45}
  .cmsg small{color:var(--muted);display:block}
  #cadd{position:fixed;inset:0;z-index:3500;background:var(--paper);display:flex;flex-direction:column}
  #cadd[hidden]{display:none}
  #cadd header{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;height:calc(54px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 6px 0;border-bottom:1px solid var(--line);font-weight:700;font-size:16px;text-align:center;color:var(--ink)}
  #cadd header button{width:44px;height:44px;border:0;background:none;color:var(--ink);cursor:pointer;display:grid;place-items:center;border-radius:50%}
  #cadd .cb{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;width:100%;max-width:560px;margin:0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
  .cfab{width:56px;height:56px;border-radius:50%;border:0;background:var(--accent,#f2b705);color:#1d1c1a;box-shadow:0 4px 14px rgba(0,0,0,.28);display:grid;place-items:center;cursor:pointer;margin-top:12px!important}
  .cfab:active{transform:scale(.96)}
  .cfab:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
  #cauth{position:fixed;inset:0;z-index:4000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}
  #cauth[hidden]{display:none}
  #cauth .box{background:#fff;color:#222;width:100%;max-width:420px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);overflow:hidden;font-family:Figtree,system-ui,sans-serif}
  #cauth header{position:relative;display:flex;align-items:center;justify-content:center;height:56px;border-bottom:1px solid #ebebeb;font-weight:700;font-size:16px}
  #cauth header button{position:absolute;left:12px;top:10px;width:36px;height:36px;border:0;background:none;border-radius:50%;cursor:pointer;display:grid;place-items:center}
  #cauth header button:hover{background:#f2f2f2}
  #cauth .in{padding:24px}
  #cauth h2{font-size:22px;margin:0 0 6px;font-weight:700}
  #cauth p{margin:0 0 18px;font-size:14px;color:#6a6a6a;line-height:1.45}
  .gbtn-g{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:44px;border:1px solid #747775;border-radius:22px;background:#fff;color:#1f1f1f;font:500 14px Roboto,Arial,sans-serif;cursor:pointer}
  .gbtn-g:hover{background:#f8f9fa;box-shadow:0 1px 2px rgba(60,64,67,.3)}
  .gbtn-g svg{width:20px;height:20px}
  #cauth .or{display:flex;align-items:center;gap:12px;margin:18px 0;color:#6a6a6a;font-size:12px}
  #cauth .or:before,#cauth .or:after{content:"";flex:1;height:1px;background:#ebebeb}
  #cauth input{width:100%;box-sizing:border-box;height:48px;border:1px solid #b0b0b0;border-radius:8px;padding:0 14px;font:inherit;font-size:16px}
  #cauth input:focus{outline:none;border-color:#222;box-shadow:0 0 0 1px #222}
  #cauth .pri{width:100%;height:48px;margin-top:12px;border:0;border-radius:24px;background:#1d1c1a;color:#fff;font:inherit;font-weight:600;font-size:15px;cursor:pointer}
  #cauth .pri:disabled{opacity:.5}
  #cauth .fine{font-size:12px;color:#6a6a6a;margin:16px 0 0;line-height:1.5}
  #cauth .fine a{color:#222}
  #cauth .err{color:#c13515;font-size:13px;margin-top:8px}
  #cauth .lnk{border:0;background:none;padding:0;font:inherit;font-size:14px;font-weight:600;text-decoration:underline;cursor:pointer;color:#222}
  @media (max-width:560px){#cauth{align-items:flex-end;padding:0}#cauth .box{max-width:none;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom)}}
  @media (prefers-reduced-motion:reduce){#cmode button{transition:none}}
  </style>`);

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
    refreshNav();
    if (location.hash.includes('access_token')) { history.replaceState(null, '', location.pathname + location.search); toast('You’re signed in'); }
  }
  function refreshNav() { if (!dpanel.hidden) return; buildNav(); }
  function hasSession() { try { return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch (e) { return false; } }
  // public reads without the SDK
  const rest = (path) => fetch(SB + '/rest/v1/' + path, { headers: { apikey: KEY } }).then(r => r.ok ? r.json() : []);

  // ---------- menu ----------
  const _buildNav = buildNav;
  buildNav = function () {
    _buildNav();
    const who = C.prof ? (C.prof.display_name || '@' + C.prof.username) : '';
    const top = `<button class="ditem" data-p="account">${ICU}${C.user ? esc(who) : 'Log in or sign up'}</button>
      ${C.prof && C.prof.role === 'admin' ? `<button class="ditem" data-p="admin">${ICS}Review and inbox<span class="n">${C.pending || ''}</span></button>` : ''}
      <div class="dsep"></div>`;
    dnav.insertAdjacentHTML('afterbegin', top);
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
  function openAuth(why) {
    closeDrawer();
    if (!AUTH) {
      AUTH = document.createElement('div'); AUTH.id = 'cauth'; AUTH.setAttribute('role', 'dialog'); AUTH.setAttribute('aria-modal', 'true'); AUTH.setAttribute('aria-label', 'Log in or sign up');
      document.body.appendChild(AUTH);
      AUTH.addEventListener('click', e => { if (e.target === AUTH) closeAuth(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && AUTH && !AUTH.hidden) closeAuth(); });
    }
    AUTH.hidden = false;
    AUTH.innerHTML = `<div class="box"><header><button type="button" data-x aria-label="Close">${XICO}</button>Log in or sign up</header><div class="in">
      <h2>Welcome to NYC Then and Now</h2>
      <p>${why || 'Log in to share your own photos of the city and see them on the map.'}</p>
      <button type="button" class="gbtn-g" data-google>${GLOGO}<span>Continue with Google</span></button>
      <div class="or">or</div>
      <label for="cEmail" style="position:absolute;left:-9999px">Email</label>
      <input type="email" id="cEmail" autocomplete="email" placeholder="Email" inputmode="email">
      <button type="button" class="pri" data-email>Continue with email</button>
      <div class="err" id="cErr" role="alert"></div>
      <p class="fine">By continuing, you agree to the <a href="terms/">Terms of Use</a> and acknowledge the <a href="privacy/">Privacy Policy</a>.</p>
    </div></div>`;
    AUTH.querySelector('[data-x]').onclick = closeAuth;
    AUTH.querySelector('[data-google]').onclick = async () => {
      await loadSB();
      const { error } = await C.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) AUTH.querySelector('#cErr').textContent = error.message;
    };
    const go = async () => {
      const email = AUTH.querySelector('#cEmail').value.trim(), errEl = AUTH.querySelector('#cErr'), btn = AUTH.querySelector('[data-email]');
      if (!/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = 'Enter a valid email address.'; return; }
      btn.disabled = true; errEl.textContent = '';
      await loadSB();
      const { error } = await C.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      btn.disabled = false;
      if (error) { errEl.textContent = /rate limit/i.test(error.message) ? 'We can\u2019t send more emails right now. Try Continue with Google, or try again later.' : error.message; return; }
      AUTH.querySelector('.in').innerHTML = `<h2>Check your email</h2><p>We sent a sign in link to <b style="color:#222">${esc(email)}</b>. Open it on this device to finish. It can take a minute, and might land in spam.</p><button type="button" class="pri" data-done>Got it</button><p class="fine"><button type="button" class="lnk" data-back>Use a different email</button></p>`;
      AUTH.querySelector('[data-done]').onclick = closeAuth;
      AUTH.querySelector('[data-back]').onclick = () => openAuth(why);
    };
    AUTH.querySelector('[data-email]').onclick = go;
    AUTH.querySelector('#cEmail').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => AUTH.querySelector('[data-google]').focus(), 50);
  }
  function closeAuth() { if (AUTH) AUTH.hidden = true; }
  function signInForm(body, why) { showNavSafe(); openAuth(why); }
  function showNavSafe() { try { document.getElementById('dback').click(); } catch (e) {} }

  async function accountPanel(body, title) {
    title.textContent = C.user ? 'Your account' : 'Sign in';
    if (!C.user) { signInForm(body); return; }
    const p = C.prof || {};
    const { data: mine } = await C.sb.from('posts').select('id,title,status,thumb_key,image_key,created_at,mod_note').eq('user_id', C.user.id).order('created_at', { ascending: false });
    body.innerHTML = `<div class="cf">
      <p class="note">Logged in as ${esc(C.user.email || '')}</p>
      <label>Username <small>3 to 24 lowercase letters, numbers or _</small><input type="text" id="pUser" value="${esc(p.username || '')}" autocapitalize="off"></label>
      <label>Display name<input type="text" id="pName" maxlength="60" value="${esc(p.display_name || '')}"></label>
      <label>Neighborhood <small>optional</small><input type="text" id="pHood" maxlength="60" value="${esc(p.neighborhood || '')}" placeholder="e.g. Bed-Stuy"></label>
      <label>About you <small>optional</small><textarea id="pBio" maxlength="300">${esc(p.bio || '')}</textarea></label>
      <div class="row"><button class="btn" id="pSave">Save profile</button><button class="btn ghost" id="pOut">Log out</button></div>
      <div id="pMsg"></div></div>
      <div class="about" style="padding-top:0"><p><b>Your photos</b></p></div>
      ${(mine || []).length ? mine.map(m => `<div class="row2" data-cpost="${m.id}"><img src="${PUB + esc(m.thumb_key || m.image_key)}" alt=""><div><b>${esc(m.title)}<span class="cpill ${m.status}">${{ pending: 'In review', approved: 'Live', rejected: 'Not approved', removed: 'Removed' }[m.status]}</span></b><span>${new Date(m.created_at).toLocaleDateString()}${m.mod_note ? ' · ' + esc(m.mod_note) : ''}</span></div></div>`).join('') : '<p class="empty">Photos you add show up here. <a href="#" data-goadd>Add your first photo</a>.</p>'}`;
    body.querySelector('#pSave').onclick = async () => {
      const u = body.querySelector('#pUser').value.trim().toLowerCase(), msg = body.querySelector('#pMsg');
      if (!/^[a-z0-9_]{3,24}$/.test(u)) { msg.innerHTML = '<p class="err">Usernames are 3 to 24 lowercase letters, numbers or underscores.</p>'; return; }
      const upd = { username: u, display_name: body.querySelector('#pName').value.trim() || null, neighborhood: body.querySelector('#pHood').value.trim() || null, bio: body.querySelector('#pBio').value.trim() || null };
      const { error } = await C.sb.from('profiles').update(upd).eq('id', C.user.id);
      if (error) { msg.innerHTML = `<p class="err">${error.code === '23505' ? 'That username is taken. Try another.' : esc(error.message)}</p>`; return; }
      Object.assign(C.prof, upd); msg.innerHTML = '<p class="ok">Saved.</p>';
    };
    body.querySelector('#pOut').onclick = async () => { await C.sb.auth.signOut(); C.user = null; C.prof = null; toast('Logged out'); showNav(); buildNav(); };
    const ga = body.querySelector('[data-goadd]'); if (ga) ga.onclick = e => { e.preventDefault(); openAdd(); };
    body.querySelectorAll('[data-cpost]').forEach(r => r.onclick = () => { const post = C.posts.find(x => x.id === r.dataset.cpost); if (post) { closeDrawer(); setMode(C.mode === 'archive' ? 'both' : C.mode); map.setView([post.lat, post.lon], 18); } });
  }

  // ---------- add a photo ----------
  function addPanel(body, title) {
    title.textContent = 'Add a photo';
    if (!C.user) { signInForm(body, 'Sign in to add your photos to the map.'); return; }
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
      <p class="note">Only share photos you have the right to share. By submitting you let NYC Then and Now show it on the map, credited to your username. You can delete it any time.</p>
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
    if (!C.user && !hasSession()) { openAuth('Log in to add your photos to the map.'); return; }
    closeDrawer(); ADDV.hidden = false; document.body.style.overflow = 'hidden';
    ADDB.innerHTML = '<p class="empty">Loading\u2026</p>';
    loadSB().then(() => { ADDT.textContent = 'New photo'; if (!C.user) { closeAdd(); openAuth('Log in to add your photos to the map.'); return; } addPanel(ADDB, ADDT); ADDT.textContent = 'New photo'; });
  }
  function closeAdd() { ADDV.hidden = true; document.body.style.overflow = ''; }
  const Fab = L.Control.extend({ options: { position: 'bottomright' }, onAdd() {
    const b = L.DomUtil.create('button', 'cfab'); b.type = 'button'; b.setAttribute('aria-label', 'Add a photo'); b.title = 'Add a photo';
    b.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
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
    C.posts = await rest('posts?select=id,kind,title,description,year_taken,year_approx,lat,lon,place_label,image_key,thumb_key,created_at,profiles(username,display_name)&status=eq.approved&order=created_at.desc&limit=5000');
    drawPosts();
  }
  function drawPosts() {
    if (!C.layer) C.layer = L.layerGroup();
    C.layer.clearLayers();
    const sel = (typeof KINDSEL !== 'undefined') ? KINDSEL : new Set();
    C.posts.filter(p => !sel.size || sel.has(p.kind || 'p')).forEach(p => {
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
      <div class="row"><span>Shared by ${esc(by)}</span><button data-rep>Report</button></div>`;
    d.querySelector('[data-rep]').onclick = () => report('post', p.id);
    return d;
  }
  async function report(type, id) {
    const reason = prompt('What’s wrong? Type a number:\n1 Wrong location\n2 Copyright\n3 Offensive\n4 Spam\n5 Privacy\n6 Something else');
    const map6 = { 1: 'wrong_location', 2: 'copyright', 3: 'offensive', 4: 'spam', 5: 'privacy', 6: 'other' };
    if (!map6[(reason || '').trim()]) return;
    const r = await fetch(SB + '/rest/v1/reports', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(C.sb && C.user ? { Authorization: 'Bearer ' + (await C.sb.auth.getSession()).data.session.access_token } : {}) }, body: JSON.stringify({ target_type: type, target_id: id, reason: map6[reason.trim()], reporter_id: C.user ? C.user.id : null }) });
    toast(r.ok ? 'Thanks, I’ll take a look' : 'Couldn’t send the report');
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
    body.innerHTML =
      sec('Photos waiting for review', (pend.data || []).length) +
      ((pend.data || []).map(p => `<div class="cadm" data-id="${p.id}"><a href="${PUB + esc(p.image_key)}" target="_blank" rel="noopener"><img src="${PUB + esc(p.thumb_key || p.image_key)}" alt=""></a>
        <b>${esc(p.title)}</b><p>${[p.year_taken, p.place_label, '@' + (p.profiles ? p.profiles.username : '?'), { own_photo: 'Took it', family_photo: 'Family photo', permission: 'Has permission', public_domain: 'Public domain' }[p.rights]].filter(Boolean).map(esc).join(' · ')}</p>
        ${p.description ? `<p>${esc(p.description)}</p>` : ''}
        <div class="row"><button class="btn" data-ap>Approve</button><button class="btn ghost" data-rj>Reject</button><button class="btn ghost" data-see>See spot</button></div></div>`).join('') || '<p class="empty">Nothing waiting.</p>') +
      sec('Removal requests', (td.data || []).length) +
      ((td.data || []).map(t => `<div class="cmsg"><b>${esc(t.name)}</b> ${t.org ? '(' + esc(t.org) + ')' : ''} <a href="mailto:${esc(t.email)}">${esc(t.email)}</a><small>${new Date(t.created_at).toLocaleString()} · ${esc(t.ask)}</small><div>${esc(t.images)}</div>${t.notes ? `<small>${esc(t.notes)}</small>` : ''}<div class="row" style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost" data-done="takedown_requests" data-id="${t.id}">Mark done</button></div></div>`).join('') || '<p class="empty">None.</p>') +
      sec('Reports', (rp.data || []).length) +
      ((rp.data || []).map(r => `<div class="cmsg"><b>${esc(r.reason.replace('_', ' '))}</b> on ${esc(r.target_type)} <small>${esc(r.target_id)}</small>${r.details ? `<div>${esc(r.details)}</div>` : ''}<div style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost" data-done="reports" data-id="${r.id}">Resolve</button></div></div>`).join('') || '<p class="empty">None.</p>') +
      sec('Feedback', (fb.data || []).length) +
      ((fb.data || []).map(f => `<div class="cmsg"><b>${esc(f.type)}</b>${f.email ? ` · <a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}<small>${new Date(f.created_at).toLocaleString()}</small><div>${esc(f.message)}</div>${f.link ? `<small><a href="${esc(f.link)}" target="_blank" rel="noopener">${esc(f.link)}</a></small>` : ''}<div style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost" data-done="feedback" data-id="${f.id}">Done</button></div></div>`).join('') || '<p class="empty">No new feedback.</p>');
    body.onclick = async e => {
      const card = e.target.closest('.cadm');
      if (card) {
        const id = card.dataset.id, post = (pend.data || []).find(x => x.id === id);
        if (e.target.closest('[data-see]')) { closeDrawer(); map.setView([post.lat, post.lon], 18); return; }
        if (e.target.closest('[data-ap]')) { const { error } = await C.sb.from('posts').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id); if (error) return toast(error.message); card.remove(); C.loaded = false; if (C.layer) C.layer.clearLayers(); toast('Approved, it’s live'); }
        if (e.target.closest('[data-rj]')) { const note = prompt('Reason (the uploader sees this):', 'Not a New York City photo') || null; const { error } = await C.sb.from('posts').update({ status: 'rejected', mod_note: note }).eq('id', id); if (error) return toast(error.message); card.remove(); toast('Rejected'); }
        C.pending = body.querySelectorAll('.cadm').length; return;
      }
      const d = e.target.closest('[data-done]');
      if (d) { const t = d.dataset.done, st = t === 'reports' ? 'resolved' : 'done'; const { error } = await C.sb.from(t).update({ status: st }).eq('id', d.dataset.id); if (error) return toast(error.message); d.closest('.cmsg').remove(); }
    };
  }

  // ---------- start ----------
  if (/access_token|error_description/.test(location.hash)) loadSB();
  else {
    let lsHas = false; try { lsHas = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch (e) {}
    if (lsHas) (window.requestIdleCallback || setTimeout)(() => loadSB());
  }
})();
