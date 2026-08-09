const customers = {
  data: [],

  // ─────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_customers}}
      </div>`);

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

    content.innerHTML = translateTemplate(`

      <!-- ── Page Header ── -->
      <div class="page-header">
        <h2><i class="fas fa-users"></i> {{nav_customers}}</h2>
        <button class="btn btn-primary" onclick="customers.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_customer}}
        </button>
      </div>

      <!-- ── Stats Row ── -->
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-users',              t('stat_total_customers'), total,        '#6366f1')}
        ${this._statCard('fas fa-id-card',            t('stat_valid_licenses'),
            total - expired - expiringSoon, '#10b981')}
        ${this._statCard('fas fa-exclamation-triangle',t('stat_expiring_soon'),  expiringSoon, '#f59e0b')}
        ${this._statCard('fas fa-times-circle',       t('stat_expired'),         expired,      '#ef4444')}
      </div>

      <!-- ── Table Wrapper ── -->
      <div class="table-wrapper">

        <!-- Search -->
        <div class="search-bar">
          <input
            type="text"
            id="customerSearch"
            placeholder="{{ph_search_customers}}"
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
                label: t('col_customer'),
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
                label: t('col_email'),
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
                label: t('col_phone'),
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
                label: t('col_license_no'),
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
                label: t('col_license_expiry'),
                render: row => this._licenceBadge(row.license_exp)
              },

              // Member Since
              {
                key: 'created_at',
                label: t('col_member_since'),
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
                title="${t('btn_edit')}"
                onclick="customers.openEdit(${row.customer_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="${t('btn_delete')}"
                onclick="customers.delete(${row.customer_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`);

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
          {{label_full_name}} <span style="color:red">*</span>
        </label>
        <input
          id="f_cust_name"
          type="text"
          placeholder="{{ph_full_name}}"
          maxlength="160"
          value="${d.full_name || ''}"
        />
        <small style="color:#64748b;">{{hint_max_chars}}</small>
      </div>

      <!-- Email & Phone -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <div class="form-group">
          <label for="f_cust_email">{{label_email}}</label>
          <input
            id="f_cust_email"
            type="email"
            placeholder="{{ph_email}}"
            maxlength="255"
            value="${d.email || ''}"
          />
        </div>

        <div class="form-group">
          <label for="f_cust_phone">${t('label_phone')}</label>
          <input
            id="f_cust_phone"
            type="tel"
            placeholder="${t('ph_phone')}"
            maxlength="30"
            value="${d.phone || ''}"
          />
        </div>

      </div>

      <!-- License Number & Expiry -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <div class="form-group">
          <label for="f_cust_license_no">${t('label_driver_license')}</label>
          <input
            id="f_cust_license_no"
            type="text"
            placeholder="${t('ph_driver_license')}"
            maxlength="60"
            value="${d.license_no || ''}"
          />
        </div>

        <div class="form-group">
          <label for="f_cust_license_exp">${t('label_license_expiry_date')}</label>
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
                ? t('hint_license_expired')
                : t('hint_license_valid')}
            </small>` : ''}
        </div>

      </div>

      <div class="form-group">
        <label for="f_cust_identity_document">Identity Document (PDF)</label>
        <input id="f_cust_identity_document" type="file" accept="application/pdf" />
        ${d.identity_document_path ? `
          <small style="color:#10b981;display:block;margin-top:.35rem;">
            Uploaded: <a href="/customers/${d.customer_id}/document" target="_blank" style="color:#818cf8;">Open PDF</a>
          </small>` : ''}
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
      showToast(t('error_full_name_required'), 'error');
      return null;
    }
    if (full_name.length > 160) {
      showToast(t('error_full_name_length'), 'error');
      return null;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast(t('error_invalid_email'), 'error');
      return null;
    }
    if (license_no && !license_exp) {
      showToast(t('error_license_expiry_required'), 'error');
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
      t('modal_add_customer'),
      this.formHTML(),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          const fileInput = document.getElementById('f_cust_identity_document');
          const file = fileInput?.files?.[0] || null;
          if (file) {
            const formData = new FormData();
            formData.append('full_name', data.full_name);
            formData.append('email', data.email || '');
            formData.append('phone', data.phone || '');
            formData.append('license_no', data.license_no || '');
            formData.append('license_exp', data.license_exp || '');
            formData.append('file', file);

            const res = await fetch('/customers/with-document', {
              method: 'POST',
              headers: authState?.token ? { Authorization: `Bearer ${authState.token}` } : {},
              body: formData,
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ detail: res.statusText }));
              throw new Error(err.detail || 'Upload failed');
            }
          } else {
            await api.post('/customers/', data);
          }
          showToast(t('toast_customer_created'), 'success');
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
    if (!d) { showToast(t('error_customer_not_found'), 'error'); return; }

    openModal(
      t('modal_edit_customer'),
      this.formHTML(d),
      async () => {
        const data = this.getFormData();
        if (!data) return;
        try {
          const fileInput = document.getElementById('f_cust_identity_document');
          const file = fileInput?.files?.[0] || null;

          if (file) {
            const formData = new FormData();
            formData.append('full_name', data.full_name);
            formData.append('email', data.email || '');
            formData.append('phone', data.phone || '');
            formData.append('license_no', data.license_no || '');
            formData.append('license_exp', data.license_exp || '');
            formData.append('file', file);

            const res = await fetch(`/customers/${id}/document`, {
              method: 'PUT',
              headers: authState?.token ? { Authorization: `Bearer ${authState.token}` } : {},
              body: formData,
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({ detail: res.statusText }));
              throw new Error(err.detail || 'Upload failed');
            }
          } else {
            await api.put(`/customers/${id}`, data);
          }
          showToast(t('toast_customer_updated'), 'success');
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
      t('confirm_delete_customer', { name }),
      async () => {
        try {
          await api.delete(`/customers/${id}`);
          showToast(t('toast_customer_deleted'), 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};