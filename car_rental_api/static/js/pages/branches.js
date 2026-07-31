const branches = {
  data: [],

  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `<div class="loading"><div class="spinner"></div> Loading...</div>`;
    try {
      this.data = await api.get('/branches/');
      this.render();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-code-branch"></i> Branches</h2>
        <button class="btn btn-primary" onclick="branches.openCreate()">
          <i class="fas fa-plus"></i> Add Branch
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="branchSearch" placeholder="🔍 Search branches..."/>
        </div>
        <div id="branchTable">
          ${buildTable(
            [
              { key: 'branch_id',   label: 'ID' },
              { key: 'branch_name', label: 'Name' },
              { key: 'address',     label: 'Address' },
              { key: 'city',        label: 'City' },
              { key: 'phone',       label: 'Phone' },
              { key: 'email',       label: 'Email' },
            ],
            this.data,
            row => `
              <button class="btn btn-warning btn-sm" onclick="branches.openEdit(${row.branch_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-sm" onclick="branches.delete(${row.branch_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`;
    setupSearch('branchSearch', 'branchTable');
  },

  formHTML(d = {}) {
    return `
      <div class="form-group">
        <label>Branch Name *</label>
        <input id="f_branch_name" value="${d.branch_name || ''}" placeholder="Main Branch"/>
      </div>
      <div class="form-group">
        <label>Address</label>
        <input id="f_address" value="${d.address || ''}" placeholder="123 Main St"/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>City</label>
          <input id="f_city" value="${d.city || ''}" placeholder="Cairo"/>
        </div>
        <div class="form-group">
          <label>State</label>
          <input id="f_state" value="${d.state || ''}" placeholder="Cairo"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone</label>
          <input id="f_phone" value="${d.phone || ''}" placeholder="+20..."/>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input id="f_email" value="${d.email || ''}" placeholder="branch@example.com"/>
        </div>
      </div>`;
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
    openModal('➕ Add Branch', this.formHTML(), async () => {
      try {
        await api.post('/branches/', this.getFormData());
        showToast('Branch created ✅', 'success');
        closeModal();
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.branch_id === id);
    openModal('✏️ Edit Branch', this.formHTML(d), async () => {
      try {
        await api.put(`/branches/${id}`, this.getFormData());
        showToast('Branch updated ✅', 'success');
        closeModal();
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete('Delete this branch?', async () => {
      try {
        await api.delete(`/branches/${id}`);
        showToast('Branch deleted 🗑️', 'info');
        this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};