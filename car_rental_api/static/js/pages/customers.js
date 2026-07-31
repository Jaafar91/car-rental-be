const customers = {
  data: [],

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Customers...
      </div>`;

    try {
      this.data = await api.get('/customers/');
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

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /** Initials avatar from full_name */
  _avatar(full_name) {
    const parts    = (full_name || '?').trim().split(' ');
    const initials = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].substring(0, 2);
    return initials.toUpperCase();
  },

  /** License expiry badge — red if expired, yellow if within 30 days */
  _licenseBadge(exp) {
    if (!exp) return '<span style="color:#94a3b8">—</span>';

    const expDate  = new Date(exp);
    const today    = new Date();
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    const formatted = expDate.toLocaleDateString();

    if (diffDays < 0)
      return `<span class="badge badge-danger" title="Expired">
                <i class="fas fa-times-circle"></i> ${formatted}
              </span>`;

    if (diffDays <= 30)
      return `<span class="badge badge-warning" title="Expires soon">
                <i class="fas fa-exclamation-triangle"></i> ${formatted}
              </span>`;

    return `<span class="badge badge-success" title="Valid">
              <i class="fas fa-check-circle"></i> ${formatted}
            </span>`;
  },

  /** Stats counts */
  _counts() {
    const today = new Date();
    const expired = this.data.filter(c => {
      if (!c.license_exp) return false;
      return new Date(c.license_exp) < today;
    }).length;

    const expiringSoon = this.data.filter(c => {
      if (!c.license_exp) return false;
      const diff = Math.ceil(
        (new Date(c.license_exp) - today) / (1000 * 60 * 60 * 24)
      );
      return diff >= 0 && diff <= 30;
    }).length;

    return { total: this.data.length, expired, expiringSoon };
  },

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  render() {
    const content = document.getElementById('pageContent');
    const { total, expired, expiringSoon } = this._counts();

    content.innerHTML = `

      <!-- ── Page Header ── -->
      <div class="page-header">
        <h2><i class="fas fa-users"></i> Customers</h2>
        <button class="btn btn-primary" onclick="customers.openCreate()">
          <i class="fas fa-plus"></i> Add Customer
        </button>
      </div>

      <!-- ── Stats Row ── -->
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-users',              'Total Customers', total,        '#6366f1')}
        ${this._statCard('fas fa-id-card',            'Valid Licenses',
            total - expired - expiringSoon, '#10b981')}
        ${this._statCard('fas fa-exclamation-triangle','Expiring Soon',  expiringSoon, '#f59e0b')}
        ${this._statCard('fas fa-times-circle',       'Expired',         expired,      '#ef4444')}
      </div>

      <!-- ── Table Wrapper ── -->
      <div class="table-wrapper">

        <!-- Search -->
        <div class="search-bar">
          <input
            type="text"
            id="customerSearch"
            placeholder="🔍 Search by name, email, phone or license..."
          />
        </div>

        <!-- Table -->
        <div id="customerTable">
          ${buildTable(
            [
              // ID
              { key: 'customer_id', label: 'ID' },

              // Full Name with avatar
              {
                key: 'full_name',
                label: 'Customer',
                render: row => `
                  <div style="display:flex;align-items:center;gap:.7rem;">
                    <div style="
                      width:36px;height:36px;border-radius:50%;flex-shrink:0;
                      background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;color:#fff;font-size:.82rem;letter-spacing:.5px;">
                      ${this._avatar(row.full_name)}
                    </div>
                    <span style="font-weight:600;">${row.full_name}</span>
                  </div>`
              },

              // Email
              {
                key: 'email',
                label: 'Email',
                render: row =>
                  row.email
                    ? `<a href="mailto:${row.email}"
                           style="color:#818cf8;text-decoration:none;">
                         ${row.email}
                       </a>`
                    : '<span style="color:#94a3b8">—</span>'
              },

              // Phone
              {
                key: 'phone',
                label: 'Phone',
                render: row =>
                  row.phone
                    ? `<a href="tel:${row.phone}"
                           style="color:#94a3b8;text-decoration:none;">
                         <i class="fas fa-phone" style="font-size:.75rem;margin-right:.3rem;"></i>
                         ${row.phone}
                       </a>`
                    : '<span style="color:#94a3b8">—</span>'
              },

              // License Number
              {
                key: 'license_no',
                label: 'License No.',
                render: row =>
                  row.license_no
                    ? `<code style="
                          background:#0f172a;padding:.2rem .5rem;
                          border-radius:6px;font-size:.82rem;color:#e2e8f0;">
                         ${row.license_no}
                       </code>`
                    : '<span style="color:#94a3b8">—</span>'
              },

              // License Expiry with color badge
              {
                key: 'license_exp',
                label: 'License Expiry',
                render: row => this._licenceBadge(row.license_exp)
              },

              // Member Since
              {
                key: 'created_at',
                label: 'Member Since',
                render: row =>
                  row.created_at
                    ? new Date(row.created_at).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
            ],

            this.data,

            // Actions
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit customer"
                onclick="customers.openEdit(${row.customer_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete customer"
                onclick="customers.delete(${row.customer_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`;

    setupSearch('customerSearch', 'customerTable');
  },

  // ─────────────────────────────────────────────
  // STAT CARD
  // ─────────────────────────────────────────────
  _statCard(icon, label, value, color) {
    return `
      <div style="
        background:#1e293b;border-radius:12px;padding:1rem 1.5rem;
        flex:1;min-width:140px;border-left:4px solid ${color};">
        <div style="color:${color};font-size:1.4rem;margin-bottom:.3rem;">
          <i class="${icon}"></i>
        </div>
        <div style="font-size:1.8rem;font-weight:700;color:#f1f5f9;">${value}</div>
        <div style="color:#94a3b8;font-size:.85rem;">${label}</div>
      </div>`;
  },

  // ─────────────────────────────────────────────
  // LICENSE BADGE (internal alias fix)
  // ─────────────────────────────────────────────
  _licenceBadge(exp) {
    return this._licenseBadge(exp);
  },

  // ─────────────────────────────────────────────
  // FORM HTML
  // ─────────────────────────────────────────────
  formHTML(d = {}) {
    return `

      <!-- Full Name -->
      <div class="form-group">
        <label for="f_cust_name">
          Full Name <span style="color:red">*</span>
        </label>
        <input
          id="f_cust_name"
          type="text"
          placeholder="e.g. Jane Smith"
          maxlength="160"
          value="${d.full_name || ''}"
        />
        <small style="color:#64748b;">Max 160 characters</small>
      </div>

      <!-- Email & Phone -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <div class="form-group">
          <label for="f_cust_email">Email</label>
          <input
            id="f_cust_email"
            type="email"
            placeholder="jane@example.com"
            maxlength="255"
            value="${d.email || ''}"
          />
        </div>

        <div class="form-group">
          <label for="f_cust_phone">Phone</label>
          <input
            id="f_cust_phone"
            type="tel"
            placeholder="+1 555 000 0000"
            maxlength="30"
            value="${d.phone || ''}"
          />
        </div>

      </div>

      <!-- License Number & Expiry -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <div class="form-group">
          <label for="f_cust_license_no">Driver's License No.</label>
          <input
            id="f_cust_license_no"
            type="text"
            placeholder="e.g. DL-1234567"
            maxlength="60"
            value="${d.license_no || ''}"
          />
        </div>

        <div class="form-group">
          <label for="f_cust_license_exp">License Expiry Date</label>
          <input
            id="f_cust_license_exp"
            type="date"
            value="${d.license_exp ? d.license_exp.substring(0, 10) : ''}"
          />
          ${d.license_exp ? `
            <small style="color:${
              new Date(d.license_exp) < new Date() ? '#ef4444' : '#10b981'
            };">
              ${new Date(d.license_exp) < new Date()
                ? '⚠️ This license has expired'
                : '✔ License is valid'}
            </small>` : ''}
        </div>

      </div>`;
  },

  // ─────────────────────────────────────────────
  // COLLECT FORM DATA
  // ─────────────────────────────────────────────
  getFormData() {
    const full_name   = document.getElementById('f_cust_name').value.trim();
    const email       = document.getElementById('f_cust_email').value.trim();
    const phone       = document.getElementById('f_cust_phone').value.trim();
    const license_no  = document.getElementById('f_cust_license_no').value.trim();
    const license_exp = document.getElementById('f_cust_license_exp').value;

    // ── Validation ──
    if (!full_name) {
      showToast('Full name is required ⚠️', 'error');
      return null;
    }
    if (full_name.length > 160) {
      showToast('Full name must be 160 characters or less ⚠️', 'error');
      return null;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email address ⚠️', 'error');
      return null;
    }
    if (license_no && !license_exp) {
      showToast('Please provide the license expiry date ⚠️', 'error');
      return null;
    }

    return {
      full_name,
      email:       email       || null,
      phone:       phone       || null,
      license_no:  license_no  || null,
      license_exp: license_exp || null,
    };
  },

  // ─────────────────────────────────────────────
  // OPEN CREATE
  // ─────────────────────────────────────────────
  openCreate() {
    openModal(
      '➕ Add Customer',
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.post('/customers/', data);
          showToast('Customer created ✅', 'success');
          closeModal();
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  },

  // ─────────────────────────────────────────────
  // OPEN EDIT
  // ─────────────────────────────────────────────
  openEdit(id) {
    const d = this.data.find(x => x.customer_id === id);
    if (!d) { showToast('Customer not found ⚠️', 'error'); return; }

    openModal(
      '✏️ Edit Customer',
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          await api.put(`/customers/${id}`, data);
          showToast('Customer updated ✅', 'success');
          closeModal();
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  },

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────
  delete(id) {
    const d    = this.data.find(x => x.customer_id === id);
    const name = d ? `"${d.full_name}"` : `#${id}`;

    confirmDelete(
      `Delete customer ${name}?
       This may also affect their reservations and rental history.`,
      async () => {
        try {
          await api.delete(`/customers/${id}`);
          showToast('Customer deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};