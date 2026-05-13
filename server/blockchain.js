// Blockchain payment detection for BTC, LTC, ETH, SOL.
//
// Design notes:
// - Each coin uses multiple providers with automatic fallback so a single
//   provider outage or rate-limit does not break payment detection.
// - All providers normalize to: { txHash, amount, confirmations }.
// - Matching is done by *amount* (not by per-invoice address) — every invoice
//   gets a unique sub-satoshi offset so the polling worker can identify which
//   invoice each incoming tx belongs to.

const REQUIRED_CONFIRMATIONS = {
  BTC: Number(process.env.REQUIRED_CONFIRMATIONS_BTC || 2),
  LTC: Number(process.env.REQUIRED_CONFIRMATIONS_LTC || 2),
  ETH: Number(process.env.REQUIRED_CONFIRMATIONS_ETH || 12),
  SOL: Number(process.env.REQUIRED_CONFIRMATIONS_SOL || 1)
};

const REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function tryProviders(providers, label) {
  const errors = [];
  for (const provider of providers) {
    try {
      const result = await provider.fn();
      return result;
    } catch (err) {
      errors.push(`${provider.name}: ${err.message}`);
    }
  }
  throw new Error(`All ${label} providers failed — ${errors.join(" | ")}`);
}

// ── BTC ──
// Primary: mempool.space (no API key, no rate limit, real-time)
// Fallback: blockstream.info (same API spec, run by Blockstream)
async function getBTCFromEsplora(baseUrl, address) {
  const txs = await fetchJson(`${baseUrl}/api/address/${address}/txs`);
  let tipHeight = 0;
  try {
    tipHeight = await fetchJson(`${baseUrl}/api/blocks/tip/height`);
  } catch {}

  const incoming = [];
  for (const tx of txs) {
    for (const vout of tx.vout || []) {
      if (vout.scriptpubkey_address === address) {
        const blockHeight = tx.status?.block_height || 0;
        incoming.push({
          txHash: tx.txid,
          amount: vout.value / 1e8,
          confirmations: tx.status?.confirmed && tipHeight && blockHeight
            ? tipHeight - blockHeight + 1
            : tx.status?.confirmed ? 1 : 0
        });
      }
    }
  }
  return incoming;
}

async function getIncomingBTC(address) {
  return tryProviders([
    { name: "mempool.space", fn: () => getBTCFromEsplora("https://mempool.space", address) },
    { name: "blockstream.info", fn: () => getBTCFromEsplora("https://blockstream.info", address) }
  ], "BTC");
}

// ── LTC ──
// Primary: litecoinspace.org (Esplora-compatible, no key, no rate limit)
// Fallback: Blockcypher (rate-limited, 3 req/sec, 200 req/hr free)
async function getLTCFromLitecoinspace(address) {
  const baseUrl = "https://litecoinspace.org";
  const txs = await fetchJson(`${baseUrl}/api/address/${address}/txs`);
  let tipHeight = 0;
  try {
    tipHeight = await fetchJson(`${baseUrl}/api/blocks/tip/height`);
  } catch {}

  const incoming = [];
  for (const tx of txs) {
    for (const vout of tx.vout || []) {
      if (vout.scriptpubkey_address === address) {
        const blockHeight = tx.status?.block_height || 0;
        incoming.push({
          txHash: tx.txid,
          amount: vout.value / 1e8,
          confirmations: tx.status?.confirmed && tipHeight && blockHeight
            ? tipHeight - blockHeight + 1
            : tx.status?.confirmed ? 1 : 0
        });
      }
    }
  }
  return incoming;
}

async function getLTCFromBlockcypher(address) {
  const data = await fetchJson(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}?limit=10`);
  const incoming = [];
  for (const ref of data.txrefs || []) {
    if (ref.tx_input_n === -1) {
      incoming.push({ txHash: ref.tx_hash, amount: ref.value / 1e8, confirmations: ref.confirmations || 0 });
    }
  }
  for (const ref of data.unconfirmed_txrefs || []) {
    if (ref.tx_input_n === -1) {
      incoming.push({ txHash: ref.tx_hash, amount: ref.value / 1e8, confirmations: 0 });
    }
  }
  return incoming;
}

async function getIncomingLTC(address) {
  return tryProviders([
    { name: "litecoinspace.org", fn: () => getLTCFromLitecoinspace(address) },
    { name: "blockcypher", fn: () => getLTCFromBlockcypher(address) }
  ], "LTC");
}

// ── ETH ──
// Primary: Etherscan (5 req/sec free without key, more with key)
// Fallback: Blockscout (no key required)
async function getETHFromEtherscan(address) {
  const apiKey = process.env.ETHERSCAN_API_KEY || "";
  const keyParam = apiKey ? `&apikey=${apiKey}` : "";
  const data = await fetchJson(
    `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=10${keyParam}`
  );
  if (data.status !== "1" || !Array.isArray(data.result)) {
    // Etherscan returns status "0" with message "No transactions found" — that's not an error
    if (data.message === "No transactions found") return [];
    throw new Error(data.message || "Etherscan returned no results");
  }

  let currentBlock = 0;
  try {
    const bd = await fetchJson(`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber${keyParam}`);
    currentBlock = parseInt(bd.result, 16);
  } catch {}

  return data.result
    .filter((tx) => tx.to?.toLowerCase() === address.toLowerCase() && tx.isError === "0" && Number(tx.value) > 0)
    .map((tx) => ({
      txHash: tx.hash,
      amount: Number(tx.value) / 1e18,
      confirmations: currentBlock && tx.blockNumber
        ? currentBlock - Number(tx.blockNumber) + 1
        : Number(tx.confirmations || 1)
    }));
}

async function getETHFromBlockscout(address) {
  const data = await fetchJson(
    `https://eth.blockscout.com/api/v2/addresses/${address}/transactions?filter=to`
  );
  if (!data || !Array.isArray(data.items)) return [];

  let currentBlock = 0;
  try {
    const blocks = await fetchJson("https://eth.blockscout.com/api/v2/blocks?type=block");
    currentBlock = blocks?.items?.[0]?.height || 0;
  } catch {}

  return data.items
    .filter((tx) => tx.to?.hash?.toLowerCase() === address.toLowerCase() && tx.status === "ok" && Number(tx.value) > 0)
    .map((tx) => ({
      txHash: tx.hash,
      amount: Number(tx.value) / 1e18,
      confirmations: currentBlock && tx.block ? currentBlock - tx.block + 1 : 1
    }));
}

