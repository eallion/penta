const API_BASE = '/api';
const AVATAR_BASE = 'https://game.gtimg.cn/images/lol/act/img/champion';

const gallery = document.getElementById('gallery');
const statsEl = document.getElementById('stats');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxInfo = document.getElementById('lightboxInfo');
const sentinel = document.getElementById('sentinel');

const filterYear = document.getElementById('filterYear');
const filterChampion = document.getElementById('filterChampion');
const filterMap = document.getElementById('filterMap');
const filterSort = document.getElementById('filterSort');
const toggleLarge = document.getElementById('toggleLarge');

let allPentas = [];
let currentPage = 1;
const PAGE_SIZE = 20;
let isLoading = false;
let hasMore = true;
let observer = null;

function getFilterParams() {
  const p = new URLSearchParams();
  if (filterYear.value) p.set('year', filterYear.value);
  if (filterChampion.value) p.set('champion', filterChampion.value);
  if (filterMap.value) p.set('map', filterMap.value);
  p.set('sort', filterSort.value);
  return p.toString();
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function loadStats() {
  try {
    const stats = await fetchWithTimeout(`${API_BASE}/pentas/stats`);
    statsEl.innerHTML = `
      <span>Total: ${stats.total}</span>
      <span>Champions: ${Object.keys(stats.byChampion).length}</span>
      <span>Years: ${Object.keys(stats.byYear).length}</span>
    `;

    if (stats.years) {
      filterYear.innerHTML = '<option value="">Year</option>' +
        stats.years.map(y => `<option value="${y.year}">${y.year} (${y.count})</option>`).join('');
    }

    if (stats.champions) {
      filterChampion.innerHTML = '<option value="">Champion</option>' +
        stats.champions.map(c => `<option value="${c}">${c} (${stats.byChampion[c]})</option>`).join('');
    }

    if (stats.maps && stats.maps.length > 0) {
      filterMap.innerHTML = '<option value="">Map</option>' +
        stats.maps.map(m => `<option value="${m}">${m} (${stats.byMap[m]})</option>`).join('');
    }
  } catch (e) {
    statsEl.innerHTML = '<span>Stats error: ' + e.message + '</span>';
  }
}

async function loadPage(page) {
  if (isLoading) return;
  isLoading = true;
  sentinel.style.display = 'block';
  sentinel.textContent = 'Loading more...';
  sentinel.style.height = '';
  sentinel.style.padding = '24px';
  try {
    const qs = getFilterParams();
    const data = await fetchWithTimeout(`${API_BASE}/pentas?limit=${PAGE_SIZE}&page=${page}&${qs}`);
    if (!data || !Array.isArray(data.data)) {
      throw new Error(data?.error || 'Invalid response');
    }
    const items = data.data;
    if (items.length === 0) {
      hasMore = false;
      sentinel.textContent = page === 1 ? 'No results' : 'All loaded';
      return;
    }
    if (page === 1) gallery.innerHTML = '';
    hasMore = page < data.pagination.totalPages;
    allPentas = allPentas.concat(items);
    appendCards(items);
    currentPage = page;
  } catch (e) {
    sentinel.textContent = 'Failed to load: ' + e.message;
  } finally {
    isLoading = false;
    if (!hasMore) {
      sentinel.textContent = 'All loaded';
    } else {
      sentinel.style.display = 'block';
      sentinel.textContent = '';
      sentinel.style.height = '1px';
      sentinel.style.padding = '0';
    }
  }
}

function appendCards(pentas) {
  const html = pentas.map(p => {
    const imgUrl = p.imageUrl || p.screenshot || '';
    const avatarUrl = `${AVATAR_BASE}/${p.champion}.png`;
    return `
    <div class="card" data-id="${p.id}">
      <img src="${imgUrl}" alt="${p.champion}" loading="lazy"
        onerror="this.parentElement.classList.add('no-img')">
      <div class="info">
        <div class="avatar-row">
          <img class="avatar" src="${avatarUrl}" alt="${p.champion}"
            onerror="this.style.display='none'">
          <div>
            <div class="champion">${p.name}</div>
            <div class="title">${p.title}</div>
          </div>
          <div class="date">${formatDate(p.date)}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  gallery.insertAdjacentHTML('beforeend', html);

  gallery.querySelectorAll('.card:not(.bound)').forEach(card => {
    card.classList.add('bound');
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const p = allPentas.find(x => x.id === id);
      if (p) openLightbox(p);
    });
  });
}

function setupObserver() {
  observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore && !isLoading) {
      loadPage(currentPage + 1);
    }
  }, { rootMargin: '200px' });
  observer.observe(sentinel);
}

function resetGallery() {
  if (observer) observer.disconnect();
  allPentas = [];
  currentPage = 1;
  hasMore = true;
  gallery.innerHTML = '<div class="loading">Loading...</div>';
  sentinel.style.display = 'none';
  sentinel.textContent = 'Loading more...';
  if (filterYear.value) filterYear.value = '';
  loadPage(1).then(() => setupObserver());
}

function onFilterChange() {
  allPentas = [];
  currentPage = 1;
  hasMore = true;
  gallery.innerHTML = '<div class="loading">Loading...</div>';
  sentinel.style.display = 'none';
  if (observer) observer.disconnect();
  loadPage(1).then(() => setupObserver());
}

function formatDate(dateStr) {
  const m = (dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return (dateStr || '').slice(0, 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m[2])-1]} ${parseInt(m[3])}, ${m[1]}`;
}

function openLightbox(p) {
  lightboxImg.src = p.imageUrl || p.screenshot || '';
  lightboxInfo.textContent = `${p.name} — ${p.title} — ${formatDate(p.date)}`;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

filterYear.addEventListener('change', onFilterChange);
filterChampion.addEventListener('change', onFilterChange);
filterMap.addEventListener('change', onFilterChange);
filterSort.addEventListener('change', onFilterChange);

toggleLarge.addEventListener('click', () => {
  gallery.classList.toggle('large');
  toggleLarge.classList.toggle('active');
});

function hideOverlay() {
  const el = document.getElementById('turnstile-overlay');
  if (el) el.classList.add('hidden');
}

function showError(msg) {
  const widget = document.getElementById('turnstile-widget');
  if (widget) widget.innerHTML = `<div class="turnstile-error">${msg}</div><button class="turnstile-retry" onclick="location.reload()">Retry</button>`;
}

function startGallery() {
  hideOverlay();
  loadStats();
  loadPage(1).then(() => setupObserver());
}

async function initTurnstile() {
  try {
    const res = await fetch('/api/config/turnstile');
    const { siteKey } = await res.json();
    if (!siteKey) {
      startGallery();
      return;
    }
    window._turnstileReady = () => {
      turnstile.render('#turnstile-widget', {
        sitekey: siteKey,
        callback: startGallery
      });
    };
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=_turnstileReady';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  } catch (e) {
    showError('Failed to load verification config. Please try again later.');
  }
  setTimeout(() => {
    const overlay = document.getElementById('turnstile-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    showError('Verification script failed to load. Please disable ad blocker or check your network connection.');
  }, 10000);
}

initTurnstile();
