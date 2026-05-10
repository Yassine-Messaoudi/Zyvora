import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { initDatabase, getSettings, updateSettings } from "./db.js";
import {
  getAllCategories, getCategoryNames, getCategoryByName, createCategory, updateCategory, deleteCategory,
  getAllProducts, getProductById, getProductBySlug, getProductStock, createProduct, updateProduct, deleteProduct, consumeStock,
  publicProduct, publicProductListItem,
  getAllInvoices, getInvoiceById, createInvoice, updateInvoice, addInvoiceEvent, getPendingInvoices,
  getAllOrders, createOrder,
  getApprovedReviews, getReviewsByProduct, createReview,
  findOrCreateCustomer, getCustomerByEmail, updateCustomerLastOrder,
  getActiveCoupon, addActivityLog, addDeliveryLog, getAdminSummary
} from "./store.js";
import { getWalletAddress, calculateCryptoAmount, createQrData, supportedCoins } from "./payments.js";
import { sendDeliveryEmail, sendDiscordWebhook } from "./delivery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fileToDataUrl(file) {
  const mime = file.mimetype || "image/png";
  return `data:${mime};base64,${file.buffer.toString("base64")}`;
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
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-this-secret";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
// images are stored as base64 data URLs in the database, no static uploads dir needed

const checkoutLimiter = rateLimit({ windowMs: 60_000, limit: 12 });
const adminLimiter = rateLimit({ windowMs: 60_000, limit: 20 });

function makeInvoiceId() {
  return `INV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
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
  const existing = await getAllOrders();
  if (existing.some((o) => o.invoiceId === invoice.id)) return;
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

// ── Public routes ──

app.get("/api/health", async (_req, res) => {
  const settings = await getSettings();
  res.json({ ok: true, storeName: settings.storeName || "Zyvora Market", coins: supportedCoins() });
});

app.get("/api/categories", async (_req, res) => {
  const cats = await getAllCategories();
  res.json(cats);
});

app.get("/api/products", async (req, res) => {
  const search = String(req.query.search || "").toLowerCase();
  const category = String(req.query.category || "");
  const sort = String(req.query.sort || "popular");
  let products = (await getAllProducts()).map(publicProductListItem);
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
  return res.json({ ...publicProduct(product), reviews });
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
    if (["LTC", "BTC", "SOL", "ETH"].includes(parsed.data.paymentMethod)) {
      const settings = await getSettings();
      depositAddress = getWalletAddress(settings, parsed.data.paymentMethod);
      expectedCryptoAmount = calculateCryptoAmount(totalUsd, parsed.data.paymentMethod);
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
      status: parsed.data.paymentMethod === "BALANCE" ? "paid" : "pending",
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000).toISOString()
    };
    const invoice = await createInvoice(invoiceData);
    await addActivityLog("invoice_created", id);
    await sendDiscordWebhook("New order", { invoice: id, email: invoice.customerEmail, total: `$${totalUsd}`, method: invoice.selectedCoin });
    if (invoice.status === "paid") await completeInvoice(invoice);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  const invoice = await getInvoiceById(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  res.json(invoice);
});

app.get("/api/settings/public", async (_req, res) => {
  const settings = await getSettings();
  res.json({ discordInvite: settings.discordInvite || "https://discord.gg/your-server" });
});

app.get("/api/dashboard", async (req, res) => {
  const email = String(req.query.email || "").toLowerCase();
  const invId = String(req.query.invoiceId || "");
  if (!email && !invId) return res.status(400).json({ error: "Email or invoice ID required" });
  const allInvoices = await getAllInvoices();
  const invoices = allInvoices.filter((inv) => (email && inv.customerEmail === email) || (invId && inv.id === invId));
  const allOrders = await getAllOrders();
  const orders = allOrders.filter((order) => invoices.some((inv) => inv.id === order.invoiceId));
  const customer = (email ? await getCustomerByEmail(email) : null) || { email: email || invId, balance: 0 };
  res.json({ customer, invoices, orders });
});

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

// ── Admin routes ──

app.post("/api/admin/login", adminLimiter, async (req, res) => {
  const email = String(req.body.email || "");
  const password = String(req.body.password || "");
  const adminEmail = process.env.ADMIN_EMAIL || "crownshoptn@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Aa2255860955@";
  const ok = email === adminEmail && (password === adminPassword || (adminPassword.startsWith("$2") && (await bcrypt.compare(password, adminPassword))));
  if (!ok) return res.status(401).json({ error: "Invalid admin credentials" });
  res.json({ token: createToken(email), email });
});

app.get("/api/admin/summary", auth, async (_req, res) => {
  res.json(await getAdminSummary());
});

app.get("/api/admin/products", auth, async (_req, res) => {
  res.json(await getAllProducts());
});

app.get("/api/admin/catalog", auth, async (_req, res) => {
  const categories = await getAllCategories();
  const products = await getAllProducts();
  res.json({ categories, products });
});

app.get("/api/admin/categories", auth, async (_req, res) => {
  res.json(await getAllCategories());
});

app.post("/api/admin/categories", auth, upload.single("image"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) throw new Error("Category name is required");
    const image = req.file ? fileToDataUrl(req.file) : (req.body.image || null);
    const cat = await createCategory(name, image);
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
    const product = await createProduct({
      id: `prod_${randomUUID().slice(0, 8)}`,
      name: String(body.name || "").trim(),
      category: String(body.category || "").trim(),
      price: Number(body.price || 0),
      image,
      badge: body.badge || "New",
      stockCount: Number(body.stockCount || 0),
      shortDescription: body.shortDescription || "",
      description: body.description || ""
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

app.get("/api/admin/settings", auth, async (_req, res) => {
  res.json(await getSettings());
});

app.put("/api/admin/settings", auth, async (req, res) => {
  const settings = await updateSettings(req.body);
  res.json(settings);
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
  console.log(`Zyvora API listening on http://0.0.0.0:${port}`);
});
