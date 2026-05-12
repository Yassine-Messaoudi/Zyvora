import mysql from "mysql2/promise";

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "zyvory",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function initDatabase() {
  const db = getPool();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      image LONGTEXT DEFAULT NULL,
      tag VARCHAR(255) DEFAULT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrate existing VARCHAR columns to LONGTEXT for base64 images
  await db.execute(`ALTER TABLE categories MODIFY COLUMN image LONGTEXT DEFAULT NULL`).catch(() => {});
  // Add tag column if missing
  await db.execute(`ALTER TABLE categories ADD COLUMN tag VARCHAR(255) DEFAULT NULL`).catch(() => {});

  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category_id INT NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image LONGTEXT DEFAULT NULL,
      badge VARCHAR(50) DEFAULT 'New',
      stock_count INT NOT NULL DEFAULT 0,
      short_description TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Migrate existing databases
  await db.execute(`ALTER TABLE products MODIFY COLUMN image LONGTEXT DEFAULT NULL`).catch(() => {});
  await db.execute(`ALTER TABLE products ADD COLUMN stock_count INT NOT NULL DEFAULT 0`).catch(() => {});

  await db.execute(`
    CREATE TABLE IF NOT EXISTS product_stock (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      stock_value TEXT NOT NULL,
      is_sold TINYINT(1) DEFAULT 0,
      sold_at TIMESTAMP NULL DEFAULT NULL,
      invoice_id VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(50) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      balance DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_order_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(50) PRIMARY KEY,
      customer_email VARCHAR(255) NOT NULL,
      discord VARCHAR(255) DEFAULT '',
      newsletter TINYINT(1) DEFAULT 0,
      items JSON NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      coupon_code VARCHAR(100) DEFAULT NULL,
      total_usd DECIMAL(10,2) NOT NULL,
      selected_coin VARCHAR(20) NOT NULL,
      expected_crypto_amount DECIMAL(18,8) DEFAULT NULL,
      deposit_address VARCHAR(255) DEFAULT NULL,
      qr_code_data TEXT DEFAULT NULL,
      qr_code LONGTEXT DEFAULT NULL,
      transaction_id VARCHAR(255) DEFAULT NULL,
      confirmation_count INT DEFAULT 0,
      mock_detected TINYINT(1) DEFAULT 0,
      status ENUM('pending','detected','confirming','paid','failed','expired') DEFAULT 'pending',
      order_id VARCHAR(50) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      detected_at TIMESTAMP NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoice_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_id VARCHAR(50) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      event_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      invoice_id VARCHAR(50) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      items JSON NOT NULL,
      total_usd DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'completed',
      delivery_items JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(50) PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      invoice_id VARCHAR(50) DEFAULT NULL,
      name VARCHAR(255) DEFAULT 'Verified buyer',
      rating INT NOT NULL,
      text TEXT NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      verified_purchase TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      type ENUM('percent','fixed') DEFAULT 'percent',
      value DECIMAL(10,2) NOT NULL,
      active TINYINT(1) DEFAULT 1,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_logs (
      id VARCHAR(50) PRIMARY KEY,
      invoice_id VARCHAR(50) NOT NULL,
      order_id VARCHAR(50) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      type VARCHAR(50) DEFAULT 'auto_delivery',
      items JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(100) NOT NULL,
      invoice_id VARCHAR(50) DEFAULT NULL,
      details TEXT DEFAULT NULL,
      ip VARCHAR(45) DEFAULT 'hidden',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Insert default settings if empty
  const [settingsRows] = await db.execute("SELECT COUNT(*) as cnt FROM settings");
  if (settingsRows[0].cnt === 0) {
    const defaults = [
      ["storeName", process.env.STORE_NAME || "Zyvory Market"],
      ["discordInvite", process.env.DISCORD_INVITE || "https://discord.gg/Zhd6unzQGm"],
      ["walletAddresses", JSON.stringify({
        LTC: process.env.LTC_ADDRESS || "",
        BTC: process.env.BTC_ADDRESS || "",
        SOL: process.env.SOL_ADDRESS || "",
        ETH: process.env.ETH_ADDRESS || ""
      })]
    ];
    for (const [key, value] of defaults) {
      await db.execute("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)", [key, value]);
    }
  }

  // Insert default coupon if empty
  const [couponRows] = await db.execute("SELECT COUNT(*) as cnt FROM coupons");
  if (couponRows[0].cnt === 0) {
    await db.execute(
      "INSERT INTO coupons (code, type, value, active, expires_at) VALUES (?, ?, ?, ?, ?)",
      ["LAUNCH10", "percent", 10, 1, "2026-12-31 23:59:59"]
    );
  }

  console.log("Database tables initialized successfully.");
}

export async function getSettings() {
  const rows = await query("SELECT setting_key, setting_value FROM settings");
  const settings = {};
  for (const row of rows) {
    try {
      settings[row.setting_key] = JSON.parse(row.setting_value);
    } catch {
      settings[row.setting_key] = row.setting_value;
    }
  }
  return settings;
}

export async function updateSettings(newSettings) {
  for (const [key, value] of Object.entries(newSettings)) {
    const val = typeof value === "object" ? JSON.stringify(value) : String(value);
    await query(
      "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
      [key, val, val]
    );
  }
  return getSettings();
}
