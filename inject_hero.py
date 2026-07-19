import sys

FILES = [
    '/Users/howardshellabarge/Desktop/Sailwindow/dist/index.html',
    '/Users/howardshellabarge/Desktop/Sailwindow/dist-v8/index.html',
]

# ─── 1. HERO CSS (scoped to #sw-hero-overlay) ───────────────────────────────
HERO_CSS = """
/* ─── Hero Overlay ─────────────────────────────────────────── */
#sw-hero-overlay{position:fixed;inset:0;z-index:600;overflow-y:auto;display:none;background:var(--bg);font-family:var(--body)}
#sw-hero-overlay *,#sw-hero-overlay *::before,#sw-hero-overlay *::after{box-sizing:border-box;margin:0;padding:0}
#sw-hero-overlay img,#sw-hero-overlay svg{display:block;max-width:100%}
#sw-hero-overlay button{cursor:pointer;background:none;border:none;font:inherit;color:inherit}
#sw-hero-overlay a{color:var(--primary);text-decoration:none;transition:opacity var(--tr)}
#sw-hero-overlay a:hover{opacity:.8}
/* header */
#sw-hero-overlay .h-header{position:sticky;top:0;z-index:100;background:var(--bg);border-bottom:1px solid var(--divider);padding:var(--sp3) var(--sp4);padding-top:calc(var(--sp3) + env(safe-area-inset-top))}
#sw-hero-overlay .h-header-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
#sw-hero-overlay .h-logo{display:flex;align-items:center;gap:var(--sp2);text-decoration:none;color:var(--text);font-weight:600;font-size:var(--sm)}
#sw-hero-overlay .h-logo-word{display:flex;align-items:center;gap:3px}
#sw-hero-overlay .h-logo-word span{color:var(--primary)}
#sw-hero-overlay .h-header-link{font-size:var(--xs);color:var(--muted);transition:color var(--tr);cursor:pointer;background:none;border:none;font-family:inherit}
#sw-hero-overlay .h-header-link:hover{color:var(--text)}
#sw-hero-overlay .h-header-cta{background:var(--primary);color:var(--inverse);padding:var(--sp2) var(--sp4);border-radius:var(--r-full);font-size:var(--xs);font-weight:600;white-space:nowrap;box-shadow:0 2px 8px oklch(from var(--primary) l c h/.3);border:none;font-family:inherit;cursor:pointer}
/* hero section */
#sw-hero-overlay .h-hero{margin:0 auto;min-height:90dvh;display:flex;align-items:center;justify-content:center;padding:var(--sp8) var(--sp4);position:relative;overflow:hidden}
#sw-hero-overlay .h-hero-bg{position:absolute;inset:0;z-index:-1;background:var(--offset);opacity:.4}
#sw-hero-overlay .h-hero-content{text-align:center;max-width:640px;display:flex;flex-direction:column;gap:var(--sp6)}
#sw-hero-overlay .h-hero-tagline{font-size:clamp(1.75rem,6vw,3rem);font-weight:700;line-height:1.1;letter-spacing:-.02em}
#sw-hero-overlay .h-hero-tagline em{color:var(--primary);font-style:italic}
#sw-hero-overlay .h-hero-subtitle{font-size:var(--lg);color:var(--muted);line-height:1.6}
#sw-hero-overlay .h-hero-ctas{display:flex;flex-direction:column;gap:var(--sp3);margin-top:var(--sp4)}
#sw-hero-overlay .h-btn-primary{background:var(--primary);color:var(--inverse);padding:var(--sp4) var(--sp6);border-radius:var(--r-xl);font-size:var(--sm);font-weight:600;display:inline-block;text-align:center;transition:background var(--tr),transform var(--tr);box-shadow:0 4px 16px oklch(from var(--primary) l c h/.3);border:none;font-family:inherit;cursor:pointer;width:100%}
#sw-hero-overlay .h-btn-primary:hover{background:var(--primary-h);transform:translateY(-2px)}
#sw-hero-overlay .h-btn-secondary{background:var(--surface);color:var(--text);padding:var(--sp4) var(--sp6);border-radius:var(--r-xl);font-size:var(--sm);font-weight:600;display:inline-block;text-align:center;border:1px solid var(--border);transition:background var(--tr),border-color var(--tr);font-family:inherit;cursor:pointer;width:100%}
#sw-hero-overlay .h-btn-secondary:hover{background:var(--dynamic);border-color:var(--primary)}
/* pricing bar */
#sw-hero-overlay .h-pricing-bar{background:var(--surface);border:1px solid var(--divider);border-radius:var(--r-xl);padding:var(--sp4) var(--sp6);max-width:400px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:var(--sp8)}
#sw-hero-overlay .h-price{text-align:center}
#sw-hero-overlay .h-price-amt{font-size:var(--xl);font-weight:700;color:var(--primary)}
#sw-hero-overlay .h-price-label{font-size:var(--xs);color:var(--muted);margin-top:2px}
#sw-hero-overlay .h-price-badge{font-size:9px;font-weight:700;background:var(--success-hl);color:var(--success);padding:2px 7px;border-radius:var(--r-full);margin-top:var(--sp1);display:inline-block}
#sw-hero-overlay .h-price-divider{width:1px;height:48px;background:var(--divider)}
/* sections */
#sw-hero-overlay .h-section{max-width:1200px;margin:0 auto;padding:var(--sp12) var(--sp4)}
#sw-hero-overlay .h-section-title{font-size:clamp(2rem,5vw,3rem);font-weight:700;text-align:center;margin-bottom:var(--sp8);letter-spacing:-.02em}
#sw-hero-overlay .h-section-subtitle{font-size:var(--lg);text-align:center;color:var(--muted);max-width:600px;margin:0 auto var(--sp8);line-height:1.6}
#sw-hero-overlay .h-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:var(--sp6)}
#sw-hero-overlay .h-feature-card{background:var(--surface);border-radius:var(--r-2xl);padding:var(--sp6);border:1px solid oklch(from var(--text) l c h/.06);box-shadow:var(--sh-md);display:flex;flex-direction:column;gap:var(--sp3)}
#sw-hero-overlay .h-feature-icon{font-size:2.5rem;margin-bottom:var(--sp2)}
#sw-hero-overlay .h-feature-title{font-size:var(--lg);font-weight:700}
#sw-hero-overlay .h-feature-desc{color:var(--muted);font-size:var(--sm);line-height:1.6}
/* story */
#sw-hero-overlay .h-story{background:var(--surface);border-radius:var(--r-2xl);padding:var(--sp8);border:1px solid oklch(from var(--text) l c h/.06);box-shadow:var(--sh-md)}
#sw-hero-overlay .h-story-content{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:var(--sp5);line-height:1.8}
#sw-hero-overlay .h-story-content p{color:var(--muted);font-size:var(--sm)}
#sw-hero-overlay .h-story-content strong{color:var(--text)}
#sw-hero-overlay .h-story-highlight{background:var(--offset);border-left:3px solid var(--primary);padding:var(--sp4);border-radius:var(--r-lg);font-size:var(--sm);font-style:italic;color:var(--muted)}
/* bottom CTA */
#sw-hero-overlay .h-cta-section{text-align:center;padding:var(--sp12) var(--sp4);display:flex;flex-direction:column;align-items:center;gap:var(--sp4)}
#sw-hero-overlay .h-cta-text{font-size:var(--lg);color:var(--muted);max-width:640px;margin:0 auto;line-height:1.6}
/* footer */
#sw-hero-overlay .h-footer{background:var(--offset);padding:var(--sp8) var(--sp4);border-top:1px solid var(--divider)}
#sw-hero-overlay .h-footer-in{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp8);text-align:center}
#sw-hero-overlay .h-footer-col h4{font-size:var(--sm);font-weight:600;margin-bottom:var(--sp3)}
#sw-hero-overlay .h-footer-col a{display:block;font-size:var(--xs);color:var(--muted);margin-bottom:var(--sp2)}
#sw-hero-overlay .h-footer-col a:hover{color:var(--text)}
#sw-hero-overlay .h-footer-bottom{grid-column:1/-1;text-align:center;padding-top:var(--sp6);border-top:1px solid var(--divider);color:var(--faint);font-size:var(--xs)}
@media(max-width:640px){
  #sw-hero-overlay .h-hero-ctas{flex-direction:column}
  #sw-hero-overlay .h-features{grid-template-columns:1fr}
  #sw-hero-overlay .h-footer-in{grid-template-columns:1fr}
  #sw-hero-overlay .h-pricing-bar{flex-direction:column;gap:var(--sp4)}
  #sw-hero-overlay .h-price-divider{width:40px;height:1px}
}
"""

