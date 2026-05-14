import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://www.lusive.xyz/products";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "imports");
const outFile = path.join(outDir, "lusive-products.json");
const imageDir = path.join(rootDir, "public", "images", "imported", "lusive");
const imagePublicPath = "/images/imported/lusive";
const applyToDatabase = process.argv.includes("--apply");
const importAsDraft = process.argv.includes("--draft");
const realImages = !process.argv.includes("--generated-images");

function decodeEntities(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\\//g, "/")
    .trim();
}

function cleanText(value = "") {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function slugify(value = "product") {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product";
}

function shortHash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 14);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitTitle(value = "") {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > 20 && lines.length < 2) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

function categoryTone(category = "Other") {
  const tones = {
    Accounts: ["#19d4ff", "#2755ff"],
    Social: ["#7df9ff", "#6448ff"],
    Games: ["#2bd5ff", "#1f7aff"],
    Generators: ["#9b8cff", "#00d9ff"],
    Methods: ["#22d3ee", "#2563eb"],
    Spoofers: ["#00d9ff", "#0f172a"],
    VPN: ["#60a5fa", "#14b8ff"],
    Boosting: ["#67e8f9", "#8b5cf6"],
    FiveM: ["#7df9ff", "#0ea5e9"],
    Fortnite: ["#38bdf8", "#6366f1"],
    Valorant: ["#00d9ff", "#0f4cff"],
    "Counter Strike 2": ["#0ea5e9", "#f59e0b"],
    "Rainbow Six Siege": ["#29b6ff", "#0b1b2c"],
    "Roblox (Robux's)": ["#38bdf8", "#ef4444"],
    Rust: ["#38bdf8", "#f97316"],
    Supercell: ["#7df9ff", "#1e40af"],
    Minecraft: ["#7df9ff", "#22c55e"]
  };
  return tones[category] || ["#00d9ff", "#1e90ff"];
}

function makeZyvoryImage({ title, category, kind = "product", price = "" }) {
  const [accent, secondary] = categoryTone(category);
  const titleLines = splitTitle(title);
  const subtitle = kind === "group" ? "CATEGORY DROP" : "DIGITAL PRODUCT";
  const priceText = price ? `FROM €${roundMoney(price).toFixed(2)}` : "ZYVORY MARKET";
  const lineHeight = titleLines.length > 2 ? 48 : 56;
  const startY = titleLines.length > 2 ? 176 : 190;
  const titleSvg = titleLines.map((line, index) =>
    `<text x="56" y="${startY + index * lineHeight}" fill="#f8fbff" font-family="Arial, Helvetica, sans-serif" font-size="${titleLines.length > 2 ? 42 : 48}" font-weight="900" letter-spacing="-1">${escapeXml(line.toUpperCase())}</text>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#041324"/>
      <stop offset=".52" stop-color="#07111f"/>
      <stop offset="1" stop-color="#020812"/>
    </linearGradient>
    <radialGradient id="glowA" cx=".18" cy=".1" r=".72">
      <stop offset="0" stop-color="${accent}" stop-opacity=".55"/>
      <stop offset=".42" stop-color="${secondary}" stop-opacity=".2"/>
      <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx=".85" cy=".8" r=".7">
      <stop offset="0" stop-color="${secondary}" stop-opacity=".42"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>
  </defs>
  <rect width="960" height="540" fill="url(#bg)"/>
  <rect width="960" height="540" fill="url(#glowA)"/>
  <rect width="960" height="540" fill="url(#glowB)"/>
  <g opacity=".22">
    <path d="M0 420 C210 290 300 610 545 410 S790 230 960 330 V540 H0Z" fill="${accent}"/>
    <circle cx="142" cy="92" r="118" fill="${accent}" opacity=".34" filter="url(#blur)"/>
    <circle cx="806" cy="92" r="84" fill="${secondary}" opacity=".36" filter="url(#blur)"/>
  </g>
  <g opacity=".18" stroke="${accent}">
    <path d="M80 84h800M80 164h800M80 244h800M80 324h800M80 404h800"/>
    <path d="M120 40v460M240 40v460M360 40v460M480 40v460M600 40v460M720 40v460M840 40v460"/>
  </g>
  <g transform="translate(750 62)" opacity=".95">
    <path d="M58 0 116 28 58 56 0 28Z" fill="none" stroke="${accent}" stroke-width="8"/>
    <path d="M58 56v56M0 28v56l58 28 58-28V28" fill="none" stroke="${accent}" stroke-width="8" opacity=".72"/>
  </g>
  <text x="56" y="88" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" letter-spacing="5">${escapeXml(subtitle)}</text>
  ${titleSvg}
  <rect x="56" y="414" width="252" height="54" rx="27" fill="rgba(0,0,0,.34)" stroke="${accent}" stroke-opacity=".55"/>
  <text x="82" y="449" fill="#dffbff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900">${escapeXml(priceText)}</text>
  <text x="688" y="476" fill="${accent}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="900" letter-spacing="2">ZYVORY</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function fetchImageAsset(url) {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "referer": SOURCE_URL,
        "user-agent": "Mozilla/5.0 (compatible; ZyvoryCatalogImporter/1.0; +https://zyvory.xyz)"
      }
    });

    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return null;

    const headerType = response.headers.get("content-type") || "";
    const inferredType =
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? "image/png" :
      bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ? "image/jpeg" :
      bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" ? "image/webp" :
      headerType.startsWith("image/") ? headerType.split(";")[0] :
      null;

    if (!inferredType) return null;
    const extension = inferredType === "image/jpeg" ? "jpg" : inferredType.split("/")[1] || "png";
    const fileName = `${shortHash(url)}.${extension}`;
    await fs.mkdir(imageDir, { recursive: true });
    await fs.writeFile(path.join(imageDir, fileName), bytes);
    return `${imagePublicPath}/${fileName}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadSourceImages(products) {
  if (!realImages) return { downloaded: 0, failed: 0 };

  const urls = [...new Set(products.map((product) => product.sourceImageUrl).filter(Boolean))];
  const imageCache = new Map();
  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += 6) {
    const batch = urls.slice(i, i + 6);
    const results = await Promise.all(batch.map(async (url) => [url, await fetchImageAsset(url)]));
    for (const [url, imagePath] of results) {
      if (imagePath) downloaded++;
      else failed++;
      imageCache.set(url, imagePath);
    }
  }

  for (const product of products) {
    const imagePath = imageCache.get(product.sourceImageUrl);
    if (imagePath) product.image = imagePath;
  }

  return { downloaded, failed };
}

function extractBalanced(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) depth--;
    if (depth === 0) return source.slice(startIndex, i + 1);
  }

  throw new Error(`Could not find balanced ${openChar}${closeChar} block`);
}

