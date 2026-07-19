#!/usr/bin/env python3
"""Replace dark hero overlay with light ICW Passage Planner hero in both dist files."""

FILES = [
    '/Users/howardshellabarge/Desktop/Sailwindow/dist/index.html',
    '/Users/howardshellabarge/Desktop/Sailwindow/dist-v8/index.html',
]

HERO_CSS = """
/* ─── Hero Overlay (Light — ICW Passage Planner) ───────────────────────── */
#sw-hero-overlay{position:fixed;inset:0;z-index:600;overflow-y:auto;display:none;font-family:'Segoe UI',Roboto,system-ui,-apple-system,sans-serif;color:#1a2e3b}
#sw-hero-overlay #sailwindow-hero{background:linear-gradient(135deg,#f0f7fc 0%,#d4e9ff 100%);padding:3rem 2rem 2rem;min-height:100vh}
#sw-hero-overlay .hero-container{max-width:1280px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:2.5rem}
#sw-hero-overlay .hero-left{flex:1 1 45%;min-width:280px}
#sw-hero-overlay .hero-badge{display:inline-block;background:#005a8c;color:white;padding:.3rem 1.2rem;border-radius:30px;font-size:.8rem;font-weight:600;letter-spacing:.5px;margin-bottom:1.2rem}
#sw-hero-overlay .live-tag{background:#2e7d32;padding:.1rem .6rem;border-radius:30px;font-size:.65rem;margin-left:.5rem}
#sw-hero-overlay .hero-title{font-size:clamp(2.5rem,6vw,4rem);font-weight:700;line-height:1.1;margin-bottom:1.2rem;color:#0a1e2b}
#sw-hero-overlay .hero-title span{color:#0077be;border-bottom:4px solid #ffb74d}
#sw-hero-overlay .hero-sub{font-size:1.2rem;line-height:1.6;color:#2c4a5e;margin-bottom:1.8rem;max-width:550px}
#sw-hero-overlay .hw-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem 1.5rem;margin-bottom:1.5rem}
#sw-hero-overlay .hw-feature-item{display:flex;align-items:center;gap:.6rem;font-size:.95rem;color:#1a3b4f}
#sw-hero-overlay .hw-feature-item i{width:20px;font-size:1rem;text-align:center}
#sw-hero-overlay .hero-ctas{display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem;max-width:420px}
#sw-hero-overlay .btn-hero-primary{display:block;background:#0a1e2b;color:white;padding:1rem 2rem;border-radius:60px;font-weight:700;font-size:1.05rem;text-align:center;box-shadow:0 8px 25px rgba(10,30,43,.35);transition:all .2s ease;border:none;cursor:pointer;width:100%;font-family:inherit}
#sw-hero-overlay .btn-hero-primary:hover{background:#005a8c;transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,119,190,.45)}
#sw-hero-overlay .btn-hero-outline{display:block;background:transparent;color:#0077be;padding:.85rem 2rem;border-radius:60px;border:2px solid #0077be;font-weight:600;font-size:1rem;text-align:center;transition:all .2s;cursor:pointer;width:100%;font-family:inherit}
#sw-hero-overlay .btn-hero-outline:hover{background:#0077be;color:white}
#sw-hero-overlay .btn-hero-restore{background:none;border:none;color:#5a7a8a;font-size:.85rem;cursor:pointer;text-decoration:underline;font-family:inherit;padding:.25rem 0;width:100%;text-align:center}
#sw-hero-overlay .hw-trust-badges{display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:1.8rem;padding-top:1.5rem;border-top:2px solid rgba(0,119,190,.15)}
#sw-hero-overlay .hw-trust-badge{display:flex;align-items:center;gap:.5rem;font-size:.85rem;color:#2c4a5e}
#sw-hero-overlay .hw-trust-badge i{color:#0077be}
#sw-hero-overlay .hw-founder-story{margin-top:1.2rem;padding:.8rem 1.2rem;background:rgba(255,215,0,.08);border-radius:16px;border-left:4px solid #ffb74d;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
#sw-hero-overlay .hw-founder-avatar{width:44px;height:44px;border-radius:50%;background:#005a8c;color:white;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0}
#sw-hero-overlay .hw-founder-text{font-size:.9rem;color:#1a3b4f}
#sw-hero-overlay .hw-verified{background:#2e7d32;color:white;padding:.15rem .8rem;border-radius:30px;font-size:.65rem;font-weight:600;margin-left:auto;white-space:nowrap}
#sw-hero-overlay .hero-right{flex:1 1 45%;min-width:280px;display:grid;grid-template-columns:1fr 1fr;gap:1rem}
#sw-hero-overlay .hw-card{background:rgba(255,255,255,.7);backdrop-filter:blur(8px);border-radius:20px;padding:1.2rem 1rem;border:1px solid rgba(255,255,255,.6);box-shadow:0 8px 25px rgba(0,40,60,.08);transition:transform .2s ease,box-shadow .2s ease}
#sw-hero-overlay .hw-card:hover{transform:translateY(-4px);box-shadow:0 12px 35px rgba(0,40,60,.15)}
#sw-hero-overlay .hw-card-icon{font-size:1.6rem;margin-bottom:.3rem}
#sw-hero-overlay .hw-card-title{font-weight:700;font-size:1rem;color:#0a1e2b}
#sw-hero-overlay .hw-card-desc{font-size:.8rem;color:#5a7a8a;line-height:1.4}
#sw-hero-overlay .hw-card-tag{margin-top:.5rem;font-size:.65rem;text-transform:uppercase;letter-spacing:.5px;font-weight:600;color:#0077be;background:#e3f0fa;padding:.15rem .7rem;border-radius:30px;display:inline-block}
#sw-hero-overlay .hw-card.hw-bridge-card{background:rgba(230,126,34,.06);border-color:rgba(230,126,34,.2)}
#sw-hero-overlay .hw-card.hw-bridge-card .hw-card-tag{background:#fdebd0;color:#e67e22}
#sw-hero-overlay .hw-card.hw-log-card{background:rgba(255,183,77,.08);border-color:rgba(255,183,77,.2)}
#sw-hero-overlay .hw-card.hw-log-card .hw-card-tag{background:#fdebd0;color:#d4a017}
#sw-hero-overlay .hw-pricing-bar{grid-column:1/-1;margin-top:.3rem;padding-top:1rem;border-top:2px dashed rgba(0,119,190,.15);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem}
#sw-hero-overlay .hw-price-big{font-weight:700;font-size:1.4rem;color:#0077be}
#sw-hero-overlay .hw-price-big span{font-size:.9rem;font-weight:400;color:#5a7a8a}
#sw-hero-overlay .hw-trial-tag{background:#2e7d32;color:white;padding:.1rem .6rem;border-radius:30px;font-size:.65rem;margin-left:.5rem}
@media(max-width:900px){
  #sw-hero-overlay .hero-container{flex-direction:column;text-align:center}
  #sw-hero-overlay .hero-sub{margin-left:auto;margin-right:auto}
  #sw-hero-overlay .hw-feature-grid{max-width:400px;margin-left:auto;margin-right:auto}
  #sw-hero-overlay .hw-feature-item{justify-content:center}
  #sw-hero-overlay .hw-trust-badges{justify-content:center}
  #sw-hero-overlay .hw-founder-story{justify-content:center;text-align:center}
  #sw-hero-overlay .hw-verified{margin-left:0}
  #sw-hero-overlay .hero-right{width:100%}
  #sw-hero-overlay .hero-ctas{margin-left:auto;margin-right:auto}
  #sw-hero-overlay .hw-pricing-bar{flex-direction:column;text-align:center}
}
@media(max-width:500px){
  #sw-hero-overlay .hw-feature-grid{grid-template-columns:1fr}
  #sw-hero-overlay .hero-right{grid-template-columns:1fr}
}"""