# ─── 2. HERO OVERLAY HTML ──────────────────────────────────────────────────
HERO_HTML = """
<!-- ═══════════════════════════════════════════════════════════
     HERO OVERLAY — shown to new visitors before trial starts
     Auto-bypassed for returning users (trial or subscription)
     ═══════════════════════════════════════════════════════════ -->
<div id="sw-hero-overlay">

  <!-- Sticky header -->
  <header class="h-header">
    <div class="h-header-in">
      <a href="javascript:void(0)" class="h-logo" onclick="return false">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="16" fill="var(--primary)" opacity=".12"/>
          <line x1="16" y1="22" x2="16" y2="8" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M16 8 L24 21 L16 22 Z" fill="var(--primary)" opacity=".85"/>
          <path d="M16 12 L10 21 L16 22 Z" fill="var(--primary)" opacity=".4"/>
          <path d="M7 25.5 Q10 23.5 13 25.5 Q16 27.5 19 25.5 Q22 23.5 25 25.5" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".6"/>
        </svg>
        <span class="h-logo-word">Sail<span>Window</span></span>
      </a>
      <div style="display:flex;align-items:center;gap:var(--sp4)">
        <button class="h-header-link" onclick="heroRestoreAccess()">Already subscribed?</button>
        <button class="h-header-cta" onclick="heroStartTrial()">Start Free Trial →</button>
      </div>
    </div>
  </header>

  <!-- Hero section -->
  <section class="h-hero">
    <div class="h-hero-bg"></div>
    <div class="h-hero-content">
      <div class="h-hero-tagline">
        I’ve always been <em>the cook.</em><br>This year, I cooked up <em>something different.</em>
      </div>
      <p class="h-hero-subtitle">
        Live sailing conditions for 35 Gulf Coast marinas. Real-time wind, tide, and best-departure windows powered by NWS and NOAA data.
      </p>
      <!-- Pricing bar -->
      <div class="h-pricing-bar">
        <div class="h-price">
          <div class="h-price-amt">$5.99</div>
          <div class="h-price-label">per month</div>
        </div>
        <div class="h-price-divider"></div>
        <div class="h-price">
          <div class="h-price-amt">$49</div>
          <div class="h-price-label">per year</div>
          <div class="h-price-badge">Save 32%</div>
        </div>
      </div>
      <!-- CTAs -->
      <div class="h-hero-ctas">
        <button class="h-btn-primary" onclick="heroStartTrial()">Check Your Window — Free for 7 Days →</button>
        <button class="h-btn-secondary" onclick="heroSubscribe()">Subscribe Now</button>
        <button onclick="heroRestoreAccess()" style="font-size:var(--xs);color:var(--muted);background:none;border:none;cursor:pointer;font-family:inherit;padding:var(--sp1)">Already a subscriber? Restore access →</button>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section class="h-section" id="h-features">
    <h2 class="h-section-title">Know When to Go</h2>
    <p class="h-section-subtitle">Built for sailors by a sailor. Real-time data from the sources meteorologists and mariners trust.</p>
    <div class="h-features">
      <div class="h-feature-card">
        <div class="h-feature-icon">⛵</div>
        <h3 class="h-feature-title">Best Sailing Window</h3>
        <p class="h-feature-desc">See the exact hour when conditions align — wind in your range, low gusts, no storms.</p>
      </div>
      <div class="h-feature-card">
        <div class="h-feature-icon">⏰</div>
        <h3 class="h-feature-title">Departure &amp; Return Times</h3>
        <p class="h-feature-desc">Plan your whole trip. Best time to leave, optimal return window, based on wind, tide, and daylight.</p>
      </div>
      <div class="h-feature-card">
        <div class="h-feature-icon">\U0001f30a</div>
        <h3 class="h-feature-title">Live Tide &amp; Wind Data</h3>
        <p class="h-feature-desc">Updated hourly from NWS and NOAA. Wind forecasts, gust peaks, tide predictions.</p>
      </div>
      <div class="h-feature-card">
        <div class="h-feature-icon">\U0001f4cd</div>
        <h3 class="h-feature-title">35 Gulf Coast Marinas</h3>
        <p class="h-feature-desc">Texas to the Florida Keys. Select your marina and see conditions tailored to where you sail.</p>
      </div>
      <div class="h-feature-card">
        <div class="h-feature-icon">⚙️</div>
        <h3 class="h-feature-title">Your Sailing Preferences</h3>
        <p class="h-feature-desc">Set your wind limits, gust tolerance, and storm threshold. SailWindow shows you what matters.</p>
      </div>
      <div class="h-feature-card">
        <div class="h-feature-icon">✨</div>
        <h3 class="h-feature-title">Simple, Fast, Beautiful</h3>
        <p class="h-feature-desc">No clutter. No ads. Clean, real-time sailing conditions when you need them — on any device.</p>
      </div>
    </div>
  </section>

  <!-- The Story -->
  <section class="h-section" id="h-story">
    <h2 class="h-section-title">The Story</h2>
    <div class="h-story">
      <div class="h-story-content">
        <p>For <strong>30 years</strong>, I’ve been the cook on our annual sailing trips to Niceville. Same boat, same crew of four friends, same jokes. My job was simple: keep everyone fed, stay out of the captain’s way, and try not to burn the rice.</p>
        <p>The captain’s a blue water sailor. <strong>He knows the Gulf.</strong> But every year, we spent half the trip arguing about the forecast. Is the wind going to hold? Will gusts spike when we motor out? Is the tide right? Sailors don’t trust forecasts — we trust data we can see and feel.</p>
        <div class="h-story-highlight">This year, we couldn’t make the trip. So I stayed in the kitchen a little longer — and cooked up SailWindow instead.</div>
        <p>I built this for sailors like the captain. Sailors who’ve logged thousands of hours on the water. Sailors who know their boat, know their limits, and want to see the numbers before they commit to a day on the water.</p>
        <p><strong>SailWindow</strong> is the tool I wish existed before we’d argue about the forecast. Real-time wind and tide data from NWS and NOAA. A single sailability score. A clear best-departure window. Your wind limits baked in.</p>
        <p style="margin-top:var(--sp4);color:var(--text);font-weight:500">No ads. No guesswork. Just the data that matters, when you need it. Built by a cook. Built for sailors.</p>
      </div>
    </div>
  </section>

  <!-- Bottom CTA -->
  <section class="h-cta-section">
    <h2 class="h-section-title">Ready to Know When to Go?</h2>
    <p class="h-cta-text">Start with 7 free days — no credit card required. 35 stations from Texas to the Florida Keys.</p>
    <div style="display:flex;flex-direction:column;gap:var(--sp3);width:100%;max-width:360px">
      <button class="h-btn-primary" onclick="heroStartTrial()">Start Free Trial →</button>
      <button class="h-btn-secondary" onclick="heroSubscribe()">Subscribe — from $5.99/mo</button>
    </div>
    <button onclick="heroRestoreAccess()" style="font-size:var(--xs);color:var(--muted);background:none;border:none;cursor:pointer;font-family:inherit">Already a subscriber? Restore access →</button>
  </section>

  <!-- Footer -->
  <footer class="h-footer">
    <div class="h-footer-in">
      <div class="h-footer-col">
        <h4>Product</h4>
        <a href="javascript:void(0)" onclick="document.getElementById('h-features').scrollIntoView({behavior:'smooth'})">Features</a>
        <a href="javascript:void(0)" onclick="document.getElementById('h-story').scrollIntoView({behavior:'smooth'})">The Story</a>
      </div>
      <div class="h-footer-col">
        <h4>Access</h4>
        <a href="javascript:void(0)" onclick="heroStartTrial()">Start Free Trial</a>
        <a href="javascript:void(0)" onclick="heroSubscribe()">Subscribe</a>
        <a href="javascript:void(0)" onclick="heroRestoreAccess()">Restore Access</a>
      </div>
      <div class="h-footer-col">
        <h4>Data</h4>
        <a href="https://www.weather.gov" target="_blank" rel="noopener">NWS</a>
        <a href="https://tidesandcurrents.noaa.gov" target="_blank" rel="noopener">NOAA Tides</a>
      </div>
    </div>
    <div class="h-footer-bottom">
      <p>SailWindow &copy; 2026 &middot; Built for sailors &middot; Live data from NWS &amp; NOAA</p>
    </div>
  </footer>

</div><!-- /#sw-hero-overlay -->
"""

