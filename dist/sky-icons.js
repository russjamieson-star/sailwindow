// Ask Captain Jim — weather icons + slider preferences (add-on, loaded after the engine).
//
// Russ, 2026-10-08, after reviewing a mock-up: "much nicer, add them to the app."
//   1. A sky icon on the Today score card, picked from the best window's forecast.
//   2. Small icons on the score card's reason tags (wind, gusts, rain, storms, direction).
//   3. A sky icon on each 7-Day forecast card.
//   4. Slider/segmented-control wiring for the Sailing Preferences sheet (the markup lives in
//      index.html; the inputs keep their old ids, so savePrefs()/openModal() work unchanged).
// Icons: Meteocons by Bas Milius (MIT, see /icons/LICENSE-meteocons.txt). Animated SVGs in
// /icons/, still versions in /icons/still/ for people who turn on "reduce motion".
// Kept as an add-on rather than edited into engine.js, like marina-hints.js / marina-places.js.
(function(){
  const css = document.createElement('style');
  css.textContent = `
    .acj-sky{width:72px;height:72px;display:block;margin:-8px -6px -4px auto}
    .acj-sky[hidden]{display:none}
    .rtag.acj-rt{display:inline-flex;align-items:center;gap:2px}
    .rtag .acj-ti{display:block;width:22px;height:22px;margin:-4px 0 -4px -7px}
    .acj-day-l{display:flex;align-items:center;gap:var(--sp2)}
    /* the 7-day list is a flex column: without this, a long week squeezes cards and clips their text */
    #sevenday-body .day-card{flex-shrink:0}
    .acj-day-i{width:48px;height:48px;margin:-6px -2px -6px -6px;flex-shrink:0}
    .sl-h{display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp3)}
    .sl-h output{font-family:var(--mono);font-weight:500;color:var(--primary)}
    .sl-ctl input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:34px;background:transparent;margin:0;padding:0}
    .sl-ctl input[type=range]:focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:6px}
    .sl-ctl input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:var(--track,var(--divider))}
    .sl-ctl input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:var(--track,var(--divider))}
    .sl-ctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:var(--surface);border:3px solid var(--primary);margin-top:-10px;box-shadow:var(--sh-sm);cursor:grab}
    .sl-ctl input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--surface);border:3px solid var(--primary);box-shadow:var(--sh-sm);cursor:grab}
    .sl-dual{position:relative;height:34px}
    .sl-dual input{position:absolute;inset:0;pointer-events:none}
    .sl-dual input::-webkit-slider-thumb{pointer-events:auto}
    .sl-dual input::-moz-range-thumb{pointer-events:auto}
    .sl-dual input:last-child::-webkit-slider-runnable-track{background:transparent}
    .sl-dual input:last-child::-moz-range-track{background:transparent}
    .sl-scale{display:flex;justify-content:space-between;font-family:var(--mono);font-size:var(--xs);color:var(--faint);margin-top:-6px}
    .sl-seg{display:grid;grid-template-columns:repeat(3,1fr);background:var(--offset);border:1px solid var(--divider);border-radius:var(--r-full);padding:3px;gap:3px}
    .sl-seg input{position:absolute;opacity:0;pointer-events:none}
    .sl-seg label{text-align:center;font-size:var(--sm);font-weight:600;padding:7px 4px;border-radius:var(--r-full);cursor:pointer;color:var(--muted)}
    .sl-seg input:checked+label{background:var(--surface);color:var(--primary);box-shadow:var(--sh-sm)}
    .sl-seg input:focus-visible+label{outline:2px solid var(--primary)}
    .sl-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  `;
  document.head.appendChild(css);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  // <picture> so "reduce motion" gets the still icon.
  const icon = (name, cls, alt) =>
    `<picture><source srcset="/icons/still/${name}.svg" media="(prefers-reduced-motion: reduce)">` +
    `<img class="${cls}" src="/icons/${name}.svg" alt="${esc(alt)}" width="64" height="64" decoding="async"></picture>`;

  // ---- Which sky icon fits a forecast window ----
  // Uses the same fields the score uses: NWS shortForecast text (or the Open-Meteo fallback's
  // wording from wmoToForecast) and precipitation probability.
  function skyFor(slice){
    if(!slice || !slice.length) return null;
    const fcs = slice.map(p => (p.shortForecast || '').trim());
    const precip = slice.map(p => p.probabilityOfPrecipitation?.value ?? 0);
    const avgP = precip.reduce((a,b) => a + b, 0) / precip.length;
    const counts = {};
    fcs.forEach(f => { if(f) counts[f] = (counts[f] || 0) + 1; });
    const main = Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0] || '';
    const m = main.toLowerCase();
    let name;
    if(fcs.some(f => /thunder|severe|tropical/i.test(f))) name = 'thunderstorms-day-rain';
    else if(avgP >= 50 || (/rain|shower|drizzle/.test(m) && avgP >= 30)) name = 'rain';
    else if(avgP >= 30 || /rain|shower|drizzle/.test(m)) name = 'partly-cloudy-day-rain';
    else if(/fog|haze|mist|smoke/.test(m)) name = 'fog-day';
    else if(/^(mostly )?(sunny|clear)/.test(m)) name = 'clear-day';
    else if(/partly/.test(m)) name = 'partly-cloudy-day';
    else if(/mostly cloudy/.test(m)) name = 'overcast-day';
    else if(/cloudy|overcast/.test(m)) name = 'cloudy';
    else name = 'partly-cloudy-day';
    return { name, alt: main || 'Forecast sky' };
  }

  // ---- 1. Score card sky icon ----
  function scoreSkyEl(){
    let el = document.getElementById('acj-sky');
    if(!el){
      const right = document.querySelector('#score-card .score-right');
      if(!right) return null;
      el = document.createElement('div');
      el.id = 'acj-sky';
      right.insertBefore(el, right.firstChild);
    }
    return el;
  }
  const _updateScoreCard = window.updateScoreCard;
  window.updateScoreCard = function(score, win){
    const r = _updateScoreCard.apply(this, arguments);
    try{
      const el = scoreSkyEl(), sky = skyFor(win && win.slice);
      if(el){ el.innerHTML = sky ? icon(sky.name, 'acj-sky', sky.alt) : ''; }
    }catch(e){ console.warn('sky icon', e); }
    return r;
  };

  // ---- 2. Reason-tag icons ----
  function tagIcon(text){
    if(/^Wind from/.test(text)) return 'compass';
    if(/^Wind/.test(text)) return 'wind';
    if(/^Gusts/.test(text)) return 'windsock';
    if(/^Rain/.test(text)) return 'rain';
    if(/^Storm risk/.test(text)) return 'thunderstorms-day-rain';
    return null;
  }
  const _buildReasons = window.buildReasons;
  window.buildReasons = function(){
    const r = _buildReasons.apply(this, arguments);
    try{
      document.querySelectorAll('#reasons .rtag').forEach(t => {
        const name = tagIcon(t.textContent);
        if(name && !t.querySelector('.acj-ti')){ t.classList.add('acj-rt'); t.insertAdjacentHTML('afterbegin', icon(name, 'acj-ti', '')); }
      });
    }catch(e){ console.warn('tag icons', e); }
    return r;
  };

  // ---- 3. 7-Day card icons ----
  const _build7DayCards = window.build7DayCards;
  window.build7DayCards = function(days){
    const r = _build7DayCards.apply(this, arguments);
    try{
      const cards = document.querySelectorAll('#sevenday-body .day-card');
      (days || []).forEach((day, i) => {
        const card = cards[i], sky = skyFor(day.win && day.win.slice);
        const left = card && card.querySelector('.day-top > div');
        if(!left || !sky) return;
        const wrap = document.createElement('div');
        wrap.className = 'acj-day-l';
        left.parentNode.insertBefore(wrap, left);
        wrap.insertAdjacentHTML('afterbegin', icon(sky.name, 'acj-day-i', sky.alt));
        wrap.appendChild(left);
      });
    }catch(e){ console.warn('7-day icons', e); }
    return r;
  };

  // ---- 4. Preference sliders ----
  const $ = id => document.getElementById(id);
  function refreshPrefsUI(changed){
    const wmin = $('p-wmin'), wmax = $('p-wmax');
    if(!wmin || !wmax || wmin.type !== 'range') return;
    let a = +wmin.value, b = +wmax.value;
    if(a > b - 1){
      if(changed === wmin){ a = Math.max(0, b - 1); wmin.value = a; }
      else { b = Math.min(+wmax.max, a + 1); wmax.value = b; if(b - 1 < a){ a = b - 1; wmin.value = a; } }
    }
    const span = +wmax.max - +wmin.min || 35;
    const pa = (a - +wmin.min) / span * 100, pb = (b - +wmin.min) / span * 100;
    wmin.style.setProperty('--track', `linear-gradient(90deg,var(--divider) ${pa}%,var(--primary) ${pa}%,var(--primary) ${pb}%,var(--divider) ${pb}%)`);
    const set = (id, v) => { const o = $(id); if(o) o.textContent = v; };
    set('sl-wout', `${a}–${b} kt`);
    set('sl-gout', `${$('p-gust').value} kt`);
    const d = +$('p-dur').value; set('sl-dout', `${d} ${d === 1 ? 'hr' : 'hrs'}`);
    const tide = $('p-tide').value, radio = document.querySelector(`input[name="sl-tide"][value="${tide}"]`);
    if(radio) radio.checked = true;
  }
  function wirePrefs(){
    ['p-wmin','p-wmax','p-gust','p-dur'].forEach(id => { const el = $(id); if(el) el.addEventListener('input', e => refreshPrefsUI(e.target)); });
    document.querySelectorAll('input[name="sl-tide"]').forEach(r => r.addEventListener('change', () => { $('p-tide').value = r.value; }));
    refreshPrefsUI();
  }
  ['openModal', 'syncPrefsUI'].forEach(fn => {
    const orig = window[fn];
    if(typeof orig !== 'function') return;
    window[fn] = function(){ const r = orig.apply(this, arguments); try{ refreshPrefsUI(); }catch(_){} return r; };
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wirePrefs);
  else wirePrefs();
})();
