import client from "./client";

export const loginUser = async (data) => {
  const response = await client.post("/login", data);
  return response.data;
};

export const registerUser = async (data) => {
  const response = await client.post("/register", data);
  return response.data;
};

// ── Wallet ─────────────────────────────────────────────────────────────────

export const getWallet = (userId) =>
  client.get(`/wallet/${userId}`).then((r) => r.data);

export const depositFunds = (userId, amount_cents, reference) =>
  client.post(`/wallet/${userId}/deposit`, { amount_cents, reference }).then((r) => r.data);

export const withdrawFunds = (userId, amount_cents, reference) =>
  client.post(`/wallet/${userId}/withdraw`, { amount_cents, reference }).then((r) => r.data);

export const getTransactions = (userId, limit = 50) =>
  client.get(`/wallet/${userId}/transactions?limit=${limit}`).then((r) => r.data);

export const getPaymentMethods = (userId) =>
  client.get(`/wallet/${userId}/payment-methods`).then((r) => r.data);

export const addPaymentMethod = (userId, data) =>
  client.post(`/wallet/${userId}/payment-methods`, data).then((r) => r.data);

export const deletePaymentMethod = (userId, pmId) =>
  client.delete(`/wallet/${userId}/payment-methods/${pmId}`).then((r) => r.data);

export const setDefaultPaymentMethod = (userId, pmId) =>
  client.patch(`/wallet/${userId}/payment-methods/${pmId}/default`).then((r) => r.data);

// ── Portfolio ───────────────────────────────────────────────────────────────

export const getHoldings = (userId) =>
  client.get(`/holdings/${userId}`).then((r) => r.data);

export const getPnl = (userId) =>
  client.get(`/pnl?user_id=${userId}`).then((r) => r.data);

export const getBookSnapshot = (depth = 1) =>
  client.get(`/book/snapshot?depth=${depth}`).then((r) => r.data);

export const getRecentTrades = (limit = 20) =>
  client.get(`/trades?limit=${limit}`).then((r) => r.data);
