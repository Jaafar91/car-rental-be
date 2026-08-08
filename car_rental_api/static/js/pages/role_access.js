const role_access = {
  data: {},

  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading}}
      </div>`);

    try {
      const payload = await api.get('/role-permissions/');
      this.data = payload;
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

  render() {
    const content = document.getElementById('pageContent');
    const roles = this.data.roles || [];
    const modules = this.data.modules || [];
    const permissions = this.data.permissions || {};

    const roleTabs = roles.map(role => `
      <button class="btn btn-secondary btn-sm" onclick="role_access.selectRole('${role}')" style="margin-right:0.5rem;">
        ${role.charAt(0).toUpperCase() + role.slice(1)}
      </button>
    `).join('');

    const rows = modules.map(module => `
      <tr>
        <td><strong>${module.label}</strong></td>
        ${roles.map(role => {
          const allowed = (permissions[role] || []).includes(module.key);
          return `<td><input type="checkbox" data-role="${role}" data-module="${module.key}" ${allowed ? 'checked' : ''} /></td>`;
        }).join('')}
      </tr>
    `).join('');

    content.innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-user-shield"></i> Role Access</h2>
        <button class="btn btn-primary" onclick="role_access.save()">Save Permissions</button>
      </div>

      <div class="table-wrapper" style="padding:1rem;">
        <p style="margin-bottom:1rem;">Assign modules that each role can view in the dashboard.</p>
        <div style="margin-bottom:1rem;">${roleTabs}</div>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              ${roles.map(role => `<th>${role.charAt(0).toUpperCase() + role.slice(1)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `);
  },

  selectRole(role) {
    const current = document.querySelectorAll('input[type="checkbox"]');
    current.forEach(box => {
      if (box.dataset.role === role) box.checked = true;
    });
  },

  async save() {
    const rows = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const roles = this.data.roles || [];
    const grouped = {};

    roles.forEach(role => {
      grouped[role] = [];
    });

    rows.forEach(box => {
      const role = box.dataset.role;
      if (!grouped[role]) grouped[role] = [];
      if (box.checked) grouped[role].push(box.dataset.module);
    });

    try {
      for (const role of roles) {
        await api.post('/role-permissions/', { role, modules: grouped[role] || [] });
      }
      showToast('Permissions saved', 'success');
      await refreshModuleAccess();
      this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
