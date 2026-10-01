// Ask Captain Jim — marinas from Google Places (add-on, loaded after the engine).
//
// Why (Russ, 2026-09-30): standing beside Pier One Marina on Pensacola Beach, it wasn't in the
// Marina list, and searching for it "did nothing". Causes: (1) the "nearby marinas" feed used the
// free OpenStreetMap Overpass servers, which were timing out or returning nothing, and Pier One
// isn't in OpenStreetMap anyway; (2) search only filtered the list as you typed — Return did
// nothing, and no matches just showed a blank list.
//
// What this does, without editing engine.js (the 60 /locations/ pages inline their own copy):
//   - Replaces fetchNearbyMarinas() with Google Places "marinas within ~25 mi", via the
//     askcaptainjim-weather Worker (which holds the Google key).
//   - Turns off the engine's 24 h localStorage copy of nearby marinas: Google's terms don't allow
//     storing Places content. Results are reused in memory for 30 min only, to limit cost.
//   - Search: "no matches" message with a "Search Google" button and a Google Maps link; Return
//     runs the Google search directly when the list has no match, and closes the phone keyboard.
//     Google searches are centred on the user's GPS position when location is already allowed.
(function(){
  const PROXY = 'https://askcaptainjim-weather.russjamieson.workers.dev';
  const MEMO_MS = 30 * 60 * 1000;
  const memo = new Map();   // "lat,lon" (2 dp) -> { at, data }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  // Shape the Worker's results like the engine's old Overpass entries so buildMarinaCards() can use them.
  const toLive = p => ({ name: p.name, lat: p.lat, lon: p.lon, sub: p.address, tags: { phone: p.phone, website: p.website }, google: p });

  window.fetchNearbyMarinas = async function(lat, lon){
    const k = lat.toFixed(2) + ',' + lon.toFixed(2), hit = memo.get(k);
    if(hit && Date.now() - hit.at < MEMO_MS) return hit.data;
    const res = await fetch(`${PROXY}/places/nearby?lat=${lat}&lon=${lon}`);
    if(!res.ok) throw new Error('Places nearby ' + res.status);
    const data = (await res.json()).map(toLive);
    memo.set(k, { at: Date.now(), data });
    return data;
  };
  window.loadMarinaCacheLs = () => null;
  window.saveMarinaCacheLs = () => {};

  // ---- Search ----
  const css = document.createElement('style');
  css.textContent = `
    .acj-nomatch{padding:14px;border:1px dashed var(--divider);border-radius:16px;color:var(--muted);font-size:15px;line-height:1.45;display:flex;flex-direction:column;gap:10px}
    .acj-nomatch strong{color:var(--text)}
    .acj-nomatch button{align-self:flex-start;background:#f26a3d;color:#fff;border:0;border-radius:999px;padding:10px 16px;font:600 15px/1.2 inherit;cursor:pointer}
    .acj-nomatch a{color:var(--primary);font-weight:600;text-decoration:none}
    .acj-gtag{font-size:11px;font-weight:700;color:var(--primary);background:var(--primary-hl);padding:1px 7px;border-radius:99px;vertical-align:middle}`;
  document.head.appendChild(css);

  // The /locations/ pages carry an older inline engine without EDITION_CONFIG, so don't assume it.
  const thumb = () => { try{ return marinaPhoto(typeof EDITION_CONFIG !== 'undefined' ? EDITION_CONFIG.defaultLocKey : ''); }catch(_){ return ''; } };
  const mapsLink = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const input = () => document.getElementById('marina-search-input');
  const results = () => document.getElementById('marina-results');
  const query = () => (input()?.value || '').trim();
  const listHasMatches = () => !!results()?.querySelector('.marina-card');

  // Where to centre a Google search: the user's GPS if they've already allowed location (no new
  // permission prompt), otherwise the marina they've chosen in the app.
  async function searchCenter(){
    const fallback = activeSearchCenter();
    try{
      const perm = navigator.permissions && await navigator.permissions.query({ name: 'geolocation' });
      if(perm && perm.state === 'granted'){
        const pos = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { timeout: 4000, maximumAge: 300000 }));
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      }
    }catch(_){}
    return fallback;
  }

  function showNoMatch(q, note){
    const wrap = results(); if(!wrap) return;
    wrap.querySelector('.acj-nomatch')?.remove();
    const div = document.createElement('div');
    div.className = 'acj-nomatch';
    div.innerHTML = note
      ? `<div>${note}</div><a href="${mapsLink(q + ' marina')}" target="_blank" rel="noopener">Open “${esc(q)}” in Google Maps ↗</a>`
      : `<div>No marinas in the list match <strong>“${esc(q)}”</strong>.</div>
         <button type="button">Search Google for “${esc(q)}”</button>
         <a href="${mapsLink(q + ' marina')}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`;
    div.querySelector('button')?.addEventListener('click', () => searchGoogle(q));
    wrap.appendChild(div);
  }

  function renderGoogleResults(list, center){
    const wrap = results(); if(!wrap) return;
    wrap.innerHTML = '';
    for(const p of list){
      const m = { id: 'g-' + p.id, name: p.name, lat: p.lat, lon: p.lon, sub: p.address };
      const dist = Math.round(distMiles(center.lat, center.lon, p.lat, p.lon));
      const card = document.createElement('div');
      card.className = 'marina-card';
      card.onclick = () => selectMarinaFromCard(m.id, m);
      card.innerHTML = `
        <img class="marina-thumb" src="${thumb()}" alt="" loading="lazy">
        <div class="marina-main">
          <div class="marina-title">${esc(p.name)} <span class="acj-gtag">Google</span></div>
          <div class="marina-meta">
            ${p.rating ? `<span>★ ${p.rating}${p.reviews ? ' (' + p.reviews + ')' : ''}</span>` : ''}
            <span>${p.rating ? '• ' : ''}${dist} mi</span>
          </div>
          ${p.address ? `<div class="marina-meta"><a href="${esc(p.mapsUrl || mapsLink(p.name + ' ' + p.address))}" target="_blank" rel="noopener" style="color:var(--muted);text-decoration:none;font-size:12px" onclick="event.stopPropagation()">📍 ${esc(p.address)}</a></div>` : ''}
          ${p.phone ? `<div class="marina-meta"><a href="tel:${esc(p.phone.replace(/[^0-9+]/g, ''))}" style="color:var(--primary);font-weight:600;text-decoration:none" onclick="event.stopPropagation()">📞 ${esc(p.phone)}</a></div>` : ''}
        </div>`;
      wrap.appendChild(card);
    }
  }

  async function searchGoogle(q){
    const wrap = results(); if(!wrap || q.length < 2) return;
    wrap.innerHTML = `<div style="padding:14px;color:var(--muted)">Searching Google for “${esc(q)}”…</div>`;
    try{
      const c = await searchCenter();
      const res = await fetch(`${PROXY}/places/search?q=${encodeURIComponent(q)}&lat=${c.lat}&lon=${c.lon}`);
      if(!res.ok) throw new Error('Places search ' + res.status);
      const list = await res.json();
      if(!list.length){ wrap.innerHTML = ''; showNoMatch(q, `Google didn’t find a marina called <strong>“${esc(q)}”</strong>.`); return; }
      renderGoogleResults(list, c);
    }catch(e){
      console.warn('Marina search:', e);
      wrap.innerHTML = '';
      showNoMatch(q, 'Search isn’t available right now.');
    }
  }

  // After every list rebuild (the search box calls buildMarinaCards() on each keystroke), say
  // so when nothing matches instead of leaving a blank list.
  const origBuild = window.buildMarinaCards;
  window.buildMarinaCards = async function(){
    await origBuild.apply(this, arguments);
    const q = query();
    if(q && !listHasMatches()) showNoMatch(q);
  };

  // Return = search: close the keyboard, and go to Google if the list has nothing for it.
  function wireInput(){
    const el = input(); if(!el || el.dataset.acjWired) return;
    el.dataset.acjWired = '1';
    el.setAttribute('enterkeyhint', 'search');
    el.addEventListener('keydown', async e => {
      if(e.key !== 'Enter') return;
      e.preventDefault();
      el.blur();
      await window.buildMarinaCards();
      const q = query();
      if(q && !listHasMatches()) searchGoogle(q);
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireInput); else wireInput();
})();
