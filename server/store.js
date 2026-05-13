import { query, queryOne } from "./db.js";

// ── Helpers ──

function parseJson(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function normalizeProductRow(row) {
  if (!row) return null;
  const stockCount = Number(row.stock_count || 0);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category || "",
    category_id: row.category_id,
    price: Number(row.price),
    image: row.image,
    badge: row.badge,
    shortDescription: row.short_description,
    description: row.description,
    features: parseJson(row.features, []),
    deliveryType: row.delivery_type || "license key",
    status: row.status || "active",
    stockCount,
    stockStatus: stockCount > 0 ? "In stock" : "Out of stock",
    stockType: row.delivery_type === "manual delivery" ? "manual" : "auto",
    metaTitle: row.meta_title || "",
    metaDescription: row.meta_description || "",
    createdAt: row.created_at
  };
}

function normalizeInvoiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerEmail: row.customer_email,
    discord: row.discord,
    newsletter: !!row.newsletter,
    items: parseJson(row.items),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    couponCode: row.coupon_code,
    totalUsd: Number(row.total_usd),
    selectedCoin: row.selected_coin,
    expectedCryptoAmount: row.expected_crypto_amount ? Number(row.expected_crypto_amount) : null,
    depositAddress: row.deposit_address,
    qrCodeData: row.qr_code_data,
    qrCode: row.qr_code,
    transactionId: row.transaction_id,
    confirmationCount: row.confirmation_count || 0,
    mockDetected: !!row.mock_detected,
    status: row.status,
    orderId: row.order_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    detectedAt: row.detected_at ? new Date(row.detected_at).toISOString() : null
  };
}

function normalizeOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    customerEmail: row.customer_email,
    items: parseJson(row.items),
    totalUsd: Number(row.total_usd),
    status: row.status,
    deliveryItems: parseJson(row.delivery_items),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

function normalizeReviewRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    invoiceId: row.invoice_id,
    name: row.name,
    rating: row.rating,
    text: row.text,
    status: row.status,
    verifiedPurchase: !!row.verified_purchase,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

