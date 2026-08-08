const car_categories = {
  data: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_car_categories}}
      </div>`);

    try {
      this.data = await api.get('/car-categories/');
      this.render();
    } catch (e) {
      content.innerHTML = translateTemplate(`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{error_loading_categories}}</p>
        </div>`);
      const errorParagraph = document.querySelector('#pageContent p');
      if (errorParagraph) errorParagraph.textContent = e.message;
      showToast(e.message, 'error');
    }
  },

  // ── RENDER TABLE ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-tags"></i> {{nav_car_categories}}</h2>
        <button class="btn btn-primary" onclick="car_categories.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_category}}
        </button>
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">

        <!-- Search Bar -->
        <div class="search-bar">
          <input
            type="text"
            id="catSearch"
            placeholder="{{ph_search_categories}}"
          />
        </div>

        <!-- Table -->
        <div id="catTable">
          ${buildTable(
            [
              { key: 'category_id', label: t('col_id') },
              { key: 'category_name', label: t('col_category_name') },
              {
                key: 'description',
                label: t('col_description'),
                render: row =>
                  row.description
                    ? `<span title="${row.description}">${row.description.length > 50 ? row.description.substring(0, 50) + '…' : row.description}</span>`
                    : `<span style="color:#94a3b8">${t('placeholder_empty')}</span>`
              },
              {
                key: 'daily_rate',
                label: t('col_daily_rate'),
                render: row =>
                  row.daily_rate != null
                    ? `<strong>${formatCurrency(row.daily_rate)}</strong>`
                    : `<span style="color:#94a3b8">${t('placeholder_empty')}</span>`
              },
            ],
            this.data,
            row => `
              <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="car_categories.openEdit(${row.category_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="car_categories.delete(${row.category_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>

      </div>`);

    // Activate live search
    setupSearch('catSearch', 'catTable');
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    const dailyRateLabel = t('label_daily_rate').replace('{currency}', currentCurrency || 'USD');

    return translateTemplate(`
      <!-- Category Name -->
      <div class="form-group">
        <label for="f_category_name">{{label_category_name}} <span style="color:red">*</span></label>
        <input
          id="f_category_name"
          type="text"
          placeholder="{{ph_category_name}}"
          value="${d.category_name || ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_description">{{label_description}}</label>
        <textarea
          id="f_description"
          rows="3"
          placeholder="{{ph_category_description}}"
        >${d.description || ''}</textarea>
      </div>

      <!-- Daily Rate -->
      <div class="form-group">
        <label for="f_daily_rate">${dailyRateLabel}</label>
        <input
          id="f_daily_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder="{{ph_daily_rate}}"
          value="${d.daily_rate != null ? d.daily_rate : ''}"
        />
      </div>`);
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const category_name = document.getElementById('f_category_name').value.trim();
    const description   = document.getElementById('f_description').value.trim();
    const daily_rate    = document.getElementById('f_daily_rate').value;

    if (!category_name) {
      showToast(t('error_category_name_required'), 'error');
      return null;
    }

    return {
      category_name,
      description:  description || null,
      daily_rate:   daily_rate !== '' ? parseFloat(daily_rate) : null,
    };
  },

  // ── OPEN CREATE MODAL ──
  openCreate() {
    openModal(
      t('modal_add_category'),
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;

        try {
          await api.post('/car-categories/', data);
          showToast(t('toast_category_created'), 'success');
          closeModal();
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  },

  // ── OPEN EDIT MODAL ──
  openEdit(id) {
    const d = this.data.find(x => x.category_id === id);
    if (!d) {
      showToast(t('error_category_not_found'), 'error');
      return;
    }

    openModal(
      t('modal_edit_category'),
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;

        try {
          await api.put(`/car-categories/${id}`, data);
          showToast(t('toast_category_updated'), 'success');
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
    const d = this.data.find(x => x.category_id === id);
    const name = d ? `${d.category_name}` : `#${id}`;

    confirmDelete(
      t('confirm_delete_category', { name }),
      async () => {
        try {
          await api.delete(`/car-categories/${id}`);
          showToast(t('toast_category_deleted'), 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};