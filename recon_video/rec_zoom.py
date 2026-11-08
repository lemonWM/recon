# Recon - video clip with a zoom and a comment bubble ("tooltip" scene).
#
# What it does: opens the panel in a headless browser, moves a drawn cursor to the
# HubSpot / Salesforce switch, zooms in, shows a comment bubble, clicks Salesforce and
# zooms back out. The zoom and the bubble happen on the live page, so text stays sharp.
#
# Run:  python3 rec_zoom.py | tee rec_zoom.out  &&  python3 cut.py
# Needs: Python with playwright (Chromium) and numpy, plus ffmpeg.
# Result: recon_multi_crm_test.mp4 (1920x1080).
import asyncio, os, glob, time, json
from playwright.async_api import async_playwright

VW, VH = 1920, 1080          # video frame
S = 1.5                      # the panel is laid out at 1280x720 and shown 1.5x, so text is crisp in 1080p
LW, LH = VW / S, VH / S
K = 2.2                      # extra zoom on the switch
PANEL = '../recon_panel_demo/index.html'   # what to record; later the address of the real panel
TEXT_HTML = "Recon potrafi obsługiwać jednocześnie CRM <b>HubSpot</b> i jego deale oraz <b>Salesforce</b> i jego opportunities."

SETUP_JS = """
(() => {
  const st = document.createElement('style');
  st.textContent = 'html{overflow:hidden;background:#F3F5F7}body{overflow:visible;background:#F3F5F7}#recon-demo>div{min-height:__LH__px !important}';
  document.head.appendChild(st);
  const mount = document.getElementById('recon-demo');
  mount.style.width = '__LW__px';
  mount.style.transformOrigin = '0 0';
  mount.style.transform = 'translate(0px, 0px) scale(__S__)';
  mount.style.willChange = 'transform';

  const cur = document.createElement('div');
  cur.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:34px;height:34px;transition:transform .1s;transform-origin:4px 3px';
  cur.innerHTML = '<svg width="34" height="34" viewBox="0 0 22 22"><path d="M3 2l14 7.2-6 1.6-2.2 6L3 2z" fill="#111820" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cur);
  document.addEventListener('mousemove', e => { cur.style.left = (e.clientX - 5) + 'px'; cur.style.top = (e.clientY - 3) + 'px'; }, true);
  document.addEventListener('mousedown', e => {
    cur.style.transform = 'scale(.86)';
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:99998;pointer-events:none;left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #1F6FD6;opacity:.9;transition:all .5s ease-out';
    document.body.appendChild(r);
    requestAnimationFrame(() => { r.style.width = '90px'; r.style.height = '90px'; r.style.margin = '-45px 0 0 -45px'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 650);
  }, true);
  document.addEventListener('mouseup', () => { cur.style.transform = 'scale(1)'; }, true);

  const mk = document.createElement('div');
  mk.id = '__mark';
  mk.style.cssText = 'position:fixed;left:0;bottom:0;width:16px;height:16px;background:#FF00FF;z-index:100000';
  document.body.appendChild(mk);

  const b = document.createElement('div');
  b.id = '__bubble';
  b.style.cssText = "position:fixed;z-index:99990;pointer-events:none;width:600px;box-sizing:border-box;padding:24px 28px;background:#FFFFFF;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:'IBM Plex Sans','Segoe UI',system-ui,sans-serif;color:#1D2730;opacity:0;transform:translateX(-14px) scale(.97);transform-origin:100% 50%;transition:opacity .35s ease, transform .35s ease";
  b.innerHTML = '<div style="position:absolute;top:50%;right:-10px;width:22px;height:22px;margin-top:-11px;background:#FFFFFF;transform:rotate(45deg)"></div>' +
    '<div style="position:relative;display:flex;gap:9px;align-items:center;font-size:16px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#1F6FD6;margin-bottom:10px"><svg width="20" height="20" viewBox="0 0 16 16" fill="#1F6FD6"><path d="M7 2.5l1.3 3.7L12 7.5 8.3 8.8 7 12.5 5.7 8.8 2 7.5l3.7-1.3L7 2.5z"/><path d="M12.5 1.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z"/></svg>Multi-CRM</div>' +
    '<div style="position:relative;font-size:26px;line-height:1.38">' + __TEXT__ + '</div>';
  document.body.appendChild(b);
})();
""".replace('__TEXT__', json.dumps(TEXT_HTML)).replace('__LW__', str(LW)).replace('__LH__', str(LH)).replace('__S__', str(S))

