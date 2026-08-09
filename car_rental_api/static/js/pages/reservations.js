const reservations = {
  data: [], customers: [], cars: [],

  async load() {
    document.getElementById('pageContent').innerHTML = translateTemplate(
      `<div class="loading"><div class="spinner"></div> {{loading}}</div>`
    );
    try {
      [this.data, this.customers, this.cars] = await Promise.all([
        api.get('/reservations/'),
        api.get('/customers/'),
        api.get('/cars/'),
      ]);
      this.render();
    } catch (e) { showToast(e.message, 'error'); }
  },

  // ─── Helper: convert stored ISO string → datetime-local input value ─────────
  // datetime-local expects: "YYYY-MM-DDTHH:MM" (no seconds, no timezone)
  toInputValue(dt) {
    if (!dt) return '';
    // Handle both "2024-06-01T14:30:00Z" and "2024-06-01 14:30:00"
    const d = new Date(dt);
    if (isNaN(d)) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(currentLocale || undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  render() {
    document.getElementById('pageContent').innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-calendar-check"></i> {{nav_reservations}}</h2>
        <button class="btn btn-primary" onclick="reservations.openCreate()">
          <i class="fas fa-plus"></i> {{btn_add_reservation}}
        </button>
      </div>
      <div class="table-wrapper">
        <div class="search-bar">
          <input type="text" id="resSearch" placeholder="{{ph_search_reservations}}"/>
        </div>
        <div id="resTable">
          ${buildTable([
            { key: 'reservation_id', label: t('col_id') },
            { key: 'customer_id',    label: t('col_customer'), render: r => {
              const c = this.customers.find(x => x.customer_id === r.customer_id);
              return c ? `${c.full_name}` : r.customer_id;
            }},
            { key: 'car_id', label: t('col_car'), render: r => {
              const c = this.cars.find(x => x.car_id === r.car_id);
              return c ? `${c.make} ${c.model}` : r.car_id;
            }},
            { key: 'pickup_at',  label: 'Pickup', render: r => this.formatDate(r.pickup_at) },
            { key: 'dropoff_at',    label: 'Return', render: r => this.formatDate(r.dropoff_at) },
            { key: '_period', label: 'Booking', render: r => {
              const pickup = r.pickup_at ? new Date(r.pickup_at) : null;
              const dropoff = r.dropoff_at ? new Date(r.dropoff_at) : null;
              if (!pickup || !dropoff) return '—';
              const now = new Date();
              const isFuture = pickup > now;
              return `<span style="color:${isFuture ? '#10b981' : '#f59e0b'};font-weight:600;">${isFuture ? 'Future booking' : 'Current/Recent'}</span>`;
            }}, 
            { key: 'status',      label: t('col_status'), render: r => statusBadge(r.status) },
            { key: 'deposit_amount', label: 'Deposit', render: r => formatCurrency(r.deposit_amount) },
            { key: 'total_amount',label: t('col_total'),  render: r => formatCurrency(r.total_amount) },
          ], this.data, row => `
            <button class="btn btn-warning btn-sm" title="${t('btn_edit')}" onclick="reservations.openEdit(${row.reservation_id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" title="${t('btn_delete')}" onclick="reservations.delete(${row.reservation_id})">
              <i class="fas fa-trash"></i>
            </button>`
          )}
        </div>
      </div>`);
    setupSearch('resSearch', 'resTable');
  },

  formHTML(d = {}) {
    const custOpts = this.customers.map(c =>
      `<option value="${c.customer_id}" ${d.customer_id === c.customer_id ? 'selected' : ''}>
        ${c.full_name}
      </option>`).join('');
    const carOpts = this.cars.map(c =>
      `<option value="${c.car_id}" ${d.car_id === c.car_id ? 'selected' : ''}>
        ${c.make} ${c.model} (${c.license_plate})
      </option>`).join('');

    return translateTemplate(`
      <div class="form-group"><label>{{label_customer}} <span style="color:red">*</span></label>
        <select id="f_customer_id">
          <option value="">{{placeholder_select_customer}}</option>${custOpts}
        </select>
      </div>
      <div class="form-group"><label>{{label_car}} <span style="color:red">*</span></label>
        <select id="f_car_id">
          <option value="">{{placeholder_select_car}}</option>${carOpts}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>📅 Pickup Date <span style="color:red">*</span></label>
          <input id="f_pickup_at"
                 type="datetime-local"
                 value="${this.toInputValue(d.pickup_at)}"/>
        </div>
        <div class="form-group">
          <label>📅 Return Date <span style="color:red">*</span></label>
          <input id="f_dropoff_at"
                 type="datetime-local"
                 value="${this.toInputValue(d.dropoff_at)}"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>{{label_status}}</label>
          <select id="f_status">
            ${['pending','confirmed','cancelled','completed'].map(s => {
              const label = {
                pending: t('status_pending') || 'Pending',
                confirmed: t('status_confirmed') || 'Confirmed',
                cancelled: t('status_cancelled') || 'Cancelled',
                completed: t('status_completed') || 'Completed'
              }[s] || s;
              return `<option value="${s}" ${d.status === s ? 'selected' : ''}>${label}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group"><label>Deposit Amount</label>
          <input id="f_deposit_amount" type="number" step="0.01"
                 value="${d.deposit_amount || ''}"/>
        </div>
        <div class="form-group"><label>{{label_total_amount}}</label>
          <input id="f_total_amount" type="number" step="0.01"
                 value="${d.total_amount || ''}"/>
        </div>
      </div>
      <div class="form-group"><label>{{label_notes}}</label>
        <textarea id="f_notes" rows="2">${d.notes || ''}</textarea>
      </div>
      <div class="form-group">
        <label>✍️ Agreement Signature</label>
        <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="reservations.toggleSignaturePad()">${d.agreement_signature ? 'Update Signature' : 'Capture Signature'}</button>
          <span id="signatureStatus" style="color:${d.agreement_signed ? '#10b981' : '#94a3b8'};font-size:0.9rem;">${d.agreement_signed ? 'Signed' : 'Not signed yet'}</span>
          ${d.reservation_id ? `<button type="button" class="btn btn-sm btn-primary" onclick="reservations.previewAgreement(${d.reservation_id})">Preview</button>` : ''}
          ${d.reservation_id ? `<button type="button" class="btn btn-sm btn-success" onclick="reservations.sendAgreementEmail(${d.reservation_id})">Send by Email</button>` : ''}
        </div>
        <div id="signaturePadWrap" style="display:${d.agreement_signature ? 'block' : 'none'};border:1px solid #334155;border-radius:8px;padding:0.75rem;background:#0f172a;">
          <canvas id="signatureCanvas" width="480" height="180" style="border:1px solid #475569;border-radius:6px;background:#fff;touch-action:none;width:100%;max-width:480px;"></canvas>
          <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="reservations.clearSignature()">Clear</button>
          </div>
        </div>
        <input id="f_agreement_signed" type="hidden" value="${d.agreement_signed ? 'true' : 'false'}" />
        <input id="f_agreement_signature" type="hidden" value="${d.agreement_signature || ''}" />
      </div>`);
  },

  getFormData() {

    const pickup  = document.getElementById('f_pickup_at').value;
    const dropoff = document.getElementById('f_dropoff_at').value;
    const signature = document.getElementById('f_agreement_signature')?.value || '';
    const signed = Boolean(signature || document.getElementById('f_agreement_signed')?.value === 'true');

    return {
      customer_id:   parseInt(document.getElementById('f_customer_id').value),
      car_id:        parseInt(document.getElementById('f_car_id').value),
      pickup_at:    pickup  ? new Date(pickup).toISOString()  : null,  // ✅ Send ISO string
      dropoff_at:   dropoff ? new Date(dropoff).toISOString() : null,  // ✅ Send ISO string
      status:        document.getElementById('f_status').value,
      deposit_amount: parseFloat(document.getElementById('f_deposit_amount').value) || null,
      total_amount:  parseFloat(document.getElementById('f_total_amount').value) || null,
      notes:         document.getElementById('f_notes').value,
      agreement_signed: signed,
      agreement_signature: signature || null,
    };
  },

  toggleSignaturePad() {
    const wrap = document.getElementById('signaturePadWrap');
    const canvas = document.getElementById('signatureCanvas');
    const signatureInput = document.getElementById('f_agreement_signature');
    const signedInput = document.getElementById('f_agreement_signed');
    const status = document.getElementById('signatureStatus');
    if (!wrap || !canvas) return;
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    if (wrap.style.display === 'block') {
      this.initSignaturePad(canvas, signatureInput, signedInput, status);
    }
  },

  showSignaturePreview() {
    const wrap = document.getElementById('signaturePadWrap');
    const canvas = document.getElementById('signatureCanvas');
    const signatureInput = document.getElementById('f_agreement_signature');
    const signedInput = document.getElementById('f_agreement_signed');
    const status = document.getElementById('signatureStatus');

    if (!wrap || !canvas || !signatureInput || !signedInput) return;

    const hasSignature = Boolean(signatureInput.value);
    wrap.style.display = hasSignature ? 'block' : 'none';

    if (status) {
      status.textContent = hasSignature ? 'Signed' : 'Not signed yet';
      status.style.color = hasSignature ? '#10b981' : '#94a3b8';
    }

    if (hasSignature) {
      this.initSignaturePad(canvas, signatureInput, signedInput, status);
    }
  },

  clearSignature() {
    const canvas = document.getElementById('signatureCanvas');
    const signatureInput = document.getElementById('f_agreement_signature');
    const signedInput = document.getElementById('f_agreement_signed');
    const status = document.getElementById('signatureStatus');
    if (!canvas || !signatureInput || !signedInput) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    signatureInput.value = '';
    signedInput.value = 'false';
    if (status) {
      status.textContent = 'Not signed yet';
      status.style.color = '#94a3b8';
    }
  },

  initSignaturePad(canvas, signatureInput, signedInput, status) {
    if (!canvas || !signatureInput || !signedInput) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 180;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';

    let drawing = false;
    const startDraw = (e) => {
      drawing = true;
      const pos = this.getCanvasPoint(e, canvas);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    const moveDraw = (e) => {
      if (!drawing) return;
      const pos = this.getCanvasPoint(e, canvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    const endDraw = () => {
      drawing = false;
      if (ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(v => v !== 0)) {
        signatureInput.value = canvas.toDataURL('image/png');
        signedInput.value = 'true';
        if (status) {
          status.textContent = 'Signed';
          status.style.color = '#10b981';
        }
      }
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = moveDraw;
    canvas.onmouseup = endDraw;
    canvas.onmouseleave = endDraw;
    canvas.ontouchstart = (e) => { e.preventDefault(); startDraw(e.touches[0]); };
    canvas.ontouchmove = (e) => { e.preventDefault(); moveDraw(e.touches[0]); };
    canvas.ontouchend = endDraw;

    if (signatureInput.value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = signatureInput.value;
    }
  },

  getCanvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  },

  openCreate() {
    openModal(t('modal_add_reservation'), this.formHTML(), async () => {
      try {
        const created = await api.post('/reservations/', this.getFormData());
        if (created.agreement_signed && created.agreement_signature) {
          await this.sendAgreementEmail(created.reservation_id);
        }
        showToast(t('toast_reservation_created'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  },

  openEdit(id) {
    const d = this.data.find(x => x.reservation_id === id);
    openModal(t('modal_edit_reservation'), this.formHTML(d), async () => {
      try {
        const updated = await api.put(`/reservations/${id}`, this.getFormData());
        if (updated.agreement_signed && updated.agreement_signature) {
          await this.sendAgreementEmail(updated.reservation_id);
        }
        showToast(t('toast_reservation_updated'), 'success');
        closeModal(); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });

    setTimeout(() => this.showSignaturePreview(), 50);
  },

  async previewAgreement(id) {
    try {
      const reservation = this.data.find(x => x.reservation_id === id);
      if (!reservation || !reservation.agreement_signed || !reservation.agreement_signature) {
        showToast('Signature must be captured before previewing the agreement', 'error');
        return;
      }

      const customer = this.customers.find(x => x.customer_id === reservation.customer_id);
      const car = this.cars.find(x => x.car_id === reservation.car_id);

      const previewHtml = `
        <div style="padding:1rem;max-height:70vh;overflow:auto;">
          <h3 style="margin-bottom:0.5rem;">Signed Agreement Preview</h3>
          <p style="margin:0 0 0.75rem;color:#94a3b8;">Review the agreement below before sending it to the customer.</p>
          <div style="border:1px solid #334155;border-radius:10px;padding:1rem;background:#fff;color:#111827;">
            <h4 style="margin:0 0 0.5rem;">Reservation #${reservation.reservation_id}</h4>
            <p style="margin:0.15rem 0;"><strong>Customer:</strong> ${customer ? customer.full_name : reservation.customer_id}</p>
            <p style="margin:0.15rem 0;"><strong>Vehicle:</strong> ${car ? `${car.make} ${car.model} (${car.license_plate})` : reservation.car_id}</p>
            <p style="margin:0.15rem 0;"><strong>Pickup:</strong> ${reservation.pickup_at ? new Date(reservation.pickup_at).toLocaleString() : '—'}</p>
            <p style="margin:0.15rem 0;"><strong>Dropoff:</strong> ${reservation.dropoff_at ? new Date(reservation.dropoff_at).toLocaleString() : '—'}</p>
            <p style="margin:0.15rem 0;"><strong>Total:</strong> ${formatCurrency(reservation.total_amount)}</p>
            <p style="margin:0.75rem 0 0.25rem;"><strong>Customer Signature</strong></p>
            <img src="${reservation.agreement_signature}" alt="Customer signature" style="max-width:100%;max-height:220px;border:1px solid #d1d5db;padding:0.5rem;background:#fff;" />
          </div>
          <div style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;">
            <button class="btn btn-success" onclick="reservations.sendAgreementEmail(${id});closeModal();">Send by Email</button>
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
          </div>
        </div>`;

      openModal('Agreement Preview', previewHtml);
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async sendAgreementEmail(id) {
    try {
      const result = await api.post(`/reservations/${id}/send-agreement`, {});
      showToast(result.message || 'Agreement email sent', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  delete(id) {
    confirmDelete(t('confirm_delete_reservation'), async () => {
      try {
        await api.delete(`/reservations/${id}`);
        showToast(t('toast_reservation_deleted'), 'info'); this.load();
      } catch (e) { showToast(e.message, 'error'); }
    });
  }
};