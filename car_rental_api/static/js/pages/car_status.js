const car_status = {
  data: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_car_statuses}}
      </div>`);

    try {
      this.data = await api.get('/car-status/');
      this.data.sort((a, b) => a.status_id - b.status_id);
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

  // ── RENDER TABLE ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-traffic-light"></i> {{nav_car_status}}</h2>
        <button class="btn btn-primary" onclick="car_status.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_status}}
        </button>
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">

        <!-- Search Bar -->
        <div class="search-bar">
          <input
            type="text"
            id="statusSearch"
            placeholder="{{ph_search_statuses}}"
          />
        </div>

        <!-- Table -->
        <div id="statusTable">
          ${buildTable(
            [
              { key: 'status_id', label: t('col_id') },
              { key: 'status_name', label: t('label_status_name') },
              {
                key: 'description',
                label: t('label_description'),
                render: row =>
                  row.description
                    ? `<span title="${row.description}">${row.description.length > 50 ? row.description.substring(0, 50) + '…' : row.description}</span>`
                    : `<span style="color:#94a3b8">${t('placeholder_empty')}</span>`
              },
            ],
            this.data,
            row => `
              <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="car_status.openEdit(${row.status_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="car_status.delete(${row.status_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>

      </div>`);

    setupSearch('statusSearch', 'statusTable');
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    return translateTemplate(`
      <!-- Status Name -->
      <div class="form-group">
        <label for="f_status_name">{{label_status_name}} <span style="color:red">*</span></label>
        <input
          id="f_status_name"
          type="text"
          placeholder="{{ph_status_name}}"
          value="${d.status_name || ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_status_desc">{{label_description}}</label>
        <textarea
          id="f_status_desc"
          rows="3"
          placeholder="{{ph_status_description}}"
        >${d.description || ''}</textarea>
      </div>

      <!-- Is Available -->
      <div class="form-group">
        <label for="f_is_available">{{label_is_available}}</label>
        <select id="f_is_available">
          <option value="true"  ${d.is_available === true  ? 'selected' : ''}>✔ ${t('option_yes')}</option>
          <option value="false" ${d.is_available === false ? 'selected' : ''}>✘ ${t('option_no')}</option>
        </select>
      </div>`);
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const status_name  = document.getElementById('f_status_name').value.trim();
    const description  = document.getElementById('f_status_desc').value.trim();
    const is_available = document.getElementById('f_is_available').value === 'true';

    if (!status_name) {
      showToast(t('error_status_name_required'), 'error');
      return null;
    }

    return {
      status_name,
      description:  description || null,
      is_available,
    };
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      t('modal_add_status'),
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/car-status/', data);
          showToast(t('toast_status_created'), 'success');
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
    const d = this.data.find(x => x.status_id === id);
    if (!d) { showToast(t('error_status_not_found'), 'error'); return; }

    openModal(
      t('modal_edit_status'),
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          const updated = await api.put(`/car-status/${id}`, data);
          const idx = this.data.findIndex(x => x.status_id === id);
          if (idx >= 0) {
            this.data[idx] = { ...this.data[idx], ...updated };
          }
          showToast(t('toast_status_updated'), 'success');
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
    const d    = this.data.find(x => x.status_id === id);
    const name = d ? `"${d.status_name}"` : `#${id}`;

    confirmDelete(
      t('confirm_delete_status', { name }),
      async () => {
        try {
          await api.delete(`/car-status/${id}`);
          showToast(t('toast_status_deleted'), 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};