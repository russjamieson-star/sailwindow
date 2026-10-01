// Ask Captain Jim — Wind Map tab.
//
// Self-contained: injects its own CSS and controls into #wind-view and exposes
// openWindView() / closeWindView() for the bottom-nav button. Needs Leaflet and
// the shared engine (prefs, trialStatus, openSubscribeModal, activeSearchCenter,
// LOCATIONS) to be loaded first.
//
// Weather comes from the askcaptainjim-weather Worker (weather-worker/), which
// holds the commercial Open-Meteo key and caches responses for 30 minutes.
// Colours follow scorePeriod() in engine.js and the user's own wind/gust prefs,
// so "green" on the map means the same thing as a good score on the Today tab.
(function(){
  const WEATHER_PROXY = "https://askcaptainjim-weather.russjamieson.workers.dev";
  const CARTO_KEY = location.hostname === "askcaptainjim.com"
    ? "cb1_45my_1_ff44d8b19b638cff8f00a23c" : "cb1_45my_2_7112bc2671dbd23dcf751bc0";
  const HOURS = 72;
  const CELL = 8;                    // px per colour sample; the wash is smooth-scaled between samples
  const MAX_POINTS = 260;            // forecast grid points per view (one Worker request each 100)
  const CARD = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

  const PURPLE=[110,90,170], BLUE=[70,140,210], GREEN=[40,175,120], YELLOW=[235,200,60], ORANGE=[240,130,50], RED=[215,50,60];

  // Anchors are [value, rgb, label]. Built from prefs each time so changing
  // Preferences on the Today tab is reflected the next time the map is drawn.
  function windBands(){
    const lo = Math.max(4, +prefs.windMin || 8), hi = Math.min(26, Math.max(lo + 1, +prefs.windMax || 18));
    const bands = [[0, PURPLE, 'Under 4 kt — too light'], [4, BLUE, `4–${lo} kt — light`], [lo, GREEN, `${lo}–${hi} kt — your range`]];
    if(26 - hi > 4){
      const mid = Math.round((hi + 26) / 2);
      bands.push([hi, YELLOW, `${hi}–${mid} kt — fresh`], [mid, ORANGE, `${mid}–26 kt — strong`]);
    } else {
      bands.push([hi, ORANGE, `${hi}–26 kt — strong`]);
    }
    bands.push([26, RED, 'Over 26 kt — no-go']);
    return bands;
  }
  function gustBands(){
    const g = +prefs.gustMax || 22;
    return [[0, GREEN, `Under ${g - 3} kt`], [g - 3, YELLOW, `${g - 3}–${g} kt — near your limit`], [g, RED, `Over ${g} kt — over your limit`]];
  }
  const WAVE_BANDS = [[0, BLUE, 'Under 1 ft'], [1, GREEN, '1–2 ft'], [2, YELLOW, '2–4 ft'], [4, ORANGE, '4–6 ft'], [6, RED, 'Over 6 ft']];

  function colorFor(v, bands){
    for(let i = bands.length - 1; i >= 0; i--){
      if(v >= bands[i][0]){
        const a = bands[i], b = bands[i + 1];
        if(!b) return a[1];
        const t = Math.min(1, (v - a[0]) / (b[0] - a[0]));
        return a[1].map((c, k) => c + (b[1][k] - c) * t * t);   // ease into the next band, no hard edges
      }
    }
    return bands[0][1];
  }

  // ---- State ----
  let map = null, grid = null, hour0 = null, hourIdx = 0, layer = 'wind';
  const cache = new Map();       // "lat,lon" -> { s, g, d, land }   speeds in knots, d = direction FROM
  const waveCache = new Map();   // "lat,lon" -> { h } feet, or null where the marine model has no data
  const key = (a, b) => a.toFixed(3) + ',' + b.toFixed(3);
  let washCv, flowCv, wctx, fctx, field = null, particles = [], animating = false, rafId = null;
  let pinMarker = null, pillMarker = null, playTimer = null, moveTimer = null;

  // ---- One-time DOM + CSS ----
  function injectUI(){
    const css = document.createElement('style');
    css.textContent = `
      #wind-wrap{position:relative;flex:1;min-height:0}
      #wind-map{position:absolute;inset:0}
      #wind-view .leaflet-wind-pane{pointer-events:none}
      #wind-view .wbar{position:absolute;left:50%;transform:translateX(-50%);z-index:1000;display:flex;gap:6px;align-items:center;
        background:rgba(15,34,51,.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:999px;padding:6px;
        color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:calc(100% - 24px)}
      #wind-view .wbar.top{top:12px}
      #wind-view .wbar.bottom{bottom:calc(26px + env(safe-area-inset-bottom))}   /* clears the map credits line */
      #wind-view .wbar button,#wind-view .wbar select{font:inherit;font-size:16px;font-weight:600;color:#fff;background:transparent;border:0;border-radius:999px;padding:8px 13px;cursor:pointer;white-space:nowrap}
      #wind-view .wbar button.on{background:#fff;color:#0f2233;font-weight:600}
      #wind-view .wbar select{background:rgba(255,255,255,.12);appearance:none;-webkit-appearance:none}
      #wind-view .wbar select option{color:#000}
      #wind-view .wround{width:42px;height:42px;font-size:22px!important;padding:0!important;display:grid;place-items:center;background:rgba(255,255,255,.14)!important}
      #wind-time{min-width:104px;text-align:center;font-weight:700;font-size:18px}
      #wind-scrub{width:150px;accent-color:#f26a3d}
      #wind-legend{position:absolute;left:12px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:1000;background:rgba(15,34,51,.84);color:#fff;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.6}
      #wind-legend i{display:inline-block;width:16px;height:12px;border-radius:2px;margin-right:6px;vertical-align:middle}
      #wind-status{position:absolute;top:62px;left:50%;transform:translateX(-50%);z-index:1000;background:rgba(15,34,51,.84);color:#fff;font-size:14px;padding:7px 14px;border-radius:999px;display:none;white-space:nowrap}
      #wind-view .wpill-wrap{display:flex;gap:6px;width:max-content;transform:translate(var(--wpx,-50%),calc(-100% - 16px))}
      #wind-view .wpill{background:#0f2233;color:#fff;border-radius:18px;padding:8px 14px;display:flex;align-items:center;gap:9px;box-shadow:0 4px 16px rgba(0,0,0,.35);white-space:nowrap;border:1.5px solid rgba(255,255,255,.85)}
      #wind-view .wpill .big{font-size:30px;font-weight:800;line-height:1}
      #wind-view .wpill .sub{font-size:14px;line-height:1.25;opacity:.95}
      #wind-view .wpin{width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid #0f2233;transform:translate(-50%,-50%)}
      @media (max-width:560px){
        #wind-view .leaflet-control-zoom{display:none}   /* pinch to zoom; the top bar covers these on phones */
        #wind-scrub{width:56px}
        #wind-view .wbar button,#wind-view .wbar select{padding:8px 11px;font-size:15px}
        #wind-time{min-width:84px;font-size:17px}
        #wind-legend{font-size:13px;padding:8px 10px}
      }`;
    document.head.appendChild(css);


    const view = document.getElementById('wind-view');
    const wrap = document.createElement('div');
    wrap.id = 'wind-wrap';
    wrap.innerHTML = `
      <div id="wind-map"></div>
      <div class="wbar top">
        <button class="on" data-wlayer="wind">Wind</button>
        <button data-wlayer="gust">Gusts</button>
        <button data-wlayer="waves">Waves</button>
        <select id="wind-jump" aria-label="Jump to area"><option value="">Jump to…</option></select>
      </div>
      <div id="wind-status"></div>
      <div id="wind-legend"></div>
      <div class="wbar bottom">
        <button class="wround" id="wind-prev" aria-label="Previous hour">&#8249;</button>
        <div id="wind-time">Now</div>
        <button class="wround" id="wind-next" aria-label="Next hour">&#8250;</button>
        <input type="range" id="wind-scrub" min="0" max="${HOURS - 1}" value="0" aria-label="Forecast hour">
        <button class="wround" id="wind-play" aria-label="Play">&#9654;</button>
      </div>`;
    view.appendChild(wrap);

    // Jump list = this edition's own forecast locations, so it works for Gulf and Atlantic alike.
    const jump = document.getElementById('wind-jump');
    Object.entries(LOCATIONS).forEach(([k, l]) => {
      const o = document.createElement('option'); o.value = k; o.textContent = l.name; jump.appendChild(o);
    });
    jump.onchange = () => { const l = LOCATIONS[jump.value]; if(l) map.setView([l.lat, l.lon], 9); jump.value = ''; };

    wrap.querySelectorAll('[data-wlayer]').forEach(b => b.onclick = async () => {
      wrap.querySelectorAll('[data-wlayer]').forEach(x => x.classList.toggle('on', x === b));
      layer = b.dataset.wlayer; renderLegend(); await ensureData(); redraw();
    });
    document.getElementById('wind-prev').onclick = () => setHour(hourIdx - 1);
    document.getElementById('wind-next').onclick = () => setHour(hourIdx + 1);
    document.getElementById('wind-scrub').oninput = e => setHour(+e.target.value);
    document.getElementById('wind-play').onclick = togglePlay;
  }

  // Traces the shoreline from CARTO's own base tiles, in plain canvas code so it behaves the same in
  // every browser (Safari's SVG-filter support on HTML is unreliable). Voyager water is (213,232,235);
  // land and parks have blue <= red, so "blue exceeds red by 10+" is a clean water test. Any land
  // pixel touching water becomes part of the line; everything else is transparent.
  // Binary morphology helpers for the shoreline tracer (separable square kernel, radius k).
  function morph(m, W, H, k, keepIfAll){
    const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      let v = keepIfAll ? 1 : 0;
      for(let dx = -k; dx <= k; dx++){
        const xx = Math.min(W - 1, Math.max(0, x + dx)), b = m[y * W + xx];
        if(keepIfAll ? !b : b){ v = keepIfAll ? 0 : 1; break; }
      }
      tmp[y * W + x] = v;
    }
    for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
      let v = keepIfAll ? 1 : 0;
      for(let dy = -k; dy <= k; dy++){
        const yy = Math.min(H - 1, Math.max(0, y + dy)), b = tmp[yy * W + x];
        if(keepIfAll ? !b : b){ v = keepIfAll ? 0 : 1; break; }
      }
      out[y * W + x] = v;
    }
    return out;
  }
  const shrink = (m, W, H, k) => morph(m, W, H, k, true);
  const grow   = (m, W, H, k) => morph(m, W, H, k, false);

  const CoastLayer = L.GridLayer.extend({
    createTile(coords, done){
      const size = this.getTileSize(), dpr = Math.min(2, Math.ceil(window.devicePixelRatio || 1));
      const cv = document.createElement('canvas');
      cv.width = size.x * dpr; cv.height = size.y * dpr;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        let px;
        try{ px = ctx.getImageData(0, 0, W, H); }catch(e){ ctx.clearRect(0, 0, W, H); done(null, cv); return; }
        const d = px.data;
        let water = new Uint8Array(W * H);
        for(let i = 0, p = 0; p < water.length; i += 4, p++) water[p] = d[i + 2] - d[i] >= 10 ? 1 : 0;
        // Drop creeks and small streams (water narrower than ~5 CSS px) so the outline shows coasts,
        // bays, sounds and big rivers without cluttering the land: erode the mask, then grow it back.
        const k = 2 * dpr;
        water = grow(shrink(water, W, H, k), W, H, k);
        const r = dpr > 1 ? 2 : 1;   // line width in canvas pixels (about 1 CSS px either way)
        for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
          const p = y * W + x, i = p * 4;
          let edge = false;
          if(!water[p]){
            for(let dy = -r; dy <= r && !edge; dy++) for(let dx = -r; dx <= r; dx++){
              const yy = y + dy, xx = x + dx;
              if(yy >= 0 && yy < H && xx >= 0 && xx < W && water[yy * W + xx]){ edge = true; break; }
            }
          }
          if(edge){ d[i] = 11; d[i + 1] = 42; d[i + 2] = 63; d[i + 3] = 235; } else d[i + 3] = 0;
        }
        ctx.putImageData(px, 0, 0);
        done(null, cv);
      };
      img.onerror = () => done(null, cv);
      const sub = 'abcd'[(coords.x + coords.y) % 4];
      img.src = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${coords.z}/${coords.x}/${coords.y}${dpr > 1 ? '@2x' : ''}.png?key=${CARTO_KEY}`;
      return cv;
    }
  });

  function initMap(){
    const c = activeSearchCenter();
    map = L.map('wind-map', { zoomControl: false, attributionControl: true }).setView([c.lat, c.lon], 9);
    L.control.zoom({ position: 'topright' }).addTo(map);
    // Short credits so they fit on one line above the time bar on phones.
    map.attributionControl.setPrefix(false);
    const attrib = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · <a href="https://open-meteo.com/">Open-Meteo</a>';
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      { subdomains: 'abcd', maxZoom: 14, attribution: attrib }).addTo(map);
    map.createPane('wind');   map.getPane('wind').style.zIndex = 450;   map.getPane('wind').classList.add('leaflet-wind-pane');
    // Blend the wash into the map (multiply) instead of painting over it, so land and water stay distinct.
    map.getPane('wind').style.mixBlendMode = 'multiply';

    // Shoreline: a crisp dark line traced along every coast, bay and river, drawn above the wash.
    map.createPane('wcoast'); map.getPane('wcoast').style.zIndex = 470; map.getPane('wcoast').style.pointerEvents = 'none';
    new CoastLayer({ pane: 'wcoast', maxZoom: 14 }).addTo(map);

    // Labels at double size: request the zoom-below @2x tile and show it at 512 px, which doubles the
    // text size while keeping it sharp (and halves label density, which also helps readability).
    map.createPane('wlabels'); map.getPane('wlabels').style.zIndex = 500; map.getPane('wlabels').style.pointerEvents = 'none';
    L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png?key=${CARTO_KEY}`,
      { subdomains: 'abcd', maxZoom: 14, tileSize: 512, zoomOffset: -1, pane: 'wlabels' }).addTo(map);

    // Streaks get their own pane above the wash and shoreline: the wash pane multiplies, which
    // would cancel out the white streak cores if they shared it.
    map.createPane('wflow'); map.getPane('wflow').style.zIndex = 480; map.getPane('wflow').style.pointerEvents = 'none';
    washCv = L.DomUtil.create('canvas', '', map.getPane('wind')); flowCv = L.DomUtil.create('canvas', '', map.getPane('wflow'));
    wctx = washCv.getContext('2d'); fctx = flowCv.getContext('2d');

    map.on('zoomstart', () => { animating = false; washCv.style.display = flowCv.style.display = 'none'; });
    map.on('movestart', () => { animating = false; });
    map.on('moveend', () => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(async () => {
        sizeCanvases(); grid = buildGrid();
        redraw(); await ensureData(); redraw();
        washCv.style.display = flowCv.style.display = ''; animating = true;
        document.getElementById('wind-time').textContent = fmtHour();
      }, 250);
    });
    map.on('click', onTap);
  }

  // ---- Forecast grid, snapped to a fixed lattice so panning reuses cached points ----
  function buildGrid(){
    const b = map.getBounds().pad(0.15), z = map.getZoom();
    let step = z >= 10 ? 0.1 : z >= 9 ? 0.15 : z >= 8 ? 0.25 : z >= 7 ? 0.5 : 1, lats, lons;
    for(;;){
      lats = []; lons = [];
      for(let la = Math.floor(b.getSouth() / step) * step; la <= b.getNorth() + step; la += step) lats.push(+la.toFixed(3));
      for(let lo = Math.floor(b.getWest() / step) * step; lo <= b.getEast() + step; lo += step) lons.push(+lo.toFixed(3));
      if(lats.length * lons.length <= MAX_POINTS) break;
      step *= 1.5;
    }
    return { lats, lons, step };
  }

  async function fetchBatch(points, marine){
    const lat = points.map(p => p[0]).join(','), lon = points.map(p => p[1]).join(',');
    const url = marine
      ? `${WEATHER_PROXY}/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&length_unit=imperial&timeformat=unixtime&forecast_hours=${HOURS}`
      : `${WEATHER_PROXY}/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn&timeformat=unixtime&forecast_hours=${HOURS}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error((marine ? 'Waves' : 'Wind') + ' ' + res.status);
    const j = await res.json();
    return Array.isArray(j) ? j : [j];
  }
  const hasWaves = r => r.hourly && r.hourly.wave_height.some(v => v != null) ? { h: r.hourly.wave_height } : null;

  async function ensureData(){
    const need = [], needWave = [];
    for(const la of grid.lats) for(const lo of grid.lons){
      if(!cache.has(key(la, lo))) need.push([la, lo]);
      if(layer === 'waves' && !waveCache.has(key(la, lo))) needWave.push([la, lo]);
    }
    if(!need.length && !needWave.length) return;
    showStatus('Loading forecast…');
    const chunks = arr => { const out = []; for(let i = 0; i < arr.length; i += 100) out.push(arr.slice(i, i + 100)); return out; };
    try{
      await Promise.all([
        ...chunks(need).map(async pts => {
          (await fetchBatch(pts, false)).forEach((r, i) => {
            if(hour0 === null) hour0 = r.hourly.time[0];
            cache.set(key(...pts[i]), { s: r.hourly.wind_speed_10m, g: r.hourly.wind_gusts_10m, d: r.hourly.wind_direction_10m,
                                        land: r.elevation > 1 });   // Open-Meteo reports 0 m over water
          });
        }),
        ...chunks(needWave).map(async pts => {
          (await fetchBatch(pts, true)).forEach((r, i) => waveCache.set(key(...pts[i]), hasWaves(r)));
        }),
      ]);
      hideStatus();
    }catch(e){ showStatus('Forecast unavailable — try again shortly'); console.warn('Wind map:', e); }
  }

  // Bilinear sample of the lattice at an arbitrary lat/lon for the current hour.
  // u/v point the way the wind is blowing TOWARD (east, north).
  function sample(lat, lon){
    const { lats, lons, step } = grid;
    const fy = (lat - lats[0]) / step, fx = (lon - lons[0]) / step;
    const y0 = Math.max(0, Math.min(lats.length - 2, Math.floor(fy))), x0 = Math.max(0, Math.min(lons.length - 2, Math.floor(fx)));
    const ty = Math.max(0, Math.min(1, fy - y0)), tx = Math.max(0, Math.min(1, fx - x0));
    let s = 0, g = 0, u = 0, v = 0, w = 0, wWeight = 0, total = 0, land = 0;
    for(const [dy, dx, wt] of [[0, 0, (1 - ty) * (1 - tx)], [0, 1, (1 - ty) * tx], [1, 0, ty * (1 - tx)], [1, 1, ty * tx]]){
      const la = lats[y0 + dy], lo = lons[x0 + dx], c = cache.get(key(la, lo));
      if(!c || c.s[hourIdx] == null) continue;
      const sp = c.s[hourIdx], dir = c.d[hourIdx] * Math.PI / 180;
      s += sp * wt; g += (c.g[hourIdx] ?? sp) * wt; total += wt; if(c.land) land += wt;
      u += -sp * Math.sin(dir) * wt; v += -sp * Math.cos(dir) * wt;
      // the marine model is coarse and smears offshore seas inland, so only water cells count
      const wc = waveCache.get(key(la, lo));
      if(!c.land && wc && wc.h[hourIdx] != null){ w += wc.h[hourIdx] * wt; wWeight += wt; }
    }
    if(!total) return null;
    const onLand = land / total > 0.5;
    return { s: s / total, g: g / total, u: u / total, v: v / total, w: wWeight && !onLand ? w / wWeight : null, onLand };
  }

  // ---- Drawing ----
  function sizeCanvases(){
    const sz = map.getSize(), dpr = window.devicePixelRatio || 1;
    for(const cv of [washCv, flowCv]){
      cv.width = sz.x * dpr; cv.height = sz.y * dpr; cv.style.width = sz.x + 'px'; cv.style.height = sz.y + 'px';
      cv.style.position = 'absolute'; cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    washCv.style.opacity = .8;
  }

  function redraw(){
    if(!grid) return;
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(washCv, topLeft); L.DomUtil.setPosition(flowCv, topLeft);
    const sz = map.getSize(), cols = Math.ceil(sz.x / CELL) + 1, rows = Math.ceil(sz.y / CELL) + 1;
    const small = document.createElement('canvas'); small.width = cols; small.height = rows;
    const sctx = small.getContext('2d'), img = sctx.createImageData(cols, rows);
    const u = new Float32Array(cols * rows), v = new Float32Array(cols * rows);
    const bands = layer === 'waves' ? WAVE_BANDS : layer === 'gust' ? gustBands() : windBands();
    const speedScale = 0.08;   // knots -> px/frame
    for(let r = 0; r < rows; r++) for(let c = 0; c < cols; c++){
      const ll = map.containerPointToLatLng([c * CELL, r * CELL]), sm = sample(ll.lat, ll.lng), i = r * cols + c;
      if(!sm) continue;
      const val = layer === 'gust' ? sm.g : layer === 'waves' ? sm.w : sm.s;
      if(val != null){
        const col = colorFor(val, bands);
        img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = 255;
      }
      u[i] = sm.u * speedScale; v[i] = -sm.v * speedScale;   // screen y points down
    }
    sctx.putImageData(img, 0, 0);
    wctx.clearRect(0, 0, sz.x, sz.y);
    wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high';
    wctx.drawImage(small, 0, 0, cols * CELL, rows * CELL);
    field = { cols, rows, u, v };
    fctx.clearRect(0, 0, sz.x, sz.y);
    const n = Math.round(sz.x * sz.y / 1300);   // fewer, bolder streaks read better than many faint ones
    particles = Array.from({ length: n }, () => newParticle(sz));
    updateReadout();
  }

  const TRAIL = 22;   // positions kept per streak; streak length = speed x TRAIL frames
  const newParticle = sz => ({ x: Math.random() * sz.x, y: Math.random() * sz.y, age: Math.floor(Math.random() * 80), trail: [] });

  function fieldAt(x, y){
    const c = x / CELL, r = y / CELL, c0 = Math.floor(c), r0 = Math.floor(r);
    if(c0 < 0 || r0 < 0 || c0 >= field.cols - 1 || r0 >= field.rows - 1) return null;
    const tx = c - c0, ty = r - r0, i = r0 * field.cols + c0, j = i + field.cols;
    const lerp = a => (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[j] * (1 - tx) + a[j + 1] * tx) * ty;
    return [lerp(field.u), lerp(field.v)];
  }

  function frame(){
    rafId = null;
    if(field && animating){
      const sz = map.getSize();
      // Each particle keeps its last TRAIL positions and is redrawn as one polyline every frame:
      // dark outline first, white core on top, so streaks read in bright daylight on the pale map
      // and over the darker colours alike. (Fading the previous frame instead chopped trails into dashes.)
      fctx.clearRect(0, 0, sz.x, sz.y);
      const outline = new Path2D();
      for(const p of particles){
        const vel = fieldAt(p.x, p.y);
        if(!vel || ++p.age > 110){ Object.assign(p, newParticle(sz)); continue; }
        p.x += vel[0]; p.y += vel[1];
        p.trail.push(p.x, p.y);
        if(p.trail.length > TRAIL * 2) p.trail.splice(0, 2);
        if(p.trail.length < 4) continue;
        outline.moveTo(p.trail[0], p.trail[1]);
        for(let k = 2; k < p.trail.length; k += 2) outline.lineTo(p.trail[k], p.trail[k + 1]);
      }
      fctx.lineCap = 'round'; fctx.lineJoin = 'round';
      fctx.strokeStyle = 'rgba(11,42,63,0.7)'; fctx.lineWidth = 4.2; fctx.stroke(outline);
      fctx.strokeStyle = '#ffffff';            fctx.lineWidth = 2.2; fctx.stroke(outline);
    }
    if(isOpen()) rafId = requestAnimationFrame(frame);   // stop entirely while the tab is closed (battery)
  }

  // ---- Tap readout ----
  async function onTap(e){
    if(pinMarker){ pinMarker.remove(); pillMarker.remove(); }
    pinMarker = L.marker(e.latlng, { icon: L.divIcon({ className: '', html: '<div class="wpin"></div>', iconSize: [0, 0] }) }).addTo(map);
    pillMarker = L.marker(e.latlng, { icon: L.divIcon({ className: '', html: '<div class="wpill-wrap" id="wind-readout"></div>', iconSize: [0, 0] }), interactive: false }).addTo(map);
    const k = key(e.latlng.lat, e.latlng.lng);
    pinMarker._waveKey = k;
    updateReadout();
    if(!waveCache.has(k)){
      try{ const [r] = await fetchBatch([[e.latlng.lat, e.latlng.lng]], true); waveCache.set(k, hasWaves(r)); }
      catch(_){ waveCache.set(k, null); }
      updateReadout();
    }
  }

  function updateReadout(){
    const el = document.getElementById('wind-readout');
    if(!el || !pinMarker) return;
    const ll = pinMarker.getLatLng(), sm = sample(ll.lat, ll.lng);
    if(!sm){ el.innerHTML = '<div class="wpill"><span class="sub">No forecast here</span></div>'; return; }
    const fromDeg = (Math.atan2(-sm.u, -sm.v) * 180 / Math.PI + 360) % 360;
    const wc = waveCache.get(pinMarker._waveKey), wave = sm.onLand ? null : wc && wc.h[hourIdx];
    el.innerHTML =
      `<div class="wpill"><span style="display:inline-block;transform:rotate(${fromDeg + 180}deg)">&#x25B2;</span>
         <span class="big">${Math.round(sm.s)}</span><span class="sub">kt ${CARD[Math.round(fromDeg / 22.5) % 16]}<br>gust ${Math.round(sm.g)}</span></div>` +
      (wave != null ? `<div class="wpill"><span class="big" style="font-size:23px">${wave.toFixed(1)} ft</span><span class="sub">waves</span></div>` : '');
    // Centre the readout over the pin, but slide it sideways so it never runs off screen.
    const x = map.latLngToContainerPoint(ll).x, w = el.offsetWidth, W = map.getSize().x, pad = 8;
    const left = Math.max(pad, Math.min(W - w - pad, x - w / 2));
    el.style.setProperty('--wpx', (left - x) + 'px');
  }

  // ---- Time controls ----
  function fmtHour(){
    if(hour0 === null || hourIdx === 0) return 'Now';
    const d = new Date((hour0 + hourIdx * 3600) * 1000), now = new Date();
    if(Math.abs(d - now) < 1800e3) return 'Now';
    const day = d.toDateString() === now.toDateString() ? '' : d.toLocaleDateString([], { weekday: 'short' }) + ' ';
    return day + d.toLocaleTimeString([], { hour: 'numeric' });
  }
  function setHour(i){
    hourIdx = (i + HOURS) % HOURS;
    document.getElementById('wind-scrub').value = hourIdx;
    document.getElementById('wind-time').textContent = fmtHour();
    redraw();
  }
  function togglePlay(){
    const btn = document.getElementById('wind-play');
    if(playTimer){ clearInterval(playTimer); playTimer = null; btn.innerHTML = '&#9654;'; return; }
    btn.innerHTML = '&#10074;&#10074;';
    playTimer = setInterval(() => setHour(hourIdx + 1), 700);
  }

  function renderLegend(){
    const bands = layer === 'waves' ? WAVE_BANDS : layer === 'gust' ? gustBands() : windBands();
    document.getElementById('wind-legend').innerHTML =
      `<strong>${layer === 'waves' ? 'Wave height' : layer === 'gust' ? 'Gusts' : 'Wind'}</strong><br>` +
      bands.map(b => `<i style="background:rgb(${b[1].join(',')})"></i>${b[2]}`).join('<br>');
  }
  const showStatus = t => { const s = document.getElementById('wind-status'); s.textContent = t; s.style.display = 'block'; };
  const hideStatus = () => { document.getElementById('wind-status').style.display = 'none'; };
  const isOpen = () => document.getElementById('wind-view').style.display === 'flex';

  // ---- Public: bottom-nav hooks ----
  window.openWindView = function(){
    if(trialStatus().state === 'expired'){ openSubscribeModal('locked'); return; }
    document.getElementById('wind-view').style.display = 'flex';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-wind').classList.add('active');
    if(!map){ injectUI(); initMap(); }
    renderLegend();   // prefs may have changed since last time
    setTimeout(() => { map.invalidateSize(); map.fire('moveend'); }, 50);
    if(!rafId) rafId = requestAnimationFrame(frame);
  };

  window.closeWindView = function(){
    document.getElementById('wind-view').style.display = 'none';
    if(playTimer){ clearInterval(playTimer); playTimer = null; const b = document.getElementById('wind-play'); if(b) b.innerHTML = '&#9654;'; }
    animating = false;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.nav-item[data-tab="today"]').classList.add('active');
  };
})();
