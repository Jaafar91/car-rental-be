const authState = {
  token: localStorage.getItem('car_rental_token') || '',
  staff: null,
};

function isLoggedIn() {
  return Boolean(authState.token);
}

function logout() {
  authState.token = '';
  authState.staff = null;
  localStorage.removeItem('car_rental_token');
  document.getElementById('appShell')?.classList.add('auth-hidden');
  document.getElementById('loginView')?.classList.remove('auth-hidden');
  const emailInput = document.getElementById('loginEmail');
  if (emailInput) emailInput.focus();
}

async function loginStaff(email, password) {
  const res = await fetch('/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }

  const data = await res.json();
  authState.token = data.access_token;
  localStorage.setItem('car_rental_token', data.access_token);
  return data;
}

async function bootstrapAuth() {
  if (!authState.token) {
    logout();
    return;
  }

  try {
    const res = await fetch('/staff/me', {
      headers: { Authorization: `Bearer ${authState.token}` },
    });

    if (!res.ok) {
      logout();
      return;
    }

    authState.staff = await res.json();
    document.getElementById('appShell')?.classList.remove('auth-hidden');
    document.getElementById('loginView')?.classList.add('auth-hidden');
    const userLabel = document.getElementById('currentUserLabel');
    if (userLabel) {
      userLabel.textContent = `${authState.staff.first_name} ${authState.staff.last_name} (${(authState.staff.role || 'agent').toUpperCase()})`;
    }
    const staffNav = document.querySelector('.staff-nav');
    if (staffNav) {
      staffNav.style.display = authState.staff?.role?.toLowerCase() === 'admin' ? '' : 'none';
    }
    if (typeof loadConfig === 'function') {
      await loadConfig();
      await loadLocale(currentLang);
    }
  } catch (error) {
    logout();
  }
}
