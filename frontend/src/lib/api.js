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

  // Multipart file upload — backend uploads to ImgBB, runs SerpApi, persists,
  // returns { search_id, image_url, candidate_ids }.
  lensScan: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}/lens/scan`, { method: 'POST', body: fd });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`POST /lens/scan ${res.status}: ${text}`);
    }
    return res.json();
  },

  // Wishlist
  getWishlist: () => request('/wishlist'),
  getWishlistSweetspot: () => request('/wishlist/sweetspot'),
  getWishlistDiscount: () => request('/wishlist/discount'),
  getWishlistBought: () => request('/wishlist/bought'),

  // SweetSpot — scan all wishlist items, write results to DB
  sweetspotWishlistScan: () =>
    request('/sweetspot/wishlist-scan', { method: 'POST' }),

  markWishlistItemBought: (wishlistItemId) =>
    request(`/wishlist/${wishlistItemId}/buy`, { method: 'POST' }),

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