function slugify(value) {
  return String(value || "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function uniqueSlug(name, currentId = null) {
  const base = slugify(name) || `product-${Date.now().toString(36)}`;
  let slug = base;
  let idx = 2;
  while (true) {
    const existing = currentId
      ? await queryOne("SELECT id FROM products WHERE slug = ? AND id != ?", [slug, currentId])
      : await queryOne("SELECT id FROM products WHERE slug = ?", [slug]);
    if (!existing) return slug;
    slug = `${base}-${idx}`;
    idx++;
  }
}

async function resolveCategoryId(categoryName) {
  if (!categoryName) throw new Error("Category is required");
  let cat = await queryOne("SELECT id FROM categories WHERE name = ?", [categoryName.trim()]);
  if (!cat) {
    await query("INSERT INTO categories (name) VALUES (?)", [categoryName.trim()]);
    cat = await queryOne("SELECT id FROM categories WHERE name = ?", [categoryName.trim()]);
  }
  return cat.id;
}

// ── Categories ──

export async function getAllCategories() {
  return query("SELECT * FROM categories ORDER BY sort_order, name");
}

export async function getCategoryNames() {
  const rows = await query("SELECT name FROM categories ORDER BY sort_order, name");
  return rows.map((r) => r.name);
}

export async function getCategoryById(id) {
  return queryOne("SELECT * FROM categories WHERE id = ?", [id]);
}

export async function getCategoryByName(name) {
  return queryOne("SELECT * FROM categories WHERE name = ?", [name]);
}

export async function createCategory(name, image = null, tag = null) {
  const existing = await getCategoryByName(name.trim());
  if (existing) throw new Error("Category already exists");
  await query("INSERT INTO categories (name, image, tag) VALUES (?, ?, ?)", [name.trim(), image, tag || null]);
  return getCategoryByName(name.trim());
}

export async function updateCategory(id, data) {
  const cat = await getCategoryById(id);
  if (!cat) throw new Error("Category not found");
  const name = data.name !== undefined ? data.name.trim() : cat.name;
  const image = data.image !== undefined ? data.image : cat.image;
  const tag = data.tag !== undefined ? (data.tag || null) : cat.tag;
  if (name !== cat.name) {
    const dup = await queryOne("SELECT id FROM categories WHERE name = ? AND id != ?", [name, id]);
    if (dup) throw new Error("Category already exists");
  }
  await query("UPDATE categories SET name = ?, image = ?, tag = ? WHERE id = ?", [name, image, tag, id]);
  return { ...cat, name, image, tag };
}

export async function deleteCategory(id) {
  const rows = await query("SELECT COUNT(*) as cnt FROM products WHERE category_id = ?", [id]);
  if (rows[0].cnt > 0) throw new Error("Move or delete products in this category first");
  await query("DELETE FROM categories WHERE id = ?", [id]);
}

// ── Products ──

const PRODUCT_SELECT = `
  SELECT p.*, c.name as category
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

export async function getAllProducts() {
  const rows = await query(`${PRODUCT_SELECT} ORDER BY p.created_at DESC`);
  return rows.map(normalizeProductRow);
}

export async function getProductById(id) {
  const row = await queryOne(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  return normalizeProductRow(row);
}

export async function getProductBySlug(slug) {
  const row = await queryOne(`${PRODUCT_SELECT} WHERE p.slug = ?`, [slug]);
  return normalizeProductRow(row);
}

export async function getProductStock(productId) {
  const row = await queryOne("SELECT stock_count FROM products WHERE id = ?", [productId]);
  return row ? Number(row.stock_count) : 0;
}

export async function createProduct(data) {
  const id = data.id;
  const slug = data.slug ? await uniqueSlug(data.slug) : await uniqueSlug(data.name);
  const categoryId = await resolveCategoryId(data.category);
  const features = Array.isArray(data.features) ? JSON.stringify(data.features) : (data.features || null);
  await query(`
    INSERT INTO products (id, slug, name, category_id, price, image, badge, stock_count,
    short_description, description, features, delivery_type, status, meta_title, meta_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, slug, data.name, categoryId, data.price || 0, data.image || null,
    data.badge || "New", Number(data.stockCount) || 0,
    data.shortDescription || "", data.description || "",
    features, data.deliveryType || "license key", data.status || "active",
    data.metaTitle || null, data.metaDescription || null
  ]);
  return getProductById(id);
}

export async function updateProduct(id, data) {
  const existing = await getProductById(id);
  if (!existing) return null;
  const categoryId = data.category ? await resolveCategoryId(data.category) : existing.category_id;
  const name = data.name || existing.name;
  const slug = data.slug ? await uniqueSlug(data.slug, id) : await uniqueSlug(name, id);
  const features = data.features !== undefined
    ? (Array.isArray(data.features) ? JSON.stringify(data.features) : data.features)
    : JSON.stringify(existing.features || []);
  await query(`
    UPDATE products SET slug=?, name=?, category_id=?, price=?, image=?, badge=?,
    stock_count=?, short_description=?, description=?, features=?, delivery_type=?,
    status=?, meta_title=?, meta_description=? WHERE id=?
  `, [
    slug, name, categoryId,
    data.price !== undefined ? data.price : existing.price,
    data.image !== undefined ? data.image : existing.image,
    data.badge || existing.badge,
    data.stockCount !== undefined ? Number(data.stockCount) : existing.stockCount,
    data.shortDescription !== undefined ? data.shortDescription : existing.shortDescription,
    data.description !== undefined ? data.description : existing.description,
    features,
    data.deliveryType || existing.deliveryType,
    data.status || existing.status,
    data.metaTitle !== undefined ? data.metaTitle : existing.metaTitle,
    data.metaDescription !== undefined ? data.metaDescription : existing.metaDescription,
    id
  ]);
  return getProductById(id);
}

