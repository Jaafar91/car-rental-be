const cars = {
  data: [], categories: [], statuses: [], branches: [],

  async load() {
    document.getElementById('pageContent').innerHTML = translateTemplate(
      `<div class="loading"><div class="spinner"></div> {{loading_cars}}</div>`
    );
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
    document.getElementById('pageContent').innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-car-side"></i> {{nav_cars}}</h2>
        <button class="btn btn-primary" onclick="cars.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_car}}
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="carSearch" placeholder="{{ph_search_cars}}"/>
        </div>
        <div id="carTable">
          ${buildTable([
            { key: 'car_id',        label: t('col_id') },
            { key: 'make',          label: t('col_make') },
            { key: 'model',         label: t('col_model') },
            { key: 'year',          label: t('col_year') },
            { key: 'license_plate', label: t('col_license_plate') },
            { key: 'daily_rate',    label: t('col_rate_per_day'), render: r => `$${this.categories.find(c => c.category_id === r.category_id)?.daily_rate}` },
            { key: 'status_id',     label: t('col_status'), render: r => {
              const s = this.statuses.find(x => x.status_id === r.status_id);
              return statusBadge(s?.status_name || r.status_id);
            }},
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="cars.openEdit(${row.car_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="cars.delete(${row.car_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`);
    setupSearch('carSearch', 'carTable');
  },

  formHTML(d = {}) {
    const catOpts = this.categories.map(c =>
      `<option value="${c.category_id}" ${d.category_id === c.category_id ? 'selected' : ''}>${c.category_name}</option>`).join('');
    const stOpts = this.statuses.map(s =>
      `<option value="${s.status_id}" ${d.status_id === s.status_id ? 'selected' : ''}>${s.status_name}</option>`).join('');
    const brOpts = this.branches.map(b =>
      `<option value="${b.branch_id}" ${d.branch_id === b.branch_id ? 'selected' : ''}>${b.branch_name}</option>`).join('');

    return translateTemplate(`
      <div class="form-row">
        <div class="form-group"><label>{{label_make}} <span style="color:red">*</span></label><input id="f_make" placeholder="{{ph_make}}" value="${d.make || ''}"/></div>
        <div class="form-group"><label>{{label_model}} <span style="color:red">*</span></label><input id="f_model" placeholder="{{ph_model}}" value="${d.model || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_year}}</label><input id="f_year" type="number" placeholder="{{ph_year}}" value="${d.year || ''}"/></div>
        <div class="form-group"><label>{{label_color}}</label><input id="f_color" placeholder="{{ph_color}}" value="${d.color || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_license_plate}} <span style="color:red">*</span></label><input id="f_license_plate" placeholder="{{ph_license_plate}}" value="${d.license_plate || ''}"/></div>
        <div class="form-group"><label>{{label_vin}} <span style="color:red">*</span></label><input id="f_vin" placeholder="{{ph_vin}}" value="${d.vin || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_category}}</label><select id="f_category_id"><option value="">{{placeholder_select}}</option>${catOpts}</select></div>
        <div class="form-group"><label>{{label_status}}</label><select id="f_status_id"><option value="">{{placeholder_select}}</option>${stOpts}</select></div>
      </div>
      <div class="form-group"><label>{{label_branch}}</label><select id="f_branch_id"><option value="">{{placeholder_select}}</option>${brOpts}</select></div>`);
  },

  getFormData() {
    return {
      make:          document.getElementById('f_make').value,
      model:         document.getElementById('f_model').value,
      year:          parseInt(document.getElementById('f_year').value) || null,
      color:         document.getElementById('f_color').value,
      license_plate: document.getElementById('f_license_plate').value,
      vin:           document.getElementById('f_vin').value,
      //daily_rate:    parseFloat(document.getElementById('f_daily_rate').value) || null,
      //mileage:       parseInt(document.getElementById('f_mileage').value) || null,
      category_id:   parseInt(document.getElementById('f_category_id').value) || null,
      status_id:     parseInt(document.getElementById('f_status_id').value) || null,
      branch_id:     parseInt(document.getElementById('f_branch_id').value) || null,
    };
  },

  openCreate() {
    openModal(t('modal_add_car'), this.formHTML(), async () => {
      try {
        await api.post('/cars/', this.getFormData());
        showToast(t('toast_car_created'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.car_id === id);
    openModal(t('modal_edit_car'), this.formHTML(d), async () => {
      try {
        await api.put(`/cars/${id}`, this.getFormData());
        showToast(t('toast_car_updated'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete(t('confirm_delete_car'), async () => {
      try {
        await api.delete(`/cars/${id}`);
        showToast(t('toast_car_deleted'), 'info');
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};