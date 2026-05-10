import QRCode from "qrcode";
import { randomUUID } from "node:crypto";

const coinMeta = {
  LTC: { label: "Litecoin", uri: "litecoin", usdRate: 86.25 },
  BTC: { label: "Bitcoin", uri: "bitcoin", usdRate: 104000 },
  SOL: { label: "Solana", uri: "solana", usdRate: 151.4 },
  ETH: { label: "Ethereum", uri: "ethereum", usdRate: 2500 }
};

function envPool(coin) {
  const key = `${coin}_ADDRESS_POOL`;
  return (process.env[key] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function supportedCoins() {
  return Object.entries(coinMeta).map(([symbol, meta]) => ({ symbol, ...meta }));
}

export function calculateCryptoAmount(totalUsd, coin) {
  const rate = coinMeta[coin]?.usdRate;
  if (!rate) throw new Error(`Unsupported coin: ${coin}`);
  return Number((totalUsd / rate).toFixed(8));
}

export function assignDepositAddress(existingInvoices, coin) {
  const pool = envPool(coin);
  const used = new Set(
    existingInvoices
      .filter((invoice) => invoice.selectedCoin === coin)
      .map((invoice) => invoice.depositAddress)
  );
  const available = pool.find((address) => !used.has(address));
  if (available) return available;
  return `${coin.toLowerCase()}_watch_only_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

export async function createQrData(coin, address, amount, invoiceId) {
  const meta = coinMeta[coin];
  const data = `${meta.uri}:${address}?amount=${amount}&label=${encodeURIComponent(invoiceId)}`;
  const qrCode = await QRCode.toDataURL(data, { margin: 1, width: 280, color: { dark: "#07111f", light: "#ffffff" } });
  return { data, qrCode };
}

export async function checkBlockchain(invoice) {
  if (process.env.PAYMENT_MODE === "btcpay") {
    return { status: invoice.status, transactionId: invoice.transactionId, confirmations: invoice.confirmationCount };
  }
  return {
    status: invoice.mockDetected ? "detected" : invoice.status,
    transactionId: invoice.transactionId,
    confirmations: invoice.confirmationCount || 0
  };
}

export function nextInvoiceStatus(invoice, requiredConfirmations) {
  if (new Date(invoice.expiresAt).getTime() < Date.now() && !["paid", "expired"].includes(invoice.status)) {
    return { ...invoice, status: "expired" };
  }
  if (!invoice.mockDetected) return invoice;
  const confirmations = Math.min((invoice.confirmationCount || 0) + 1, requiredConfirmations);
  const status = confirmations >= requiredConfirmations ? "paid" : confirmations > 0 ? "confirming" : "detected";
  return { ...invoice, status, confirmationCount: confirmations };
}
