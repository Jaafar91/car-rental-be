// ── STATE ──
const supportedLangs = ['en', 'fr'];
let currentPage = 'dashboard';
let currentLang = localStorage.getItem('car_rental_lang') || 'en';
let currentCurrency = '';
let currentLocale = '';
let locale = {};

async function loadConfig() {
  try {
    const config = await api.get('/api/config');
    currentCurrency = config.default_currency || currentCurrency;
    currentLocale = config.default_locale || currentLocale;
  } catch (error) {
    console.warn('Unable to load config', error);
  }
}

function formatCurrency(value, currency = currentCurrency, localeString = currentLocale) {
  if (value === null || value === undefined || value === '') return '—';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);
  try {
    return new Intl.NumberFormat(localeString, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numberValue);
  } catch (error) {
    return `${currency} ${numberValue.toFixed(2)}`;
  }
}

async function loadLocale(lang = currentLang) {
  if (!supportedLangs.includes(lang)) lang = 'en';
  currentLang = lang;

  try {
    const res = await fetch(`/static/locales/${lang}.json`);
    locale = res.ok ? await res.json() : {};
  } catch (error) {
    console.error('Unable to load locale', error);
    locale = {};
  }

  document.documentElement.lang = lang;
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = lang;
  localStorage.setItem('car_rental_lang', lang);
  document.title = t('appTitle');
  translateDOM();
  if (currentPage) navigateTo(currentPage);
}

function t(key, vars = {}) {
  let str = locale[key] ?? key;
  if (typeof str !== 'string') str = String(str ?? '');
  if (vars && typeof vars === 'object' && Object.keys(vars).length) {
    Object.entries(vars).forEach(([name, value]) => {
      str = str.replace(new RegExp(`\\{${name}\\}`, 'g'), value);
    });
  }

  if (str.includes('{currency}')) {
    str = str.replace(/currency/g, currentCurrency || 'USD');
  }

  return str;
}

function translateDOM(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = t(key);
  });

  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    if (key) el.title = t(key);
  });
}

function translateTemplate(html) {
  return html.replace(/\{\{(.+?)\}\}/g, (_, key) => t(key.trim()));
}

function setLanguage(lang) {
  loadLocale(lang);
}

// ── SIDEBAR TOGGLE ──
document.getElementById('toggleSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.querySelector('.main-wrapper').classList.toggle('expanded');
});

// ── LANGUAGE SWITCHER ──
document.getElementById('langSelect')?.addEventListener('change', e => {
  setLanguage(e.target.value);
});

// ── NAVIGATION ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page === 'staff' && !isAdmin()) {
      showToast('Only admins can access staff management', 'error');
      return;
    }
    navigateTo(page);
  });
});

function isAdmin() {
  return Boolean(authState?.staff?.role && authState.staff.role.toLowerCase() === 'admin');
}

function navigateTo(page) {
  if (page === 'staff' && !isAdmin()) {
    showToast('Only admins can access staff management', 'error');
    page = 'dashboard';
  }

  currentPage = page;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  document.getElementById('pageTitle').textContent = t(`nav_${page}`);

  const pages = {
    dashboard, branches, car_categories, car_status,
    cars, customers, profile, staff, reservations, rentals, payments, maintenance
  };

  if (pages[page]) pages[page].load();
}

