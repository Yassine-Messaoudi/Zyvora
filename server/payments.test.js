import test from "node:test";
import assert from "node:assert/strict";
import { assignDepositAddress, calculateCryptoAmount } from "./payments.js";

test("calculates exact crypto amount from USD total", () => {
  assert.equal(calculateCryptoAmount(49.99, "LTC"), 0.5795942);
});

test("assigns a unique fallback address when no pool is configured", () => {
  const address = assignDepositAddress([], "BTC");
  assert.match(address, /^btc_watch_only_[a-f0-9]{24}$/);
});
