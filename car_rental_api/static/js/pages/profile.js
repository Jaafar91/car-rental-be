const profile = {
  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_staff}}
      </div>`);

    try {
      const staff = await api.get('/staff/me');
      content.innerHTML = translateTemplate(`
        <div class="table-wrapper" style="padding:24px;max-width:720px;">
          <h2 style="margin-bottom:12px"><i class="fas fa-user-circle"></i> {{nav_profile}}</h2>
          <p style="margin-bottom:20px;color:#94a3b8;">${staff.first_name} ${staff.last_name} • ${staff.email || ''}</p>

          <div class="card" style="padding:20px;border-radius:14px;background:#111827;">
            <div class="form-group">
              <label for="profile_current_password">{{label_current_password}}</label>
              <input id="profile_current_password" type="password" placeholder="{{ph_current_password}}" />
            </div>
            <div class="form-group">
              <label for="profile_new_password">{{label_new_password}}</label>
              <input id="profile_new_password" type="password" placeholder="{{ph_new_password}}" />
            </div>
            <div class="form-group">
              <label for="profile_confirm_password">{{label_confirm_password}}</label>
              <input id="profile_confirm_password" type="password" placeholder="{{ph_confirm_password}}" />
            </div>
            <button class="btn btn-primary" onclick="profile.changePassword()">{{btn_change_password}}</button>
          </div>
        </div>`);
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${e.message}</p></div>`;
    }
  },

  async changePassword() {
    const currentPassword = document.getElementById('profile_current_password').value;
    const newPassword = document.getElementById('profile_new_password').value;
    const confirmPassword = document.getElementById('profile_confirm_password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast(t('error_password_length'), 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast(t('error_password_length'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('error_passwords_do_not_match'), 'error');
      return;
    }

    try {
      await api.post('/staff/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      showToast(t('toast_password_updated'), 'success');
      document.getElementById('profile_current_password').value = '';
      document.getElementById('profile_new_password').value = '';
      document.getElementById('profile_confirm_password').value = '';
    } catch (e) {
      showToast(e.message, 'error');
    }
  }
};
