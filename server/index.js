import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomUUID, randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { initDatabase, getSettings, updateSettings } from "./db.js";
import {
  getAllCategories, getCategoryNames, getCategoryByName, getCategoryById, createCategory, updateCategory, deleteCategory,
  getAllProducts, getProductById, getProductBySlug, getProductStock, createProduct, updateProduct, deleteProduct, consumeStock,
  publicProduct, publicProductListItem,
  getAllInvoices, getInvoiceById, createInvoice, updateInvoice, addInvoiceEvent, getPendingInvoices,
  getInvoicesByEmail, getInvoicesByCoin, orderExistsForInvoice,
  getAllOrders, getOrderByInvoiceId, getOrdersByInvoiceIds, createOrder,
  getApprovedReviews, getReviewsByProduct, createReview, getAllReviews, updateReviewStatus, deleteReview,
  findOrCreateCustomer, getCustomerByEmail, updateCustomerLastOrder, deductCustomerBalance, getAllCustomers, updateCustomerBalance,
  getActiveCoupon, getAllCoupons, createCoupon, updateCoupon, deleteCoupon,
  addActivityLog, addDeliveryLog, getAdminSummary
} from "./store.js";
import { getWalletAddress, getPoolAddress, calculateCryptoAmount, createQrData, supportedCoins, getLivePrices, convertFiat } from "./payments.js";
import { getIncomingTransactions, findMatchingPayment, getRequiredConfirmations } from "./blockchain.js";
import { sendDeliveryEmail, sendDiscordWebhook, sendVerificationEmail } from "./delivery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fileToDataUrl(file) {
  const mime = file.mimetype || "image/png";
  return `data:${mime};base64,${file.buffer.toString("base64")}`;
}

function toMySQLDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, fieldSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});

const app = express();
const port = Number(process.env.PORT || 8787);
const jwtSecret = process.env.JWT_SECRET || (() => { console.warn("[SECURITY] JWT_SECRET not set! Using random secret (tokens won't persist across restarts)"); return randomBytes(32).toString("hex"); })();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
// images are stored as base64 data URLs in the database, no static uploads dir needed

const checkoutLimiter = rateLimit({ windowMs: 60_000, limit: 12 });
const adminLimiter = rateLimit({ windowMs: 60_000, limit: 20 });
const dashboardCodeLimiter = rateLimit({ windowMs: 60_000, limit: 5 });

// In-memory verification code store: email -> { code, expiresAt }
const verificationCodes = new Map();

function makeInvoiceId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `INV-${ts}-${rand}`;
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Missing admin token" });
  try {
    req.admin = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

function createToken(email) {
  return jwt.sign({ email, role: "admin" }, jwtSecret, { expiresIn: "8h" });
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

async function applyCoupon(subtotal, couponCode) {
  if (!couponCode) return { discount: 0, coupon: null };
  const coupon = await getActiveCoupon(couponCode);
  if (!coupon) return { discount: 0, coupon: null };
  const discount = coupon.type === "percent" ? subtotal * (Number(coupon.value) / 100) : Number(coupon.value);
  return { discount: Number(Math.min(discount, subtotal).toFixed(2)), coupon };
}

async function calculateItems(requestedItems) {
  const items = [];
  for (const entry of requestedItems) {
    const product = await getProductById(entry.productId);
    if (!product) throw new Error(`Unknown product: ${entry.productId}`);
    const quantity = Math.max(1, Math.min(Number(entry.quantity || 1), 10));
    if (product.stockCount < quantity) throw new Error(`${product.name} does not have enough stock`);
    items.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
      lineTotal: Number((product.price * quantity).toFixed(2))
    });
  }
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  return { items, subtotal };
}

