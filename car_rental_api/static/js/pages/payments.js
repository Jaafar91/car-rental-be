const payments = {
  data: [], rentals: [],

  async load() {
    document.getElementById('pageContent').innerHTML =
      `<div class="loading"><div class="spinner"></div> Loading...</div>`;
    try {
      [this.data, this.rentals] = await Promise.all([
        api.get('/payments/'),
        api.get('/rentals/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  render() {
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-credit-card"></i> Payments</h2>
        <button class="btn btn-primary" onclick="payments.openCreate()">
          <i class="fas fa-plus"></i> Add Payment
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="paySearch" placeholder="🔍 Search..."/>
        </div>
        <div id="payTable">
          ${buildTable([
            { key: 'payment_id',  label: 'ID' },
            { key: 'rental_id',   label: 'Rental #' },
            { key: 'amount',      label: 'Amount', render: r => `$${r.amount}` },
            { key: 'payment_method', label: 'Method' },
            { key: 'payment_status', label: 'Status', render: r => statusBadge(r.payment_status) },
            { key: 'payment_date',   label: 'Date' },
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" onclick="payments.openEdit(${row.payment_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="payments.delete(${row.payment_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`;
    setupSearch('paySearch', 'payTable');
  },

  formHTML(d = {}) {
    const rentalOpts = this.rentals.map(r =>
      `<option value="${r.rental_id}" ${d.rental_id === r.rental_id ? 'selected' : ''}>
        Rental #${r.rental_id}
      </option>`).join('');

    return `
      <div class="form-group"><label>Rental *</label>
        <select id="f_rental_id"><option value="">-- Select --</option>${rentalOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Amount *</label>
          <input id="f_amount" type="number" step="0.01" value="${d.amount || ''}"/>
        </div>
        <div class="form-group"><label>Payment Date</label>
          <input id="f_payment_date" type="date" value="${d.payment_date || ''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Method</label>
          <select id="f_payment_method">
            ${['cash','credit_card','debit_card','bank_transfer','online'].map(m =>
              `<option value="${m}" ${d.payment_method === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select id="f_payment_status">
            ${['paid','partial','refunded'].map(s =>
              `<option value="${s}" ${d.payment_status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Transaction ID</label>
        <input id="f_transaction_id" value="${d.transaction_id || ''}"/>
      </div>`;
  },

  getFormData() {
    return {
      rental_id:       parseInt(document.getElementById('f_rental_id').value),
      amount:          parseFloat(document.getElementById('f_amount').value),
      payment_date:    document.getElementById('f_payment_date').value || null,
      payment_method:  document.getElementById('f_payment_method').value,
      payment_status:  document.getElementById('f_payment_status').value,
      transaction_id:  document.getElementById('f_transaction_id').value,
    };
  },

  openCreate() {
    openModal('➕ Add Payment', this.formHTML(), async () => {
      try {
        await api.post('/payments/', this.getFormData());
        showToast('Payment created ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.payment_id === id);
    openModal('✏️ Edit Payment', this.formHTML(d), async () => {
      try {
        await api.put(`/payments/${id}`, this.getFormData());
        showToast('Payment updated ✅', 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete('Delete this payment?', async () => {
      try {
        await api.delete(`/payments/${id}`);
        showToast('Deleted 🗑️', 'info'); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};