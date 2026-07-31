const maintenance = {
  data: [],
  cars: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Maintenance Records...
      </div>`;

    try {
      [this.data, this.cars] = await Promise.all([
        api.get('/maintenance/'),
        api.get('/cars/'),
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
  carLabel(car_id) {
    const c = this.cars.find(x => x.car_id === car_id);
    return c ? `${c.make} ${c.model} (${c.license_plate})` : `Car #${car_id}`;
  },

  statusBadge(status) {
    const map = {
      scheduled:  'badge-info',
      in_progress:'badge-warning',
      completed:  'badge-success',
      cancelled:  'badge-danger',
    };
    return `<span class="badge ${map[status] || 'badge-secondary'}">
              ${status || '—'}
            </span>`;
  },

  // ── RENDER TABLE ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-tools"></i> Maintenance</h2>
        <button class="btn btn-primary" onclick="maintenance.openCreate()">
          <i class="fas fa-plus"></i> Add Record
        </button>
      </div>

      <!-- Stats Row -->
      <div class="stats-row" style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-calendar-check','Scheduled',
            this.data.filter(x=>x.status==='scheduled').length,'#3b82f6')}
        ${this._statCard('fas fa-spinner','In Progress',
            this.data.filter(x=>x.status==='in_progress').length,'#f59e0b')}
        ${this._statCard('fas fa-check-circle','Completed',
            this.data.filter(x=>x.status==='completed').length,'#10b981')}
        ${this._statCard('fas fa-times-circle','Cancelled',
            this.data.filter(x=>x.status==='cancelled').length,'#ef4444')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="maintSearch" placeholder="🔍 Search maintenance records..." />
        </div>

        <div id="maintTable">
          ${buildTable(
            [
              { key: 'maintenance_id', label: 'ID' },
              {
                key: 'car_id',
                label: 'Car',
                render: row => this.carLabel(row.car_id)
              },
              { key: 'maintenance_type', label: 'Type' },
              {
                key: 'status',
                label: 'Status',
                render: row => this.statusBadge(row.status)
              },
              {
                key: 'scheduled_date',
                label: 'Scheduled',
                render: row =>
                  row.scheduled_date
                    ? new Date(row.scheduled_date).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'completion_date',
                label: 'Completed',
                render: row =>
                  row.completion_date
                    ? new Date(row.completion_date).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'cost',
                label: 'Cost',
                render: row =>
                  row.cost != null
                    ? `<strong>$${parseFloat(row.cost).toFixed(2)}</strong>`
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'description',
                label: 'Notes',
                render: row =>
                  row.description
                    ? `<span title="${row.description}">
                         ${row.description.length > 40
                           ? row.description.substring(0, 40) + '…'
                           : row.description}
                       </span>`
                    : '<span style="color:#94a3b8">—</span>'
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit"
                onclick="maintenance.openEdit(${row.maintenance_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete"
                onclick="maintenance.delete(${row.maintenance_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`;

    setupSearch('maintSearch', 'maintTable');
  },

  // ── STAT CARD HELPER ──
  _statCard(icon, label, count, color) {
    return `
      <div style="background:#1e293b;border-radius:12px;padding:1rem 1.5rem;
                  flex:1;min-width:140px;border-left:4px solid ${color};">
        <div style="color:${color};font-size:1.5rem;margin-bottom:.3rem;">
          <i class="${icon}"></i>
        </div>
        <div style="font-size:1.8rem;font-weight:700;color:#f1f5f9;">${count}</div>
        <div style="color:#94a3b8;font-size:.85rem;">${label}</div>
      </div>`;
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    const carOptions = this.cars
      .map(c => `<option value="${c.car_id}"
                   ${d.car_id === c.car_id ? 'selected' : ''}>
                   ${c.make} ${c.model} — ${c.license_plate}
                 </option>`)
      .join('');

    const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];

    return `
      <!-- Car -->
      <div class="form-group">
        <label for="f_maint_car">Car <span style="color:red">*</span></label>
        <select id="f_maint_car">
          <option value="">— Select a car —</option>
          ${carOptions}
        </select>
      </div>

      <!-- Type -->
      <div class="form-group">
        <label for="f_maint_type">Maintenance Type <span style="color:red">*</span></label>
        <input
          id="f_maint_type"
          type="text"
          placeholder="e.g. Oil Change, Tire Rotation, Brake Repair"
          value="${d.maintenance_type || ''}"
        />
      </div>

      <!-- Status -->
      <div class="form-group">
        <label for="f_maint_status">Status <span style="color:red">*</span></label>
        <select id="f_maint_status">
          ${statuses.map(s =>
            `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </div>

      <!-- Dates Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_maint_sched">Scheduled Date</label>
          <input
            id="f_maint_sched"
            type="date"
            value="${d.scheduled_date ? d.scheduled_date.substring(0,10) : ''}"
          />
        </div>
        <div class="form-group">
          <label for="f_maint_comp">Completion Date</label>
          <input
            id="f_maint_comp"
            type="date"
            value="${d.completion_date ? d.completion_date.substring(0,10) : ''}"
          />
        </div>
      </div>

      <!-- Cost -->
      <div class="form-group">
        <label for="f_maint_cost">Cost ($)</label>
        <input
          id="f_maint_cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 150.00"
          value="${d.cost != null ? d.cost : ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_maint_desc">Notes / Description</label>
        <textarea
          id="f_maint_desc"
          rows="3"
          placeholder="Additional notes about this maintenance..."
        >${d.description || ''}</textarea>
      </div>`;
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const car_id           = document.getElementById('f_maint_car').value;
    const maintenance_type = document.getElementById('f_maint_type').value.trim();
    const status           = document.getElementById('f_maint_status').value;
    const scheduled_date   = document.getElementById('f_maint_sched').value;
    const completion_date  = document.getElementById('f_maint_comp').value;
    const cost             = document.getElementById('f_maint_cost').value;
    const description      = document.getElementById('f_maint_desc').value.trim();

    if (!car_id) {
      showToast('Please select a car ⚠️', 'error'); return null;
    }
    if (!maintenance_type) {
      showToast('Maintenance type is required ⚠️', 'error'); return null;
    }

    return {
      car_id:           parseInt(car_id),
      maintenance_type,
      status,
      scheduled_date:   scheduled_date  || null,
      completion_date:  completion_date || null,
      cost:             cost !== ''     ? parseFloat(cost) : null,
      description:      description     || null,
    };
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      '➕ Add Maintenance Record',
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/maintenance/', data);
          showToast('Maintenance record created ✅', 'success');
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
    const d = this.data.find(x => x.maintenance_id === id);
    if (!d) { showToast('Record not found ⚠️', 'error'); return; }

    openModal(
      '✏️ Edit Maintenance Record',
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.put(`/maintenance/${id}`, data);
          showToast('Maintenance record updated ✅', 'success');
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
      `Delete maintenance record #${id}? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/maintenance/${id}`);
          showToast('Record deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};