async function completeInvoice(invoice) {
  if (await orderExistsForInvoice(invoice.id)) return;
  const deliveryItems = [];
  for (const item of invoice.items) {
    const product = await getProductById(item.productId);
    if (!product) continue;
    let delivered = [];
    if (product.stockType !== "manual") {
      delivered = await consumeStock(product.id, item.quantity, invoice.id);
    } else {
      delivered = ["Manual delivery task opened. Support will contact you."];
    }
    if (delivered.length === 0) delivered = ["Delivery pending stock review."];
    deliveryItems.push({ productId: product.id, name: product.name, deliveryType: product.deliveryType, delivered });
  }
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();
  await createOrder({
    id: orderId, invoiceId: invoice.id, customerEmail: invoice.customerEmail,
    items: invoice.items, totalUsd: invoice.totalUsd, status: "completed",
    deliveryItems, createdAt: now
  });
  await updateInvoice(invoice.id, { status: "paid", orderId });
  await addDeliveryLog({
    id: `DLV-${Date.now().toString(36).toUpperCase()}`,
    invoiceId: invoice.id, orderId, customerEmail: invoice.customerEmail,
    type: "auto_delivery", items: deliveryItems
  });
  const customer = await findOrCreateCustomer(invoice.customerEmail);
  await updateCustomerLastOrder(invoice.customerEmail);
  await sendDiscordWebhook("Payment confirmed", { invoice: invoice.id, order: orderId, total: `$${invoice.totalUsd}` });
  // Send delivery email to customer
  try {
    const order = await getOrderByInvoiceId(invoice.id);
    if (order) await sendDeliveryEmail(invoice, order);
  } catch (emailErr) {
    console.error(`[delivery] Failed to send delivery email for ${orderId}:`, emailErr.message);
  }
}

async function expireOldInvoices() {
  const pending = await getPendingInvoices();
  for (const invoice of pending) {
    if (new Date(invoice.expiresAt).getTime() < Date.now() && !["paid", "expired"].includes(invoice.status)) {
      await updateInvoice(invoice.id, { status: "expired" });
      await addInvoiceEvent(invoice.id, "expired");
    }
  }
}

// ── Initialize DB + start server ──

await initDatabase();

setInterval(() => {
  expireOldInvoices().catch((error) => console.error("invoice expiry check failed", error));
}, 30_000);

// ── Blockchain payment detection loop ──

