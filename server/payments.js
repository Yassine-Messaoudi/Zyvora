import QRCode from "qrcode";

const coinMeta = {
  LTC: { label: "Litecoin", uri: "litecoin", geckoId: "litecoin" },
  BTC: { label: "Bitcoin", uri: "bitcoin", geckoId: "bitcoin" },
  SOL: { label: "Solana", uri: "solana", geckoId: "solana" },
  ETH: { label: "Ethereum", uri: "ethereum", geckoId: "ethereum" }
};

// ── Live price cache (refreshes every 120s) ──
let priceCache = { rates: {}, fiatRates: {}, lastFetch: 0 };
const CACHE_TTL = 120_000;

const FIAT_CURRENCIES = ["usd", "eur", "usdt", "try", "cny", "gbp"];

// Fetch prices from CoinGecko
async function fetchFromCoinGecko() {
  const ids = Object.values(coinMeta).map((m) => m.geckoId).join(",");
  const vs = FIAT_CURRENCIES.join(",");
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();

  const rates = {};
  for (const [symbol, meta] of Object.entries(coinMeta)) {
    const coinData = data[meta.geckoId];
    if (coinData) {
      rates[symbol] = {};
      for (const fiat of FIAT_CURRENCIES) rates[symbol][fiat] = coinData[fiat] || 0;
    }
  }
  const fiatRates = {};
  const btcPrices = data.bitcoin || {};
  if (btcPrices.eur && btcPrices.usd) {
    for (const fiat of FIAT_CURRENCIES) {
      if (btcPrices[fiat] && btcPrices.eur) fiatRates[`eurTo${fiat}`] = btcPrices[fiat] / btcPrices.eur;
    }
  }
  return { rates, fiatRates };
}

// Primary: fetch prices from Binance API (free, no key, very reliable)
// Uses only USDT pairs (guaranteed to exist) + BTCEUR for EUR conversion
async function fetchFromBinance() {
  const usdtPairs = Object.keys(coinMeta).map(s => `${s}USDT`);
  const allSymbols = [...usdtPairs, "BTCEUR"];
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(allSymbols)}`);
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();

  const priceMap = {};
  for (const item of data) priceMap[item.symbol] = Number(item.price);

  // Derive EUR/USDT rate from BTC pairs: BTCEUR / BTCUSDT
  const btcUsdt = priceMap.BTCUSDT || 0;
  const btcEur = priceMap.BTCEUR || 0;
  const usdtToEur = btcEur && btcUsdt ? btcEur / btcUsdt : 0.92;

  const rates = {};
  for (const symbol of Object.keys(coinMeta)) {
    const usdtPrice = priceMap[`${symbol}USDT`] || 0;
    rates[symbol] = {
      eur: Number((usdtPrice * usdtToEur).toFixed(8)),
      usd: usdtPrice,
      usdt: usdtPrice
    };
  }
  const eurToUsd = usdtToEur ? 1 / usdtToEur : 1.08;
  const fiatRates = { eurTousd: eurToUsd, eurTousdt: eurToUsd };
  console.log(`[prices] Binance rates — USDT/EUR=${usdtToEur.toFixed(4)} LTC/EUR=${rates.LTC?.eur} BTC/EUR=${rates.BTC?.eur}`);
  return { rates, fiatRates };
}

async function fetchPrices() {
  if (Date.now() - priceCache.lastFetch < CACHE_TTL && Object.keys(priceCache.rates).length) {
    return priceCache;
  }
  // Try Binance first (most reliable), fallback to CoinGecko
  let result = null;
  try {
    result = await fetchFromBinance();
    console.log("[prices] Refreshed from Binance");
  } catch (err) {
    console.warn("[prices] Binance failed:", err.message, "— trying CoinGecko...");
    try {
      result = await fetchFromCoinGecko();
      console.log("[prices] Refreshed from CoinGecko (fallback)");
    } catch (err2) {
      console.error("[prices] CoinGecko also failed:", err2.message);
    }
  }
  if (result && Object.keys(result.rates).length) {
    priceCache = { ...result, lastFetch: Date.now() };
  }
  return priceCache;
}

export function supportedCoins() {
  return Object.entries(coinMeta).map(([symbol, meta]) => ({ symbol, label: meta.label }));
}

// Get live prices for all coins (returns { LTC: { usd, eur, ... }, BTC: {...}, ... })
export async function getLivePrices() {
  const cache = await fetchPrices();
  return { rates: cache.rates, fiatRates: cache.fiatRates };
}

// Convert EUR amount to crypto using live rate
export async function calculateCryptoAmount(totalEur, coin, existingAmounts = []) {
  const cache = await fetchPrices();
  const coinRates = cache.rates[coin];
  if (!coinRates || !coinRates.eur) throw new Error(`No live price for ${coin}. Try again shortly.`);
  console.log(`[prices] Converting €${totalEur} to ${coin} at rate 1 ${coin} = €${coinRates.eur}`);
  const base = totalEur / coinRates.eur;
  // Add a small random offset (0.000001 – 0.000999) to make the amount unique
  // so the admin can match each blockchain tx to the correct invoice
  const usedSet = new Set(existingAmounts.map(String));
  let amount;
  let attempts = 0;
  do {
    const offset = (Math.floor(Math.random() * 999) + 1) / 1_000_000;
    amount = Number((base + offset).toFixed(8));
    attempts++;
  } while (usedSet.has(String(amount)) && attempts < 50);
  return amount;
}

// Convert EUR to other fiat currencies
export async function convertFiat(eurAmount) {
  const cache = await fetchPrices();
  const result = { EUR: eurAmount };
  for (const [key, rate] of Object.entries(cache.fiatRates)) {
    const fiat = key.replace("eurTo", "").toUpperCase();
    result[fiat] = Number((eurAmount * rate).toFixed(2));
  }
  return result;
}

export function getWalletAddress(settings, coin) {
  const wallets = settings.walletAddresses || {};
  const address = wallets[coin];
  if (!address) throw new Error(`No wallet address configured for ${coin}. Admin must set it in Settings.`);
  return address;
}

// Address pool: picks an address for the invoice.
// Prefers an unused address; if all are in use, reuses the least-used one.
// Payment matching works by unique amount, so address reuse is safe.
export function getPoolAddress(coin, usedAddresses = []) {
  const poolStr = process.env[`${coin}_ADDRESS_POOL`] || "";
  const pool = poolStr.split(",").map(a => a.trim()).filter(Boolean);
  if (pool.length === 0) return null; // No pool configured, caller should fall back

  const usedSet = new Set(usedAddresses.map(a => a.toLowerCase()));
  const available = pool.filter(a => !usedSet.has(a.toLowerCase()));

  if (available.length > 0) return available[0];

  // All addresses in use — reuse the one with fewest pending invoices
  const counts = {};
  for (const a of usedAddresses) counts[a.toLowerCase()] = (counts[a.toLowerCase()] || 0) + 1;
  let best = pool[0];
  let min = Infinity;
  for (const a of pool) {
    const c = counts[a.toLowerCase()] || 0;
    if (c < min) { min = c; best = a; }
  }
  return best;
}

export async function createQrData(coin, address, amount, invoiceId) {
  const meta = coinMeta[coin];
  const data = `${meta.uri}:${address}?amount=${amount}&label=${encodeURIComponent(invoiceId)}`;
  const qrCode = await QRCode.toDataURL(data, { margin: 1, width: 280, color: { dark: "#07111f", light: "#ffffff" } });
  return { data, qrCode };
}
