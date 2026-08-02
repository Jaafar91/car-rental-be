const cars = {
  data: [], categories: [], statuses: [], branches: [],

  async load() {
    document.getElementById('pageContent').innerHTML =
      `<div class="loading"><div class="spinner"></div> Loading...</div>`;
    try {
      [this.data, this.categories, this.statuses, this.branches] = await Promise.all([
        api.get('/cars/'),
        api.get('/car-categories/'),
        api.get('/car-status/'),
        api.get('/branches/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-car-side"></i> Cars</h2>
        <button class="btn btn-primary" onclick="cars.openCreate()">
          <i class="fas fa-plus"></i> Add Car
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="carSearch" placeholder="🔍 Search cars..."/>
        </div>
        <div id="carTable">
          ${buildTable([
            { key: 'car_id',       label: 'ID' },
            { key: 'make',         label: 'Make' },
            { key: 'model',        label: 'Model' },
            { key: 'year',         label: 'Year' },
            { key: 'license_plate',label: 'Plate' },
            { key: 'daily_rate',   label: 'Rate/Day', render: r => `$${this.categories.find(c => c.category_id === r.category_id)?.daily_rate}` },
            { key: 'status_id',    label: 'Status', render: r => {
              const s = this.statuses.find(x => x.status_id === r.status_id);
              return statusBadge(s?.status_name || r.status_id);
            }},
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" onclick="cars.openEdit(${row.car_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="cars.delete(${row.car_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`;
    setupSearch('carSearch', 'carTable');
  },

  formHTML(d = {}) {
    const catOpts = this.categories.map(c =>
      `<option value="${c.category_id}" ${d.category_id === c.category_id ? 'selected' : ''}>${c.category_name}</option>`).join('');
    const stOpts = this.statuses.map(s =>
      `<option value="${s.status_id}" ${d.status_id === s.status_id ? 'selected' : ''}>${s.status_name}</option>`).join('');
    const brOpts = this.branches.map(b =>
      `<option value="${b.branch_id}" ${d.branch_id === b.branch_id ? 'selected' : ''}>${b.branch_name}</option>`).join('');

    return `
      <div class="form-row">
        <div class="form-group"><label>Make *</label><input id="f_make" value="${d.make || ''}"/></div>
        <div class="form-group"><label>Model *</label><input id="f_model" value="${d.model || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Year</label><input id="f_year" type="number" value="${d.year || ''}"/></div>
        <div class="form-group"><label>Color</label><input id="f_color" value="${d.color || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>License Plate *</label><input id="f_license_plate" value="${d.license_plate || ''}"/></div>
        <div class="form-group"><label>VIN *</label><input id="f_vin" value="${d.vin || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Category</label><select id="f_category_id"><option value="">--</option>${catOpts}</select></div>
        <div class="form-group"><label>Status</label><select id="f_status_id"><option value="">--</option>${stOpts}</select></div>
      </div>
      <div class="form-group"><label>Branch</label><select id="f_branch_id"><option value="">--</option>${brOpts}</select></div>`;
  },

  getFormData() {
    return {
      make:          document.getElementById('f_make').value,
      model:         document.getElementById('f_model').value,
      year:          parseInt(document.getElementById('f_year').value) || null,
      color:         document.getElementById('f_color').value,
      license_plate: document.getElementById('f_license_plate').value,
      vin:           document.getElementById('f_vin').value,
      daily_rate:    parseFloat(document.getElementById('f_daily_rate').value) || null,
      mileage:       parseInt(document.getElementById('f_mileage').value) || null,
      category_id:   parseInt(document.getElementById('f_category_id').value) || null,
      status_id:     parseInt(document.getElementById('f_status_id').value) || null,
      branch_id:     parseInt(document.getElementById('f_branch_id').value) || null,
    };
  },

  openCreate() {
    openModal('➕ Add Car', this.formHTML(), async () => {
      try {
        await api.post('/cars/', this.getFormData());
        showToast('Car created ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.car_id === id);
    openModal('✏️ Edit Car', this.formHTML(d), async () => {
      try {
        await api.put(`/cars/${id}`, this.getFormData());
        showToast('Car updated ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete('Delete this car?', async () => {
      try {
        await api.delete(`/cars/${id}`);
        showToast('Car deleted 🗑️', 'info');
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};