# ─── 3. HERO JS FUNCTIONS ──────────────────────────────────────────────────
HERO_JS = """
// ─────────────────────────────────────────────
// HERO PAGE OVERLAY
// ─────────────────────────────────────────────
function initHeroCheck(){
  // Bypass hero for anyone who already has a trial or subscription
  if(storageAvailable()){
    const hasTrial = !!localStorage.getItem('sailwindow.trial.start');
    const hasSub   = localStorage.getItem('sailwindow.subscription') === 'active';
    if(hasTrial || hasSub) return false;
  }
  // New visitor: show hero, prevent body scroll
  const overlay = document.getElementById('sw-hero-overlay');
  if(overlay) overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';
  return true;
}

function hideHero(){
  const overlay = document.getElementById('sw-hero-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function _heroInitApp(){
  // Runs normal app startup sequence after hero is dismissed
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  checkTrialGate();
  loadAll();
}

function heroStartTrial(){
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  _heroInitApp();
}

function heroSubscribe(){
  // Start trial clock so app is usable, then open subscribe modal
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  loadAll();
  setTimeout(() => openSubscribeModal('upgrade'), 600);
}

function heroRestoreAccess(){
  // User already paid via Stripe; set trial start, show activate button in modal
  if(storageAvailable()) localStorage.setItem('sailwindow.trial.start', String(Date.now()));
  hideHero();
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  loadAll();
  setTimeout(() => openSubscribeModal('restore'), 600);
}
"""

