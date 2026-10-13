// Ask Captain Jim — Captain's Brief.
//
// Two places in the app:
//  1. A headline strip under the score card on Today (free): the top 1–2 items within
//     STRIP_MILES of the chosen location that are on now or start within a week, Safety first.
//     With nothing nearby it collapses to a one-line "All clear near you".
//  2. The Brief tab in the bottom nav (needs an active trial or subscription, like the Wind
//     map): every approved item, nearest first, grouped Safety / Plan Ahead / Fun.
//
// Items come from the Daily Brief Google Sheet via the weather Worker's /brief route, which
// only ever returns rows Russ has approved and whose End Date hasn't passed. If the feed
// isn't reachable the strip stays hidden and the tab says so; nothing else depends on it.
(function(){
  const FEED = "https://askcaptainjim-weather.russjamieson.workers.dev/brief";
  const STRIP_MILES = 50, NEAR_MILES = 100, SOON_DAYS = 7;
  const ORDER = { "Safety": 0, "Plan Ahead": 1, "Fun": 2 };
  const ICON = { "Safety": "⚠️", "Plan Ahead": "🧭", "Fun": "🎉" };
  let items = null, failed = false, scope = 'near';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const plusDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function miles(lat1, lon1, lat2, lon2){
    const R = 3959, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  // Items with a map point get a distance from the chosen location; the rest (region-wide notices) get null.
  function withDistance(){
    const c = activeSearchCenter(), today = todayStr();
    return (items || [])
      .filter(i => !i.end || i.end >= today)
      .map(i => ({ ...i, mi: i.lat != null && i.lon != null ? miles(c.lat, c.lon, i.lat, i.lon) : null }));
  }
  const byPriorityThenDistance = (a, b) => (ORDER[a.priority] ?? 1) - (ORDER[b.priority] ?? 1) || (a.mi ?? 1e9) - (b.mi ?? 1e9);

  async function load(){
    try{
      const r = await fetch(FEED);
      if(!r.ok) throw new Error('brief ' + r.status);
      items = (await r.json()).items || [];
      try{ localStorage.setItem('acj.brief.cache', JSON.stringify(items)); }catch(_){}
    }catch(e){
      console.warn('Captain\'s Brief unavailable:', e.message);
      try{ items = JSON.parse(localStorage.getItem('acj.brief.cache') || 'null'); }catch(_){ items = null; }
      failed = !items;
    }
    renderStrip(); if(isOpen()) renderTab();
  }

  // ---- Today strip ----
  function renderStrip(){
    const el = document.getElementById('brief-strip');
    if(!el) return;
    if(!items){ el.style.display = 'none'; return; }
    const soon = plusDays(SOON_DAYS);
    const near = withDistance()
      .filter(i => i.mi != null && i.mi <= STRIP_MILES && (!i.start || i.start <= soon))
      .sort(byPriorityThenDistance).slice(0, 2);
    el.style.display = '';
    el.innerHTML = `<div class="bs-head"><span>⚓ Captain's Brief</span><button type="button" class="bs-all" onclick="openBriefView()">See all ›</button></div>` +
      (near.length ? near.map(i => `<button type="button" class="bs-item bs-${(ORDER[i.priority] ?? 1)}" onclick="openBriefView()">
          <span class="bs-ico">${ICON[i.priority] || '🧭'}</span>
          <span class="bs-txt"><strong>${esc(i.item)}</strong><span>${esc(i.location)} · ${Math.round(i.mi)} mi · ${esc(i.when)}</span></span></button>`).join('')
        : `<div class="bs-clear">All clear near you — nothing in the Brief within ${STRIP_MILES} mi this week.</div>`);
  }

  // ---- Brief tab ----
  const isOpen = () => document.getElementById('brief-view')?.style.display === 'flex';
  function card(i){
    const src = safeUrl(i.source);
    return `<div class="bc bc-${(ORDER[i.priority] ?? 1)}">
      <div class="bc-top"><span class="bc-cat">${esc(i.category)}</span>${i.mi != null ? `<span class="bc-mi">${Math.round(i.mi)} mi</span>` : ''}</div>
      <div class="bc-item">${esc(i.item)}</div>
      <div class="bc-loc">${esc(i.location)}${i.state ? ', ' + esc(i.state) : ''}</div>
      ${i.when ? `<div class="bc-when">🗓 ${esc(i.when)}</div>` : ''}
      ${i.details ? `<div class="bc-det">${esc(i.details)}</div>` : ''}
      ${i.notes ? `<div class="bc-note"><strong>Captain's note:</strong> ${esc(i.notes)}</div>` : ''}
      ${src ? `<a class="bc-src" href="${esc(src)}" target="_blank" rel="noopener">Source ›</a>` : ''}
    </div>`;
  }
  function renderTab(){
    const body = document.getElementById('brief-body');
    if(!body) return;
    document.querySelectorAll('#brief-scope button').forEach(b => b.classList.toggle('on', b.dataset.scope === scope));
    if(failed){ body.innerHTML = `<div class="bc-empty">The Captain's Brief isn't available right now. Check back soon.</div>`; return; }
    if(!items){ body.innerHTML = `<div class="bc-empty">Loading the Captain's Brief…</div>`; return; }
    let list = withDistance();
    if(scope === 'near') list = list.filter(i => i.mi != null && i.mi <= NEAR_MILES);
    list.sort(byPriorityThenDistance);
    if(!list.length){
      body.innerHTML = `<div class="bc-empty">Nothing in the Brief within ${NEAR_MILES} mi of ${esc(document.getElementById('loc-name')?.textContent || 'you')}. Tap <strong>Whole Gulf</strong> to see everything.</div>`;
      return;
    }
    body.innerHTML = Object.keys(ORDER).map(p => {
      const group = list.filter(i => (i.priority in ORDER ? i.priority : 'Plan Ahead') === p);
      return group.length ? `<div class="bg-title">${ICON[p]} ${p}</div>` + group.map(card).join('') : '';
    }).join('');
  }

  function injectCss(){
    const css = document.createElement('style');
    css.textContent = `
      #brief-strip{margin-top:var(--sp3);background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-lg);padding:var(--sp3) var(--sp4)}
      #brief-strip .bs-head{display:flex;justify-content:space-between;align-items:center;font-size:var(--sm);font-weight:700;margin-bottom:var(--sp2)}
      #brief-strip .bs-all{background:none;border:0;color:var(--primary);font-weight:600;font-size:var(--sm);cursor:pointer;padding:4px 0}
      #brief-strip .bs-item{display:flex;gap:var(--sp3);align-items:flex-start;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--divider);padding:var(--sp2) 0;color:var(--text);cursor:pointer;font:inherit}
      #brief-strip .bs-item:first-of-type{border-top:0}
      #brief-strip .bs-ico{font-size:18px;line-height:1.3}
      #brief-strip .bs-txt{display:flex;flex-direction:column;gap:2px;font-size:var(--sm)}
      #brief-strip .bs-txt span{color:var(--muted);font-size:var(--xs)}
      #brief-strip .bs-0 strong{color:var(--error)}
      #brief-strip .bs-clear{font-size:var(--sm);color:var(--muted)}
      #brief-scope{display:flex;gap:var(--sp2);padding:var(--sp3) var(--sp4) 0;max-width:600px;width:100%;margin:0 auto;box-sizing:border-box}
      #brief-scope button{flex:1;padding:10px;border-radius:999px;border:1px solid var(--divider);background:var(--surface);color:var(--text);font-weight:600;font-size:var(--sm);cursor:pointer}
      #brief-scope button.on{background:var(--primary);border-color:var(--primary);color:#fff}
      #brief-body{flex:1;overflow-y:auto;padding:var(--sp4) var(--sp4) var(--sp12);display:flex;flex-direction:column;gap:var(--sp3);max-width:600px;width:100%;margin:0 auto;box-sizing:border-box}
      #brief-body .bg-title{font-size:var(--sm);font-weight:700;margin-top:var(--sp2)}
      #brief-body .bc{background:var(--surface);border:1px solid var(--divider);border-left:4px solid var(--primary);border-radius:var(--r-lg);padding:var(--sp3) var(--sp4);display:flex;flex-direction:column;gap:6px}
      #brief-body .bc-0{border-left-color:var(--error)} #brief-body .bc-2{border-left-color:var(--gold)}
      #brief-body .bc-top{display:flex;justify-content:space-between;font-size:var(--xs);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
      #brief-body .bc-item{font-weight:700;font-size:var(--base, 16px)}
      #brief-body .bc-loc,#brief-body .bc-when{font-size:var(--sm);color:var(--muted)}
      #brief-body .bc-det,#brief-body .bc-note{font-size:var(--sm)}
      #brief-body .bc-note{background:var(--primary-hl);border-radius:var(--r-md, 8px);padding:var(--sp2) var(--sp3)}
      #brief-body .bc-src{font-size:var(--sm);color:var(--primary);font-weight:600;text-decoration:none;align-self:flex-start}
      #brief-body .bc-empty{font-size:var(--sm);color:var(--muted);text-align:center;padding:var(--sp8) var(--sp4)}`;
    document.head.appendChild(css);
  }

  window.openBriefView = function(){
    if(trialStatus().state === 'expired'){ openSubscribeModal('locked'); return; }
    document.getElementById('brief-view').style.display = 'flex';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-brief')?.classList.add('active');
    const loc = document.getElementById('brief-loc');
    if(loc) loc.textContent = 'Near ' + (document.getElementById('loc-name')?.textContent || 'you');
    renderTab();
  };
  window.closeBriefView = function(){
    document.getElementById('brief-view').style.display = 'none';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.nav-item[data-tab="today"]')?.classList.add('active');
  };
  window.setBriefScope = function(s){ scope = s; renderTab(); };

  function init(){
    injectCss();
    // Re-rank the strip whenever the location changes (loadAll rewrites #loc-name).
    const name = document.getElementById('loc-name');
    if(name) new MutationObserver(renderStrip).observe(name, { childList: true, characterData: true, subtree: true });
    load();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
