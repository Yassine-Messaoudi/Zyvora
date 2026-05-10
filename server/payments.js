import QRCode from "qrcode";

const coinMeta = {
  LTC: { label: "Litecoin", uri: "litecoin", usdRate: 86.25 },
  BTC: { label: "Bitcoin", uri: "bitcoin", usdRate: 104000 },
  SOL: { label: "Solana", uri: "solana", usdRate: 151.4 },
  ETH: { label: "Ethereum", uri: "ethereum", usdRate: 2500 }
};

export function supportedCoins() {
  return Object.entries(coinMeta).map(([symbol, meta]) => ({ symbol, ...meta }));
}

export function calculateCryptoAmount(totalUsd, coin, existingAmounts = []) {
  const rate = coinMeta[coin]?.usdRate;
  if (!rate) throw new Error(`Unsupported coin: ${coin}`);
  const base = totalUsd / rate;
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
