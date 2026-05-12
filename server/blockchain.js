// Blockchain payment detection for BTC, LTC, ETH, SOL

const REQUIRED_CONFIRMATIONS = {
  BTC: Number(process.env.REQUIRED_CONFIRMATIONS_BTC || 2),
  LTC: Number(process.env.REQUIRED_CONFIRMATIONS_LTC || 2),
  ETH: Number(process.env.REQUIRED_CONFIRMATIONS_ETH || 12),
  SOL: Number(process.env.REQUIRED_CONFIRMATIONS_SOL || 1)
};

// ── BTC via mempool.space (no rate limit) ──
async function getIncomingBTC(address) {
  const res = await fetch(`https://mempool.space/api/address/${address}/txs`);
  if (!res.ok) throw new Error(`mempool.space HTTP ${res.status}`);
  const txs = await res.json();

  let tipHeight = 0;
  try {
    const tipRes = await fetch("https://mempool.space/api/blocks/tip/height");
    if (tipRes.ok) tipHeight = await tipRes.json();
  } catch {}

  const incoming = [];
  for (const tx of txs) {
    for (const vout of (tx.vout || [])) {
      if (vout.scriptpubkey_address === address) {
        const blockHeight = tx.status?.block_height || 0;
        incoming.push({
          txHash: tx.txid,
          amount: vout.value / 1e8,
          confirmations: tx.status?.confirmed && tipHeight && blockHeight
            ? tipHeight - blockHeight + 1
            : (tx.status?.confirmed ? 1 : 0)
        });
      }
    }
  }
  return incoming;
}

// ── LTC via Blockcypher ──
async function getIncomingLTC(address) {
  const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}?limit=10`);
  if (!res.ok) throw new Error(`Blockcypher HTTP ${res.status}`);
  const data = await res.json();

  const incoming = [];
  for (const ref of (data.txrefs || [])) {
    if (ref.tx_input_n === -1) {
      incoming.push({ txHash: ref.tx_hash, amount: ref.value / 1e8, confirmations: ref.confirmations || 0 });
    }
  }
  for (const ref of (data.unconfirmed_txrefs || [])) {
    if (ref.tx_input_n === -1) {
      incoming.push({ txHash: ref.tx_hash, amount: ref.value / 1e8, confirmations: 0 });
    }
  }
  return incoming;
}

// ── ETH via Etherscan ──
async function getIncomingETH(address) {
  const apiKey = process.env.ETHERSCAN_API_KEY || "";
  const keyParam = apiKey ? `&apikey=${apiKey}` : "";
  const res = await fetch(
    `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=10${keyParam}`
  );
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "1" || !Array.isArray(data.result)) return [];

  let currentBlock = 0;
  try {
    const bRes = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_blockNumber${keyParam}`);
    if (bRes.ok) { const bd = await bRes.json(); currentBlock = parseInt(bd.result, 16); }
  } catch {}

  return data.result
    .filter(tx => tx.to?.toLowerCase() === address.toLowerCase() && tx.isError === "0" && Number(tx.value) > 0)
    .map(tx => ({
      txHash: tx.hash,
      amount: Number(tx.value) / 1e18,
      confirmations: currentBlock && tx.blockNumber
        ? currentBlock - Number(tx.blockNumber) + 1
        : Number(tx.confirmations || 1)
    }));
}

// ── SOL via Solana RPC ──
async function getIncomingSOL(address) {
  const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

  const sigRes = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [address, { limit: 10 }] })
  });
  const sigData = await sigRes.json();

  const incoming = [];
  for (const sig of (sigData.result || [])) {
    if (sig.err) continue;
    try {
      const txRes = await fetch(RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]
        })
      });
      const txData = await txRes.json();
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
            incoming.push({
              txHash: sig.signature,
              amount: diff / 1e9,
              confirmations: sig.confirmationStatus === "finalized" ? 32 : 1
            });
          }
        }
      }
    } catch {}
  }
  return incoming;
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

export function findMatchingPayment(transactions, expectedAmount) {
  const tolerance = expectedAmount * 0.001;
  // Exact match first (within 0.1%)
  for (const tx of transactions) {
    if (Math.abs(tx.amount - expectedAmount) <= tolerance) return tx;
  }
  // Overpayment (>= 99.5% of expected)
  for (const tx of transactions) {
    if (tx.amount >= expectedAmount * 0.995) return tx;
  }
  return null;
}

export function getRequiredConfirmations(coin) {
  return REQUIRED_CONFIRMATIONS[coin] || 2;
}
