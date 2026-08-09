const reports = {
  data: [],
  cars: [],
  customers: [],

  async load() {
    const content = document.getElementById('pageContent');
    content.innerHTML = translateTemplate(`
      <div class="loading">
        <div class="spinner"></div> {{loading_reports}}
      </div>`);

    try {
      [this.data, this.cars, this.customers] = await Promise.all([
        api.get('/rentals/'),
        api.get('/cars/'),
        api.get('/customers/'),
      ]);
      this.render();
    } catch (e) {
      content.innerHTML = translateTemplate(`
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${e.message}</p>
        </div>`);
      showToast(e.message, 'error');
    }
  },

  _statCard(icon, label, value, color) {
    return `
      <div style="background:#1e293b;border-radius:12px;padding:1rem 1.5rem;flex:1;min-width:180px;border-left:4px solid ${color};">
        <div style="color:${color};font-size:1.4rem;margin-bottom:.3rem;"><i class="${icon}"></i></div>
        <div style="font-size:1.6rem;font-weight:700;color:#f1f5f9;">${value}</div>
        <div style="color:#94a3b8;font-size:.85rem;">${label}</div>
      </div>`;
  },

  _carLabel(carId) {
    const car = this.cars.find(item => item.car_id === carId);
    return car ? `${car.make} ${car.model}` : `Car #${carId}`;
  },

  _customerLabel(customerId) {
    const customer = this.customers.find(item => item.customer_id === customerId);
    return customer ? customer.full_name : `Customer #${customerId}`;
  },

  render() {
    const content = document.getElementById('pageContent');
    const totalRevenue = this.data.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
    const activeCount = this.data.filter(item => item.status === 'active').length;
    const overdueCount = this.data.filter(item => item.status === 'overdue').length;
    const completedCount = this.data.filter(item => item.status === 'completed').length;
    const cancelledCount = this.data.filter(item => item.status === 'cancelled').length;

    const carUsage = Object.entries(this.data.reduce((acc, item) => {
      if (!item.car_id) return acc;
      acc[item.car_id] = (acc[item.car_id] || 0) + 1;
      return acc;
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([carId, count]) => ({ carId, count }));

    const customerUsage = Object.entries(this.data.reduce((acc, item) => {
      if (!item.customer_id) return acc;
      acc[item.customer_id] = (acc[item.customer_id] || 0) + 1;
      return acc;
    }, {}))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([customerId, count]) => ({ customerId, count }));

    content.innerHTML = translateTemplate(`
      <div class="page-header">
        <h2><i class="fas fa-chart-bar"></i> {{nav_reports}}</h2>
      </div>

      <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
        ${this._statCard('fas fa-car', t('stat_total_rentals'), this.data.length, '#6366f1')}
        ${this._statCard('fas fa-check-circle', t('stat_active'), activeCount, '#10b981')}
        ${this._statCard('fas fa-exclamation-circle', t('stat_overdue'), overdueCount, '#ef4444')}
        ${this._statCard('fas fa-coins', t('stat_total_revenue'), formatCurrency(totalRevenue), '#f59e0b')}
        ${this._statCard('fas fa-flag-checkered', t('stat_completed'), completedCount, '#3b82f6')}
        ${this._statCard('fas fa-ban', t('stat_cancelled'), cancelledCount, '#64748b')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="table-wrapper">
          <h3 style="margin:0 0 1rem 0;">{{report_top_cars}}</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #334155;">
                <th style="text-align:left;padding:.7rem;color:#94a3b8;">{{col_car}}</th>
                <th style="text-align:left;padding:.7rem;color:#94a3b8;">{{report_rental_count}}</th>
              </tr>
            </thead>
            <tbody>
              ${carUsage.length ? carUsage.map(item => `
                <tr style="border-bottom:1px solid #1e293b;">
                  <td style="padding:.7rem;color:#f8fafc;">${this._carLabel(item.carId)}</td>
                  <td style="padding:.7rem;color:#94a3b8;">${item.count}</td>
                </tr>`).join('') : `<tr><td colspan="2" style="padding:.7rem;color:#94a3b8;">{{no_data}}</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="table-wrapper">
          <h3 style="margin:0 0 1rem 0;">{{report_top_customers}}</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #334155;">
                <th style="text-align:left;padding:.7rem;color:#94a3b8;">{{col_customer}}</th>
                <th style="text-align:left;padding:.7rem;color:#94a3b8;">{{report_rental_count}}</th>
              </tr>
            </thead>
            <tbody>
              ${customerUsage.length ? customerUsage.map(item => `
                <tr style="border-bottom:1px solid #1e293b;">
                  <td style="padding:.7rem;color:#f8fafc;">${this._customerLabel(item.customerId)}</td>
                  <td style="padding:.7rem;color:#94a3b8;">${item.count}</td>
                </tr>`).join('') : `<tr><td colspan="2" style="padding:.7rem;color:#94a3b8;">{{no_data}}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`);
  }
};