// ── DASHBOARD ──
const dashboard = {
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`<div class="loading"><div class="spinner"></div> {{loading}}</div>`);

    try {
      const [br, cats, cars, custs, staff, res, rent, pay, maint] = await Promise.all([
        api.get('/branches/'),
        api.get('/car-categories/'),
        api.get('/cars/'),
        api.get('/customers/'),
        api.get('/staff/'),
        api.get('/reservations/'),
        api.get('/rentals/'),
        api.get('/payments/'),
        api.get('/maintenance/'),
      ]);

      content.innerHTML = translateTemplate(`
        <div class="stats-grid">
          ${stat('🏢', br.length, 'nav_branches', '#2563eb', 'branches')}
          ${stat('🚗', cars.length, 'nav_cars', '#7c3aed', 'cars')}
          ${stat('👥', custs.length, 'nav_customers', '#0891b2', 'customers')}
          ${stat('👔', staff.length, 'nav_staff', '#065f46', 'staff')}
          ${stat('📅', res.length, 'nav_reservations', '#b45309', 'reservations')}
          ${stat('🔑', rent.length, 'nav_rentals', '#be185d', 'rentals')}
          ${stat('💳', pay.length, 'nav_payments', '#15803d', 'payments')}
          ${stat('🔧', maint.length, 'nav_maintenance', '#dc2626', 'maintenance')}
          ${stat('🏷️', cats.length, 'col_categories', '#6d28d9', 'car_categories')}
        </div>

        <div class="table-wrapper" style="padding:20px">
          <h3 style="margin-bottom:16px">📋 {{recent_reservations}}</h3>
          ${buildReservationSummary(res.slice(0, 5))}
        </div>
      `);

      content.querySelectorAll('.stat-card[data-page]').forEach(card => {
        card.addEventListener('click', () => navigateTo(card.dataset.page));
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateTo(card.dataset.page);
          }
        });
      });
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i>${e.message}</div>`;
    }
  }
};

function stat(icon, value, labelKey, color, pageKey = null) {
  const pageAttr = pageKey ? `data-page="${pageKey}" role="button" tabindex="0"` : '';
  const cursorStyle = pageKey ? 'cursor:pointer;' : '';
  return `
    <div class="stat-card" style="border-left-color:${color};${cursorStyle}" ${pageAttr}>
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${t(labelKey)}</div>
    </div>`;
}

function buildReservationSummary(items) {
  if (!items.length) return translateTemplate(`<div class="empty-state"><i class="fas fa-calendar"></i> {{no_reservations}}</div>`);
  return `
    <table>
      <thead><tr>
        <th>${t('col_id')}</th><th>${t('col_customer')}</th><th>${t('col_car')}</th>
        <th>${t('col_start')}</th><th>${t('col_end')}</th><th>${t('col_status')}</th>
      </tr></thead>
      <tbody>
        ${items.map(r => `
          <tr>
            <td>#${r.reservation_id}</td>
            <td>${r.customer_id}</td>
            <td>${r.car_id}</td>
            <td>${r.start_date}</td>
            <td>${r.end_date}</td>
            <td>${statusBadge(r.status)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── MODAL HELPERS ──
function openModal(title, bodyHTML, onSubmit) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = translateTemplate(bodyHTML || '');
  translateDOM(document.getElementById('modal'));
  document.getElementById('modalOverlay').classList.add('open');

  const submitBtn = document.getElementById('modalSubmit');
  submitBtn.onclick = onSubmit;
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalClose').onclick  = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ── TOAST ──
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── CONFIRM DELETE ──
function confirmDelete(msg, onConfirm) {
  if (confirm(msg)) onConfirm();
}

// ── STATUS BADGE ──
function statusBadge(status) {
  const map = {
    active: 'badge-green', inactive: 'badge-red',
    available: 'badge-green', rented: 'badge-blue',
    maintenance: 'badge-yellow', retired: 'badge-gray',
    pending: 'badge-yellow', confirmed: 'badge-blue',
    cancelled: 'badge-red', completed: 'badge-green',
    ongoing: 'badge-blue', paid: 'badge-green',
    partial: 'badge-yellow', refunded: 'badge-gray',
    scheduled: 'badge-yellow',
    in_progress: 'badge-warning',
  };
  const normalized = (status || '').toString().toLowerCase();
  const cls = map[normalized] || 'badge-gray';
  const rawStatus = (status || '').toString().trim();
  const translated = normalized ? t(`status_${normalized}`) : '';
  const label = translated && !translated.startsWith('status_') ? translated : (rawStatus || '-');
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── GENERIC TABLE BUILDER ──
function buildTable(columns, rows, actions) {
  if (!rows.length) return `
    <div class="empty-state">
      <i class="fas fa-inbox"></i>${t('no_records')}
    </div>`;

  return `
    <table>
      <thead><tr>
        ${columns.map(c => `<th>${c.label}</th>`).join('')}
        <th>${t('col_actions')}</th>
      </tr></thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? '-')}</td>`).join('')}
            <td><div class="actions">${actions(row)}</div></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── SEARCH FILTER ──
function setupSearch(inputId, tableId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll(`#${tableId} tbody tr`).forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

// ── INIT ──
loadConfig()
  .then(() => loadLocale(currentLang))
  .catch(() => loadLocale(currentLang));
