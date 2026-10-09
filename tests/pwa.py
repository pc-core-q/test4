"""PWA smoke test: manifest valid, service worker installs, shell renders offline. Run: python3 tests/pwa.py"""
import asyncio, json, pathlib, subprocess, sys, time
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8097'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx = await b.new_context(); pg = await ctx.new_page()
            await pg.route('https://fonts.*/**', lambda r: r.abort())
            m = json.loads(await (await ctx.request.get('http://localhost:8097/manifest.json')).text()); assert m['display'] == 'standalone' and len(m['icons']) == 3
            for ic in m['icons']: assert (await ctx.request.get('http://localhost:8097/' + ic['src'])).ok
            print('ok  manifest + icons load')
            await pg.goto('http://localhost:8097/index.html'); await pg.wait_for_selector('#featured .card:not([aria-hidden])')
            await pg.wait_for_function('navigator.serviceWorker.getRegistrations().then(r=>r.length>0)', timeout=10000); await pg.evaluate('navigator.serviceWorker.ready.then(()=>1)'); await pg.wait_for_timeout(1500); await pg.reload(); await pg.wait_for_timeout(800)
            assert await pg.evaluate('!!navigator.serviceWorker.controller'); print('ok  service worker controls the page')
            await ctx.set_offline(True); await pg.reload(); await pg.wait_for_selector('#featured .card:not([aria-hidden])', timeout=8000)
            print('ok  offline reload renders the shop (demo data):', await pg.title())
            await ctx.set_offline(False); await b.close()
    finally: srv.terminate()
asyncio.run(main())
