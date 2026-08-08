const staff = {
  data: [],
  branches: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_staff}}
      </div>`);

    try {
      [this.data, this.branches] = await Promise.all([
        api.get('/staff/'),
        api.get('/branches/'),
      ]);
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

  // ── HELPERS ──
  branchLabel(id) {
    const b = this.branches.find(x => x.branch_id === id);
    return b ? b.branch_name : `${t('col_branch')} #${id}`;
  },

  roleBadge(role) {
    const normalizedRole = (role || '').toLowerCase();
    const label = normalizedRole ? t(`role_${normalizedRole}`) : '—';
    const map = {
      admin:   'badge-danger',
      manager: 'badge-warning',
      agent:   'badge-info',
    };
    return `<span class="badge ${map[normalizedRole] || 'badge-secondary'}">${label}</span>`;
  },

  // ── RENDER ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-user-tie"></i> {{nav_staff}}</h2>
        <button class="btn btn-primary" onclick="staff.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_staff}}
        </button>
      </div>

      <!-- Stats Row -->
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-users', t('stat_total_staff'), this.data.length,'#6366f1')}
        ${this._statCard('fas fa-user-shield', t('stat_admins'),
            this.data.filter(x=>x.role==='admin').length,'#ef4444')}
        ${this._statCard('fas fa-user-cog', t('stat_managers'),
            this.data.filter(x=>x.role==='manager').length,'#f59e0b')}
        ${this._statCard('fas fa-user', t('stat_agents'),
            this.data.filter(x=>x.role==='agent').length,'#3b82f6')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="staffSearch" placeholder="{{ph_search_staff}}" />
        </div>

        <div id="staffTable">
          ${buildTable(
            [
              { key: 'staff_id',   label: t('col_id') },
              {
                key: 'full_name',
                label: t('col_name'),
                render: row =>
                  `<div style="display:flex;align-items:center;gap:.6rem;">
                     <div style="width:34px;height:34px;border-radius:50%;
                                 background:linear-gradient(135deg,#6366f1,#8b5cf6);
                                 display:flex;align-items:center;justify-content:center;
                                 font-weight:700;color:#fff;font-size:.85rem;flex-shrink:0;">
                       ${(row.first_name||'?')[0]}${(row.last_name||'?')[0]}
                     </div>
                     <div>
                       <div style="font-weight:600;">${row.first_name} ${row.last_name}</div>
                       <div style="color:#94a3b8;font-size:.8rem;">${row.email || ''}</div>
                     </div>
                   </div>`
              },
              {
                key: 'role',
                label: t('col_role'),
                render: row => this.roleBadge(row.role)
              },
              {
                key: 'branch_id',
                label: t('col_branch'),
                render: row =>
                  row.branch_id
                    ? this.branchLabel(row.branch_id)
                    : '<span style="color:#94a3b8">—</span>'
              },
              { key: 'phone', label: t('col_phone'),
                render: row => row.phone || '<span style="color:#94a3b8">—</span>' },
              {
                key: 'hire_date',
                label: t('col_hire_date'),
                render: row =>
                  row.hire_date
                    ? new Date(row.hire_date).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'is_active',
                label: t('col_active'),
                render: row =>
                  row.is_active
                    ? `<span class="badge badge-success">✔ ${t('status_active')}</span>`
                    : `<span class="badge badge-danger">✘ ${t('status_inactive')}</span>`
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="${t('btn_edit')}"
                onclick="staff.openEdit(${row.staff_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="${t('btn_delete')}"
                onclick="staff.delete(${row.staff_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`);

    setupSearch('staffSearch', 'staffTable');
  },

  // ── STAT CARD ──
  _statCard(icon, label, value, color) {
    return `
      <div style="background:#1e293b;border-radius:12px;padding:1rem 1.5rem;
                  flex:1;min-width:140px;border-left:4px solid ${color};">
        <div style="color:${color};font-size:1.5rem;margin-bottom:.3rem;">
          <i class="${icon}"></i>
        </div>
        <div style="font-size:1.8rem;font-weight:700;color:#f1f5f9;">${value}</div>
        <div style="color:#94a3b8;font-size:.85rem;">${label}</div>
      </div>`;
  },

  // ── FORM HTML ──
  formHTML(d = {}) {
    const branchOpts = this.branches
      .map(b => `<option value="${b.branch_id}"
                   ${d.branch_id === b.branch_id ? 'selected':''}>
                   ${b.branch_name}
                 </option>`).join('');

    const roles = ['admin', 'manager', 'agent'];

    return `
      <!-- Name Row -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_first">{{label_first_name}} <span style="color:red">*</span></label>
          <input id="f_staff_first" type="text" placeholder="{{ph_first_name}}"
            value="${d.first_name || ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_last">{{label_last_name}} <span style="color:red">*</span></label>
          <input id="f_staff_last" type="text" placeholder="{{ph_last_name}}"
            value="${d.last_name || ''}" />
        </div>
      </div>

      <!-- Email & Phone -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_email">{{label_email}} <span style="color:red">*</span></label>
          <input id="f_staff_email" type="email" placeholder="{{ph_email}}"
            value="${d.email || ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_phone">{{label_phone}}</label>
          <input id="f_staff_phone" type="text" placeholder="{{ph_phone}}"
            value="${d.phone || ''}" />
        </div>
      </div>

      <!-- Role & Branch -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_role">{{label_role}} <span style="color:red">*</span></label>
          <select id="f_staff_role">
            ${roles.map(r =>
              `<option value="${r}" ${d.role === r ? 'selected':''}>${t(`role_${r}`)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f_staff_branch">{{label_branch}}</label>
          <select id="f_staff_branch">
            <option value="">{{placeholder_none}}</option>
            ${branchOpts}
          </select>
        </div>
      </div>

      <!-- Hire Date & Active -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_hire">{{label_hire_date}}</label>
          <input id="f_staff_hire" type="date"
            value="${d.hire_date ? d.hire_date.substring(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_active">{{label_status}}</label>
          <select id="f_staff_active">
            <option value="true"  ${d.is_active !== false ? 'selected':''}>✔ ${t('status_active')}</option>
            <option value="false" ${d.is_active === false  ? 'selected':''}>✘ ${t('status_inactive')}</option>
          </select>
        </div>
      </div>

      <!-- Password (only for create) -->
      ${!d.staff_id ? `
        <div class="form-group">
          <label for="f_staff_pass">{{label_password}} <span style="color:red">*</span></label>
          <input id="f_staff_pass" type="password" placeholder="{{ph_password}}" />
        </div>` : ''}`;
  },

  // ── COLLECT FORM DATA ──
  getFormData(isEdit = false) {
    const first_name = document.getElementById('f_staff_first').value.trim();
    const last_name  = document.getElementById('f_staff_last').value.trim();
    const email      = document.getElementById('f_staff_email').value.trim();
    const phone      = document.getElementById('f_staff_phone').value.trim();
    const role       = document.getElementById('f_staff_role').value;
    const branch_id  = document.getElementById('f_staff_branch').value;
    const hire_date  = document.getElementById('f_staff_hire').value;
    const is_active  = document.getElementById('f_staff_active').value === 'true';

    if (!first_name) { showToast(t('error_first_name_required'), 'error'); return null; }
    if (!last_name)  { showToast(t('error_last_name_required'),  'error'); return null; }
    if (!email)      { showToast(t('error_email_required'),      'error'); return null; }

    const payload = {
      first_name,
      last_name,
      email,
      phone:     phone     || null,
      role,
      branch_id: branch_id ? parseInt(branch_id) : null,
      hire_date: hire_date || null,
      is_active,
    };

    // Password only on create
    if (!isEdit) {
      const password = document.getElementById('f_staff_pass').value;
      if (!password || password.length < 8) {
        showToast(t('error_password_length'), 'error');
        return null;
      }
      payload.password = password;
    }

    return payload;
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      t('modal_add_staff'),
      this.formHTML(),
      async () => {
        const data = this.getFormData(false);
        if (!data) return;
        try {
          await api.post('/staff/', data);
          showToast(t('toast_staff_created'), 'success');
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
    const d = this.data.find(x => x.staff_id === id);
    if (!d) { showToast(t('error_staff_not_found'), 'error'); return; }

    openModal(
      t('modal_edit_staff'),
      this.formHTML(d),
      async () => {
        const data = this.getFormData(true);
        if (!data) return;
        try {
          await api.put(`/staff/${id}`, data);
          showToast(t('toast_staff_updated'), 'success');
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
    const d    = this.data.find(x => x.staff_id === id);
    const name = d ? `"${d.first_name} ${d.last_name}"` : `#${id}`;

    confirmDelete(
      t('confirm_delete_staff', { name }),
      async () => {
        try {
          await api.delete(`/staff/${id}`);
          showToast(t('toast_staff_deleted'), 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};