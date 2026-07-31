const car_categories = {
  data: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Car Categories...
      </div>`;

    try {
      this.data = await api.get('/car-categories/');
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
        <h2><i class="fas fa-tags"></i> Car Categories</h2>
        <button class="btn btn-primary" onclick="car_categories.openCreate()">
          <i class="fas fa-plus"></i> Add Category
        </button>
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">

        <!-- Search Bar -->
        <div class="search-bar">
          <input
            type="text"
            id="catSearch"
            placeholder="🔍 Search categories..."
          />
        </div>

        <!-- Table -->
        <div id="catTable">
          ${buildTable(
            [
              {
                key:   'category_id',
                label: 'ID'
              },
              {
                key:   'category_name',
                label: 'Category Name'
              },
              {
                key:   'description',
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
                key:   'daily_rate',
                label: 'Base Daily Rate',
                render: row =>
                  row.daily_rate != null
                    ? `<strong>$${parseFloat(row.daily_rate).toFixed(2)}</strong>`
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key:   'created_at',
                label: 'Created At',
                render: row =>
                  row.created_at
                    ? new Date(row.created_at).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit"
                onclick="car_categories.openEdit(${row.category_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete"
                onclick="car_categories.delete(${row.category_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>

      </div>`;

    // Activate live search
    setupSearch('catSearch', 'catTable');
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    return `
      <!-- Category Name -->
      <div class="form-group">
        <label for="f_category_name">
          Category Name <span style="color:red">*</span>
        </label>
        <input
          id="f_category_name"
          type="text"
          placeholder="e.g. Economy, SUV, Luxury"
          value="${d.category_name || ''}"
        />
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="f_description">Description</label>
        <textarea
          id="f_description"
          rows="3"
          placeholder="Brief description of this category..."
        >${d.description || ''}</textarea>
      </div>

      <!-- Daily Rate -->
      <div class="form-group">
        <label for="f_daily_rate">Base Daily Rate ($)</label>
        <input
          id="f_daily_rate"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 49.99"
          value="${d.daily_rate != null ? d.daily_rate : ''}"
        />
      </div>`;
  },

  // ── COLLECT FORM DATA ──
  getFormData() {
    const category_name = document.getElementById('f_category_name').value.trim();
    const description   = document.getElementById('f_description').value.trim();
    const daily_rate    = document.getElementById('f_daily_rate').value;

    // Basic validation
    if (!category_name) {
      showToast('Category name is required ⚠️', 'error');
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
      '➕ Add Car Category',
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;           // validation failed

        try {
          await api.post('/car-categories/', data);
          showToast('Category created ✅', 'success');
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
      showToast('Category not found ⚠️', 'error');
      return;
    }

    openModal(
      '✏️ Edit Car Category',
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;           // validation failed

        try {
          await api.put(`/car-categories/${id}`, data);
          showToast('Category updated ✅', 'success');
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
    const name = d ? `"${d.category_name}"` : `#${id}`;

    confirmDelete(
      `Are you sure you want to delete category ${name}?\nThis may affect cars assigned to this category.`,
      async () => {
        try {
          await api.delete(`/car-categories/${id}`);
          showToast('Category deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};