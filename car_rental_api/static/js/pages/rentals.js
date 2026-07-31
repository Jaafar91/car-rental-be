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
    return c ? `${c.first_name} ${c.last_name}` : `Customer #${id}`;
  },

  staffLabel(id) {
    if (!id) return '<span style="color:#94a3b8">—</span>';
    const s = this.staff.find(x => x.staff_id === id);
    return s ? `${s.first_name} ${s.last_name}` : `Staff #${id}`;
  },

  statusBadge(status) {
    const map = {
      active:    'badge-success',
      completed: 'badge-info',
      overdue:   'badge-danger',
      cancelled: 'badge-secondary',
    };
    return `<span class="badge ${map[status] || 'badge-secondary'}">${status || '—'}</span>`;
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
        ${this._statCard('fas fa-car','Total Rentals', this.data.length,'#6366f1')}
        ${this._statCard('fas fa-check-circle','Active',
            this.data.filter(x=>x.status==='active').length,'#10b981')}
        ${this._statCard('fas fa-exclamation-circle','Overdue',
            this.data.filter(x=>x.status==='overdue').length,'#ef4444')}
        ${this._statCard('fas fa-dollar-sign','Total Revenue',
            '$'+totalRevenue.toFixed(2),'#f59e0b')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="rentalSearch" placeholder="🔍 Search rentals..." />
        </div>

        <div id="rentalTable">
          ${buildTable(
            [
              { key: 'rental_id',  label: 'ID' },
              {
                key: 'car_id',
                label: 'Car',
                render: row => this.carLabel(row.car_id)
              },
              {
                key: 'customer_id',
                label: 'Customer',
                render: row => this.customerLabel(row.customer_id)
              },
              {
                key: 'status',
                label: 'Status',
                render: row => this.statusBadge(row.status)
              },
              {
                key: 'rental_date',
                label: 'Rental Date',
                render: row =>
                  row.rental_date
                    ? new Date(row.rental_date).toLocaleDateString()
                    : '—'
              },
              {
                key: 'due_date',
                label: 'Due Date',
                render: row =>
                  row.due_date
                    ? new Date(row.due_date).toLocaleDateString()
                    : '—'
              },
              {
                key: 'return_date',
                label: 'Returned',
                render: row =>
                  row.return_date
                    ? new Date(row.return_date).toLocaleDateString()
                    : '<span style="color:#94a3b8">Pending</span>'
              },
              {
                key: 'total_amount',
                label: 'Total ($)',
                render: row =>
                  row.total_amount != null
                    ? `<strong>$${parseFloat(row.total_amount).toFixed(2)}</strong>`
                    : '—'
              },
              {
                key: 'staff_id',
                label: 'Staff',
                render: row => this.staffLabel(row.staff_id)
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit"
                onclick="rentals.openEdit(${row.rental_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete"
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
      .map(c => `<option value="${c.car_id}" ${d.car_id === c.car_id ? 'selected':''}>
                   ${c.make} ${c.model} — ${c.license_plate}
                 </option>`).join('');

    const custOpts = this.customers
      .map(c => `<option value="${c.customer_id}" ${d.customer_id === c.customer_id ? 'selected':''}>
                   ${c.first_name} ${c.last_name} (${c.email})
                 </option>`).join('');

    const staffOpts = this.staff
      .map(s => `<option value="${s.staff_id}" ${d.staff_id === s.staff_id ? 'selected':''}>
                   ${s.first_name} ${s.last_name}
                 </option>`).join('');

    const statuses = ['active', 'completed', 'overdue', 'cancelled'];

    return `
      <!-- Car & Customer -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
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

      <!-- Status -->
      <div class="form-group">
        <label for="f_rental_status">Status</label>
        <select id="f_rental_status">
          ${statuses.map(s =>
            `<option value="${s}" ${d.status === s ? 'selected':''}>${s}</option>`
          ).join('')}
        </select>
      </div>

      <!-- Dates -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_rental_date">Rental Date <span style="color:red">*</span></label>
          <input id="f_rental_date" type="date"
            value="${d.rental_date ? d.rental_date.substring(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label for="f_due_date">Due Date <span style="color:red">*</span></label>
          <input id="f_due_date" type="date"
            value="${d.due_date ? d.due_date.substring(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label for="f_return_date">Return Date</label>
          <input id="f_return_date" type="date"
            value="${d.return_date ? d.return_date.substring(0,10) : ''}" />
        </div>
      </div>

      <!-- Amount & Staff -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_rental_amount">Total Amount ($)</label>
          <input id="f_rental_amount" type="number" step="0.01" min="0"
            placeholder="e.g. 250.00"
            value="${d.total_amount != null ? d.total_amount : ''}" />
        </div>
        <div class="form-group">
          <label for="f_rental_staff">Handled By (Staff)</label>
          <select id="f_rental_staff">
            <option value="">— None —</option>
            ${staffOpts}
          </select>
        </div>
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label for="f_rental_notes">Notes</label>
        <textarea id="f_rental_notes" rows="2"
          placeholder="Optional notes..."
        >${d.notes || ''}</textarea>
      </div>`;
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const car_id       = document.getElementById('f_rental_car').value;
    const customer_id  = document.getElementById('f_rental_cust').value;
    const status       = document.getElementById('f_rental_status').value;
    const rental_date  = document.getElementById('f_rental_date').value;
    const due_date     = document.getElementById('f_due_date').value;
    const return_date  = document.getElementById('f_return_date').value;
    const total_amount = document.getElementById('f_rental_amount').value;
    const staff_id     = document.getElementById('f_rental_staff').value;
    const notes        = document.getElementById('f_rental_notes').value.trim();

    if (!car_id)      { showToast('Please select a car ⚠️', 'error');      return null; }
    if (!customer_id) { showToast('Please select a customer ⚠️', 'error'); return null; }
    if (!rental_date) { showToast('Rental date is required ⚠️', 'error');  return null; }
    if (!due_date)    { showToast('Due date is required ⚠️', 'error');     return null; }

    return {
      car_id:       parseInt(car_id),
      customer_id:  parseInt(customer_id),
      status,
      rental_date,
      due_date,
      return_date:  return_date  || null,
      total_amount: total_amount !== '' ? parseFloat(total_amount) : null,
      staff_id:     staff_id     ? parseInt(staff_id) : null,
      notes:        notes        || null,
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