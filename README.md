# Nexora Digital Market

Original full-stack ecommerce storefront for digital products such as FiveM resources, scripts, maps, vehicles, EUP packs, tools, accounts, VPN credentials, keys, and files.

The project uses a dark gaming storefront, cart, checkout, crypto invoice flow, customer dashboard, admin dashboard, delivery logs, review gating, Discord webhook hooks, and server-only payment checking. It is inspired by common digital-product ecommerce structure, but uses original branding, content, layout, and generated artwork.

## Run Locally

```bash
npm install
npm run dev
```

Frontend: http://127.0.0.1:5173  
API: http://127.0.0.1:8787

Copy `.env.example` to `.env` before production-style testing.

## Product Import Tools

To pull a reviewable catalog from Lusive product pages, run:

```bash
npm run scrape:lusive
```

This writes `imports/lusive-products.json` with catalog facts, product fields, source references, and no copied images. After reviewing the JSON, you can import the products into MySQL:

```bash
npm run import:lusive
```

For production, commit `imports/lusive-products.json` and `public/images/imported/lusive/`, then run this against the production database:

```bash
npm run seed:products
```

## Demo Admin

Default local credentials:

```text
admin@nexora.local
change-this-password
```

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in `.env` before exposing the app.

## Crypto Payment Logic

When a customer chooses LTC, BTC, SOL, or ETH, the backend:

1. Creates a unique invoice ID.
2. Assigns a unique deposit address from the configured address pool or a watch-only demo fallback.
3. Calculates the exact coin amount from the USD total.
4. Generates QR payment data.
5. Stores the invoice ID, customer email, products, coin amount, address, status, confirmations, dates, and transaction metadata.
6. Polls payment status server-side.
7. Marks the invoice paid after the configured confirmation count.
8. Creates the order, delivery log, dashboard entry, optional email, and optional Discord webhook.

Blockchain networks do not know invoice IDs. The invoice is matched by the unique deposit address stored in the server database.

For production, use either:

- BTCPay Server or another gateway with verified webhooks.
- An HD wallet/xpub address allocator plus full nodes or trusted chain APIs.

Never put private keys, seed phrases, xprv values, API secrets, SMTP passwords, or wallet credentials in frontend code.

## Key Routes

- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/invoice/[invoiceId]`
- `/dashboard`
- `/dashboard/orders`
- `/dashboard/downloads`
- `/admin`
- `/admin/products`
- `/admin/orders`
- `/admin/invoices`
- `/admin/settings`
- `/terms`
- `/privacy`
- `/support`

## Verification

```bash
npm run build
npm test
npm audit --omit=dev
```

The local invoice page includes a `Simulate Blockchain Payment` action so the delivery path can be tested without sending real crypto.
