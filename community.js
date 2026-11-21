/* NYC Then and Now: community layer.
   Sign in (email link), profile, add a photo, community pins, reporting, and an admin review queue.
   Loaded after the main map script; uses its globals (map, L, dnav, dpanel, buildNav, openPanel, IC, esc, toast, closeDrawer, openDrawer). */
(function () {
  const SB = 'https://iurancbmhdizoafdhctq.supabase.co';
  const KEY = 'sb_publishable_bdXBpE0UULjIjYDNrHg83g_DsW0WUsb';
  const PUB = SB + '/storage/v1/object/public/uploads/';
  const C = { sb: null, user: null, prof: null, posts: [], layer: null, mode: 'archive', pending: 0 };
  const ADD = { file: null, preview: '', title: '', year: '', approx: false, desc: '', rights: '', place: '', ll: null, method: '' };
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
  @media (max-width:560px){#cmode{bottom:calc(50px + env(safe-area-inset-bottom))}}
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
  // public reads without the SDK
  const rest = (path) => fetch(SB + '/rest/v1/' + path, { headers: { apikey: KEY } }).then(r => r.ok ? r.json() : []);

  // ---------- menu ----------
  const _buildNav = buildNav;
  buildNav = function () {
    _buildNav();
    const who = C.prof ? (C.prof.display_name || '@' + C.prof.username) : '';
    const top = `<button class="ditem" data-p="account">${ICU}${C.user ? esc(who) : 'Sign in or create account'}</button>
      <button class="ditem" data-p="addphoto">${ICP}Add a photo</button>
      ${C.prof && C.prof.role === 'admin' ? `<button class="ditem" data-p="admin">${ICS}Review and inbox<span class="n">${C.pending || ''}</span></button>` : ''}
      <div class="dsep"></div>`;
    dnav.insertAdjacentHTML('afterbegin', top);
  };
  const _openPanel = openPanel;
  openPanel = function (p) {
    if (p === 'account' || p === 'addphoto' || p === 'admin') {
      const body = dpanel.querySelector('.dbody'), title = dpanel.querySelector('.back span');
      dnav.hidden = true; dpanel.hidden = false;
      body.innerHTML = '<p class="empty">Loading…</p>';
      loadSB().then(() => { if (p === 'account') accountPanel(body, title); else if (p === 'addphoto') addPanel(body, title); else adminPanel(body, title); })
        .catch(() => { body.innerHTML = '<p class="empty">Couldn’t connect. Check your connection and try again.</p>'; });
      return;
    }
    _openPanel(p);
  };

  // ---------- account ----------
  function signInForm(body, why) {
    body.innerHTML = `<div class="cf">
      ${why ? `<p class="note">${why}</p>` : ''}
      <p class="note">Enter your email and we’ll send you a link to sign in. No password needed. New here? The same link creates your account.</p>
      <label>Email<input type="email" id="cEmail" autocomplete="email" placeholder="you@example.com"></label>
      <button class="btn" id="cSend">Email me a sign in link</button>
      <p class="note">By signing in you agree to the <a href="terms/">Terms</a> and <a href="privacy/">Privacy</a> policy.</p>
      <div id="cMsg"></div></div>`;
    const go = async () => {
      const email = body.querySelector('#cEmail').value.trim(), msg = body.querySelector('#cMsg');
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.innerHTML = '<p class="err">Enter a valid email address.</p>'; return; }
      body.querySelector('#cSend').disabled = true;
      const { error } = await C.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      body.querySelector('#cSend').disabled = false;
      msg.innerHTML = error ? `<p class="err">${/rate limit/i.test(error.message) ? 'Too many sign in emails went out in the last hour. If you already asked for one, check your inbox and spam folder. Otherwise try again in a little while.' : esc(error.message)}</p>` : `<p class="ok">Check your inbox for a link from Supabase and open it on this device. It can take a minute.</p>`;
    };
    body.querySelector('#cSend').onclick = go;
    body.querySelector('#cEmail').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  async function accountPanel(body, title) {
    title.textContent = C.user ? 'Your account' : 'Sign in';
    if (!C.user) { signInForm(body); return; }
    const p = C.prof || {};
    const { data: mine } = await C.sb.from('posts').select('id,title,status,thumb_key,image_key,created_at,mod_note').eq('user_id', C.user.id).order('created_at', { ascending: false });
    body.innerHTML = `<div class="cf">
      <p class="note">Signed in as ${esc(C.user.email || '')}</p>
      <label>Username <small>3 to 24 lowercase letters, numbers or _</small><input type="text" id="pUser" value="${esc(p.username || '')}" autocapitalize="off"></label>
      <label>Display name<input type="text" id="pName" maxlength="60" value="${esc(p.display_name || '')}"></label>
      <label>Neighborhood <small>optional</small><input type="text" id="pHood" maxlength="60" value="${esc(p.neighborhood || '')}" placeholder="e.g. Bed-Stuy"></label>
      <label>About you <small>optional</small><textarea id="pBio" maxlength="300">${esc(p.bio || '')}</textarea></label>
      <div class="row"><button class="btn" id="pSave">Save profile</button><button class="btn ghost" id="pOut">Sign out</button></div>
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
    body.querySelector('#pOut').onclick = async () => { await C.sb.auth.signOut(); C.user = null; C.prof = null; toast('Signed out'); openPanel('account'); };
    const ga = body.querySelector('[data-goadd]'); if (ga) ga.onclick = e => { e.preventDefault(); openPanel('addphoto'); };
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
    const keep = () => { ADD.title = $('#aTitle').value; ADD.year = $('#aYear').value; ADD.approx = $('#aApprox').checked; ADD.place = $('#aPlace').value; ADD.desc = $('#aDesc').value; ADD.rights = $('#aRights').value; };
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
    closeDrawer();
    if (start) map.setView(start, 18);
    const el = document.createElement('div'); el.id = 'cpick';
    el.innerHTML = `<svg class="x" viewBox="0 0 24 34"><path d="M12 33s11-12.4 11-21A11 11 0 0 0 1 12c0 8.6 11 21 11 21z" fill="#1d1c1a" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#f2b705"/></svg>
      <div class="bar"><span>Move the map so the pin sits where the photo was taken.</span><div><button class="btn" id="cpOk">Use this spot</button><button class="btn ghost" id="cpNo">Cancel</button></div></div>`;
    document.body.appendChild(el);
    const end = ok => { const c = map.getCenter(); el.remove(); openDrawer(); if (ok) done([c.lat, c.lng]); openPanel('addphoto'); };
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
      r = await C.sb.from('posts').insert({ user_id: C.user.id, title: ADD.title.trim(), description: ADD.desc.trim() || null, year_taken: yr, year_approx: ADD.approx, lat: ADD.ll[0], lon: ADD.ll[1], place_label: ADD.place.trim() || null, pin_method: ADD.method || 'manual', image_key: key, thumb_key: tkey, width: big.w, height: big.h, rights: ADD.rights });
      if (r.error) throw r.error;
      Object.assign(ADD, { file: null, preview: '', title: '', year: '', approx: false, desc: '', rights: '', place: '', ll: null, method: '' });
      body.innerHTML = `<div class="cf"><p class="ok"><b>Thanks, it’s in.</b><br>Your photo will show on the map once it’s reviewed. You can see its status under Your account.</p><div class="row"><button class="btn" id="aMore">Add another</button><button class="btn ghost" id="aAcct">Your account</button></div></div>`;
      body.querySelector('#aMore').onclick = () => openPanel('addphoto');
      body.querySelector('#aAcct').onclick = () => openPanel('account');
      if (C.prof && C.prof.role === 'admin') C.pending++;
    } catch (e) { btn.disabled = false; btn.textContent = 'Submit for review'; err(esc(e.message || 'Upload failed. Try again.')); }
  }

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
    C.posts = await rest('posts?select=id,title,description,year_taken,year_approx,lat,lon,place_label,image_key,thumb_key,created_at,profiles(username,display_name)&status=eq.approved&order=created_at.desc&limit=5000');
    if (!C.layer) C.layer = L.layerGroup();
    C.posts.forEach(p => {
      const m = L.circleMarker([p.lat, p.lon], { pane: 'cpane', radius: 8, weight: 3, color: '#f2b705', fillColor: '#1d1c1a', fillOpacity: 1 });
      m.bindPopup(() => postPopup(p), { maxWidth: 300, minWidth: 240, className: 'cpopw' });
      C.layer.addLayer(m);
    });
  }
  map.createPane('cpane'); map.getPane('cpane').style.zIndex = 640;
  function postPopup(p) {
    const by = p.profiles ? (p.profiles.display_name || '@' + p.profiles.username) : 'a contributor';
    const yr = p.year_taken ? (p.year_approx ? 'around ' : '') + p.year_taken : '';
    const d = document.createElement('div'); d.className = 'cpop';
    d.innerHTML = `<a href="${PUB + esc(p.image_key)}" target="_blank" rel="noopener"><img src="${PUB + esc(p.thumb_key || p.image_key)}" alt="${esc(p.title)}"></a>
      <b>${esc(p.title)}</b><span>${[yr, p.place_label].filter(Boolean).map(esc).join(' · ')}</span>
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
