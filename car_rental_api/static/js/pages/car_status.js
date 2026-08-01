const car_status = {
  data: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Car Statuses...
      </div>`;

    try {
      this.data = await api.get('/car-status/');
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
    content.innerHTML = `

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-traffic-light"></i> Car Statuses</h2>
        <button class="btn btn-primary" onclick="car_status.openCreate()">
          <i class="fas fa-plus"></i> Add Status
        </button>
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">

        <!-- Search Bar -->
        <div class="search-bar">
          <input
            type="text"
            id="statusSearch"
            placeholder="🔍 Search statuses..."
          />
        </div>

        <!-- Table -->
        <div id="statusTable">
          ${buildTable(
            [
              { key: 'status_id',   label: 'ID' },
              { key: 'status_name', label: 'Status Name' },
              {
                key: 'description',
                label: 'Description',
                render: row =>
                  row.description
                    ? `<span title="${row.description}">
                         ${row.description.length > 50
                           ? row.description.substring(0, 50) + '…'
                           : row.description}
                       </span>`
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'is_available',
                label: 'Available',
                render: row =>
                  row.is_available
                    ? '<span class="badge badge-success">✔ Yes</span>'
                    : '<span class="badge badge-danger">✘ No</span>'
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit"
                onclick="car_status.openEdit(${row.status_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete"
                onclick="car_status.delete(${row.status_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>

      </div>`;

    setupSearch('statusSearch', 'statusTable');
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    return `
      <!-- Status Name -->
      <div class="form-group">
        <label for="f_status_name">
          Status Name <span style="color:red">*</span>
        </label>
        <input
          id="f_status_name"
          type="text"
          placeholder="e.g. Available, Rented, Maintenance"
          value="${d.status_name || ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_status_desc">Description</label>
        <textarea
          id="f_status_desc"
          rows="3"
          placeholder="Brief description of this status..."
        >${d.description || ''}</textarea>
      </div>

      <!-- Is Available -->
      <div class="form-group">
        <label for="f_is_available">Marks Car as Available?</label>
        <select id="f_is_available">
          <option value="true"  ${d.is_available === true  ? 'selected' : ''}>✔ Yes</option>
          <option value="false" ${d.is_available === false ? 'selected' : ''}>✘ No</option>
        </select>
      </div>`;
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const status_name  = document.getElementById('f_status_name').value.trim();
    const description  = document.getElementById('f_status_desc').value.trim();
    const is_available = document.getElementById('f_is_available').value === 'true';

    if (!status_name) {
      showToast('Status name is required ⚠️', 'error');
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
      '➕ Add Car Status',
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/car-status/', data);
          showToast('Status created ✅', 'success');
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
    if (!d) { showToast('Status not found ⚠️', 'error'); return; }

    openModal(
      '✏️ Edit Car Status',
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.put(`/car-status/${id}`, data);
          showToast('Status updated ✅', 'success');
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
    const d    = this.data.find(x => x.status_id === id);
    const name = d ? `"${d.status_name}"` : `#${id}`;

    confirmDelete(
      `Delete status ${name}? This may affect cars using this status.`,
      async () => {
        try {
          await api.delete(`/car-status/${id}`);
          showToast('Status deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};