async function checkPendingPayments() {
  if (process.env.PAYMENT_MODE === "mock") return;
  const pending = await getPendingInvoices();
  for (const invoice of pending) {
    if (!invoice.depositAddress || !invoice.selectedCoin) continue;
    if (!["LTC", "BTC", "SOL", "ETH"].includes(invoice.selectedCoin)) continue;
    try {
      const txs = await getIncomingTransactions(invoice.selectedCoin, invoice.depositAddress);
      const match = findMatchingPayment(txs, invoice.expectedCryptoAmount);
      if (match) {
        const required = getRequiredConfirmations(invoice.selectedCoin);
        // Always update tx info
        await updateInvoice(invoice.id, {
          transactionId: match.txHash,
          confirmationCount: match.confirmations
        });
        if (match.confirmations >= required) {
          await updateInvoice(invoice.id, { status: "paid", transactionId: match.txHash, confirmationCount: match.confirmations });
          await addInvoiceEvent(invoice.id, "payment_confirmed");
          const confirmed = await getInvoiceById(invoice.id);
          await completeInvoice(confirmed);
          console.log(`[payments] ✓ Invoice ${invoice.id} confirmed — TX: ${match.txHash.slice(0, 16)}... (${match.confirmations} confs)`);
        } else {
          console.log(`[payments] ◎ Invoice ${invoice.id} detected — ${match.confirmations}/${required} confirmations`);
        }
      }
    } catch (err) {
      console.error(`[payments] Check failed for ${invoice.id}:`, err.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

setInterval(() => {
  checkPendingPayments().catch((error) => console.error("payment check failed", error));
}, 45_000);

// ── Public routes ──

app.get("/api/health", async (_req, res) => {
  const settings = await getSettings();
  res.json({ ok: true, storeName: settings.storeName || "Zyvory Market", coins: supportedCoins() });
});

app.get("/api/prices", async (_req, res) => {
  try {
    const prices = await getLivePrices();
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});

app.get("/api/img/category/:id", async (req, res) => {
  const cat = await getCategoryById(Number(req.params.id));
  if (!cat || !cat.image) return res.status(404).end();
  const match = cat.image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(404).end();
  const buffer = Buffer.from(match[2], "base64");
  res.set("Content-Type", match[1]);
  res.set("Cache-Control", "public, max-age=86400, immutable");
  res.send(buffer);
});

app.get("/api/img/product/:id", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product || !product.image) return res.status(404).end();
  const match = product.image.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return res.status(404).end();
  const buffer = Buffer.from(match[2], "base64");
  res.set("Content-Type", match[1]);
  res.set("Cache-Control", "public, max-age=86400, immutable");
  res.send(buffer);
});

app.get("/api/categories", async (_req, res) => {
  const cats = await getAllCategories();
  res.json(cats.map(c => ({ ...c, image: c.image ? `/api/img/category/${c.id}` : null })));
});

app.get("/api/products", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const category = String(req.query.category || "");
  const sort = String(req.query.sort || "popular");
  let products = (await getAllProducts())
    .filter((p) => (p.status || "active") === "active")
    .map(publicProductListItem)
    .map(p => ({
      ...p,
      image: p.image ? `/api/img/product/${p.id}` : null
    }));
  if (search) products = products.filter((p) => p.name.toLowerCase().includes(search));
  if (category) products = products.filter((p) => p.category === category);
  if (req.query.maxPrice) products = products.filter((p) => p.price <= Number(req.query.maxPrice));
  if (sort === "newest") products = [...products].reverse();
  if (sort === "price-low") products = [...products].sort((a, b) => a.price - b.price);
  if (sort === "popular") products = [...products].sort((a, b) => b.stockCount - a.stockCount);
  res.json(products);
});

app.get("/api/products/:slug", async (req, res) => {
  const product = await getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const reviews = await getReviewsByProduct(product.id);
  const pub = publicProduct(product);
  return res.json({ ...pub, image: pub.image ? `/api/img/product/${pub.id}` : null, reviews });
});

app.get("/api/reviews", async (_req, res) => {
  res.json(await getApprovedReviews());
});

app.post("/api/invoices", checkoutLimiter, async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    discord: z.string().optional().default(""),
    couponCode: z.string().optional().default(""),
    newsletter: z.boolean().optional().default(false),
    agreedToTerms: z.literal(true),
    paymentMethod: z.enum(["LTC", "BTC", "SOL", "ETH", "PAYPAL_FF", "BALANCE"]),
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout payload", details: parsed.error.flatten() });
  try {
    const { items, subtotal } = await calculateItems(parsed.data.items);
    const { discount, coupon } = await applyCoupon(subtotal, parsed.data.couponCode);
    const totalUsd = Number((subtotal - discount).toFixed(2));
    const id = makeInvoiceId();
    let expectedCryptoAmount = null;
    let depositAddress = null;
    let qrCodeData = null;
    let qrCode = null;
    if (parsed.data.paymentMethod === "PAYPAL_FF") {
      const settings = await getSettings();
      const paypalEmail = settings.paypalEmail;
      if (!paypalEmail) throw new Error("PayPal is not configured. Please choose a crypto payment method.");
      depositAddress = paypalEmail;
    } else if (["LTC", "BTC", "SOL", "ETH"].includes(parsed.data.paymentMethod)) {
      const pendingForCoin = await getInvoicesByCoin(parsed.data.paymentMethod);
      // Try address pool first, fall back to single wallet address
      const usedAddresses = pendingForCoin.map((inv) => inv.depositAddress).filter(Boolean);
      const poolAddr = getPoolAddress(parsed.data.paymentMethod, usedAddresses);
      if (poolAddr) {
        depositAddress = poolAddr;
      } else {
        const settings = await getSettings();
        depositAddress = getWalletAddress(settings, parsed.data.paymentMethod);
      }
      const existingAmounts = pendingForCoin.map((inv) => inv.expectedCryptoAmount);
      expectedCryptoAmount = await calculateCryptoAmount(totalUsd, parsed.data.paymentMethod, existingAmounts);
      const qr = await createQrData(parsed.data.paymentMethod, depositAddress, expectedCryptoAmount, id);
      qrCodeData = qr.data;
      qrCode = qr.qrCode;
    }
    const createdAt = new Date();
    const invoiceData = {
      id,
      customerEmail: parsed.data.email.toLowerCase(),
      discord: parsed.data.discord,
      newsletter: parsed.data.newsletter,
      items,
      subtotal,
      discount,
      couponCode: coupon?.code || null,
      totalUsd,
      selectedCoin: parsed.data.paymentMethod,
      expectedCryptoAmount,
      depositAddress,
      qrCodeData,
      qrCode,
      transactionId: null,
      confirmationCount: 0,
      mockDetected: 0,
      status: "pending",
      createdAt: toMySQLDatetime(createdAt),
      expiresAt: toMySQLDatetime(new Date(createdAt.getTime() + 60 * 60 * 1000))
    };
    const invoice = await createInvoice(invoiceData);
    await addActivityLog("invoice_created", id);
    await sendDiscordWebhook("New order", { invoice: id, email: invoice.customerEmail, total: `$${totalUsd}`, method: invoice.selectedCoin });
    // Handle BALANCE payment: verify and deduct balance
    if (parsed.data.paymentMethod === "BALANCE") {
      const customer = await findOrCreateCustomer(parsed.data.email.toLowerCase());
      const balance = Number(customer.balance || 0);
      if (balance < totalUsd) {
        await updateInvoice(invoice.id, { status: "failed" });
        return res.status(400).json({ error: `Insufficient balance. You have €${balance.toFixed(2)} but need €${totalUsd.toFixed(2)}.` });
      }
      await deductCustomerBalance(parsed.data.email.toLowerCase(), totalUsd);
      await updateInvoice(invoice.id, { status: "paid", transactionId: `balance_${Date.now().toString(36)}` });
      const paidInvoice = await getInvoiceById(invoice.id);
      await completeInvoice(paidInvoice);
      return res.status(201).json(paidInvoice);
    }
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  // Strip internal fields (newsletter, coupon details, mock flags) from public response
  const { newsletter, mockDetected, discount, couponCode, subtotal, ...publicInvoice } = invoice;
  res.json(publicInvoice);
});

app.get("/api/settings/public", async (_req, res) => {
  const settings = await getSettings();
  res.json({ discordInvite: settings.discordInvite || "https://discord.gg/Zhd6unzQGm" });
});

app.post("/api/dashboard/send-code", dashboardCodeLimiter, async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });
  const code = String(Math.floor(100000 + Math.random() * 900000));
  verificationCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  try {
    const sent = await sendVerificationEmail(email, code);
    if (!sent) return res.status(500).json({ error: "Email service not configured. Contact support." });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to send verification email:", err.message);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
});