export async function deleteProduct(id) {
  await query("DELETE FROM products WHERE id = ?", [id]);
}

export async function consumeStock(productId, quantity, invoiceId) {
  // Try to consume from product_stock table (real delivery items)
  const stockRows = await query(
    "SELECT id, stock_value FROM product_stock WHERE product_id = ? AND is_sold = 0 ORDER BY created_at ASC LIMIT ?",
    [productId, quantity]
  );
  if (stockRows.length > 0) {
    const delivered = [];
    for (const row of stockRows) {
      await query("UPDATE product_stock SET is_sold = 1, sold_at = NOW(), invoice_id = ? WHERE id = ?", [invoiceId, row.id]);
      delivered.push(row.stock_value);
    }
    // Sync the stock_count on products table
    await query("UPDATE products SET stock_count = GREATEST(stock_count - ?, 0) WHERE id = ?", [stockRows.length, productId]);
    return delivered;
  }
  // Fallback: no items in product_stock table, just decrement count
  await query("UPDATE products SET stock_count = GREATEST(stock_count - ?, 0) WHERE id = ?", [quantity, productId]);
  return [`${quantity}x delivered (stock items pending upload)`];
}

// ── Public product (strip sensitive data) ──

export function publicProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    badge: product.badge,
    shortDescription: product.shortDescription,
    description: product.description,
    features: product.features,
    deliveryType: product.deliveryType,
    status: product.status,
    stockCount: product.stockCount,
    stockStatus: product.stockStatus,
    createdAt: product.createdAt
  };
}

export function publicProductListItem(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    badge: product.badge,
    stockCount: product.stockCount,
    stockStatus: product.stockStatus
  };
}

// ── Invoices ──

export async function getAllInvoices() {
  const rows = await query("SELECT * FROM invoices ORDER BY created_at DESC");
  return rows.map(normalizeInvoiceRow);
}

export async function getInvoiceById(id) {
  const row = await queryOne("SELECT * FROM invoices WHERE id = ?", [id]);
  return normalizeInvoiceRow(row);
}

export async function createInvoice(data) {
  await query(`
    INSERT INTO invoices (id, customer_email, discord, newsletter, items, subtotal, discount, coupon_code,
    total_usd, selected_coin, expected_crypto_amount, deposit_address, qr_code_data, qr_code,
    transaction_id, confirmation_count, mock_detected, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.id, data.customerEmail, data.discord || "", data.newsletter ? 1 : 0,
    JSON.stringify(data.items), data.subtotal, data.discount || 0, data.couponCode || null,
    data.totalUsd, data.selectedCoin, data.expectedCryptoAmount, data.depositAddress,
    data.qrCodeData, data.qrCode, data.transactionId, data.confirmationCount || 0,
    data.mockDetected ? 1 : 0, data.status || "pending", data.createdAt, data.expiresAt
  ]);
  await query("INSERT INTO invoice_events (invoice_id, event_type) VALUES (?, ?)", [data.id, "created"]);
  return getInvoiceById(data.id);
}

export async function updateInvoice(id, updates) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(updates)) {
    const col = camelToSnake(key);
    if (typeof value === "boolean") { sets.push(`${col} = ?`); params.push(value ? 1 : 0); }
    else if (typeof value === "object" && value !== null) { sets.push(`${col} = ?`); params.push(JSON.stringify(value)); }
    else { sets.push(`${col} = ?`); params.push(value); }
  }
  if (sets.length === 0) return getInvoiceById(id);
  params.push(id);
  await query(`UPDATE invoices SET ${sets.join(", ")} WHERE id = ?`, params);
  return getInvoiceById(id);
}

export async function addInvoiceEvent(invoiceId, eventType) {
  await query("INSERT INTO invoice_events (invoice_id, event_type) VALUES (?, ?)", [invoiceId, eventType]);
}

export async function getPendingInvoices() {
  const rows = await query("SELECT * FROM invoices WHERE status NOT IN ('paid','failed','expired') ORDER BY created_at ASC");
  return rows.map(normalizeInvoiceRow);
}

export async function getInvoicesByEmail(email) {
  const rows = await query("SELECT * FROM invoices WHERE customer_email = ? ORDER BY created_at DESC", [email]);
  return rows.map(normalizeInvoiceRow);
}

export async function getInvoicesByCoin(coin) {
  const rows = await query("SELECT * FROM invoices WHERE selected_coin = ? AND status = 'pending' ORDER BY created_at ASC", [coin]);
  return rows.map(normalizeInvoiceRow);
}

export async function orderExistsForInvoice(invoiceId) {
  const row = await queryOne("SELECT id FROM orders WHERE invoice_id = ?", [invoiceId]);
  return !!row;
}

// ── Orders ──

export async function getAllOrders() {
  const rows = await query("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(normalizeOrderRow);
}

export async function getOrderByInvoiceId(invoiceId) {
  const row = await queryOne("SELECT * FROM orders WHERE invoice_id = ?", [invoiceId]);
  return normalizeOrderRow(row);
}

export async function getOrdersByInvoiceIds(invoiceIds) {
  if (!invoiceIds.length) return [];
  const placeholders = invoiceIds.map(() => "?").join(",");
  const rows = await query(`SELECT * FROM orders WHERE invoice_id IN (${placeholders}) ORDER BY created_at DESC`, invoiceIds);
  return rows.map(normalizeOrderRow);
}

export async function createOrder(data) {
  await query(`
    INSERT INTO orders (id, invoice_id, customer_email, items, total_usd, status, delivery_items, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.id, data.invoiceId, data.customerEmail,
    JSON.stringify(data.items), data.totalUsd, data.status || "completed",
    JSON.stringify(data.deliveryItems), data.createdAt || new Date().toISOString()
  ]);
}

