const staff = {
  data: [],
  branches: [],

  // ── LOAD ──
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div> Loading Staff...
      </div>`;

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
    return b ? b.branch_name : `Branch #${id}`;
  },

  roleBadge(role) {
    const map = {
      admin:   'badge-danger',
      manager: 'badge-warning',
      agent:   'badge-info',
    };
    return `<span class="badge ${map[role] || 'badge-secondary'}">${role || '—'}</span>`;
  },

  // ── RENDER ──
  render() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `

      <!-- Page Header -->
      <div class="page-header">
        <h2><i class="fas fa-user-tie"></i> Staff</h2>
        <button class="btn btn-primary" onclick="staff.openCreate()">
          <i class="fas fa-plus"></i> Add Staff
        </button>
      </div>

      <!-- Stats Row -->
      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-users','Total Staff',this.data.length,'#6366f1')}
        ${this._statCard('fas fa-user-shield','Admins',
            this.data.filter(x=>x.role==='admin').length,'#ef4444')}
        ${this._statCard('fas fa-user-cog','Managers',
            this.data.filter(x=>x.role==='manager').length,'#f59e0b')}
        ${this._statCard('fas fa-user','Agents',
            this.data.filter(x=>x.role==='agent').length,'#3b82f6')}
      </div>

      <!-- Table Wrapper -->
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="staffSearch" placeholder="🔍 Search staff..." />
        </div>

        <div id="staffTable">
          ${buildTable(
            [
              { key: 'staff_id',   label: 'ID' },
              {
                key: 'full_name',
                label: 'Name',
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
                label: 'Role',
                render: row => this.roleBadge(row.role)
              },
              {
                key: 'branch_id',
                label: 'Branch',
                render: row =>
                  row.branch_id
                    ? this.branchLabel(row.branch_id)
                    : '<span style="color:#94a3b8">—</span>'
              },
              { key: 'phone', label: 'Phone',
                render: row => row.phone || '<span style="color:#94a3b8">—</span>' },
              {
                key: 'hire_date',
                label: 'Hire Date',
                render: row =>
                  row.hire_date
                    ? new Date(row.hire_date).toLocaleDateString()
                    : '<span style="color:#94a3b8">—</span>'
              },
              {
                key: 'is_active',
                label: 'Active',
                render: row =>
                  row.is_active
                    ? '<span class="badge badge-success">✔ Active</span>'
                    : '<span class="badge badge-danger">✘ Inactive</span>'
              },
            ],
            this.data,
            row => `
              <button
                class="btn btn-warning btn-sm"
                title="Edit"
                onclick="staff.openEdit(${row.staff_id})">
                <i class="fas fa-edit"></i>
              </button>
              <button
                class="btn btn-danger btn-sm"
                title="Delete"
                onclick="staff.delete(${row.staff_id})">
                <i class="fas fa-trash"></i>
              </button>`
          )}
        </div>
      </div>`;

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
          <label for="f_staff_first">First Name <span style="color:red">*</span></label>
          <input id="f_staff_first" type="text" placeholder="John"
            value="${d.first_name || ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_last">Last Name <span style="color:red">*</span></label>
          <input id="f_staff_last" type="text" placeholder="Doe"
            value="${d.last_name || ''}" />
        </div>
      </div>

      <!-- Email & Phone -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_email">Email <span style="color:red">*</span></label>
          <input id="f_staff_email" type="email" placeholder="john@example.com"
            value="${d.email || ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_phone">Phone</label>
          <input id="f_staff_phone" type="text" placeholder="+1 555 000 0000"
            value="${d.phone || ''}" />
        </div>
      </div>

      <!-- Role & Branch -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_role">Role <span style="color:red">*</span></label>
          <select id="f_staff_role">
            ${roles.map(r =>
              `<option value="${r}" ${d.role === r ? 'selected':''}>${r}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="f_staff_branch">Branch</label>
          <select id="f_staff_branch">
            <option value="">— None —</option>
            ${branchOpts}
          </select>
        </div>
      </div>

      <!-- Hire Date & Active -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label for="f_staff_hire">Hire Date</label>
          <input id="f_staff_hire" type="date"
            value="${d.hire_date ? d.hire_date.substring(0,10) : ''}" />
        </div>
        <div class="form-group">
          <label for="f_staff_active">Status</label>
          <select id="f_staff_active">
            <option value="true"  ${d.is_active !== false ? 'selected':''}>✔ Active</option>
            <option value="false" ${d.is_active === false  ? 'selected':''}>✘ Inactive</option>
          </select>
        </div>
      </div>

      <!-- Password (only for create) -->
      ${!d.staff_id ? `
        <div class="form-group">
          <label for="f_staff_pass">Password <span style="color:red">*</span></label>
          <input id="f_staff_pass" type="password" placeholder="Min. 8 characters" />
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

    if (!first_name) { showToast('First name is required ⚠️', 'error'); return null; }
    if (!last_name)  { showToast('Last name is required ⚠️',  'error'); return null; }
    if (!email)      { showToast('Email is required ⚠️',      'error'); return null; }

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
        showToast('Password must be at least 8 characters ⚠️', 'error');
        return null;
      }
      payload.password = password;
    }

    return payload;
  },

  // ── OPEN CREATE ──
  openCreate() {
    openModal(
      '➕ Add Staff Member',
      this.formHTML(),
      async () => {
        const data = this.getFormData(false);
        if (!data) return;
        try {
          await api.post('/staff/', data);
          showToast('Staff member created ✅', 'success');
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
    if (!d) { showToast('Staff not found ⚠️', 'error'); return; }

    openModal(
      '✏️ Edit Staff Member',
      this.formHTML(d),
      async () => {
        const data = this.getFormData(true);
        if (!data) return;
        try {
          await api.put(`/staff/${id}`, data);
          showToast('Staff updated ✅', 'success');
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
      `Delete staff member ${name}? This cannot be undone.`,
      async () => {
        try {
          await api.delete(`/staff/${id}`);
          showToast('Staff member deleted 🗑️', 'info');
          this.load();
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    );
  }
};