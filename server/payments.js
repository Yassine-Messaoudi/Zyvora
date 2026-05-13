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

// Convert EUR amount to crypto using live rate.
// Adds a small unique offset so each invoice has a distinct expected amount.
// This is how payment matching works — single deposit address per coin, but
// each pending invoice has a unique sub-satoshi/sub-gwei amount so we can
// match the incoming tx to the correct invoice.
//
// For ETH/SOL we use a smaller offset (1e-9 / 1e-7) so it fits in the smallest
// unit of the chain. For BTC/LTC we use 1e-6 (sub-satoshi precision rounded
// to 8 decimals).
export async function calculateCryptoAmount(totalEur, coin, existingAmounts = []) {
  const cache = await fetchPrices();
  const coinRates = cache.rates[coin];
  if (!coinRates || !coinRates.eur) throw new Error(`No live price for ${coin}. Try again shortly.`);
  console.log(`[prices] Converting €${totalEur} to ${coin} at rate 1 ${coin} = €${coinRates.eur}`);
  const base = totalEur / coinRates.eur;

  // Use a wider offset range (1..9999) so we can support many pending invoices
  // without collisions. Range scales per coin:
  //  - BTC/LTC: offset is in satoshis * 100 = 0.00000001 .. 0.00009999 (negligible value)
  //  - ETH:     offset is in wei * 1e9 = 0.000000001 .. 0.000009999 ETH (negligible)
  //  - SOL:     offset is in lamports = 0.000000001 .. 0.000009999 SOL (negligible)
  const decimals = coin === "ETH" ? 9 : coin === "SOL" ? 9 : 8;
  const usedSet = new Set(existingAmounts.filter(Boolean).map((a) => Number(a).toFixed(decimals)));

  let amount;
  let attempts = 0;
  do {
    const offset = (Math.floor(Math.random() * 9999) + 1) / Math.pow(10, decimals);
    amount = Number((base + offset).toFixed(decimals));
    attempts++;
  } while (usedSet.has(amount.toFixed(decimals)) && attempts < 200);

  if (attempts >= 200) {
    throw new Error(`Could not generate a unique payment amount for ${coin}. Too many pending invoices — please try again shortly.`);
  }
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

// Returns the configured wallet address for the given coin.
// Single address per coin — payment matching works via unique amount offset
// per invoice (see calculateCryptoAmount), so address reuse is safe and standard.
export function getWalletAddress(settings, coin) {
  const wallets = settings.walletAddresses || {};
  const address = wallets[coin];
  if (!address) throw new Error(`No wallet address configured for ${coin}. Admin must set it in Settings.`);
  return address;
}

export async function createQrData(coin, address, amount, invoiceId) {
  const meta = coinMeta[coin];
  const data = `${meta.uri}:${address}?amount=${amount}&label=${encodeURIComponent(invoiceId)}`;
  const qrCode = await QRCode.toDataURL(data, { margin: 1, width: 280, color: { dark: "#07111f", light: "#ffffff" } });
  return { data, qrCode };
}
