"""End-to-end smoke test using fake Firebase modules (no network). Run: python3 tests/e2e.py"""
import asyncio, json, pathlib, subprocess, time, sys
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
FAKE = ROOT / 'tests' / 'fake-firebase'
BASE = 'http://localhost:8098/'
CFG = "export const FIREBASE_CONFIG={apiKey:'k',authDomain:'a',projectId:'p',storageBucket:'',messagingSenderId:'',appId:'x'};"
ADM = "export const ADMIN_CONFIG={imgbbApiKey:'fake',maxImageSide:1600,imageQuality:0.85};"
ok = lambda m: print('ok  ' + m)
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8098'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.2)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844}, service_workers='block'); pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            for name in ['firebase-app', 'firebase-auth', 'firebase-firestore']:
                await pg.route(f'https://www.gstatic.com/firebasejs/10.12.2/{name}.js', (lambda body: (lambda r: r.fulfill(content_type='text/javascript', body=body)))((FAKE / f'{name}.js').read_text()))
            await pg.route('**/config/firebase-config.js', lambda r: r.fulfill(content_type='text/javascript', body=CFG))
            await pg.route('**/config/admin-config.js', lambda r: r.fulfill(content_type='text/javascript', body=ADM))
            await pg.route('https://api.imgbb.com/**', lambda r: r.fulfill(content_type='application/json', body=json.dumps({'success': True, 'data': {'url': 'https://i.ibb.co/abc/image.webp'}})))
            await pg.route('https://i.ibb.co/**', lambda r: r.abort())
            await pg.route('https://wa.me/**', lambda r: r.fulfill(body='ok'))
            await pg.route('https://fonts.*/**', lambda r: r.abort())
            await pg.add_init_script("if(!sessionStorage.getItem('fakedb'))sessionStorage.setItem('fakedb',JSON.stringify({'stores/my-store/admins/u1':{}}))")

            # --- login ---
            await pg.goto(BASE + 'admin/index.html'); await pg.wait_for_selector('#lf')
            await pg.fill('#em', 'admin@test.com'); await pg.fill('#pw', 'wrong'); await pg.click('#lf button'); await pg.wait_for_function("document.querySelector('#le').textContent")
            assert 'غير صحيحة' in await pg.inner_text('#le'); ok('wrong password -> Arabic error')
            await pg.fill('#em', 'other@test.com'); await pg.fill('#pw', 'secret2'); await pg.click('#lf button'); await pg.wait_for_function("document.querySelector('#le').textContent.includes('صلاحية')"); ok('non-admin account rejected')
            await pg.fill('#em', 'admin@test.com'); await pg.fill('#pw', 'secret1'); await pg.click('#lf button'); await pg.wait_for_selector('.stats')
            assert (await pg.locator('.stat b').all_inner_texts())[0] == '0'; ok('admin login + empty dashboard')

            # --- settings ---
            await pg.goto(BASE + 'admin/settings.html'); await pg.wait_for_selector('#sf')
            await pg.fill('#storeName', 'متجر الاختبار'); await pg.fill('#whatsapp', '07701234567'); await pg.fill('[name="social.instagram"]', 'instagram.com/test')
            await pg.fill('#lowStockThreshold', '5'); await pg.click('#save'); await pg.wait_for_selector('.toast.success'); ok('settings saved')

            # --- category ---
            await pg.goto(BASE + 'admin/categories.html'); await pg.wait_for_selector('#add'); await pg.click('#add')
            await pg.click('dialog [type=submit]'); assert 'مطلوب' in await pg.inner_text('dialog [data-err=name]'); ok('category validation')
            await pg.fill('dialog [name=name]', 'قمصان'); await pg.click('dialog [type=submit]'); await pg.wait_for_selector('.tbl tr[data-id]'); ok('category added')

            # --- product (with upload) ---
            await pg.goto(BASE + 'admin/products.html'); await pg.wait_for_selector('#add'); await pg.click('#add')
            await pg.click('dialog [type=submit]'); assert 'مطلوب' in await pg.inner_text('dialog [data-err=name]'); ok('product validation')
            await pg.fill('dialog [name=name]', 'تيشيرت أسود'); await pg.select_option('dialog [name=categoryId]', label='قمصان')
            await pg.fill('dialog [name=price]', '25000'); await pg.fill('dialog [name=stock]', '10'); await pg.check('dialog [name=featured]')
            await pg.fill('dialog [name=options]', 'المقاس: S, M, L'); await pg.fill('dialog [name=tags]', 'قطن')
            await pg.set_input_files('dialog input[type=file]', '/tmp/pic.png'); await pg.wait_for_selector('dialog .th img')
            await pg.click('dialog [type=submit]'); await pg.wait_for_selector('.tbl tr[data-id]'); ok('product added with uploaded image')
            await pg.fill('[data-stock]', '4'); await pg.press('[data-stock]', 'Enter'); await pg.wait_for_selector('.toast.success'); ok('inline stock edit')

            # --- storefront in real (fake-firebase) mode ---
            await pg.goto(BASE + 'index.html'); await pg.wait_for_selector('#featured .card:not([aria-hidden])')
            assert await pg.title() == 'متجر الاختبار'; await pg.wait_for_selector('#sec-low:not([hidden])'); ok('storefront shows saved product, store name, low-stock section (stock 4 <= 5)')
            await pg.goto(BASE + 'shop.html?q=قطن'); await pg.wait_for_selector('#grid .card:not([aria-hidden])'); ok('keyword search')
            await pg.click('#grid .card'); await pg.wait_for_selector('#buy'); await pg.check('input[name=opt0][value=M]'); await pg.fill('#qty', '2'); await pg.click('button[data-go=checkout]')
            await pg.wait_for_selector('#summary-list li')
            await pg.fill('#name', 'محمد أحمد'); await pg.fill('#phone', '07701234567'); await pg.fill('#address', 'بغداد - الكرادة'); await pg.fill('#landmark', 'قرب الجامع')
            await pg.click('#submit'); await pg.wait_for_selector('.done'); ok('order created -> done screen')

            # --- orders + stock logic ---
            await pg.goto(BASE + 'admin/orders.html'); await pg.wait_for_selector('.order')
            assert await pg.locator('.order .pill.new').count() == 1; ok('order visible to admin with status جديد')
            await pg.click('.order summary'); await pg.select_option('[data-status]', 'confirmed'); await pg.wait_for_selector('.toast.success')
            await pg.goto(BASE + 'admin/inventory.html'); await pg.wait_for_selector('.tbl input.mini')
            assert await pg.input_value('.tbl input.mini') == '2'; ok('confirm order -> stock 4 - 2 = 2')
            await pg.goto(BASE + 'admin/orders.html'); await pg.wait_for_selector('.order'); await pg.click('.order summary')
            await pg.select_option('[data-status]', 'cancelled'); await pg.click('dialog .danger'); await pg.wait_for_function("document.querySelector('.order .pill.cancelled')")
            await pg.goto(BASE + 'admin/inventory.html'); await pg.wait_for_selector('.tbl input.mini'); assert await pg.input_value('.tbl input.mini') == '4'; ok('cancel -> stock restored to 4')
            await pg.goto(BASE + 'admin/index.html'); await pg.wait_for_selector('.stats'); t = await pg.locator('.stat b').all_inner_texts(); assert t[:3] == ['1', '0', '1'] and t[4] == '1', t; ok('dashboard counts ' + str(t))
            # --- delete product + guard ---
            await pg.goto(BASE + 'admin/products.html'); await pg.wait_for_selector('[data-del]'); await pg.click('[data-del]'); await pg.click('dialog .danger'); await pg.wait_for_selector('.empty'); ok('product deleted after confirmation')
            await pg.screenshot(path='/tmp/admin_m.png')
            print('PAGE ERRORS:', errs); await b.close()
    finally:
        srv.terminate()
asyncio.run(main())
