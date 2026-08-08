const payments = {
  data: [], rentals: [],

  async load() {
    document.getElementById('pageContent').innerHTML = translateTemplate(
      `<div class="loading"><div class="spinner"></div> {{loading}}</div>`
    );
    try {
      [this.data, this.rentals] = await Promise.all([
        api.get('/payments/'),
        api.get('/rentals/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  render() {
    document.getElementById('pageContent').innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-credit-card"></i> {{nav_payments}}</h2>
        <button class="btn btn-primary" onclick="payments.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_payment}}
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="paySearch" placeholder="{{ph_search_payments}}"/>
        </div>
        <div id="payTable">
          ${buildTable([
            { key: 'payment_id',   label: t('col_id') },
            { key: 'rental_id',    label: t('col_rental') },
            { key: 'amount',       label: t('col_amount'), render: r => formatCurrency(r.amount) },
            { key: 'payment_method', label: t('col_method') },
            { key: 'payment_status', label: t('col_status'), render: r => statusBadge(r.payment_status) },
            { key: 'payment_date',  label: t('col_date') },
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="payments.openEdit(${row.payment_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="payments.delete(${row.payment_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`);
    setupSearch('paySearch', 'payTable');
  },

  formHTML(d = {}) {
    const rentalOpts = this.rentals.map(r =>
      `<option value="${r.rental_id}" ${d.rental_id === r.rental_id ? 'selected' : ''}>
        ${t('label_rental')} #${r.rental_id}
      </option>`).join('');

    return translateTemplate(`
      <div class="form-group"><label>{{label_rental}} <span style="color:red">*</span></label>
        <select id="f_rental_id"><option value="">{{placeholder_select}}</option>${rentalOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_amount}} <span style="color:red">*</span></label>
          <input id="f_amount" type="number" step="0.01" placeholder="{{ph_amount}}" value="${d.amount || ''}"/>
        </div>
        <div class="form-group"><label>{{label_payment_date}}</label>
          <input id="f_payment_date" type="date" value="${d.payment_date || ''}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_payment_method}}</label>
          <select id="f_payment_method">
            ${['cash','credit_card','debit_card','bank_transfer','online'].map(m =>
              `<option value="${m}" ${d.payment_method === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>{{label_payment_status}}</label>
          <select id="f_payment_status">
            ${['paid','partial','refunded'].map(s =>
              `<option value="${s}" ${d.payment_status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>{{label_transaction_id}}</label>
        <input id="f_transaction_id" placeholder="{{ph_transaction_id}}" value="${d.transaction_id || ''}"/>
      </div>`);
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
    openModal(t('modal_add_payment'), this.formHTML(), async () => {
      try {
        await api.post('/payments/', this.getFormData());
        showToast(t('toast_payment_created'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.payment_id === id);
    openModal(t('modal_edit_payment'), this.formHTML(d), async () => {
      try {
        await api.put(`/payments/${id}`, this.getFormData());
        showToast(t('toast_payment_updated'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  delete(id) {
    confirmDelete(t('confirm_delete_payment'), async () => {
      try {
        await api.delete(`/payments/${id}`);
        showToast(t('toast_payment_deleted'), 'info'); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};