/**
 * Validation for authorised pharmacy price feeds.
 * No external API key belongs in this static browser bundle.
 * The feed is display data only; it does not imply a clinical substitution.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LEKSCAN_OFFERS = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : undefined), function () {
  'use strict';
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const validString = (s, max = 200) => typeof s === 'string' && !!s.trim() && s.length <= max;
  function isSafeUrl(url) {
    try {
      const p = new URL(url);
      return p.protocol === 'https:' && !p.username && !p.password && p.hostname.indexOf('.') !== -1;
    } catch { return false; }
  }
  function normaliseFeed(payload, now = Date.now()) {
    if (!payload || payload.version !== 1 || !Array.isArray(payload.offers)) return [];
    return payload.offers.filter(x => {
      if (!x || typeof x !== 'object') return false;
      if (![x.id,x.city,x.productId,x.form,x.dose,x.pack,x.pharmacyName,x.sourceName]
        .every(v => validString(v))) return false;
      if (typeof x.price !== 'number' || !Number.isFinite(x.price) || x.price <= 0 || x.price > 1e7) return false;
      if (x.currency !== 'RUB' || !isSafeUrl(x.sourceUrl)) return false;
      if (!['in_stock', 'unknown'].includes(x.availability)) return false;
      if (x.pharmacyAddress != null && typeof x.pharmacyAddress !== 'string') return false;
      const t = Date.parse(x.updatedAt);
      if (!Number.isFinite(t) || t > now + 5 * 60 * 1000 || now - t > MAX_AGE_MS) return false;
      return true;
    }).map(x => ({
      id: x.id, city: x.city, productId: x.productId, form: x.form, dose: x.dose, pack: x.pack,
      pharmacyName: x.pharmacyName, pharmacyAddress: x.pharmacyAddress || '',
      price: x.price, currency: x.currency, sourceName: x.sourceName, sourceUrl: x.sourceUrl,
      updatedAt: x.updatedAt, availability: x.availability
    }));
  }
  function matchOffers(offers, params) {
    return offers.filter(x => x.city === params.city && x.productId === params.productId &&
      x.form === params.form && x.dose === params.dose && x.pack === params.pack);
  }
  return { normaliseFeed, matchOffers, MAX_AGE_MS, isSafeUrl };
});