CSS_ANCHOR = """.bridge-waterway-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--primary);background:var(--primary-hl);padding:2px 7px;border-radius:var(--r-full);white-space:nowrap}
</style>
</head>
<body>
<div class="shell">"""

CSS_REPLACEMENT = """.bridge-waterway-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--primary);background:var(--primary-hl);padding:2px 7px;border-radius:var(--r-full);white-space:nowrap}
""" + HERO_CSS + """</style>
</head>
<body>
""" + HERO_HTML + """<div class="shell">"""

DOM_ANCHOR = """document.addEventListener("DOMContentLoaded", () => {
  loadPrefsFromStorage();
  if(window.PRESELECT_LOCATION && LOCATIONS[window.PRESELECT_LOCATION]){
    prefs.locKey = window.PRESELECT_LOCATION;
  }
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  checkTrialGate();
  loadAll();
});"""

DOM_REPLACEMENT = """document.addEventListener("DOMContentLoaded", () => {
  loadPrefsFromStorage();
  if(window.PRESELECT_LOCATION && LOCATIONS[window.PRESELECT_LOCATION]){
    prefs.locKey = window.PRESELECT_LOCATION;
  }
  if(initHeroCheck()) return; // New visitor → show Hero, hold app init
  logTrialStatus();
  syncPrefsUI();
  applySavedTheme();
  updateTrialBanner();
  checkTrialGate();
  loadAll();
});"""

