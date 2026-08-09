const maintenance = {
  data: [],
  cars: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_maintenance}}
      </div>`);

    try {
      [this.data, this.cars] = await Promise.all([
        api.get('/maintenance/'),
        api.get('/cars/'),
      ]);
      this.data.sort((a, b) => a.maintenance_id - b.maintenance_id);
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
    return c ? `${c.make} ${c.model} (${c.license_plate})` : `${t('col_car')} #${car_id}`;
  },

  statusBadge(status) {
    const normalized = (status || '').toString().toLowerCase();
    const map = {
      scheduled:  'badge-info',
      in_progress:'badge-warning',
      completed:  'badge-success',
      cancelled:  'badge-danger',
    };
    const label = normalized ? t(`status_${normalized}`) : t('placeholder_empty');
    return `<span class="badge ${map[normalized] || 'badge-secondary'}">
              ${label}
            </span>`;
  },

  getStatus(row) {
    const status = (row?.status || '').toString().trim().toLowerCase();
    if (status) return status;
    if (row?.completed_at || row?.completed || row?.completion_at) return 'completed';
    if (row?.scheduled_at || row?.scheduled || row?.schedule_at) return 'scheduled';
    return 'scheduled';
  },

  formatDateValue(row, keys) {
    for (const key of keys) {
      const value = row?.[key];
      if (value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
      }
    }
    return '<span style="color:#94a3b8">—</span>';
  },

  // ── RENDER TABLE ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-tools"></i> {{nav_maintenance}}</h2>
        <button class="btn btn-primary" onclick="maintenance.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_maintenance}}
        </button>
      </div>

      <!-- Stats Row -->
      <div class="stats-row" style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-calendar-check', t('stat_scheduled'),
            this.data.filter(x=>x.status==='scheduled').length,'#3b82f6')}
        ${this._statCard('fas fa-spinner', t('stat_in_progress'),
            this.data.filter(x=>x.status==='in_progress').length,'#f59e0b')}
        ${this._statCard('fas fa-check-circle', t('stat_completed'),
            this.data.filter(x=>x.status==='completed').length,'#10b981')}
        ${this._statCard('fas fa-times-circle', t('stat_cancelled'),
            this.data.filter(x=>x.status==='cancelled').length,'#ef4444')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="maintSearch" placeholder="{{ph_search_maintenance}}" />
        </div>

        <div id="maintTable">
          ${buildTable(
            [
              { key: 'maintenance_id', label: t('col_id') },
              {
                key: 'car_id',
                label: t('col_car'),
                render: row => this.carLabel(row.car_id)
              },
              { key: 'maintenance_type', label: t('col_type') },
              {
                key: 'status',
                label: t('col_status'),
                render: row => this.statusBadge(this.getStatus(row))
              },
              {
                key: 'scheduled_at',
                label: t('col_scheduled'),
                render: row => this.formatDateValue(row, ['scheduled_at', 'scheduled', 'schedule_at'])
              },
              {
                key: 'completed_at',
                label: t('col_completed'),
                render: row => this.formatDateValue(row, ['completed_at', 'completed', 'completion_at'])
              },
              {
                key: 'cost_amount',
                label: t('col_cost'),
                render: row =>
                  row.cost_amount != null
                    ? `<strong>${formatCurrency(row.cost_amount)}</strong>`
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'description',
                label: t('col_notes'),
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
                title="${t('btn_edit')}"
                onclick="maintenance.openEdit(${row.maintenance_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="${t('btn_delete')}"
                onclick="maintenance.delete(${row.maintenance_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`);

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

  toInputValue(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  toApiDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
        <label for="f_maint_car">{{label_car}} <span style="color:red">*</span></label>
        <select id="f_maint_car">
          <option value="">{{placeholder_select_car}}</option>
          ${carOptions}
        </select>
      </div>

      <!-- Type -->
      <div class="form-group">
        <label for="f_maint_type">{{label_maintenance_type}} <span style="color:red">*</span></label>
        <input
          id="f_maint_type"
          type="text"
          placeholder="{{ph_maintenance_type}}"
          value="${d.maintenance_type || ''}"
        />
      </div>

      <!-- Status -->
      <div class="form-group">
        <label for="f_maint_status">{{label_status}} <span style="color:red">*</span></label>
        <select id="f_maint_status">
          ${statuses.map(s =>
            `<option value="${s}" ${d.status === s ? 'selected' : ''}>${t(`status_${s}`)}</option>`
          ).join('')}
        </select>
      </div>

      <!-- Dates Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_maint_sched">{{label_scheduled}}</label>
          <input
            id="f_maint_sched"
            type="date"
            value="${this.toInputValue(d.scheduled_at)}"
          />
        </div>
        <div class="form-group">
          <label for="f_maint_comp">{{label_completed}}</label>
          <input
            id="f_maint_comp"
            type="date"
            value="${this.toInputValue(d.completed_at)}"
          />
        </div>
      </div>

      <!-- Cost -->
      <div class="form-group">
        <label for="f_maint_cost">{{label_cost}}</label>
        <input
          id="f_maint_cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="{{ph_cost}}"
          value="${d.cost_amount != null ? d.cost_amount : ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_maint_desc">{{label_notes}}</label>
        <textarea
          id="f_maint_desc"
          rows="3"
          placeholder="{{ph_notes}}"
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
    const cost_amount       = document.getElementById('f_maint_cost').value;
    const description      = document.getElementById('f_maint_desc').value.trim();

    if (!car_id) {
      showToast(t('error_select_car'), 'error'); return null;
    }
    if (!maintenance_type) {
      showToast(t('error_maintenance_type_required'), 'error'); return null;
    }

    return {
      car_id:           parseInt(car_id),
      maintenance_type,
      status,
      scheduled_at:     this.toApiDateTime(scheduled_date),
      completed_at:     this.toApiDateTime(completion_date),
      cost_amount:      cost_amount !== ''     ? parseFloat(cost_amount) : null,
      description:      description     || null,
    };
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      t('modal_add_maintenance'),
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/maintenance/', data);
          showToast(t('toast_maintenance_created'), 'success');
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
    if (!d) { showToast(t('error_maintenance_not_found'), 'error'); return; }

    openModal(
      t('modal_edit_maintenance'),
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          const updated = await api.put(`/maintenance/${id}`, data);
          const idx = this.data.findIndex(x => x.maintenance_id === id);
          if (idx >= 0) {
            this.data[idx] = { ...this.data[idx], ...updated };
          }
          showToast(t('toast_maintenance_updated'), 'success');
          closeModal();
          this.render();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  },

  // ── DELETE ──
  delete(id) {
    confirmDelete(
      t('confirm_delete_maintenance', { id }),
      async () => {
        try {
          await api.delete(`/maintenance/${id}`);
          showToast(t('toast_maintenance_deleted'), 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};