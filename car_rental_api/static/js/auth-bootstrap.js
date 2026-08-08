document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      await loginStaff(email, password);
      await bootstrapAuth();
      if (typeof showToast === 'function') {
        showToast('Signed in successfully', 'success');
      }
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  logoutBtn?.addEventListener('click', () => logout());
  bootstrapAuth();
});
