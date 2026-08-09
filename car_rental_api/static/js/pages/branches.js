const branches = {
  data: [],

  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`<div class="loading"><div class="spinner"></div> {{loading}}</div>`);
    try {
      this.data = await api.get('/branches/');
      this.data.sort((a, b) => a.branch_id - b.branch_id);
      this.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-code-branch"></i> {{nav_branches}}</h2>
        <button class="btn btn-primary" onclick="branches.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_branch}}
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="branchSearch" placeholder="{{ph_search_branches}}"/>
        </div>
        <div id="branchTable">
          ${buildTable(
            [
              { key: 'branch_id',   label: t('col_id') },
              { key: 'branch_name', label: t('label_branch_name') },
              { key: 'address',     label: t('label_address') },
              { key: 'city',        label: t('label_city') },
              { key: 'phone',       label: t('label_phone') },
              { key: 'email',       label: t('label_email') },
            ],
            this.data,
            row => `
              <button class="btn btn-warning btn-sm" onclick="branches.openEdit(${row.branch_id})" title="${t('btn_edit')}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm" onclick="branches.delete(${row.branch_id})" title="${t('btn_delete')}">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`);
    setupSearch('branchSearch', 'branchTable');
    translateDOM(content);
  },

  formHTML(d = {}) {
    return translateTemplate(`
      <div class="form-group">
        <label data-i18n="label_branch_name">Branch Name *</label>
        <input id="f_branch_name" value="${d.branch_name || ''}" data-i18n-placeholder="ph_branch_name" placeholder="Main Branch"/>
      </div>
      <div class="form-group">
        <label data-i18n="label_address">Address</label>
        <input id="f_address" value="${d.address || ''}" data-i18n-placeholder="ph_address" placeholder="123 Main St"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label data-i18n="label_city">City</label>
          <input id="f_city" value="${d.city || ''}" data-i18n-placeholder="ph_city" placeholder="Cairo"/>
        </div>
        <div class="form-group">
          <label data-i18n="label_state">State</label>
          <input id="f_state" value="${d.state || ''}" data-i18n-placeholder="ph_state" placeholder="Cairo"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label data-i18n="label_phone">Phone</label>
          <input id="f_phone" value="${d.phone || ''}" data-i18n-placeholder="ph_phone" placeholder="+20..."/>
        </div>
        <div class="form-group">
          <label data-i18n="label_email">Email</label>
          <input id="f_email" value="${d.email || ''}" data-i18n-placeholder="ph_email" placeholder="branch@example.com"/>
        </div>
      </div>`);
  },

  getFormData() {
    return {
      branch_name: document.getElementById('f_branch_name').value,
      address:     document.getElementById('f_address').value,
      city:        document.getElementById('f_city').value,
      state:       document.getElementById('f_state').value,
      phone:       document.getElementById('f_phone').value,
      email:       document.getElementById('f_email').value,
    };
  },

  openCreate() {
    openModal(t('modal_add_branch'), this.formHTML(), async () => {
      try {
        await api.post('/branches/', this.getFormData());
        showToast(t('toast_branch_created'), 'success');
        closeModal();
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.branch_id === id);
    openModal(t('modal_edit_branch'), this.formHTML(d), async () => {
      try {
        const updated = await api.put(`/branches/${id}`, this.getFormData());
        const idx = this.data.findIndex(x => x.branch_id === id);
        if (idx >= 0) {
          this.data[idx] = { ...this.data[idx], ...updated };
        }
        showToast(t('toast_branch_updated'), 'success');
        closeModal();
        this.render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete(t('confirm_delete_branch'), async () => {
      try {
        await api.delete(`/branches/${id}`);
        showToast(t('toast_branch_deleted'), 'info');
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};