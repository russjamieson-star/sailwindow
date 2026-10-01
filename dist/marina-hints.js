// Ask Captain Jim — Marina map discoverability (TEST ADD-ON, loaded only by wind-test.html).
//
// Russ, 2026-09-30: "it's not intuitive that tapping on [a marker] activates a popup."
// Four changes, layered on the existing marina map without changing engine.js:
//   1. Each pin shows its marina name once zoomed in far enough that labels won't collide.
//   2. The map opens on the user's active marina at a zoom where pins and names show (it used to
//      fit every marina, i.e. all of North America, where everything is a faint cluster).
//   3. Cluster circles restyled in brand teal with a bold white count, so they read as tappable.
//   4. A one-time hint chip ("Tap a pin for phone, directions & hours") that disappears the first
//      time a popup opens and stays gone on that device.
// When approved, fold this into loadMarinaMarkers()/initMarinaMap() in shared/engine.js and drop
// this file.
(function(){
  const HINT_KEY = 'acj.marinaHintSeen';
  const LABEL_MIN_ZOOM = 9;

  const css = document.createElement('style');
  css.textContent = `
    .acj-pin-label{background:#0f2233;color:#fff;border:0;border-radius:8px;padding:3px 8px;
      font:600 13px/1.25 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap}
    .acj-pin-label::before{display:none}
    #marina-map.acj-zoomed-out .acj-pin-label{display:none}
    #acj-marina-hint{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:1000;
      background:#f26a3d;color:#fff;border-radius:999px;padding:10px 16px;font:600 15px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      box-shadow:0 6px 20px rgba(0,0,0,.3);white-space:nowrap;pointer-events:none;transition:opacity .4s}
    #acj-marina-hint.gone{opacity:0}
    #marina-map .marker-cluster{background:rgba(1,105,111,.28)!important}
    #marina-map .marker-cluster div{background:#01696f!important;color:#fff!important;font:700 14px/30px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;
      box-shadow:0 2px 8px rgba(0,0,0,.3)}`;
  document.head.appendChild(css);

  const seen = () => { try{ return localStorage.getItem(HINT_KEY) === '1'; }catch(_){ return false; } };
  const markSeen = () => { try{ localStorage.setItem(HINT_KEY, '1'); }catch(_){} };

  function labelPins(){
    if(typeof marinaCluster === 'undefined' || !marinaCluster) return;
    marinaCluster.getLayers().forEach(m => {
      if(m.getTooltip()) return;
      m.bindTooltip(m._marinaName || 'Marina', { permanent: true, direction: 'top', offset: [-15, -14], className: 'acj-pin-label' });
    });
  }

  function setup(){
    const el = document.getElementById('marina-map');
    const updateZoomClass = () => el.classList.toggle('acj-zoomed-out', marinaMap.getZoom() < LABEL_MIN_ZOOM);
    marinaMap.on('zoomend', updateZoomClass);
    updateZoomClass();
    labelPins();

    // Open on the active marina (the engine's own fitBounds runs after 200 ms; this runs after it).
    setTimeout(() => {
      const c = activeSearchCenter();
      if(c && c.lat != null) marinaMap.setView([c.lat, c.lon], 10);
    }, 350);

    if(!seen()){
      const hint = document.createElement('div');
      hint.id = 'acj-marina-hint';
      hint.textContent = '👆 Tap a pin for phone, directions & hours';
      el.appendChild(hint);
      marinaMap.once('popupopen', () => { markSeen(); hint.classList.add('gone'); setTimeout(() => hint.remove(), 500); });
    }
  }

  // Wrap the engine's global functions: labels must be re-added whenever markers are rebuilt
  // (e.g. after "use current location"), and setup runs once the map exists.
  const origLoad = window.loadMarinaMarkers;
  window.loadMarinaMarkers = function(){ origLoad.apply(this, arguments); labelPins(); };
  const origInit = window.initMarinaMap;
  window.initMarinaMap = function(){
    const firstTime = typeof marinaMap === 'undefined' || !marinaMap;
    origInit.apply(this, arguments);
    if(firstTime && marinaMap) setup();
  };
})();