function parseCategories(html) {
  const marker = "categories:";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return [];
  const start = html.indexOf("[", markerIndex);
  const raw = extractBalanced(html, start, "[", "]");
  return JSON.parse(raw).map((category) => ({
    slug: category.slug,
    name: cleanText(category.name),
    categoryNames: (category.categoryNames || []).map(cleanText),
    productNames: (category.productNames || []).map(cleanText)
  }));
}

function parseCartProducts(html) {
  const marker = "window.productsForCart = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return {};
  const start = html.indexOf("{", markerIndex);
  const raw = extractBalanced(html, start, "{", "}");
  return JSON.parse(raw);
}

function parseStock(stockText) {
  const cleaned = cleanText(stockText);
  if (/out of stock/i.test(cleaned)) return { stockCount: 0, stockStatus: "Out of stock" };
  const match = cleaned.match(/([\d,]+)\s+in stock/i);
  const stockCount = match ? Number(match[1].replace(/,/g, "")) : 0;
  return { stockCount, stockStatus: stockCount > 0 ? "In stock" : cleaned || "Unknown" };
}

function parsePrice(priceText) {
  const numbers = [...cleanText(priceText).matchAll(/€\s*([\d,.]+)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter(Number.isFinite);
  return numbers.length ? roundMoney(Math.min(...numbers)) : 0;
}

function parseProductCards(block, context = {}) {
  const cards = [];
  const cardRegex = /<a\s+href="(https:\/\/www\.lusive\.xyz\/product\/[^"]+)"[\s\S]*?<\/a>/g;
  let match;

  while ((match = cardRegex.exec(block))) {
    const cardHtml = match[0];
    const imageMatch = cardHtml.match(/<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"/i);
    const titleMatch = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const paragraphMatches = [...cardHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => cleanText(p[1]));
    const priceText = paragraphMatches.find((text) => text.includes("€")) || "";
    const stockText = paragraphMatches.find((text) => /stock/i.test(text)) || "";
    const sourceUrl = decodeEntities(match[1]);
    const productId = sourceUrl.split("/").filter(Boolean).pop();
    const title = cleanText(titleMatch?.[1] || imageMatch?.[2] || "Imported product");
    if (!title || /^not available$/i.test(title)) continue;

    cards.push({
      sourceProductId: productId,
      sourceUrl,
      sourceImageUrl: decodeEntities(imageMatch?.[1] || ""),
      sourceGroup: context.sourceGroup || "",
      name: title,
      sourcePriceText: priceText,
      ...parseStock(stockText),
      price: parsePrice(priceText)
    });
  }

  return cards;
}

function parseModals(html) {
  const modalRegex = /<div x-show="openCategoryModalId == '([^']+)'" class="vuvqj awt8i j6crg"/g;
  const starts = [];
  let match;

  while ((match = modalRegex.exec(html))) {
    starts.push({ id: match[1], index: match.index });
  }

  return starts.map((modal, index) => {
    const end = starts[index + 1]?.index ?? html.indexOf("<script>", modal.index);
    const block = html.slice(modal.index, end > modal.index ? end : undefined);
    const title = cleanText(block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] || "Imported group");
    return {
      ...modal,
      title,
      products: parseProductCards(block, { sourceGroup: title })
    };
  });
}