SWITCH = '[role=group][aria-label="CRM source"]'
EASE = 'cubic-bezier(.65,0,.35,1)'

POS = {'x': 820.0, 'y': 640.0}

async def glide(pg, x, y, ms=900):
    x0, y0 = POS['x'], POS['y']
    t_start = time.time()
    while True:
        u = min(1.0, (time.time() - t_start) * 1000 / ms)
        e = u * u * (3 - 2 * u)                       # ease in and out
        await pg.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
        if u >= 1.0:
            break
        await asyncio.sleep(0.012)
    POS['x'], POS['y'] = x, y

async def marker(pg, on):
    await pg.evaluate("(on) => { document.getElementById('__mark').style.display = on ? 'block' : 'none'; }", on)

async def box_of(loc):
    b = await loc.bounding_box()
    return b['x'] + b['width'] / 2, b['y'] + b['height'] / 2, b

async def camera(pg, tx, scale, ms):
    await pg.evaluate("([tx, s, ms, ease]) => { const m = document.getElementById('recon-demo'); m.style.transition = `transform ${ms}ms ${ease}`; m.style.transform = `translate(${tx}px, 0px) scale(${s})`; }",
                      [tx, scale, ms, EASE])

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': VW, 'height': VH}, record_video_dir='vid2',
                                   record_video_size={'width': VW, 'height': VH})
        t0 = time.time()
        pg = await ctx.new_page()
        await pg.goto('file://' + os.path.abspath(PANEL))
        await pg.evaluate(SETUP_JS)
        await pg.mouse.move(820, 640)
        await pg.wait_for_timeout(6900)            # sync finishes and its note fades out
        await marker(pg, False)
        start = time.time() - t0

        await pg.wait_for_timeout(800)
        cx, cy, _ = await box_of(pg.locator(SWITCH + ' button', has_text='HubSpot'))
        await glide(pg, cx, cy, 1000)
        await pg.wait_for_timeout(350)

        # Zoom into the top right corner, where the switch sits.
        zoom = S * K
        await camera(pg, VW - LW * zoom, zoom, 950)
        zx = VW - (VW - cx) * K
        zy = cy * K
        await glide(pg, zx, zy, 950)               # the cursor travels with the switch
        await pg.wait_for_timeout(300)

        _, sy0, sbox = await box_of(pg.locator(SWITCH))
        await pg.evaluate("([right, mid]) => { const b = document.getElementById('__bubble'); b.style.left = (right - 600) + 'px'; b.style.top = mid + 'px'; b.style.marginTop = (-b.offsetHeight / 2) + 'px'; b.style.opacity = '1'; b.style.transform = 'translateX(0) scale(1)'; }",
                          [sbox['x'] - 34, max(sy0, 120)])
        await pg.wait_for_timeout(2100)

        sx, sy, _ = await box_of(pg.locator(SWITCH + ' button', has_text='Salesforce'))
        await glide(pg, sx, sy, 650)
        await pg.wait_for_timeout(220)
        await pg.mouse.down(); await pg.wait_for_timeout(90); await pg.mouse.up()
        await pg.wait_for_timeout(2400)

        await pg.evaluate("() => { const b = document.getElementById('__bubble'); b.style.opacity = '0'; b.style.transform = 'translateX(-14px) scale(.97)'; }")
        await pg.wait_for_timeout(320)
        await camera(pg, 0, S, 950)
        await glide(pg, 1080, 700, 950)
        await pg.wait_for_timeout(2300)            # Salesforce deals after their sync
        end = time.time() - t0
        await marker(pg, True)
        await pg.wait_for_timeout(600)
        await ctx.close(); await br.close()
    f = glob.glob('vid2/*.webm')[0]
    print(json.dumps({'file': f, 'start': round(start, 2), 'end': round(end, 2)}))
asyncio.run(main())
