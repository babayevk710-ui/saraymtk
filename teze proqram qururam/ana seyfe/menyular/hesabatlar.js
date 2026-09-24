(() => {
  const getApiBaseUrl = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('marketErpServerSettings') || '{}');
      const baseIp = (saved.serverIp || saved.server_ip || '94.20.88.181').trim();
      const basePort = (saved.serverPort || saved.server_port || '5050').trim();
      if (baseIp && basePort) {
        return `http://${baseIp}:${basePort}`;
      }
    } catch (error) {
      console.warn('Server ayarı oxunmadı:', error);
    }
    return 'http://94.20.88.181:5050';
  };

  const getReportUrl = (endpoint, params) => {
    const baseUrl = getApiBaseUrl();
    const query = params?.toString();
    return `${baseUrl}${endpoint}${query ? `?${query}` : ''}`;
  };
  const API = getApiBaseUrl();

  const formatMoney = (value) => `${Number(value || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;

  const reportDefinitions = {
    alis: {
      title: 'Alış Hesabatı',
      endpoint: '/api/reports/alis-hesabati',
      filters: [
        { key: 'supplier', label: 'Firma', placeholder: 'Firma adı' },
        { key: 'product', label: 'Məhsul', placeholder: 'Məhsul kodu və ya adı' },
        { key: 'date_from', label: 'Tarixdən', type: 'date' },
        { key: 'date_to', label: 'Tarixə', type: 'date' },
      ],
      columns: [
        ['nomre', 'Sənəd'], ['tarix', 'Tarix'], ['firma', 'Firma'], ['isdifadeci', 'İstifadəçi'],
        ['mehsul_adi', 'Məhsul'], ['strixkod', 'Ştrixkod'], ['miqdari', 'Miqdar'], ['qiymeti', 'Qiymət'], ['toplam', 'Toplam']
      ],
      money: ['qiymeti', 'toplam'],
      totals: ['miqdari', 'toplam'],
    },
    satis: {
      title: 'Satış Hesabatı',
      endpoint: '/api/reports/satis-hesabati',
      filters: [
        { key: 'cashier', label: 'Kassir', type: 'select', source: 'cashiers', placeholder: 'Bütün kassirlər' },
        { key: 'product', label: 'Məhsul', placeholder: 'Məhsul kodu və ya adı' },
        { key: 'date_from', label: 'Tarixdən', type: 'date' },
        { key: 'date_to', label: 'Tarixə', type: 'date' },
      ],
      columns: [
        ['mehsul_adi', 'Mal'], ['strixkod', 'Ştrixkod'], ['miqdar', 'Miqdar'],
        ['alis_qiymeti', 'Alış qiyməti'], ['satis_qiymeti', 'Satış qiyməti'],
        ['dovriyye', 'Dövriyyə'], ['endirimsiz_dovriyye', 'Endirimsiz dövriyyə'],
        ['maya_deyeri', 'Maya dəyəri'], ['menfeet', 'Mənfəət'], ['menfeet_faizi', 'Mənfəət %']
      ],
      money: ['alis_qiymeti', 'satis_qiymeti', 'dovriyye', 'endirimsiz_dovriyye', 'maya_deyeri', 'menfeet'],
      percent: ['menfeet_faizi'],
      totals: ['miqdar', 'dovriyye', 'endirimsiz_dovriyye', 'maya_deyeri', 'menfeet'],
      groupBy: 'kassir',
      groupLabel: 'Kassir',
    },
    qaliq: {
      title: 'Anbarda Qalıq Hesabatı',
      endpoint: '/api/reports/anbar-qaligi',
      columns: [
        ['mehsul_kodu', 'Kod'], ['mehsul_adi', 'Məhsul'], ['kateqoriya', 'Kateqoriya'],
        ['olcu_vahidi', 'Vahid'], ['stok_sayi', 'Stok'], ['alis_qiymeti', 'Alış'], ['satis_qiymeti', 'Satış'], ['stok_meblegi', 'Dəyər']
      ],
      money: ['alis_qiymeti', 'satis_qiymeti', 'stok_meblegi'],
    },
    kassa: {
      title: 'Kassa Hesabatı',
      endpoint: '/api/reports/kassa-hesabati',
      filters: [
        { key: 'cashier', label: 'Kassir', type: 'select', source: 'cashiers', placeholder: 'Bütün kassirlər' },
        { key: 'date_from', label: 'Tarixdən', type: 'date' },
        { key: 'date_to', label: 'Tarixə', type: 'date' },
      ],
      columns: [
        ['tarix', 'Tarix'], ['qebz_sayi', 'Qəbz sayı'], ['nagd', 'Nağd'], ['kart', 'Kart'], ['bonus', 'Bonus'], ['umumi', 'Ümumi']
      ],
      money: ['nagd', 'kart', 'bonus', 'umumi'],
      totals: ['qebz_sayi', 'nagd', 'kart', 'bonus', 'umumi'],
      groupBy: 'kassir',
      groupLabel: 'Kassir',
    },
    hereket: {
      title: 'Malların Hərəkəti Hesabatı',
      endpoint: '/api/reports/mal-hereketleri',
      columns: [
        ['tip', 'Əməliyyat'], ['sened', 'Sənəd'], ['mehsul_adi', 'Məhsul'], ['mehsul_kodu', 'Kod'], ['miqdari', 'Miqdar'], ['qiymeti', 'Qiymət']
      ],
      money: ['qiymeti'],
      labels: { alis: 'Alış', satis: 'Satış', qaytarma: 'Qaytarma', 'muddeti-bitmis': 'Müddəti bitmiş' },
    },
    kontragent: {
      title: 'Kontragentlərin Qarşılıqlı Hesablaşması',
      endpoint: '/api/reports/kontragent-hesablasma',
      columns: [
        ['firma_adi', 'Firma'], ['firma_kodu', 'Kod'], ['alis_cemi', 'Alış cəmi'],
        ['qaytarma_cemi', 'Qaytarma cəmi'], ['aktiv_borc', 'Aktiv borc'], ['borc_limiti', 'Limit']
      ],
      money: ['alis_cemi', 'qaytarma_cemi', 'aktiv_borc', 'borc_limiti'],
    },
    odenis: {
      title: 'Tədarükçüyə Ödəniş',
      endpoint: '/api/reports/tedarukcu-odenis',
      columns: [
        ['firma_adi', 'Firma'], ['alis_cemi', 'Alış cəmi'], ['aktiv_borc', 'Aktiv borc'], ['borc_limiti', 'Limit'], ['borc_status', 'Status']
      ],
      money: ['alis_cemi', 'aktiv_borc', 'borc_limiti'],
      labels: { normal: 'Normal', limit_asib: 'Limit aşıb' },
    },
    gelir: {
      title: 'Təmiz Gəlir Hesabatı',
      endpoint: '/api/reports/temiz-gelir',
      columns: [
        ['tarix', 'Tarix'], ['satis_cemi', 'Satış cəmi'], ['maya_deyeri', 'Maya dəyəri'], ['temiz_gelir', 'Təmiz gəlir']
      ],
      money: ['satis_cemi', 'maya_deyeri', 'temiz_gelir'],
    },
  };

  const reportPages = {
    'alis-hesabatlari-view': ['alis'],
    'satis-hesabatlari-view': ['satis'],
    'qaliq-hesabatlari-view': ['qaliq', 'hereket'],
    'hesabatlar-view': ['kassa', 'kontragent', 'odenis', 'gelir'],
  };

  const getDefaultDates = () => {
    const now = new Date();
    const toLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = toLocalDate(now);
    return { from: today, to: today };
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));

  const formatQty = (value) => Number(value || 0).toLocaleString('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

  const formatCellValue = (config, key, rawValue) => {
    let value = rawValue ?? '-';
    if (config.money?.includes(key)) return formatMoney(value);
    if (config.percent?.includes(key)) return `${Number(value || 0).toFixed(2)} %`;
    if (key === 'miqdar' || key === 'miqdari') return formatQty(value);
    if (config.labels?.[value]) return config.labels[value];
    return value;
  };

  const setPdfEnabled = (view, enabled) => {
    const button = view.querySelector('.report-pdf-btn');
    if (button) button.disabled = !enabled;
  };

  const showHint = (view, reportKey) => {
    const config = reportDefinitions[reportKey];
    if (!config) return;
    const listBody = view.querySelector('.report-list');
    const countLabel = view.querySelector('.report-count');
    const emptyBox = view.querySelector('.report-empty');
    const tableHead = view.querySelector('.report-table-head');
    if (tableHead) tableHead.innerHTML = `<tr>${config.columns.map(([, label]) => `<th>${label}</th>`).join('')}</tr>`;
    if (listBody) listBody.innerHTML = `<tr><td colspan="${config.columns.length}" class="report-hint-cell">⌕ Nəticələri görmək üçün filtrləri seçib <b>«Axtar»</b> düyməsini sıxın.</td></tr>`;
    if (countLabel) countLabel.textContent = '0 sətir';
    if (emptyBox) emptyBox.hidden = true;
    view._reportState = null;
    setPdfEnabled(view, false);
  };

  const collectFilters = (view) => {
    const params = new URLSearchParams();
    const summaryParts = [];
    view.querySelectorAll('.report-filters input, .report-filters select').forEach((input) => {
      const value = input.value.trim();
      if (!value) return;
      params.set(input.dataset.filterKey, value);
      const label = input.closest('.report-filter-field')?.querySelector('span')?.textContent || input.dataset.filterKey;
      summaryParts.push(`${label}: ${value}`);
    });
    return { params, summary: summaryParts.join('  •  ') };
  };

  const buildTotalsCells = (config, rows, label, labelIndex = 0) => config.columns.map(([key], index) => {
    if (index === labelIndex) return `<td><b>${escapeHtml(label)}</b></td>`;
    if (config.percent?.includes(key)) {
      const totalSales = rows.reduce((acc, row) => acc + (Number(row.dovriyye) || 0), 0);
      const totalProfit = rows.reduce((acc, row) => acc + (Number(row.menfeet) || 0), 0);
      const avgPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
      return `<td><b>${escapeHtml(`${avgPercent.toFixed(2)} %`)}</b></td>`;
    }
    if (!config.totals?.includes(key)) return '<td></td>';
    const sum = rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
    const formatted = config.money?.includes(key) ? formatMoney(sum) : formatQty(sum);
    return `<td><b>${escapeHtml(formatted)}</b></td>`;
  }).join('');

  const renderRowsHtml = (config, rows) => {
    if (!config.groupBy) {
      return rows.map((row) => `
          <tr>${config.columns.map(([key]) => `<td>${escapeHtml(formatCellValue(config, key, row[key]))}</td>`).join('')}</tr>
        `).join('');
    }
    const colspan = config.columns.length;
    const groups = new Map();
    rows.forEach((row) => {
      const groupKey = String(row[config.groupBy] ?? '—');
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(row);
    });
    const parts = [];
    groups.forEach((groupRows, groupKey) => {
      parts.push(`<tr class="report-group-row"><td colspan="${colspan}">${escapeHtml(config.groupLabel || '')}: <b>${escapeHtml(groupKey)}</b></td></tr>`);
      groupRows.forEach((row) => {
        parts.push(`<tr>${config.columns.map(([key]) => `<td>${escapeHtml(formatCellValue(config, key, row[key]))}</td>`).join('')}</tr>`);
      });
      parts.push(`<tr class="report-subtotal-row">${buildTotalsCells(config, groupRows, 'Cəmi')}</tr>`);
    });
    parts.push(`<tr class="report-grand-total-row">${buildTotalsCells(config, rows, 'ÜMUMİ CƏMİ')}</tr>`);
    return parts.join('');
  };

  const loadReportIntoView = async (view, reportKey) => {
    const config = reportDefinitions[reportKey];
    if (!config) return;
    if (view._reportAbortController) view._reportAbortController.abort();
    const abortController = new AbortController();
    view._reportAbortController = abortController;
    const listBody = view.querySelector('.report-list');
    const countLabel = view.querySelector('.report-count');
    const emptyBox = view.querySelector('.report-empty');
    const titleLabel = view.querySelector('.report-title');
    const tableHead = view.querySelector('.report-table-head');
    const colspan = config.columns.length;

    if (titleLabel) titleLabel.textContent = config.title;
    if (listBody) listBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:18px;">Hesabat yüklənir...</td></tr>`;
    if (emptyBox) emptyBox.hidden = true;
    setPdfEnabled(view, false);

    const { params, summary } = collectFilters(view);

    try {
      const url = getReportUrl(config.endpoint, params);
      console.info('[Hesabat] Sorğu göndərilir:', url);
      let response;
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch(url, { cache: 'no-store', signal: abortController.signal });
          break;
        } catch (fetchError) {
          lastError = fetchError;
          if (fetchError?.name === 'AbortError' || attempt === 1) throw fetchError;
        }
      }
      if (!response) throw lastError || new Error('Hesabat serverdən cavabsız qaldı.');
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Hesabat alınmadı.');
      }
      const rows = Array.isArray(result.rows) ? result.rows : [];

      if (tableHead) {
        tableHead.innerHTML = `<tr>${config.columns.map(([, label]) => `<th>${label}</th>`).join('')}</tr>`;
      }
      if (countLabel) countLabel.textContent = `${rows.length} sətir`;
      if (!rows.length) {
        view._reportState = null;
        if (listBody) listBody.innerHTML = '';
        if (emptyBox) emptyBox.hidden = false;
        return;
      }
      if (emptyBox) emptyBox.hidden = true;
      if (listBody) listBody.innerHTML = renderRowsHtml(config, rows);
      view._reportState = { rows, cashiers: Array.isArray(result.cashiers) ? result.cashiers : [], filtersSummary: summary, generatedAt: new Date() };
      setPdfEnabled(view, true);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      view._reportState = null;
      const errorMessage = error?.message === 'Failed to fetch'
        ? `Serverə qoşulma baş tutmadı. Sorğunun göndərildiyi ünvanı yoxlayın: ${escapeHtml(getReportUrl(config.endpoint, params))}`
        : (error?.message || 'Hesabat yüklənmədi.');
      console.error('[Hesabat] Sorğu xətası:', error);
      if (listBody) listBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:18px;">${errorMessage}</td></tr>`;
    }
  };

  const exportReportPdf = (view, reportKey) => {
    const config = reportDefinitions[reportKey];
    const state = view._reportState;
    if (!config || !state || !state.rows.length) return;

    const headCells = config.columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('');
    const bodyRows = state.rows.map((row) => `<tr>${config.columns.map(([key]) => `<td>${escapeHtml(formatCellValue(config, key, row[key]))}</td>`).join('')}</tr>`).join('');
    const totalKeys = config.totals || config.money || [];
    const totalCells = config.columns.map(([key], index) => {
      if (config.percent?.includes(key)) {
        const totalSales = state.rows.reduce((acc, row) => acc + (Number(row.dovriyye) || 0), 0);
        const totalProfit = state.rows.reduce((acc, row) => acc + (Number(row.menfeet) || 0), 0);
        const avgPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
        return `<td><b>${escapeHtml(`${avgPercent.toFixed(2)} %`)}</b></td>`;
      }
      if (!totalKeys.includes(key)) return index === 0 ? '<td><b>ÜMUMİ CƏMİ</b></td>' : '<td></td>';
      const sum = state.rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
      const formatted = config.money?.includes(key) ? formatMoney(sum) : formatQty(sum);
      return `<td><b>${escapeHtml(formatted)}</b></td>`;
    }).join('');

    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="az">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.title)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #0f172a; }
  .doc-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .brand { font-size: 12px; color: #64748b; }
  .meta { font-size: 12px; color: #475569; text-align: right; line-height: 1.6; }
  .filters { font-size: 12px; color: #334155; background: #f1f5f9; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tfoot td { border-top: 2px solid #0f172a; background: #f1f5f9; }
  .foot { margin-top: 14px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="doc-head">
    <div><h1>${escapeHtml(config.title)}</h1><div class="brand">Tiger X — İdarəetmə sistemi</div></div>
    <div class="meta">Yaradılma: ${escapeHtml(state.generatedAt.toLocaleString('az-AZ'))}<br>Sətir sayı: ${state.rows.length}</div>
  </div>
  ${state.filtersSummary ? `<div class="filters"><b>Filtrlər:</b> ${escapeHtml(state.filtersSummary)}</div>` : ''}
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
    <tfoot><tr>${totalCells}</tr></tfoot>
  </table>
  <div class="foot">Bu sənəd Tiger X sistemi tərəfindən avtomatik yaradılıb.</div>
  <script>window.addEventListener('load', () => window.print());<\/script>
</body>
</html>`);
    win.document.close();
    win.focus();
  };

  const fillCashierOptions = async (view) => {
    const select = view.querySelector('.report-filters select[data-filter-key="cashier"]');
    if (!select) return;
    const normalizeName = (item) => {
      if (typeof item === 'string') return item.trim();
      const fullName = [item?.adi, item?.soyadi].filter(Boolean).join(' ').trim();
      return String(fullName || item?.name || [item?.firstName, item?.lastName].filter(Boolean).join(' ') || item?.istifadeci_adi || '').trim();
    };
    const renderOptions = (names) => {
      const unique = [...new Set(names.filter(Boolean))];
      const current = select.value;
      select.innerHTML = `<option value="">${escapeHtml(select.dataset.placeholder || 'Hamısı')}</option>`
        + unique.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
      if (unique.includes(current)) select.value = current;
    };

    let names = [];
    try {
      const localCashiers = JSON.parse(localStorage.getItem('marketErpCashiers') || '[]');
      names = localCashiers.map(normalizeName).filter(Boolean);
    } catch {
      names = [];
    }
    names.push(...(view._reportState?.cashiers || []).map(normalizeName).filter(Boolean));
    renderOptions(names);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/cashiers`, { cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result?.status === 'success') {
        names.push(...(result.cashiers || []).map(normalizeName).filter(Boolean));
        renderOptions(names);
      }
    } catch {
      // Local cashier settings remain available when the server is offline.
    }
  };

  const buildFilterPanel = (view, reportKey) => {
    const bar = view.querySelector('.report-filters');
    if (!bar) return;
    const config = reportDefinitions[reportKey];
    const filters = config.filters || [];
    bar.hidden = false;
    bar.innerHTML = `
      <div class="report-filter-grid"${filters.length ? '' : ' hidden'}>
        ${filters.map((filter) => {
          if (filter.type === 'select') {
            return `
          <label class="report-filter-field">
            <span>${filter.label}</span>
            <select data-filter-key="${filter.key}" data-placeholder="${filter.placeholder || 'Hamısı'}">
              <option value="">${filter.placeholder || 'Hamısı'}</option>
            </select>
          </label>`;
          }
          return `
          <label class="report-filter-field">
            <span>${filter.label}</span>
            <input type="${filter.type === 'date' ? 'date' : 'search'}" data-filter-key="${filter.key}" placeholder="${filter.placeholder || ''}">
          </label>`;
        }).join('')}
      </div>
      <div class="report-filter-actions">
        <button type="button" class="primary-button report-search-btn"><span>⌕</span> Axtar</button>
        <button type="button" class="secondary-button report-clear-btn"><span>✕</span> Təmizlə</button>
        <button type="button" class="secondary-button report-pdf-btn" disabled><span>⤓</span> PDF yüklə</button>
      </div>`;

    const defaults = getDefaultDates();
    bar.querySelectorAll('input[data-filter-key="date_from"]').forEach((input) => { input.value = defaults.from; });
    bar.querySelectorAll('input[data-filter-key="date_to"]').forEach((input) => { input.value = defaults.to; });
    fillCashierOptions(view);

    bar.querySelector('.report-search-btn')?.addEventListener('click', () => loadReportIntoView(view, reportKey));
    bar.querySelector('.report-clear-btn')?.addEventListener('click', () => {
      bar.querySelectorAll('.report-filters input').forEach((input) => { input.value = ''; });
      bar.querySelectorAll('.report-filters select').forEach((select) => { select.value = ''; });
      bar.querySelectorAll('input[data-filter-key="date_from"]').forEach((input) => { input.value = defaults.from; });
      bar.querySelectorAll('input[data-filter-key="date_to"]').forEach((input) => { input.value = defaults.to; });
      if (filters.length) showHint(view, reportKey);
      else loadReportIntoView(view, reportKey);
    });
    bar.querySelector('.report-pdf-btn')?.addEventListener('click', () => exportReportPdf(view, reportKey));
    bar.querySelectorAll('.report-filters input').forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadReportIntoView(view, reportKey);
      });
    });
    bar.querySelectorAll('.report-filters select').forEach((select) => {
      select.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadReportIntoView(view, reportKey);
      });
    });
  };

  const initReportView = (viewId) => {
    const view = document.querySelector(`#${viewId}`);
    if (!view) return;
    const keys = reportPages[viewId] || [];
    if (!keys.length) return;

    const activate = (key) => {
      view.dataset.activeReport = key;
      const buttonsWrap = view.querySelector('.report-switch');
      buttonsWrap?.querySelectorAll('.report-switch-btn').forEach((item) => {
        item.classList.toggle('active', item.dataset.reportKey === key);
      });
      const titleLabel = view.querySelector('.report-title');
      if (titleLabel) titleLabel.textContent = reportDefinitions[key].title;
      buildFilterPanel(view, key);
      if ((reportDefinitions[key].filters || []).length) {
        showHint(view, key);
      } else {
        loadReportIntoView(view, key);
      }
    };

    const buttonsWrap = view.querySelector('.report-switch');
    if (buttonsWrap) {
      if (keys.length > 1) {
        buttonsWrap.hidden = false;
        buttonsWrap.innerHTML = keys.map((key) => `<button type="button" class="secondary-button report-switch-btn" data-report-key="${key}">${reportDefinitions[key].title}</button>`).join('');
        buttonsWrap.querySelectorAll('[data-report-key]').forEach((button) => {
          button.addEventListener('click', () => activate(button.dataset.reportKey));
        });
      } else {
        buttonsWrap.innerHTML = '';
        buttonsWrap.hidden = true;
      }
    }

    activate(keys[0]);
  };

  window.hesabatlarModulu = {
    goster: (viewId = 'hesabatlar-view') => initReportView(viewId),
  };
})();