function buildCategoryResolver(categories) {
  const byGroup = new Map();
  const byProduct = new Map();
  for (const category of categories) {
    for (const name of category.categoryNames) byGroup.set(name.toLowerCase(), category.name);
    for (const name of category.productNames) byProduct.set(name.toLowerCase(), category.name);
  }

  return function resolveCategory(product) {
    const groupMatch = product.sourceGroup ? byGroup.get(product.sourceGroup.toLowerCase()) : null;
    if (groupMatch) return groupMatch;

    const productMatch = byProduct.get(product.name.toLowerCase());
    if (productMatch) return productMatch;

    const name = product.name.toLowerCase();
    const rules = [
      ["vpn", "VPN"],
      ["boost", "Boosting"],
      ["spoofer", "Spoofers"],
      ["generator", "Generators"],
      ["valorant", "Valorant"],
      ["fortnite", "Fortnite"],
      ["roblox", "Roblox (Robux's)"],
      ["rust", "Rust"],
      ["minecraft", "Minecraft"],
      ["fivem", "FiveM"],
      ["cs2", "Counter Strike 2"],
      ["counter", "Counter Strike 2"],
      ["rainbow", "Rainbow Six Siege"],
      ["discord", "Social"],
      ["tiktok", "Social"],
      ["instagram", "Social"],
      ["netflix", "Social"],
      ["spotify", "Social"],
      ["chatgpt", "Generators"]
    ];
    return rules.find(([needle]) => name.includes(needle))?.[1] || "Other";
  };
}