app.post("/api/dashboard/verify-code", dashboardCodeLimiter, async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const code = String(req.body.code || "").trim();
  if (!email || !code) return res.status(400).json({ error: "Email and code required" });
  const stored = verificationCodes.get(email);
  if (!stored) return res.status(400).json({ error: "No code sent for this email. Request a new one." });
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: "Code expired. Request a new one." });
  }
  if (stored.code !== code) return res.status(400).json({ error: "Invalid code. Please try again." });
  verificationCodes.delete(email);
  // Return dashboard data using filtered queries
  const invoices = await getInvoicesByEmail(email);
  const invoiceIds = invoices.map((inv) => inv.id);
  const orders = await getOrdersByInvoiceIds(invoiceIds);
  const customer = (await getCustomerByEmail(email)) || { email, balance: 0 };
  const allReviews = await getApprovedReviews();
  const invoiceIdSet = new Set(invoiceIds);
  const reviewCount = allReviews.filter((r) => invoiceIdSet.has(r.invoiceId)).length;
  res.json({ customer, invoices, orders, reviewCount });
});

// Dashboard data requires verification code flow (POST /dashboard/send-code + /dashboard/verify-code)
// Legacy GET endpoint removed for security — use the code-verified flow instead.

app.post("/api/reviews", async (req, res) => {
  const schema = z.object({
    invoiceId: z.string(),
    productId: z.string(),
    rating: z.number().int().min(1).max(5),
    text: z.string().min(8).max(500)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid review" });
  try {
    const invoice = await getInvoiceById(parsed.data.invoiceId);
    if (!invoice || invoice.status !== "paid") throw new Error("Review requires a paid purchase");
    if (!invoice.items.some((item) => item.productId === parsed.data.productId)) throw new Error("Review requires a paid purchase");
    const review = await createReview({
      id: `REV-${Date.now().toString(36).toUpperCase()}`,
      productId: parsed.data.productId,
      invoiceId: parsed.data.invoiceId,
      rating: parsed.data.rating,
      text: parsed.data.text
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/coupons/validate", async (req, res) => {
  const code = String(req.body.code || "").trim();
  const subtotal = Number(req.body.subtotal || 0);
  if (!code) return res.status(400).json({ error: "Coupon code is required" });
  try {
    const coupon = await getActiveCoupon(code);
    if (!coupon) return res.status(400).json({ error: "Invalid or expired coupon code" });
    const discount = coupon.type === "percent"
      ? subtotal * (Number(coupon.value) / 100)
      : Number(coupon.value);
    res.json({ valid: true, discount: Number(Math.min(discount, subtotal).toFixed(2)), type: coupon.type, value: Number(coupon.value) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Admin routes ──

app.post("/api/admin/login", adminLimiter, async (req, res) => {
  const email = String(req.body.email || "");
  const password = String(req.body.password || "");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return res.status(500).json({ error: "Admin credentials not configured on server" });
  const ok = email === adminEmail && (password === adminPassword || (adminPassword.startsWith("$2") && (await bcrypt.compare(password, adminPassword))));
  if (!ok) return res.status(401).json({ error: "Invalid admin credentials" });
  res.json({ token: createToken(email), email });
});

app.get("/api/admin/summary", auth, async (_req, res) => {
  res.json(await getAdminSummary());
});

app.get("/api/admin/products", auth, async (_req, res) => {
  const products = (await getAllProducts()).map(p => ({ ...p, image: p.image ? `/api/img/product/${p.id}` : null }));
  res.json(products);
});

app.get("/api/admin/catalog", auth, async (_req, res) => {
  const categories = (await getAllCategories()).map(c => ({ ...c, image: c.image ? `/api/img/category/${c.id}` : null }));
  const products = (await getAllProducts()).map(p => ({ ...p, image: p.image ? `/api/img/product/${p.id}` : null }));
  res.json({ categories, products });
});

app.get("/api/admin/categories", auth, async (_req, res) => {
  const cats = (await getAllCategories()).map(c => ({ ...c, image: c.image ? `/api/img/category/${c.id}` : null }));
  res.json(cats);
});

app.post("/api/admin/categories", auth, upload.single("image"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) throw new Error("Category name is required");
    const image = req.file ? fileToDataUrl(req.file) : (req.body.image || null);
    const tag = req.body.tag ? String(req.body.tag).trim() : null;
    const cat = await createCategory(name, image, tag);
    res.status(201).json(cat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/categories/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.tag !== undefined) data.tag = req.body.tag;
    if (req.file) data.image = fileToDataUrl(req.file);
    else if (req.body.image !== undefined) data.image = req.body.image;
    const cat = await updateCategory(id, data);
    res.json(cat);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/admin/categories/:id", auth, async (req, res) => {
  try {
    await deleteCategory(Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/admin/products", auth, upload.single("image"), async (req, res) => {
  try {
    const body = req.body;
    const image = req.file ? fileToDataUrl(req.file) : (body.image || null);
    const features = body.features ? normalizeList(body.features) : [];
    const product = await createProduct({
      id: `prod_${randomUUID().slice(0, 8)}`,
      name: String(body.name || "").trim(),
      category: String(body.category || "").trim(),
      price: Number(body.price || 0),
      image,
      badge: body.badge || "New",
      stockCount: Number(body.stockCount || 0),
      shortDescription: body.shortDescription || "",
      description: body.description || "",
      features,
      deliveryType: body.deliveryType || "license key",
      status: body.status || "active",
      slug: body.slug || "",
      metaTitle: body.metaTitle || "",
      metaDescription: body.metaDescription || ""
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/products/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const body = req.body;
    const data = {};
    if (body.name) data.name = String(body.name).trim();
    if (body.category) data.category = String(body.category).trim();
    if (body.price !== undefined) data.price = Number(body.price);
    if (req.file) data.image = fileToDataUrl(req.file);
    else if (body.image !== undefined) data.image = body.image;
    if (body.badge) data.badge = body.badge;
    if (body.stockCount !== undefined) data.stockCount = Number(body.stockCount);
    if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
    if (body.description !== undefined) data.description = body.description;
    if (body.features !== undefined) data.features = normalizeList(body.features);
    if (body.deliveryType) data.deliveryType = body.deliveryType;
    if (body.status) data.status = body.status;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;
    const product = await updateProduct(req.params.id, data);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/admin/products/:id", auth, async (req, res) => {
  await deleteProduct(req.params.id);
  res.status(204).end();
});

app.post("/api/admin/upload", auth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: fileToDataUrl(req.file) });
});

app.get("/api/admin/invoices", auth, async (_req, res) => {
  res.json(await getAllInvoices());
});

app.post("/api/admin/invoices/:id/mark-paid", auth, async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  const txId = invoice.transactionId || `manual_${Date.now().toString(36)}`;
  await updateInvoice(invoice.id, { status: "paid", transactionId: txId, confirmationCount: 1 });
  const fresh = await getInvoiceById(invoice.id);
  await completeInvoice(fresh);
  res.json(fresh);
});

app.get("/api/admin/orders", auth, async (_req, res) => {
  res.json(await getAllOrders());
});

app.post("/api/admin/orders/:id/resend", auth, async (req, res) => {
  try {
    const orders = await getAllOrders();
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const invoice = await getInvoiceById(order.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found for this order" });
    await sendDeliveryEmail(invoice, order);
    res.json({ success: true, message: "Delivery email resent" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/admin/settings", auth, async (_req, res) => {
  res.json(await getSettings());
});

app.put("/api/admin/settings", auth, async (req, res) => {
  const settings = await updateSettings(req.body);
  res.json(settings);
});

// ── Admin: Customers ──

app.get("/api/admin/customers", auth, async (_req, res) => {
  res.json(await getAllCustomers());
});

app.put("/api/admin/customers/:email/balance", auth, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const balance = Number(req.body.balance);
    if (isNaN(balance) || balance < 0) return res.status(400).json({ error: "Invalid balance" });
    const customer = await updateCustomerBalance(email, balance);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Admin: Coupons ──

app.get("/api/admin/coupons", auth, async (_req, res) => {
  res.json(await getAllCoupons());
});

app.post("/api/admin/coupons", auth, async (req, res) => {
  try {
    const { code, type, value, active, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ error: "Code and value are required" });
    const coupon = await createCoupon({ code, type: type || "percent", value: Number(value), active: active !== false, expiresAt: expiresAt || "2026-12-31 23:59:59" });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/admin/coupons/:id", auth, async (req, res) => {
  try {
    const coupon = await updateCoupon(Number(req.params.id), req.body);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/admin/coupons/:id", auth, async (req, res) => {
  try {
    await deleteCoupon(Number(req.params.id));
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Admin: Reviews ──

app.get("/api/admin/reviews", auth, async (_req, res) => {
  res.json(await getAllReviews());
});

app.put("/api/admin/reviews/:id/status", auth, async (req, res) => {
  try {
    const status = req.body.status;
    if (!["approved", "rejected", "pending"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const review = await updateReviewStatus(req.params.id, status);
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/admin/reviews/:id", auth, async (req, res) => {
  try {
    await deleteReview(req.params.id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ── Serve frontend in production ──
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Zyvory API listening on http://0.0.0.0:${port}`);
});
