import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDatabase, getPool, query, queryOne } from "../server/db.js";
import { createProduct } from "../server/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const importFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(rootDir, "imports", "lusive-products.json");

async function assertImageFilesExist(importData) {
  const paths = new Set();
  for (const item of [...importData.categories, ...importData.products]) {
    if (typeof item.image === "string" && item.image.startsWith("/images/")) {
      paths.add(path.join(rootDir, "public", item.image.replace(/^\//, "")));
    }
  }

  const missing = [];
  for (const file of paths) {
    try {
      await fs.access(file);
    } catch {
      missing.push(path.relative(rootDir, file));
    }
  }

  if (missing.length) {
    throw new Error(`Missing ${missing.length} imported image files. First missing file: ${missing[0]}`);
  }
}

async function seedProducts() {
  const raw = await fs.readFile(importFile, "utf8");
  const importData = JSON.parse(raw);

  if (!Array.isArray(importData.categories) || !Array.isArray(importData.products)) {
    throw new Error("Import JSON must include categories and products arrays");
  }

  await assertImageFilesExist(importData);
  await initDatabase();

  const existingImported = await query("SELECT COUNT(*) as cnt FROM products WHERE id LIKE 'imp-%'");
  await query("DELETE FROM product_stock WHERE product_id LIKE 'imp-%'").catch(() => {});
  await query("DELETE FROM reviews WHERE product_id LIKE 'imp-%'").catch(() => {});
  await query("DELETE FROM products WHERE id LIKE 'imp-%'");

  let categoriesUpserted = 0;
  for (const category of importData.categories) {
    const name = String(category.name || "").trim();
    if (!name) continue;

    const existing = await queryOne("SELECT id FROM categories WHERE name = ?", [name]);
    if (existing) {
      await query("UPDATE categories SET image = ?, tag = ? WHERE id = ?", [
        category.image || null,
        category.tag || null,
        existing.id
      ]);
    } else {
      await query("INSERT INTO categories (name, image, tag) VALUES (?, ?, ?)", [
        name,
        category.image || null,
        category.tag || null
      ]);
    }
    categoriesUpserted++;
  }

  let productsCreated = 0;
  for (const product of importData.products) {
    await createProduct({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image || null,
      badge: product.badge || "Imported",
      stockCount: product.stockCount || 0,
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      features: product.features || [],
      deliveryType: product.deliveryType || "manual delivery",
      status: product.status || "active",
      metaTitle: product.metaTitle || null,
      metaDescription: product.metaDescription || null
    });
    productsCreated++;
  }

  await getPool().end();

  console.log(`Seed complete from ${path.relative(rootDir, importFile)}`);
  console.log(`${categoriesUpserted} categories upserted`);
  console.log(`${productsCreated} products created`);
  console.log(`${Number(existingImported[0]?.cnt || 0)} previous imported products replaced`);
}

seedProducts().catch(async (error) => {
  console.error(error);
  try {
    await getPool().end();
  } catch {}
  process.exit(1);
});