function hydrateProducts(cards, categories, cartProducts) {
  const resolveCategory = buildCategoryResolver(categories);
  const seen = new Set();

  return cards
    .filter((card) => {
      if (!card.sourceProductId || seen.has(card.sourceProductId)) return false;
      seen.add(card.sourceProductId);
      return true;
    })
    .map((card) => {
      const cartProduct = cartProducts[card.sourceProductId];
      const variants = cartProduct?.variants
        ? Object.entries(cartProduct.variants).map(([id, variant]) => ({
          sourceVariantId: id,
          name: cleanText(variant.name || "Default"),
          price: roundMoney(variant.price || card.price)
        }))
        : [];
      const minVariantPrice = variants.length ? Math.min(...variants.map((variant) => variant.price)) : card.price;
      const topCategory = resolveCategory(card);
      const groupName = card.sourceGroup || card.name;
      const slug = slugify(card.name);
      const features = [
        importAsDraft ? "Imported as a draft for manual review" : "Imported from catalog and marked active",
        realImages ? "Uses scraped source product artwork" : "Uses original Zyvory-generated product artwork",
        "Verify price, stock, and delivery type before publishing"
      ];

      return {
        id: `imp-${shortHash(card.sourceUrl)}`,
        slug,
        name: card.name,
        category: groupName,
        topCategory,
        price: roundMoney(minVariantPrice || card.price),
        currency: "EUR",
        image: makeZyvoryImage({ title: card.name, category: topCategory, kind: "product", price: minVariantPrice || card.price }),
        sourceImageUrl: card.sourceImageUrl,
        badge: "Imported",
        stockCount: card.stockCount,
        stockStatus: card.stockStatus,
        shortDescription: `${topCategory} product imported from the source catalog. Review details and delivery stock.`,
        description: [
          "Imported catalog entry for Zyvory admin review.",
          `Source group: ${card.sourceGroup || "Direct product"}.`,
          realImages
            ? "Product artwork was downloaded from the source catalog as requested. Confirm rights and delivery stock before selling."
            : "Product artwork is generated for Zyvory. Confirm delivery stock before selling."
        ].join("\n"),
        features,
        deliveryType: "manual delivery",
        status: importAsDraft ? "draft" : "active",
        metaTitle: `${card.name} | Zyvory`,
        metaDescription: `${card.name} imported as a draft product for Zyvory Digital Market.`,
        source: {
          url: card.sourceUrl,
          productId: card.sourceProductId,
          group: card.sourceGroup,
          priceText: card.sourcePriceText
        },
        variants
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

async function fetchSourceHtml() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; ZyvoryCatalogImporter/1.0; +https://zyvory.xyz)"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function applyImport(importData) {
  const { initDatabase, getPool, query, queryOne } = await import("../server/db.js");
  const { createProduct } = await import("../server/store.js");

  await initDatabase();
  const existingImported = await query("SELECT COUNT(*) as cnt FROM products WHERE id LIKE 'imp-%'");
  await query("DELETE FROM product_stock WHERE product_id LIKE 'imp-%'").catch(() => {});
  await query("DELETE FROM reviews WHERE product_id LIKE 'imp-%'").catch(() => {});
  await query("DELETE FROM products WHERE id LIKE 'imp-%'");

  let created = 0;
  let skipped = 0;

  for (const category of importData.categories) {
    const existing = await queryOne("SELECT id FROM categories WHERE name = ?", [category.name]);
    if (existing) {
      await query("UPDATE categories SET image = ?, tag = ? WHERE id = ?", [category.image || null, category.tag || null, existing.id]);
    } else {
      await query("INSERT INTO categories (name, image, tag) VALUES (?, ?, ?)", [category.name, category.image || null, category.tag || null]);
    }
  }

  for (const product of importData.products) {
    const existing = await queryOne("SELECT id FROM products WHERE id = ? OR slug = ?", [product.id, product.slug]);
    if (existing) {
      skipped++;
      continue;
    }

    await createProduct({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image || null,
      badge: product.badge,
      stockCount: product.stockCount,
      shortDescription: product.shortDescription,
      description: product.description,
      features: product.features,
      deliveryType: product.deliveryType,
      status: product.status,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription
    });
    created++;
  }

  await getPool().end();
  return { created, skipped, replaced: Number(existingImported[0]?.cnt || 0) };
}

async function main() {
  const html = await fetchSourceHtml();
  const categories = parseCategories(html);
  const cartProducts = parseCartProducts(html);
  const modals = parseModals(html);
  const firstModalIndex = modals[0]?.index ?? html.length;
  const standaloneCards = parseProductCards(html.slice(0, firstModalIndex));
  const modalCards = modals.flatMap((modal) => modal.products);
  const products = hydrateProducts([...standaloneCards, ...modalCards], categories, cartProducts);
  const imageResult = await downloadSourceImages(products);
  const categoryMap = new Map();
  for (const product of products) {
    if (!categoryMap.has(product.category)) {
      categoryMap.set(product.category, {
        name: product.category,
        slug: slugify(product.category),
        tag: product.topCategory,
        image: product.image || makeZyvoryImage({ title: product.category, category: product.topCategory, kind: "group", price: product.price })
      });
    }
  }
  const usedCategories = [...categoryMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const importData = {
    source: SOURCE_URL,
    scrapedAt: new Date().toISOString(),
    legalNote: realImages
      ? "Images were downloaded from the source catalog as requested. Confirm you have permission to use them publicly."
      : "Catalog facts only. Images are stored as source references and generated placeholders are used.",
    totals: {
      sourceCategories: categories.length,
      modalGroups: modals.length,
      products: products.length,
      downloadedImages: imageResult.downloaded,
      failedImages: imageResult.failed
    },
    categories: usedCategories,
    products
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(importData, null, 2));

  console.log(`Scraped ${products.length} products into ${path.relative(rootDir, outFile)}`);
  console.log(`Found ${usedCategories.length} used categories and ${modals.length} modal groups.`);
  console.log(realImages
    ? `Downloaded ${imageResult.downloaded} source images${imageResult.failed ? `, ${imageResult.failed} failed and used fallback images` : ""}.`
    : "Using generated Zyvory images. Pass no extra flag for real source images.");

  if (applyToDatabase) {
    const result = await applyImport(importData);
    console.log(`Database import complete: ${result.created} created, ${result.replaced} replaced, ${result.skipped} skipped.`);
  } else {
    console.log("Review the JSON first. Run npm run import:lusive to create products in MySQL.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
