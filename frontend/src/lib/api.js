/**
 * Backend API client.
 *
 * Base URL comes from the VITE_API_BASE_URL env var (set in .env / Railway
 * Variables). Defaults to localhost so `npm run dev` works against a local
 * backend without configuration.
 *
 * Single-user for now: USER_ID is hardcoded to our sandbox BUNQ user.
 * Once Telegram bot onboarding lands, this becomes dynamic per session.
 */
// Defaults to the deployed Railway backend so a fresh `npm run dev` works
// without any env setup. To point at a local backend, create
// frontend/.env.local with VITE_API_BASE_URL=http://127.0.0.1:8000
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://imaginative-spontaneity-production.up.railway.app';

export const USER_ID = 3628657;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `${options.method || 'GET'} ${path} ${res.status}: ${text}`
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request('/health'),

  getUser: () => request(`/bunq/users/${USER_ID}`),

  getBalance: () => request(`/bunq/balance/${USER_ID}`),

  getTransactions: (count = 50) =>
    request(`/bunq/transactions/${USER_ID}?count=${count}`),

  createDraftPayment: ({ amountEur, counterpartyEmail, description, category }) =>
    request('/bunq/payments/draft', {
      method: 'POST',
      body: JSON.stringify({
        amount_eur: amountEur,
        counterparty_email: counterpartyEmail,
        description,
        ...(category ? { category } : {}),
      }),
    }),

  confirmDraftPayment: (draftId) =>
    request(`/bunq/payments/${draftId}/confirm`, { method: 'POST' }),

  bunqTopup: (amountEur) =>
    request('/bunq/topup', {
      method: 'POST',
      body: JSON.stringify({ amount_eur: amountEur }),
    }),

  // Lens
  getLensCandidates: (searchId, limit = 3) =>
    request(`/lens/searches/${searchId}/candidates?limit=${limit}`),

  // Wishlist
  getWishlist: () => request('/wishlist'),

  addToWishlist: ({ productCandidateId, note, onDiscount, sweetSpot, reasoning }) =>
    request('/wishlist', {
      method: 'POST',
      body: JSON.stringify({
        product_candidate_id: productCandidateId,
        ...(note != null ? { note } : {}),
        ...(onDiscount != null ? { on_discount: onDiscount } : {}),
        ...(sweetSpot != null ? { sweet_spot: sweetSpot } : {}),
        ...(reasoning != null ? { reasoning } : {}),
      }),
    }),

  // SweetSpot — image_url in, scoring + matches out
  sweetspotSearch: (imageUrl) =>
    request('/sweetspot/search', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    }),
};
