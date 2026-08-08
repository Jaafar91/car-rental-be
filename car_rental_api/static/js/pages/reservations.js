const reservations = {
  data: [], customers: [], cars: [],

  async load() {
    document.getElementById('pageContent').innerHTML = translateTemplate(
      `<div class="loading"><div class="spinner"></div> {{loading}}</div>`
    );
    try {
      [this.data, this.customers, this.cars] = await Promise.all([
        api.get('/reservations/'),
        api.get('/customers/'),
        api.get('/cars/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  // ─── Helper: convert stored ISO string → datetime-local input value ─────────
  // datetime-local expects: "YYYY-MM-DDTHH:MM" (no seconds, no timezone)
  toInputValue(dt) {
    if (!dt) return '';
    // Handle both "2024-06-01T14:30:00Z" and "2024-06-01 14:30:00"
    const d = new Date(dt);
    if (isNaN(d)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  render() {
    document.getElementById('pageContent').innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-calendar-check"></i> {{nav_reservations}}</h2>
        <button class="btn btn-primary" onclick="reservations.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_reservation}}
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="resSearch" placeholder="{{ph_search_reservations}}"/>
        </div>
        <div id="resTable">
          ${buildTable([
            { key: 'reservation_id', label: t('col_id') },
            { key: 'customer_id',    label: t('col_customer'), render: r => {
              const c = this.customers.find(x => x.customer_id === r.customer_id);
              return c ? `${c.full_name}` : r.customer_id;
            }},
            { key: 'car_id', label: t('col_car'), render: r => {
              const c = this.cars.find(x => x.car_id === r.car_id);
              return c ? `${c.make} ${c.model}` : r.car_id;
            }},
            { key: 'pickup_at',  label: t('col_start') },
            { key: 'dropoff_at',    label: t('col_end') },
            { key: 'status',      label: t('col_status'), render: r => statusBadge(r.status) },
            { key: 'total_amount',label: t('col_total'),  render: r => formatCurrency(r.total_amount) },
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="reservations.openEdit(${row.reservation_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="reservations.delete(${row.reservation_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`);
    setupSearch('resSearch', 'resTable');
  },

  formHTML(d = {}) {
    const custOpts = this.customers.map(c =>
      `<option value="${c.customer_id}" ${d.customer_id === c.customer_id ? 'selected' : ''}>
        ${c.full_name}
      </option>`).join('');
    const carOpts = this.cars.map(c =>
      `<option value="${c.car_id}" ${d.car_id === c.car_id ? 'selected' : ''}>
        ${c.make} ${c.model} (${c.license_plate})
      </option>`).join('');

    return translateTemplate(`
      <div class="form-group"><label>{{label_customer}} <span style="color:red">*</span></label>
        <select id="f_customer_id">
          <option value="">{{placeholder_select_customer}}</option>${custOpts}
        </select>
      </div>
      <div class="form-group"><label>{{label_car}} <span style="color:red">*</span></label>
        <select id="f_car_id">
          <option value="">{{placeholder_select_car}}</option>${carOpts}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>📅 {{label_pickup_datetime}} <span style="color:red">*</span></label>
          <input id="f_pickup_at"
                 type="datetime-local"
                 value="${this.toInputValue(d.pickup_at)}"/>
        </div>
        <div class="form-group">
          <label>📅 {{label_dropoff_datetime}} <span style="color:red">*</span></label>
          <input id="f_dropoff_at"
                 type="datetime-local"
                 value="${this.toInputValue(d.dropoff_at)}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_status}}</label>
          <select id="f_status">
            ${['pending','confirmed','cancelled','completed'].map(s =>
              `<option value="${s}" ${d.status === s ? 'selected' : ''}>${t(`status_${s}`)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group"><label>{{label_total_amount}}</label>
          <input id="f_total_amount" type="number" step="0.01"
                 value="${d.total_amount || ''}"/>
        </div>
      </div>
      <div class="form-group"><label>{{label_notes}}</label>
        <textarea id="f_notes" rows="2">${d.notes || ''}</textarea>
      </div>`);
  },

  getFormData() {

    const pickup  = document.getElementById('f_pickup_at').value;
    const dropoff = document.getElementById('f_dropoff_at').value;

    return {
      customer_id:   parseInt(document.getElementById('f_customer_id').value),
      car_id:        parseInt(document.getElementById('f_car_id').value),
      pickup_at:    pickup  ? new Date(pickup).toISOString()  : null,  // ✅ Send ISO string
      dropoff_at:   dropoff ? new Date(dropoff).toISOString() : null,  // ✅ Send ISO string
      status:        document.getElementById('f_status').value,
      total_amount:  parseFloat(document.getElementById('f_total_amount').value) || null,
      notes:         document.getElementById('f_notes').value,
    };
  },

  openCreate() {
    openModal(t('modal_add_reservation'), this.formHTML(), async () => {
      try {
        await api.post('/reservations/', this.getFormData());
        showToast(t('toast_reservation_created'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.reservation_id === id);
    openModal(t('modal_edit_reservation'), this.formHTML(d), async () => {
      try {
        await api.put(`/reservations/${id}`, this.getFormData());
        showToast(t('toast_reservation_updated'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete(t('confirm_delete_reservation'), async () => {
      try {
        await api.delete(`/reservations/${id}`);
        showToast(t('toast_reservation_deleted'), 'info'); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};