HERO_HTML = """<div id="sw-hero-overlay">
<section id="sailwindow-hero">
  <div class="hero-container">

    <!-- LEFT COLUMN -->
    <div class="hero-left">
      <div class="hero-badge">
        <i class="fas fa-satellite-dish"></i> NOAA + ECMWF &middot; Gulf ICW
        <span class="live-tag">&#x25CF; LIVE</span>
      </div>
      <h1 class="hero-title">
        Your Passage Planner.<br>
        <span>Bridges, Weather &amp; Docks.</span>
      </h1>
      <p class="hero-sub">
        Real-time NOAA weather, drawbridge intelligence, 80+ marinas,
        restaurant finder, 7-day trends, and a Cruiser&#8217;s Log &mdash;
        all in one app for the Gulf Intracoastal Waterway.
      </p>
      <div class="hw-feature-grid">
        <div class="hw-feature-item"><i class="fas fa-water" style="color:#0077be;"></i><span><strong>Window</strong> Go/No-Go</span></div>
        <div class="hw-feature-item"><i class="fas fa-bridge" style="color:#e67e22;"></i><span><strong>12 Bridges</strong> VHF &middot; Clearance</span></div>
        <div class="hw-feature-item"><i class="fas fa-anchor" style="color:#0077be;"></i><span><strong>80+ Marinas</strong> + GPS</span></div>
        <div class="hw-feature-item"><i class="fas fa-utensils" style="color:#0077be;"></i><span><strong>Dining</strong> 3-mile radius</span></div>
        <div class="hw-feature-item"><i class="fas fa-chart-line" style="color:#0077be;"></i><span><strong>7-Day</strong> Forecast</span></div>
        <div class="hw-feature-item"><i class="fas fa-book" style="color:#d4a017;"></i><span><strong>Log</strong> Cruiser&#8217;s Log</span></div>
      </div>
      <div class="hero-ctas">
        <button class="btn-hero-primary" onclick="heroStartTrial()"><i class="fas fa-rocket"></i> Check Your Window &mdash; Free for 7 Days &rarr;</button>
        <button class="btn-hero-outline" onclick="heroSubscribe()">Subscribe Now</button>
        <button class="btn-hero-restore" onclick="heroRestoreAccess()">Already a subscriber? Restore access &rarr;</button>
      </div>
      <div class="hw-trust-badges">
        <span class="hw-trust-badge"><i class="fas fa-cloud-sun"></i><span><strong>NOAA</strong> Weather</span></span>
        <span class="hw-trust-badge"><i class="fas fa-lock"></i><span><strong>Stripe</strong> Secure</span></span>
        <span class="hw-trust-badge"><i class="fas fa-globe"></i><span><strong>Cloudflare</strong> Fast</span></span>
        <span class="hw-trust-badge"><i class="fas fa-robot"></i><span>Built with <strong>Claude</strong></span></span>
      </div>
      <div class="hw-founder-story">
        <div class="hw-founder-avatar"><i class="fas fa-microphone"></i></div>
        <div class="hw-founder-text"><strong>Built by a former CNN correspondent</strong><br>73 years old &middot; 3 weeks with Claude &middot; Live on the ICW</div>
        <span class="hw-verified"><i class="fas fa-check-circle"></i> Verified human</span>
      </div>
    </div>

    <!-- RIGHT COLUMN (feature cards) -->
    <div class="hero-right">
      <div class="hw-card">
        <div class="hw-card-icon" style="color:#0077be;"><i class="fas fa-check-circle"></i></div>
        <div class="hw-card-title">Sailing Window</div>
        <div class="hw-card-desc">Instant Go/No-Go for AM, noon, or evening.</div>
        <span class="hw-card-tag"><i class="fas fa-clock"></i> NOAA-powered</span>
      </div>
      <div class="hw-card hw-bridge-card">
        <div class="hw-card-icon"><i class="fas fa-bridge" style="color:#e67e22;"></i></div>
        <div class="hw-card-title">12 ICW Drawbridges</div>
        <div class="hw-card-desc">Name &middot; VHF channel &middot; Clearance &middot; Hours.</div>
        <span class="hw-card-tag"><i class="fas fa-radio"></i> VHF 9 &amp; 13</span>
      </div>
      <div class="hw-card">
        <div class="hw-card-icon" style="color:#0077be;"><i class="fas fa-anchor"></i></div>
        <div class="hw-card-title">80+ Marinas</div>
        <div class="hw-card-desc">Port Aransas to Cape Canaveral + GPS.</div>
        <span class="hw-card-tag"><i class="fas fa-location-dot"></i> Pre-loaded</span>
      </div>
      <div class="hw-card">
        <div class="hw-card-icon" style="color:#0077be;"><i class="fas fa-utensils"></i></div>
        <div class="hw-card-title">Dining Nearby</div>
        <div class="hw-card-desc">Restaurants within 3 miles of any marina.</div>
        <span class="hw-card-tag"><i class="fas fa-walking"></i> Walking distance</span>
      </div>
      <div class="hw-card">
        <div class="hw-card-icon" style="color:#0077be;"><i class="fas fa-chart-line"></i></div>
        <div class="hw-card-title">7-Day Forecast</div>
        <div class="hw-card-desc">Spot weather patterns before you commit.</div>
        <span class="hw-card-tag"><i class="fas fa-calendar-alt"></i> NOAA trends</span>
      </div>
      <div class="hw-card hw-log-card">
        <div class="hw-card-icon"><i class="fas fa-book-open" style="color:#d4a017;"></i></div>
        <div class="hw-card-title">Cruiser&#8217;s Log</div>
        <div class="hw-card-desc">Log trips, rate marinas, share bridge tips.</div>
        <span class="hw-card-tag"><i class="fas fa-pen"></i> Community</span>
      </div>
      <div class="hw-pricing-bar">
        <span>
          <span class="hw-price-big">$5.99 <span>/ month</span></span>
          <span style="color:#5a7a8a;margin-left:.5rem;">or $49/year</span>
          <span class="hw-trial-tag"><i class="fas fa-gift"></i> 7-day trial</span>
        </span>
        <button class="btn-hero-outline" style="width:auto;padding:.4rem 1.2rem;font-size:.85rem;" onclick="heroSubscribe()">Subscribe</button>
      </div>
    </div>

  </div>
</section>
</div><!-- /#sw-hero-overlay -->"""

