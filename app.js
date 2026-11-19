/**
 * LЕКСКАН / Telegram Mini App proof of concept.
 * The provider below is intentionally demo-only: NEVER represent it as real pharmacy stock or prices.
 * Future real data must be returned by an authorised backend using licensed source adapters.
 */
(() => {
  'use strict';
  const data = window.LEKSCAN_DATA;
  const prices = window.LEKSCAN_OFFERS;
  if (!data || !prices) { document.body.textContent = 'Не удалось загрузить данные интерфейса'; return; }
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize = (s) => String(s || '').trim().toLocaleLowerCase('ru-RU');
  const fmtPrice = (num) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(num);
  const telegram = window.Telegram?.WebApp;

  // LocalStorage is only a convenience in the demo, not a cross-device account store.
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browser */ } }
  };
  let savedFavorites = storage.get('lekscan:favorites:v1', []);
  if (!Array.isArray(savedFavorites)) savedFavorites = [];
  const savedCity = storage.get('lekscan:city:v1', 'Иваново');
  const state = {
    city: data.cities.includes(savedCity) ? savedCity : 'Иваново',
    productId: data.products[0].id,
    form: '', dose: '', pack: '', sort: 'price', tab: 'search',
    demo: false, realOffers: [], feedStatus: 'loading',
    favorites: savedFavorites.filter(x => typeof x === 'string').slice(0, 100)
  };

  function getProduct() { return data.products.find(p => p.id === state.productId) || data.products[0]; }
  function selectedCombo() { return getProduct().combinations.find(c => c.form === state.form && c.dose === state.dose && c.packs.includes(state.pack)); }
  function unique(a) { return [...new Set(a)]; }
  function getFavoriteKey() { return [state.productId, state.form, state.dose, state.pack].join('|'); }
  function haptic() { try { telegram?.HapticFeedback?.selectionChanged?.(); } catch { /* unsupported client */ } }

  function setOptions(select, opts, selected) {
    select.replaceChildren();
    opts.forEach(value => { const o = document.createElement('option'); o.value = value; o.textContent = value; select.appendChild(o); });
    if (opts.includes(selected)) select.value = selected;
  }
  function refreshForm() {
    const product = getProduct();
    const forms = unique(product.combinations.map(c => c.form));
    if (!forms.includes(state.form)) state.form = forms[0];
    setOptions($('form-select'), forms, state.form);
    refreshDose();
  }
  function refreshDose() {
    const combos = getProduct().combinations.filter(c => c.form === state.form);
    const doses = unique(combos.map(c => c.dose));
    if (!doses.includes(state.dose)) state.dose = doses[0];
    setOptions($('dose-select'), doses, state.dose);
    refreshPacks();
  }
  function refreshPacks() {
    const combos = getProduct().combinations.filter(c => c.form === state.form && c.dose === state.dose);
    const packs = unique(combos.flatMap(c => c.packs));
    if (!packs.includes(state.pack)) state.pack = packs[packs.length - 1];
    setOptions($('pack-select'), packs, state.pack);
  }
  function chooseProduct(productId, options = {}) {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;
    state.productId = product.id;
    state.form = options.form || '';
    state.dose = options.dose || '';
    state.pack = options.pack || '';
    refreshForm();
    $('medicine-input').value = product.mnn;
    $('suggestions').classList.add('hidden');
    renderChips(); renderOffers();
    haptic();
  }
  function searchMatches(text) {
    const q = normalize(text);
    if (!q) return data.products;
    return data.products.filter(p => [p.mnn, ...p.aliases].some(x => normalize(x).includes(q)));
  }
  function renderSuggestions() {
    const input = $('medicine-input');
    const q = normalize(input.value);
    const box = $('suggestions');
    if (q.length < 2) { box.classList.add('hidden'); return; }
    const matches = searchMatches(q);
    if (!matches.length) {
      box.innerHTML = '<div class="suggestion">Ничего не найдено в демонстрационном каталоге</div>';
    } else {
      box.innerHTML = matches.map(p => `<button type="button" class="suggestion" data-select-med="${esc(p.id)}"><strong>${esc(p.mnn)}</strong><small>Действующее вещество · ${esc(p.forms.join(', ').toLowerCase())}</small></button>`).join('');
    }
    box.classList.remove('hidden');
  }
  function renderChips() {
    $('quick-chips').innerHTML = data.products.slice(0, 4).map(p =>
      `<button type="button" class="chip ${p.id === state.productId ? 'selected' : ''}" data-select-med="${esc(p.id)}">${esc(p.mnn)}</button>`
    ).join('');
  }

  // Deterministic and entirely fictional price generator.
  function getDemoOffers() {
    const combo = selectedCombo();
    if (!combo) return [];
    const cityIndex = data.cities.indexOf(state.city);
    const cityFactor = 0.94 + ((cityIndex * 7) % 17) / 100;
    let packFactor = 1;
    if (combo.packs.length > 1) packFactor = state.pack === combo.packs[0] ? .58 : 1;
    const offers = data.demoPharmacies.map((pharmacy, i) => ({
      id: pharmacy.id,
      pharmacyName: pharmacy.name,
      subtitle: pharmacy.subtitle,
      price: Math.max(20, Math.round(combo.base * packFactor * cityFactor * pharmacy.coefficient * (1 + (i * .005)) / 5) * 5)
    }));
    offers.sort((a, b) => state.sort === 'priceDesc' ? b.price - a.price : a.price - b.price);
    return offers;
  }
  function getVisibleOffers() {
    const offers = state.demo ? getDemoOffers() : prices.matchOffers(state.realOffers, {
      city: state.city, productId: state.productId, form: state.form, dose: state.dose, pack: state.pack
    });
    return offers.slice().sort((a, b) => state.sort === 'priceDesc' ? b.price - a.price : a.price - b.price);
  }
  function displayUpdatedAt(value) {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      .format(new Date(value));
  }
  function renderOffers() {
    const product = getProduct();
    $('results-title').textContent = product.mnn;
    $('results-description').textContent = `${state.dose} · ${state.form.toLowerCase()} · ${state.pack}`;
    const key = getFavoriteKey();
    const isFav = state.favorites.includes(key);
    $('favorite-button').classList.toggle('is-fav', isFav);
    $('favorite-button').setAttribute('aria-pressed', String(isFav));
    $('favorite-button').setAttribute('aria-label', isFav ? 'Удалить из избранного' : 'Добавить в избранное');
    $('fav-glyph').textContent = isFav ? '♥' : '♡';
    $('city-label').textContent = state.city;
    $('sort-select').value = state.sort;
    $('demo-toggle').checked = state.demo;
    const offers = getVisibleOffers();
    $('count-tag').textContent = state.demo ? `${offers.length} тестовых предложений` :
      `${offers.length} предложений из подключённых источников`;
    if (!offers.length) {
      $('offer-list').innerHTML = `<div class="offer-empty"><strong>${state.feedStatus === 'loading' ? 'Проверяем источники…' : 'Подтверждённых цен пока нет'}</strong>
        <p>Для выбранного города и параметров нет актуальных предложений от подключённых источников. Это не означает, что препарата нет в аптеках. Проверьте сайты сервисов выше.</p></div>`;
      return;
    }
    const cheapest = Math.min(...offers.map(x => x.price));
    $('offer-list').innerHTML = offers.map(offer => {
      const best = offer.price === cheapest;
      const details = state.demo ? `
        <p class="offer-subtitle">${esc(offer.subtitle)}</p>
        <div class="offer-tags"><span class="offer-tag">ВЫМЫШЛЕННАЯ</span>${best ? '<span class="offer-tag best">Мин. демо-цена</span>' : ''}</div>` : `
        <p class="offer-subtitle">${esc(offer.pharmacyAddress || 'Адрес не указан')}</p>
        <div class="offer-tags"><span class="offer-tag">${esc(offer.sourceName)}</span>${best ? '<span class="offer-tag best">Мин. из загруженных</span>' : ''}</div>
        <p class="source-date">Данные на ${esc(displayUpdatedAt(offer.updatedAt))}</p>`;
      return `<article class="offer-card ${best ? 'top-offer' : ''}">
        <div class="pharmacy-icon" aria-hidden="true">${esc(offer.pharmacyName.slice(0, 1))}</div>
        <div><p class="offer-name">${esc(offer.pharmacyName)}</p>${details}</div>
        <div class="offer-right"><p class="offer-price">${fmtPrice(offer.price)} <small>₽</small></p><button type="button" class="detail-button" data-offer-id="${esc(offer.id)}">Детали</button></div>
      </article>`;
    }).join('');
  }

  function showDetail(id) {
    const offer = getVisibleOffers().find(x => x.id === id);
    if (!offer) return;
    const p = getProduct();
    const common = `
      <div class="detail-price">${fmtPrice(offer.price)} <small>₽</small></div>
      <div class="detail-row"><span>Аптека</span><strong>${esc(offer.pharmacyName)}</strong></div>
      <div class="detail-row"><span>Город</span><strong>${esc(state.city)}</strong></div>
      <div class="detail-row"><span>Действующее вещество</span><strong>${esc(p.mnn)}</strong></div>
      <div class="detail-row"><span>Параметры</span><strong>${esc(state.dose)}, ${esc(state.form.toLowerCase())}, ${esc(state.pack)}</strong></div>`;
    if (state.demo) {
      $('detail-content').innerHTML = `<div class="matched-tag" style="display:inline-block">Демонстрационное предложение</div>${common}
        <div class="detail-row"><span>Источник</span><strong>Демо-генератор</strong></div>
        <div class="detail-row"><span>Наличие и адрес</span><strong>Нет реальных данных</strong></div>
        <div class="detail-warning">Цена и аптека вымышленные. Это тест интерфейса, не предложение для покупки.</div>`;
    } else {
      $('detail-content').innerHTML = `<div class="matched-tag" style="display:inline-block">Из подключённого источника</div>${common}
        <div class="detail-row"><span>Адрес</span><strong>${esc(offer.pharmacyAddress || 'Не указан')}</strong></div>
        <div class="detail-row"><span>Источник</span><strong>${esc(offer.sourceName)}</strong></div>
        <div class="detail-row"><span>Обновлено</span><strong>${esc(displayUpdatedAt(offer.updatedAt))}</strong></div>
        <div class="detail-row"><span>Наличие</span><strong>${offer.availability === 'in_stock' ? 'По данным источника — в наличии' : 'Не подтверждено'}</strong></div>
        <a class="primary-action" style="text-decoration:none" href="${esc(offer.sourceUrl)}" target="_blank" rel="noopener noreferrer">Открыть источник <span aria-hidden="true">↗</span></a>
        <div class="detail-warning">Цена, остатки и условия бронирования могут измениться. Уточняйте их у аптеки. Совпадение МНН не означает автоматическую взаимозаменяемость.</div>`;
    }
    openOverlay('detail');
  }

  async function loadPriceFeed() {
    const feedURL = window.LEKSCAN_CONFIG?.offersUrl || './offers.json';
    try {
      const response = await fetch(feedURL, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      state.realOffers = prices.normaliseFeed(payload);
      state.feedStatus = 'loaded';
    } catch (error) {
      state.realOffers = [];
      state.feedStatus = 'unavailable';
      console.warn('No licensed price feed available:', error);
    }
    renderOffers();
  }

  async function copySearchQuery() {
    const query = `${getProduct().mnn} ${state.dose} ${state.form} ${state.pack}, ${state.city}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(query);
      const toast = $('copy-toast');
      toast.textContent = 'Запрос скопирован — вставьте его в поиск аптеки';
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3000);
    } catch {
      window.prompt('Скопируйте запрос:', query);
    }
  }

  function renderCityList() {
    const q = normalize($('city-search').value);
    const matches = data.cities.filter(c => normalize(c).includes(q));
    $('city-list').innerHTML = matches.length
      ? matches.map(c => `<button type="button" class="city-row ${c === state.city ? 'current' : ''}" data-city="${esc(c)}">${esc(c)}<span>${c === state.city ? '✓' : '›'}</span></button>`).join('')
      : '<p class="sheet-footnote">Город не найден в демонстрационном списке</p>';
  }
  function openOverlay(which) {
    $(`${which}-overlay`).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (which === 'city') { $('city-search').value = ''; renderCityList(); $('city-search').focus(); }
  }
  function closeOverlay(which) {
    $(`${which}-overlay`).classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderFavorites() {
    const available = state.favorites.map(key => {
      const [id, form, dose, pack] = key.split('|');
      const p = data.products.find(p => p.id === id);
      return p && p.combinations.find(c => c.form === form && c.dose === dose && c.packs.includes(pack)) ? {key, p, form, dose, pack} : null;
    }).filter(Boolean);
    $('favorites-content').innerHTML = available.length
      ? available.map(x => `<button type="button" class="favorite-entry" data-fav="${esc(x.key)}"><span><strong>${esc(x.p.mnn)}</strong><small>${esc(x.dose)} · ${esc(x.form)} · ${esc(x.pack)}</small></span><span style="color:#2479e8;font-size:24px">›</span></button>`).join('')
      : '<div class="empty-state"><div class="empty-icon">♡</div><h3>Пока ничего нет</h3><p>Добавляйте препараты в избранное с экрана поиска, чтобы возвращаться к ним позже.</p></div>';
  }
  function switchTab(which) {
    state.tab = which;
    ['search','favorites','info'].forEach(tab => $(`page-${tab}`).classList.toggle('hidden', tab !== which));
    document.querySelectorAll('[data-tab]').forEach(el => {
      const active = el.dataset.tab === which;
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    if (which === 'favorites') renderFavorites();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    haptic();
  }

  function setupHandlers() {
    $('city-trigger').addEventListener('click', () => openOverlay('city'));
    $('city-search').addEventListener('input', renderCityList);
    $('city-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-city]');
      if (!btn) return;
      state.city = btn.dataset.city;
      storage.set('lekscan:city:v1', state.city);
      closeOverlay('city'); renderOffers(); haptic();
    });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeOverlay(b.dataset.close)));
    document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closeOverlay(o.id.replace('-overlay','')); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeOverlay('city'); closeOverlay('detail'); $('suggestions').classList.add('hidden'); } });
    $('medicine-input').addEventListener('input', renderSuggestions);
    document.querySelectorAll('#quick-chips, #suggestions').forEach(el => el.addEventListener('click', e => {
      const btn = e.target.closest('[data-select-med]');
      if (btn) chooseProduct(btn.dataset.selectMed);
    }));
    $('medicine-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); performSearch(); } });
    $('search-button').addEventListener('click', performSearch);
    $('copy-query').addEventListener('click', copySearchQuery);
    $('demo-toggle').addEventListener('change', e => { state.demo = e.target.checked; renderOffers(); });
    $('form-select').addEventListener('change', e => { state.form = e.target.value; refreshDose(); renderOffers(); });
    $('dose-select').addEventListener('change', e => { state.dose = e.target.value; refreshPacks(); renderOffers(); });
    $('pack-select').addEventListener('change', e => { state.pack = e.target.value; renderOffers(); });
    $('sort-select').addEventListener('change', e => { state.sort = e.target.value; renderOffers(); });
    $('favorite-button').addEventListener('click', () => {
      const key = getFavoriteKey();
      state.favorites = state.favorites.includes(key) ? state.favorites.filter(x => x !== key) : [...state.favorites, key];
      storage.set('lekscan:favorites:v1', state.favorites);
      renderOffers(); haptic();
    });
    $('offer-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-offer-id]');
      if (btn) showDetail(btn.dataset.offerId);
    });
    document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('favorites-content').addEventListener('click', e => {
      const b = e.target.closest('[data-fav]');
      if (!b) return;
      const [id, form, dose, pack] = b.dataset.fav.split('|');
      switchTab('search'); chooseProduct(id, {form, dose, pack});
    });
  }
  function performSearch() {
    const value = normalize($('medicine-input').value);
    if (value) {
      const matches = searchMatches(value);
      if (!matches.length) {
        $('suggestions').innerHTML = '<div class="suggestion">Пока нет в демонстрационном каталоге. Попробуйте парацетамол, ибупрофен, цетиризин или тирзепатид.</div>';
        $('suggestions').classList.remove('hidden');
        return;
      }
      chooseProduct(matches[0].id);
    }
    $('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function start() {
    try { telegram?.ready?.(); telegram?.expand?.(); } catch { /* browser preview */ }
    refreshForm();
    renderChips(); renderOffers(); setupHandlers(); loadPriceFeed();
  }
  start();
})();
