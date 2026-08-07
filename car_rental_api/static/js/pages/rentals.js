const rentals = {
  data: [],
  cars: [],
  customers: [],
  staff: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Rentals...
      </div>`;
    try {
      [this.data, this.cars, this.customers, this.staff] = await Promise.all([
        api.get('/rentals/'),
        api.get('/cars/'),
        api.get('/customers/'),
        api.get('/staff/'),
      ]);
      this.render();
    } catch (e) {
      content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${e.message}</p>
        </div>`;
      showToast(e.message, 'error');
    }
  },

  // ── HELPERS ──
  carLabel(id) {
    const c = this.cars.find(x => x.car_id === id);
    return c ? `${c.make} ${c.model} (${c.license_plate})` : `Car #${id}`;
  },
  customerLabel(id) {
    const c = this.customers.find(x => x.customer_id === id);
    return c ? `${c.full_name}` : `Customer #${id}`;
  },
  staffLabel(id) {
    if (!id) return '<span style="color:#94a3b8">—</span>';
    const s = this.staff.find(x => x.staff_id === id);
    return s ? `${s.first_name} ${s.last_name}` : `Staff #${id}`;
  },
  statusBadge(status) {
    const map = {
      active: 'badge-success',
      completed: 'badge-info',
      overdue: 'badge-danger',
      cancelled: 'badge-secondary',
    };
    return `<span class="badge ${map[status] || 'badge-secondary'}">${status || '—'}</span>`;
  },

  // ── NEW: Human-readable duration helper ──
  // e.g. 40 hours → "1 day, 16 hours" | 24 hours → "1 day" | 5 hours → "5 hours"
  formatDuration(rentalDateVal, dueDateVal) {
    if (!rentalDateVal || !dueDateVal) return '—';
    const start  = new Date(rentalDateVal);
    const end    = new Date(dueDateVal);
    const diffMs = end - start;
    if (diffMs <= 0) return '—';

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days       = Math.floor(totalHours / 24);
    const hours      = totalHours % 24;

    if (days > 0 && hours > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    if (days > 0)               return `${days} day${days !== 1 ? 's' : ''}`;
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  },

  // ── RENDER ──
  render() {
    const content = document.getElementById('pageContent');
    const totalRevenue = this.data
      .reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);

    content.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-car-side"></i> Rentals</h2>
        <button class="btn btn-primary" onclick="rentals.openCreate()">
          <i class="fas fa-plus"></i> New Rental
        </button>
      </div>

      <!-- Stats Row -->
      <div class="stats-row" style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-car',              'Total Rentals', this.data.length, '#6366f1')}
        ${this._statCard('fas fa-check-circle',     'Active',
            this.data.filter(x => x.status === 'active').length, '#10b981')}
        ${this._statCard('fas fa-exclamation-circle','Overdue',
            this.data.filter(x => x.status === 'overdue').length, '#ef4444')}
        ${this._statCard('fas fa-dollar-sign',      'Total Revenue',
            '$' + totalRevenue.toFixed(2), '#f59e0b')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="rentalSearch" placeholder="🔍 Search rentals..." />
        </div>
        <div id="rentalTable">
          ${buildTable(
            [
              { key: 'rental_id',   label: 'ID' },
              { key: 'car_id',      label: 'Car',
                render: row => this.carLabel(row.car_id) },
              { key: 'customer_id', label: 'Customer',
                render: row => this.customerLabel(row.customer_id) },
              { key: 'status',      label: 'Status',
                render: row => this.statusBadge(row.status) },
              { key: 'rental_date', label: 'Rental Date',
                render: row => row.rental_date
                  ? new Date(row.rental_date).toLocaleDateString() : '—' },
              { key: 'due_date',    label: 'Due Date',
                render: row => row.due_date
                  ? new Date(row.due_date).toLocaleDateString() : '—' },

              // ✅ NEW COLUMN — Total Days & Hours
              { key: '_duration',   label: 'Duration',
                render: row => `<span style="color:#6366f1;font-weight:600;">
                  <i class="fas fa-clock" style="margin-right:4px;"></i>
                  ${this.formatDuration(row.rental_date, row.due_date)}
                </span>` },

              { key: 'return_date', label: 'Returned',
                render: row => row.return_date
                  ? new Date(row.return_date).toLocaleDateString()
                  : '<span style="color:#94a3b8">Pending</span>' },
              { key: 'total_amount', label: 'Total ($)',
                render: row => row.total_amount != null
                  ? `<strong>$${parseFloat(row.total_amount).toFixed(2)}</strong>` : '—' },
              { key: 'staff_id',    label: 'Staff',
                render: row => this.staffLabel(row.staff_id) },
            ],
            this.data,
            row => `
              <button class="btn btn-warning btn-sm" title="Edit"
                onclick="rentals.openEdit(${row.rental_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm" title="Delete"
                onclick="rentals.delete(${row.rental_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`;

    setupSearch('rentalSearch', 'rentalTable');
  },

  // ── STAT CARD ──
  _statCard(icon, label, value, color) {
    return `
      <div style="background:#1e293b;border-radius:12px;padding:1rem 1.5rem;
                  flex:1;min-width:140px;border-left:4px solid ${color};">
        <div style="color:${color};font-size:1.5rem;margin-bottom:.3rem;">
          <i class="${icon}"></i>
        </div>
        <div style="font-size:1.8rem;font-weight:700;color:#f1f5f9;">${value}</div>
        <div style="color:#94a3b8;font-size:.85rem;">${label}</div>
      </div>`;
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    const carOpts = this.cars
      .map(c => `<option value="${c.car_id}" ${d.car_id === c.car_id ? 'selected' : ''}>
        ${c.make} ${c.model} — ${c.license_plate}
      </option>`).join('');

    const custOpts = this.customers
      .map(c => `<option value="${c.customer_id}" ${d.customer_id === c.customer_id ? 'selected' : ''}>
        ${c.full_name} (${c.email})
      </option>`).join('');

    const staffOpts = this.staff
      .map(s => `<option value="${s.staff_id}" ${d.staff_id === s.staff_id ? 'selected' : ''}>
        ${s.first_name} ${s.last_name}
      </option>`).join('');

    const statuses = ['active', 'completed', 'overdue', 'cancelled'];
    const fmtDT = val => val ? val.substring(0, 16) : '';

    return `
      <!-- Row 1: Car & Customer -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
          <label for="f_rental_car">Car <span style="color:red">*</span></label>
          <select id="f_rental_car">
            <option value="">— Select Car —</option>
            ${carOpts}
          </select>
        </div>
        <div class="form-group">
          <label for="f_rental_cust">Customer <span style="color:red">*</span></label>
          <select id="f_rental_cust">
            <option value="">— Select Customer —</option>
            ${custOpts}
          </select>
        </div>
      </div>

      <!-- Row 2: Status & Staff -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
          <label for="f_rental_status">Status</label>
          <select id="f_rental_status">
            ${statuses.map(s =>
              `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f_rental_staff">Handled By (Staff)</label>
          <select id="f_rental_staff">
            <option value="">— None —</option>
            ${staffOpts}
          </select>
        </div>
      </div>

      <!-- Row 3a: Rental Date & Due Date -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
          <label for="f_rental_date">Rental Date <span style="color:red">*</span></label>
          <input id="f_rental_date" type="datetime-local" value="${fmtDT(d.rental_date)}" />
        </div>
        <div class="form-group">
          <label for="f_due_date">Due Date <span style="color:red">*</span></label>
          <input id="f_due_date" type="datetime-local" value="${fmtDT(d.due_date)}" />
        </div>
      </div>

      <!-- Row 3b: Return Date & Duration Display -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
        <div class="form-group">
          <label for="f_return_date">
            Return Date
            <span style="color:#94a3b8;font-size:0.8rem;">(optional)</span>
          </label>
          <input id="f_return_date" type="datetime-local" value="${fmtDT(d.return_date)}" />
        </div>

        <!-- ✅ NEW: Duration display field -->
        <div class="form-group">
          <label for="f_duration_display">
            <i class="fas fa-clock" style="color:#6366f1;margin-right:4px;"></i>
            Total Duration
          </label>
          <input
            id="f_duration_display"
            type="text"
            readonly
            placeholder="Set rental & due date first"
            value="${this.formatDuration(d.rental_date, d.due_date)}"
            style="background:#1e293b;color:#6366f1;font-weight:600;
                   cursor:default;border:1px solid #334155;" />
        </div>
      </div>

      <!-- Row 4: Amounts -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:0.25rem;">
        <div class="form-group">
          <label for="f_daily_rate">Base Daily Rate ($) <span style="color:red">*</span></label>
          <input id="f_daily_rate" type="number" step="0.01" min="0"
            placeholder="e.g. 49.99"
            value="${d.daily_rate != null ? d.daily_rate : ''}" />
        </div>
        <div class="form-group">
          <label for="f_discount_amount">Discount Amount ($)</label>
          <input id="f_discount_amount" type="number" step="0.01" min="0"
            placeholder="e.g. 10.00"
            value="${d.discount_amount != null ? d.discount_amount : ''}" />
        </div>
        <div class="form-group">
          <label for="f_rental_amount">Total Amount ($)</label>
          <input id="f_rental_amount" type="number" step="0.01" min="0"
            placeholder="Auto-calculated"
            value="${d.total_amount != null ? d.total_amount : ''}"
            readonly
            style="background:#1e293b;color:#10b981;font-weight:700;
                   cursor:default;border:1px solid #334155;" />
        </div>
      </div>

      <!-- Calculation hint -->
      <div id="calc_hint"
           style="text-align:right;font-size:0.8rem;color:#64748b;
                  margin-bottom:1rem;min-height:1.2rem;font-style:italic;">
      </div>

      <!-- Row 5: Notes -->
      <div class="form-group">
        <label for="f_rental_notes">Notes</label>
        <textarea id="f_rental_notes" rows="3"
          placeholder="Optional notes...">${d.notes || ''}</textarea>
      </div>`;
  },

  // ── SETUP CALCULATION (called after modal opens) ──
  setupCalculation() {
    const elRentalDate = document.getElementById('f_rental_date');
    const elDueDate    = document.getElementById('f_due_date');
    const elDailyRate  = document.getElementById('f_daily_rate');
    const elDiscount   = document.getElementById('f_discount_amount');
    const elTotal      = document.getElementById('f_rental_amount');
    const elDuration   = document.getElementById('f_duration_display'); // ✅ NEW

    function recalculate() {
      const rentalDateVal = elRentalDate?.value;
      const dueDateVal    = elDueDate?.value;
      const dailyRate     = parseFloat(elDailyRate?.value) || 0;
      const discount      = parseFloat(elDiscount?.value) || 0;

      // ✅ Update duration display
      if (elDuration) {
        if (rentalDateVal && dueDateVal) {
          const start    = new Date(rentalDateVal);
          const end      = new Date(dueDateVal);
          const diffMs   = end - start;

          if (diffMs > 0) {
            const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
            const days       = Math.floor(totalHours / 24);
            const hours      = totalHours % 24;

            if (days > 0 && hours > 0)
              elDuration.value = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
            else if (days > 0)
              elDuration.value = `${days} day${days !== 1 ? 's' : ''}`;
            else
              elDuration.value = `${hours} hour${hours !== 1 ? 's' : ''}`;
          } else {
            elDuration.value = '';
            elDuration.placeholder = '⚠ Due date must be after rental date';
          }
        } else {
          elDuration.value = '';
          elDuration.placeholder = 'Set rental & due date first';
        }
      }

      // ✅ Calculate total amount: days (ceiling) × daily_rate − discount
      if (rentalDateVal && dueDateVal) {
        const start  = new Date(rentalDateVal);
        const end    = new Date(dueDateVal);
        const diffMs = end - start;

        if (diffMs <= 0) {
          elTotal.value       = '';
          elTotal.style.color = '#ef4444';
          elTotal.placeholder = '⚠ Due date must be after rental date';
          const hint = document.getElementById('calc_hint');
          if (hint) hint.textContent = '';
          return;
        }

        // Ceiling: partial day = full day for billing
        const dayCount = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const subtotal = dailyRate * dayCount;
        const total    = Math.max(0, subtotal - discount);

        elTotal.value       = total.toFixed(2);
        elTotal.style.color = '#10b981';
        elTotal.placeholder = 'Auto-calculated';

        const hint = document.getElementById('calc_hint');
        if (hint) {
          hint.textContent =
            `${dayCount} day${dayCount !== 1 ? 's' : ''} × $${dailyRate.toFixed(2)} − $${discount.toFixed(2)} = $${total.toFixed(2)}`;
        }
      } else {
        elTotal.value       = '';
        elTotal.placeholder = 'Set rental & due date first';
        const hint = document.getElementById('calc_hint');
        if (hint) hint.textContent = '';
      }
    }

    // Attach listeners
    elRentalDate?.addEventListener('change', recalculate);
    elDueDate   ?.addEventListener('change', recalculate);
    elDailyRate ?.addEventListener('input',  recalculate);
    elDiscount  ?.addEventListener('input',  recalculate);

    // Run once immediately (for edit mode where values already exist)
    recalculate();
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const car_id          = document.getElementById('f_rental_car').value;
    const customer_id     = document.getElementById('f_rental_cust').value;
    const status          = document.getElementById('f_rental_status').value;
    const rental_date     = document.getElementById('f_rental_date').value;
    const due_date        = document.getElementById('f_due_date').value;
    const return_date     = document.getElementById('f_return_date').value;
    const total_amount    = document.getElementById('f_rental_amount').value;
    const daily_rate      = document.getElementById('f_daily_rate').value;
    const discount_amount = document.getElementById('f_discount_amount').value;
    const staff_id        = document.getElementById('f_rental_staff').value;
    const notes           = document.getElementById('f_rental_notes').value.trim();

    if (!car_id)      { showToast('Please select a car ⚠️', 'error');      return null; }
    if (!customer_id) { showToast('Please select a customer ⚠️', 'error'); return null; }
    if (!rental_date) { showToast('Rental date is required ⚠️', 'error');  return null; }
    if (!due_date)    { showToast('Due date is required ⚠️', 'error');     return null; }
    if (due_date < rental_date) {
      showToast('Due date must be after rental date ⚠️', 'error');
      return null;
    }
    if (return_date && return_date < rental_date) {
      showToast('Return date cannot be before rental date ⚠️', 'error');
      return null;
    }

    return {
      car_id:          parseInt(car_id),
      customer_id:     parseInt(customer_id),
      status,
      rental_date,
      due_date,
      return_date:     return_date || null,
      total_amount:    total_amount    !== '' ? parseFloat(total_amount)    : null,
      daily_rate:      daily_rate      !== '' ? parseFloat(daily_rate)      : null,
      discount_amount: discount_amount !== '' ? parseFloat(discount_amount) : null,
      staff_id:        staff_id ? parseInt(staff_id) : null,
      notes:           notes || null,
      currency:        'USD',
    };
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      '➕ New Rental',
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/rentals/', data);
          showToast('Rental created ✅', 'success');
          closeModal();
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
    this.setupCalculation(); // ✅ wire up live calculation after modal renders
  },

  // ── OPEN EDIT ──
  openEdit(id) {
    const d = this.data.find(x => x.rental_id === id);
    if (!d) { showToast('Rental not found ⚠️', 'error'); return; }
    openModal(
      '✏️ Edit Rental',
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.put(`/rentals/${id}`, data);
          showToast('Rental updated ✅', 'success');
          closeModal();
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
    this.setupCalculation(); // ✅ wire up live calculation after modal renders
  },

  // ── DELETE ──
  delete(id) {
    confirmDelete(
      `Delete rental #${id}? Associated payments may also be affected.`,
      async () => {
        try {
          await api.delete(`/rentals/${id}`);
          showToast('Rental deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};