FONT_AWESOME = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />'

# ── Markers — exact strings confirmed from live file ─────────────────────────
# Marker strings — unique prefixes confirmed from live file
CSS_START_MARKER  = '/* ─── Hero Overlay'        # unique prefix of the CSS comment line
CSS_END_MARKER    = '\n</style>\n</head>'
HTML_START_MARKER = '<!-- ═══'                   # unique: appears once in file before <div id="sw-hero-overlay">
HTML_END_MARKER   = '</div><!-- /#sw-hero-overlay -->'
for fpath in FILES:
    print(f'\nProcessing: {fpath}')
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f'  SKIP — file not found')
        continue

    orig_len = len(content)

    # Diagnostic: show what we find
    css_s = content.find(CSS_START_MARKER)
    html_s = content.find(HTML_START_MARKER)
    html_e = content.find(HTML_END_MARKER)
    print(f'  CSS_START @ {css_s}, HTML_START @ {html_s}, HTML_END @ {html_e}')

    errors = []

    # Sub 1: CSS
    css_end_idx = content.find(CSS_END_MARKER, css_s if css_s != -1 else 0)
    if css_s == -1 or css_end_idx == -1:
        errors.append(f'CSS markers missing (start={css_s}, end={css_end_idx})')
    else:
        content = (
            content[:css_s] +
            '\n' + HERO_CSS +
            '\n</style>\n' + FONT_AWESOME + '\n</head>' +
            content[css_end_idx + len(CSS_END_MARKER):]
        )
        print('  CSS replaced OK')

    # Sub 2: HTML
    html_s2 = content.find(HTML_START_MARKER)
    html_e2 = content.find(HTML_END_MARKER, html_s2 if html_s2 != -1 else 0)
    if html_s2 == -1 or html_e2 == -1:
        errors.append(f'HTML markers missing (start={html_s2}, end={html_e2})')
    else:
        content = (
            content[:html_s2] +
            HERO_HTML +
            content[html_e2 + len(HTML_END_MARKER):]
        )
        print('  HTML replaced OK')

    if errors:
        print(f'  ERRORS: {errors}')
    else:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  SAVED — {orig_len} -> {len(content)} chars ({len(content)-orig_len:+d})')

print('\nDone.')