async function getIncomingETH(address) {
  return tryProviders([
    { name: "etherscan", fn: () => getETHFromEtherscan(address) },
    { name: "blockscout", fn: () => getETHFromBlockscout(address) }
  ], "ETH");
}

// ── SOL ──
// Primary: configured SOLANA_RPC (or mainnet-beta public)
// Fallback: Solana public RPC (often rate-limited but always reachable)
async function getSOLFromRpc(rpcUrl, address) {
  const sigData = await fetchJson(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress",
      params: [address, { limit: 10 }]
    })
  });

  const incoming = [];
  for (const sig of sigData.result || []) {
    if (sig.err) continue;
    try {
      const txData = await fetchJson(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]
        })
      });
      const tx = txData.result;
      if (!tx) continue;

      const keys = tx.transaction?.message?.accountKeys || [];
      const pre = tx.meta?.preBalances || [];
      const post = tx.meta?.postBalances || [];

      for (let i = 0; i < keys.length; i++) {
        const key = typeof keys[i] === "string" ? keys[i] : keys[i]?.pubkey;
        if (key === address) {
          const diff = (post[i] || 0) - (pre[i] || 0);
          if (diff > 0) {
            // Solana finality:
            //   processed   -> 0 (not safe)
            //   confirmed   -> 1 (supermajority voted)
            //   finalized   -> 32 (irreversible)
            const status = sig.confirmationStatus;
            const confirmations = status === "finalized" ? 32 : status === "confirmed" ? 1 : 0;
            incoming.push({
              txHash: sig.signature,
              amount: diff / 1e9,
              confirmations
            });
          }
        }
      }
    } catch {
      // Skip individual tx fetch failures rather than aborting the whole scan
    }
  }
  return incoming;
}

async function getIncomingSOL(address) {
  const primary = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
  const providers = [
    { name: "configured-rpc", fn: () => getSOLFromRpc(primary, address) }
  ];
  if (primary !== "https://api.mainnet-beta.solana.com") {
    providers.push({ name: "mainnet-beta-fallback", fn: () => getSOLFromRpc("https://api.mainnet-beta.solana.com", address) });
  }
  return tryProviders(providers, "SOL");
}

// ── Unified interface ──

export async function getIncomingTransactions(coin, address) {
  try {
    switch (coin) {
      case "BTC": return await getIncomingBTC(address);
      case "LTC": return await getIncomingLTC(address);
      case "ETH": return await getIncomingETH(address);
      case "SOL": return await getIncomingSOL(address);
      default: return [];
    }
  } catch (err) {
    console.error(`[blockchain] ${coin} check failed for ${address.slice(0, 12)}...:`, err.message);
    return [];
  }
}

// Match an incoming tx to the expected amount. Uses precision-based matching
// because each invoice has a unique sub-satoshi offset baked into the amount.
// We prefer an *exact* match first (within absolute precision), then accept
// the closest tx whose amount is at least 99% of expected.
export function findMatchingPayment(transactions, expectedAmount) {
  if (!transactions?.length || !expectedAmount) return null;

  // Tight tolerance: 1 satoshi-equivalent (1e-8) — catches the unique offset
  // exactly without false-matching another invoice with a different offset.
  const tightTolerance = 1e-8;
  for (const tx of transactions) {
    if (Math.abs(tx.amount - expectedAmount) <= tightTolerance) return tx;
  }

  // Allow slight overpayment / wallet rounding: 0.1% tolerance.
  // Only accept the *closest* match to avoid grabbing another invoice's tx.
  const wide = expectedAmount * 0.001;
  let best = null;
  let bestDiff = Infinity;
  for (const tx of transactions) {
    const diff = Math.abs(tx.amount - expectedAmount);
    if (diff <= wide && diff < bestDiff) {
      best = tx;
      bestDiff = diff;
    }
  }
  if (best) return best;

  // Underpayment is NOT auto-accepted (would cause confusion / missing funds).
  return null;
}

export function getRequiredConfirmations(coin) {
  return REQUIRED_CONFIRMATIONS[coin] || 2;
}
