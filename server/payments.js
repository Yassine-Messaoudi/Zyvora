import QRCode from "qrcode";

const coinMeta = {
  LTC: { label: "Litecoin", uri: "litecoin", geckoId: "litecoin" },
  BTC: { label: "Bitcoin", uri: "bitcoin", geckoId: "bitcoin" },
  SOL: { label: "Solana", uri: "solana", geckoId: "solana" },
  ETH: { label: "Ethereum", uri: "ethereum", geckoId: "ethereum" }
};

// ── Live price cache (refreshes every 60s) ──
let priceCache = { rates: {}, fiatRates: {}, lastFetch: 0 };
const CACHE_TTL = 60_000;

const FIAT_CURRENCIES = ["usd", "eur", "usdt", "try", "cny", "gbp"];

async function fetchPrices() {
  if (Date.now() - priceCache.lastFetch < CACHE_TTL && Object.keys(priceCache.rates).length) {
    return priceCache;
  }
  try {
    const ids = Object.values(coinMeta).map((m) => m.geckoId).join(",");
    const vs = FIAT_CURRENCIES.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json();

    const rates = {};
    const fiatRates = {};
    for (const [symbol, meta] of Object.entries(coinMeta)) {
      const coinData = data[meta.geckoId];
      if (coinData) {
        rates[symbol] = {};
        for (const fiat of FIAT_CURRENCIES) {
          rates[symbol][fiat] = coinData[fiat] || 0;
        }
      }
    }
    // Derive fiat cross-rates from BTC prices (e.g., EUR/USD)
    const btcPrices = data.bitcoin || {};
    if (btcPrices.eur && btcPrices.usd) {
      fiatRates.eurToUsd = btcPrices.usd / btcPrices.eur;
      for (const fiat of FIAT_CURRENCIES) {
        if (btcPrices[fiat] && btcPrices.eur) {
          fiatRates[`eurTo${fiat}`] = btcPrices[fiat] / btcPrices.eur;
        }
      }
    }
    priceCache = { rates, fiatRates, lastFetch: Date.now() };
    console.log("[prices] Refreshed live crypto prices");
  } catch (err) {
    console.error("[prices] CoinGecko fetch failed, using cached:", err.message);
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

// Address pool: assigns a unique address per invoice from a comma-separated env pool
export function getPoolAddress(coin, usedAddresses = []) {
  const poolStr = process.env[`${coin}_ADDRESS_POOL`] || "";
  const pool = poolStr.split(",").map(a => a.trim()).filter(Boolean);
  if (pool.length === 0) return null; // No pool configured, caller should fall back

  const usedSet = new Set(usedAddresses.map(a => a.toLowerCase()));
  const available = pool.filter(a => !usedSet.has(a.toLowerCase()));

  if (available.length === 0) {
    throw new Error(`All ${coin} addresses are in use (${pool.length} total). Wait for pending invoices to complete or add more addresses to ${coin}_ADDRESS_POOL.`);
  }
  return available[0];
}

export async function createQrData(coin, address, amount, invoiceId) {
  const meta = coinMeta[coin];
  const data = `${meta.uri}:${address}?amount=${amount}&label=${encodeURIComponent(invoiceId)}`;
  const qrCode = await QRCode.toDataURL(data, { margin: 1, width: 280, color: { dark: "#07111f", light: "#ffffff" } });
  return { data, qrCode };
}
