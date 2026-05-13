const STORE_API_URL = process.env.STORE_API_URL || "";
const BOT_API_KEY = process.env.BOT_API_KEY || "";

export async function lookupOrder({ orderId, email }) {
  if (!STORE_API_URL || !BOT_API_KEY) return null;

  const params = new URLSearchParams();
  if (orderId) params.set("orderId", orderId.trim());
  if (email) params.set("email", email.trim());

  if (!params.toString()) return null;

  try {
    const res = await fetch(`${STORE_API_URL}/api/bot/order-lookup?${params}`, {
      headers: { "x-bot-key": BOT_API_KEY }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.found) return null;

    return data;
  } catch (error) {
    console.warn("[orderLookup] Failed to reach store API:", error.message);
    return null;
  }
}

export async function fetchLogs(limit = 20) {
  if (!STORE_API_URL || !BOT_API_KEY) return null;
  try {
    const res = await fetch(`${STORE_API_URL}/api/bot/logs?limit=${limit}`, {
      headers: { "x-bot-key": BOT_API_KEY }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.logs || [];
  } catch (error) {
    console.warn("[orderLookup] Failed to fetch logs:", error.message);
    return null;
  }
}

export function formatOrderStatus(status) {
  const map = {
    completed: "Delivered",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    paid: "Paid"
  };
  return map[status] || status || "Unknown";
}

export function formatCoin(coin) {
  const map = {
    LTC: "ltc",
    BTC: "btc",
    SOL: "sol",
    ETH: "eth",
    PAYPAL_FF: "PayPal F&F",
    BALANCE: "Balance"
  };
  return map[coin] || coin || "Unknown";
}

export function formatDate(iso) {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  });
}
