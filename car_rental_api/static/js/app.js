// ── STATE ──
let currentPage = 'dashboard';

// ── SIDEBAR TOGGLE ──
document.getElementById('toggleSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.querySelector('.main-wrapper').classList.toggle('expanded');
});

// ── NAVIGATION ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  currentPage = page;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Dashboard', branches: 'Branches',
    car_categories: 'Car Categories', car_status: 'Car Status',
    cars: 'Cars', customers: 'Customers', staff: 'Staff',
    reservations: 'Reservations', rentals: 'Rentals',
    payments: 'Payments', maintenance: 'Maintenance'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Load page
  const pages = {
    dashboard, branches, car_categories, car_status,
    cars, customers, staff, reservations, rentals, payments, maintenance
  };

  if (pages[page]) pages[page].load();
}

// ── DASHBOARD ──
const dashboard = {
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `<div class="loading"><div class="spinner"></div> Loading...</div>`;

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

      content.innerHTML = `
        <div class="stats-grid">
          ${stat('🏢', br.length,    'Branches',     '#2563eb')}
          ${stat('🚗', cars.length,  'Cars',         '#7c3aed')}
          ${stat('👥', custs.length, 'Customers',    '#0891b2')}
          ${stat('👔', staff.length, 'Staff',        '#065f46')}
          ${stat('📅', res.length,   'Reservations', '#b45309')}
          ${stat('🔑', rent.length,  'Rentals',      '#be185d')}
          ${stat('💳', pay.length,   'Payments',     '#15803d')}
          ${stat('🔧', maint.length, 'Maintenance',  '#dc2626')}
          ${stat('🏷️', cats.length,  'Categories',   '#6d28d9')}
        </div>

        <div class="table-wrapper" style="padding:20px">
          <h3 style="margin-bottom:16px">📋 Recent Reservations</h3>
          ${buildReservationSummary(res.slice(0, 5))}
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i>${e.message}</div>`;
    }
  }
};

function stat(icon, value, label, color) {
  return `
    <div class="stat-card" style="border-left-color:${color}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

function buildReservationSummary(items) {
  if (!items.length) return `<div class="empty-state"><i class="fas fa-calendar"></i>No reservations yet</div>`;
  return `
    <table>
      <thead><tr>
        <th>ID</th><th>Customer</th><th>Car</th>
        <th>Start</th><th>End</th><th>Status</th>
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
  document.getElementById('modalBody').innerHTML = bodyHTML;
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
  };
  const cls = map[(status || '').toLowerCase()] || 'badge-gray';
  return `<span class="badge ${cls}">${status || '-'}</span>`;
}

// ── GENERIC TABLE BUILDER ──
function buildTable(columns, rows, actions) {
  if (!rows.length) return `
    <div class="empty-state">
      <i class="fas fa-inbox"></i>No records found
    </div>`;

  return `
    <table>
      <thead><tr>
        ${columns.map(c => `<th>${c.label}</th>`).join('')}
        <th>Actions</th>
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
navigateTo('dashboard');