// ── Reviews ──

export async function getApprovedReviews() {
  const rows = await query("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC");
  return rows.map(normalizeReviewRow);
}

export async function getReviewsByProduct(productId) {
  const rows = await query("SELECT * FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC", [productId]);
  return rows.map(normalizeReviewRow);
}

export async function createReview(data) {
  await query(`
    INSERT INTO reviews (id, product_id, invoice_id, name, rating, text, status, verified_purchase)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [data.id, data.productId, data.invoiceId || null, data.name || "Verified buyer", data.rating, data.text, "pending", 1]);
  const row = await queryOne("SELECT * FROM reviews WHERE id = ?", [data.id]);
  return normalizeReviewRow(row);
}

// ── Customers ──

export async function findOrCreateCustomer(email) {
  let cust = await queryOne("SELECT * FROM customers WHERE email = ?", [email]);
  if (!cust) {
    const id = `CUS-${Date.now().toString(36).toUpperCase()}`;
    await query("INSERT INTO customers (id, email, balance) VALUES (?, ?, 0)", [id, email]);
    cust = await queryOne("SELECT * FROM customers WHERE id = ?", [id]);
  }
  return cust;
}

export async function getCustomerByEmail(email) {
  return queryOne("SELECT * FROM customers WHERE email = ?", [email]);
}

export async function updateCustomerLastOrder(email) {
  await query("UPDATE customers SET last_order_at = NOW() WHERE email = ?", [email]);
}

export async function deductCustomerBalance(email, amount) {
  await query("UPDATE customers SET balance = GREATEST(balance - ?, 0) WHERE email = ?", [amount, email]);
}

export async function getCustomerCount() {
  const row = await queryOne("SELECT COUNT(*) as cnt FROM customers");
  return row.cnt;
}

export async function getAllCustomers() {
  return query("SELECT * FROM customers ORDER BY created_at DESC");
}

export async function updateCustomerBalance(email, newBalance) {
  await query("UPDATE customers SET balance = ? WHERE email = ?", [newBalance, email]);
  return getCustomerByEmail(email);
}

// ── Reviews (admin) ──

export async function getAllReviews() {
  const rows = await query("SELECT r.*, p.name as product_name FROM reviews r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC");
  return rows.map(r => ({ ...normalizeReviewRow(r), productName: r.product_name || "Unknown" }));
}

export async function updateReviewStatus(id, status) {
  await query("UPDATE reviews SET status = ? WHERE id = ?", [status, id]);
  const row = await queryOne("SELECT * FROM reviews WHERE id = ?", [id]);
  return normalizeReviewRow(row);
}

export async function deleteReview(id) {
  await query("DELETE FROM reviews WHERE id = ?", [id]);
}

// ── Coupons ──

export async function getActiveCoupon(code) {
  return queryOne("SELECT * FROM coupons WHERE code = ? AND active = 1 AND expires_at > NOW()", [code]);
}

export async function getAllCoupons() {
  return query("SELECT * FROM coupons ORDER BY created_at DESC");
}

export async function createCoupon(data) {
  await query(
    "INSERT INTO coupons (code, type, value, active, expires_at) VALUES (?, ?, ?, ?, ?)",
    [data.code, data.type || "percent", data.value, data.active ? 1 : 0, data.expiresAt]
  );
  return queryOne("SELECT * FROM coupons WHERE code = ?", [data.code]);
}

export async function updateCoupon(id, data) {
  const sets = [];
  const params = [];
  if (data.code !== undefined) { sets.push("code = ?"); params.push(data.code); }
  if (data.type !== undefined) { sets.push("type = ?"); params.push(data.type); }
  if (data.value !== undefined) { sets.push("value = ?"); params.push(data.value); }
  if (data.active !== undefined) { sets.push("active = ?"); params.push(data.active ? 1 : 0); }
  if (data.expiresAt !== undefined) { sets.push("expires_at = ?"); params.push(data.expiresAt); }
  if (!sets.length) return queryOne("SELECT * FROM coupons WHERE id = ?", [id]);
  params.push(id);
  await query(`UPDATE coupons SET ${sets.join(", ")} WHERE id = ?`, params);
  return queryOne("SELECT * FROM coupons WHERE id = ?", [id]);
}

export async function deleteCoupon(id) {
  await query("DELETE FROM coupons WHERE id = ?", [id]);
}

// ── Activity Logs ──

export async function addActivityLog(type, invoiceId = null, details = null) {
  await query("INSERT INTO activity_logs (type, invoice_id, details) VALUES (?, ?, ?)", [type, invoiceId, details]);
}

// ── Delivery Logs ──

export async function addDeliveryLog(data) {
  await query(`
    INSERT INTO delivery_logs (id, invoice_id, order_id, customer_email, type, items, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [data.id, data.invoiceId, data.orderId, data.customerEmail, data.type || "auto_delivery", JSON.stringify(data.items)]);
}

// ── Stats ──

export async function getAdminSummary() {
  const revenue = await queryOne("SELECT COALESCE(SUM(total_usd), 0) as total FROM orders");
  const productCount = await queryOne("SELECT COUNT(*) as cnt FROM products");
  const invoiceCount = await queryOne("SELECT COUNT(*) as cnt FROM invoices");
  const orderCount = await queryOne("SELECT COUNT(*) as cnt FROM orders");
  const customerCount = await queryOne("SELECT COUNT(*) as cnt FROM customers");
  const reviewCount = await queryOne("SELECT COUNT(*) as cnt FROM reviews");
  const lowStock = await query(`
    ${PRODUCT_SELECT}
    WHERE p.stock_count <= 1
    ORDER BY p.stock_count ASC
  `);
  return {
    revenue: Number(revenue.total),
    products: productCount.cnt,
    invoices: invoiceCount.cnt,
    orders: orderCount.cnt,
    customers: customerCount.cnt,
    reviews: reviewCount.cnt,
    lowStock: lowStock.map(normalizeProductRow).map(publicProduct).map(p => ({ ...p, image: p.image ? `/api/img/product/${p.id}` : null }))
  };
}