MODAL_ANCHOR = """function openSubscribeModal(mode){
  const isUpgrade = mode === "upgrade";
  document.getElementById("sub-headline").textContent = isUpgrade
    ? "Upgrade for full Gulf Coast access"
    : "Your 7-day free trial has ended";
  document.getElementById("sub-free-option").style.display = "block";
  document.getElementById("sub-dismiss").style.display    = isUpgrade ? "block" : "none";
  document.getElementById("sub-activate").style.display   = "none";
  document.getElementById("subscribe-overlay").style.display = "flex";
}"""

MODAL_REPLACEMENT = """function openSubscribeModal(mode){
  const isUpgrade = mode === "upgrade";
  const isRestore = mode === "restore";
  document.getElementById("sub-headline").textContent = isRestore
    ? "Restore your SailWindow subscription"
    : isUpgrade
      ? "Upgrade for full Gulf Coast access"
      : "Your 7-day free trial has ended";
  document.getElementById("sub-free-option").style.display = isRestore ? "none" : "block";
  document.getElementById("sub-dismiss").style.display    = (isUpgrade || isRestore) ? "block" : "none";
  document.getElementById("sub-activate").style.display   = isRestore ? "block" : "none";
  document.getElementById("subscribe-overlay").style.display = "flex";
}"""

JS_ANCHOR = "function closePartnerModal(){"
JS_REPLACEMENT = HERO_JS + "\nfunction closePartnerModal(){"

errors = []
for path in FILES:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    orig_len = len(content)

    c = content
    c2 = c.replace(CSS_ANCHOR, CSS_REPLACEMENT, 1)
    if c2 == c: errors.append(f'CSS_ANCHOR not found in {path}')
    c = c2

    c2 = c.replace(DOM_ANCHOR, DOM_REPLACEMENT, 1)
    if c2 == c: errors.append(f'DOM_ANCHOR not found in {path}')
    c = c2

    c2 = c.replace(MODAL_ANCHOR, MODAL_REPLACEMENT, 1)
    if c2 == c: errors.append(f'MODAL_ANCHOR not found in {path}')
    c = c2

    c2 = c.replace(JS_ANCHOR, JS_REPLACEMENT, 1)
    if c2 == c: errors.append(f'JS_ANCHOR not found in {path}')
    c = c2

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'OK: {path}  ({orig_len} -> {len(c)} chars, +{len(c)-orig_len})')

if errors:
    print('ERRORS:')
    for e in errors: print(' ', e)
    sys.exit(1)
else:
    print('All 4 substitutions applied to both files successfully.')
