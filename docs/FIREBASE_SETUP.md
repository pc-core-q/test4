# Firebase Setup (per store)

You need one Firebase project per client (recommended), or one shared project with a different `storeId` per client.

## Steps
1. **Create the project** — https://console.firebase.google.com → Add project. (No billing needed for the Spark plan; analytics optional.)
2. **Register a Web app** — Project settings → General → "Your apps" → Web (`</>`). Copy the config object.
3. **Enable Authentication** — Build → Authentication → Get started.
4. **Enable Email/Password** — Sign-in method → Email/Password → Enable. Do NOT enable "sign-up" flows in your own UI; there is none.
5. **Create the admin account** — Authentication → Users → Add user (email + strong password). Copy the user's **UID**.
6. **Create Firestore** — Build → Firestore Database → Create database → production mode → pick the closest region (cannot be changed later).
7. **Add the config** — paste the web config into `config/firebase-config.js`; set `storeId` in `config/store-config.js` (a short slug such as `shop-ali`).
8. **Deploy rules + indexes** — either paste `firestore.rules` into Firestore → Rules → Publish, or `firebase deploy --only firestore` (uses `firebase.json`). Indexes can also be created from the link in the browser console the first time a query needs one.
9. **Create the admin document** — Firestore → Start collection `stores` → document `{storeId}` → collection `admins` → document ID = the admin's **UID** → add any field (e.g. `role: "admin"`). The rules treat "a doc exists at `admins/{uid}`" as admin.
10. **Authorize your domain** — Authentication → Settings → Authorized domains → add your production domain (`localhost` is there by default).
Then open `/admin/`, sign in, and fill Settings → Categories → Products → Banners. Collections are created automatically on first write.

## Connecting another store
Option A (separate project, recommended): repeat the steps above with a new project and a new copy of this folder.
Option B (shared project): keep one Firebase project and change only `storeId` (and host a separate copy of the site). Create `stores/{newStoreId}/admins/{uid}` for that store's admin. Data is isolated by the rules because every rule is scoped to `/stores/{storeId}`; admins of store A cannot write to store B unless listed there.

## Firestore data model
```
stores/{storeId}
  settings/main      { storeName, storeDescription, seoTitle, seoDescription, logoUrl, faviconUrl, phone, whatsapp, email, address,
                       social:{instagram,facebook,tiktok,telegram,other:[{label,url}]},
                       theme:{primary,secondary,accent,background,text,buttonStyle:'square|rounded|pill'},
                       lowStockThreshold:5, reduceStockOn:'confirmed|never',
                       homeSections:{banners,categories,featured,latest,lowStock}, updatedAt }
  categories/{id}    { name, order, active, imageUrl, createdAt, updatedAt }
  banners/{id}       { imageUrl, title, description, buttonText, link, order, active, createdAt, updatedAt }
  products/{id}      { name, nameLower, keywords[], description, categoryId, category(name), price, discountPrice(0=none), stock,
                       status:'active|draft', featured, sku, brand, tags[], options:[{name,values[]}], specs:[{label,value}],
                       images[](url, first = main), createdAt, updatedAt }
  orders/{id}        { orderNumber, customer:{name,phone,address,landmark,notes},
                       items:[{productId,name,category,options{},qty,unitPrice,total,image}],
                       subtotal, total, currency, status:'new|reviewing|confirmed|preparing|shipped|completed|cancelled',
                       stockReduced, date, time, createdAt, updatedAt }
  admins/{uid}       { role: 'admin' }  (created manually in the console)
```
Notes: `nameLower` and `keywords` are written by the admin form and power storefront search — products created by hand in the console must include them.
Clothing uses `options` (المقاس/اللون); electronics use `specs` (and usually no `options`).

## Security model (what the rules enforce)
- Public: read `settings`; read `categories`/`banners` with `active == true`; read `products` with `status == 'active'`; **create** an order (shape-validated, `status == 'new'`, `stockReduced == false`, server timestamp).
- Admins only (`admins/{uid}` exists): everything else — all writes to settings/products/categories/banners, reading/updating/deleting orders, reading drafts.
- Customers can never read orders, change stock, or list admins. A signed-in user can only check their own admin doc; no client can write `admins`.
- Everything not matched is denied.

### Safe vs secret values
| Value | Where | Safe in frontend? |
|---|---|---|
| Firebase web config (apiKey, projectId, ...) | `config/firebase-config.js` | Yes — public identifiers; protection comes from rules + Auth |
| ImageKit URL endpoint | `config/store-config.js` | Yes |
| ImgBB API key | `config/admin-config.js` | **Semi-public**: downloadable by anyone who finds the file. Use a dedicated account |
| ImageKit **private key** | nowhere | **Never** put in this project |
| Firebase **service account JSON**, Admin SDK keys | nowhere | **Never** in this project |
| Admin email/password | Firebase Auth only | Never in code |
