const reservations = {
  data: [], customers: [], cars: [],

  async load() {
    document.getElementById('pageContent').innerHTML =
      `<div class="loading"><div class="spinner"></div> Loading...</div>`;
    try {
      [this.data, this.customers, this.cars] = await Promise.all([
        api.get('/reservations/'),
        api.get('/customers/'),
        api.get('/cars/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-calendar-check"></i> Reservations</h2>
        <button class="btn btn-primary" onclick="reservations.openCreate()">
          <i class="fas fa-plus"></i> Add Reservation
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="resSearch" placeholder="🔍 Search..."/>
        </div>
        <div id="resTable">
          ${buildTable([
            { key: 'reservation_id', label: 'ID' },
            { key: 'customer_id',    label: 'Customer', render: r => {
              const c = this.customers.find(x => x.customer_id === r.customer_id);
              return c ? `${c.first_name} ${c.last_name}` : r.customer_id;
            }},
            { key: 'car_id', label: 'Car', render: r => {
              const c = this.cars.find(x => x.car_id === r.car_id);
              return c ? `${c.make} ${c.model}` : r.car_id;
            }},
            { key: 'start_date',  label: 'Start' },
            { key: 'end_date',    label: 'End' },
            { key: 'status',      label: 'Status', render: r => statusBadge(r.status) },
            { key: 'total_amount',label: 'Total',  render: r => `$${r.total_amount || 0}` },
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" onclick="reservations.openEdit(${row.reservation_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="reservations.delete(${row.reservation_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`;
    setupSearch('resSearch', 'resTable');
  },

  formHTML(d = {}) {
    const custOpts = this.customers.map(c =>
      `<option value="${c.customer_id}" ${d.customer_id === c.customer_id ? 'selected' : ''}>
        ${c.first_name} ${c.last_name}
      </option>`).join('');
    const carOpts = this.cars.map(c =>
      `<option value="${c.car_id}" ${d.car_id === c.car_id ? 'selected' : ''}>
        ${c.make} ${c.model} (${c.license_plate})
      </option>`).join('');

    return `
      <div class="form-group"><label>Customer *</label>
        <select id="f_customer_id"><option value="">-- Select --</option>${custOpts}</select>
      </div>
      <div class="form-group"><label>Car *</label>
        <select id="f_car_id"><option value="">-- Select --</option>${carOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Date *</label>
          <input id="f_start_date" type="date" value="${d.start_date || ''}"/>
        </div>
        <div class="form-group"><label>End Date *</label>
          <input id="f_end_date" type="date" value="${d.end_date || ''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Status</label>
          <select id="f_status">
            ${['pending','confirmed','cancelled','completed'].map(s =>
              `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Total Amount</label>
          <input id="f_total_amount" type="number" step="0.01" value="${d.total_amount || ''}"/>
        </div>
      </div>
      <div class="form-group"><label>Notes</label>
        <textarea id="f_notes" rows="2">${d.notes || ''}</textarea>
      </div>`;
  },

  getFormData() {
    return {
      customer_id:   parseInt(document.getElementById('f_customer_id').value),
      car_id:        parseInt(document.getElementById('f_car_id').value),
      start_date:    document.getElementById('f_start_date').value,
      end_date:      document.getElementById('f_end_date').value,
      status:        document.getElementById('f_status').value,
      total_amount:  parseFloat(document.getElementById('f_total_amount').value) || null,
      notes:         document.getElementById('f_notes').value,
    };
  },

  openCreate() {
    openModal('➕ Add Reservation', this.formHTML(), async () => {
      try {
        await api.post('/reservations/', this.getFormData());
        showToast('Reservation created ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.reservation_id === id);
    openModal('✏️ Edit Reservation', this.formHTML(d), async () => {
      try {
        await api.put(`/reservations/${id}`, this.getFormData());
        showToast('Reservation updated ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete('Delete this reservation?', async () => {
      try {
        await api.delete(`/reservations/${id}`);
        showToast('Deleted 🗑️', 'info'); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};