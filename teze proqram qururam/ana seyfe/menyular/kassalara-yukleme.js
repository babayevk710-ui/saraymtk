(() => {
  const getApiBaseUrl = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('marketErpServerSettings') || '{}');
      const ip = (saved.serverIp || saved.server_ip || '94.20.88.181').trim();
      const port = (saved.serverPort || saved.server_port || '5050').trim();
      return ip && port ? `http://${ip}:${port}` : 'http://94.20.88.181:5050';
    } catch {
      return 'http://94.20.88.181:5050';
    }
  };

  const view = document.querySelector('#kassalara-yukleme-view');
  if (!view) return;

  const registerSelect = view.querySelector('#kassalara-yukleme-kassa');
  const typeSelect = view.querySelector('#kassalara-yukleme-tipi');
  const itemList = view.querySelector('#kassalara-yukleme-list');
  const summary = view.querySelector('#kassalara-yukleme-summary');
  const sendButton = view.querySelector('#kassalara-yukleme-gonder');
  const queueList = view.querySelector('#kassalara-yukleme-queue');
  const uploadEmpty = view.querySelector('#kassalara-yukleme-empty');

  const STORAGE_KEY = 'marketErpCashUploadQueue';
  const PRODUCTS_KEY = 'marketErpProducts';
  const ALL_REGISTERS_VALUE = '__all_cash_registers__';
  const BULK_TYPES = new Set(['customers', 'employees', 'cashiers', 'products', 'bonus-cards', 'warehouses']);

  const getRegisters = () => JSON.parse(localStorage.getItem('marketErpCashRegisters') || '[]');
  const getEmployees = () => JSON.parse(localStorage.getItem('marketErpEmployees') || '[]');
  const getCustomers = () => JSON.parse(localStorage.getItem('marketErpCustomerCards') || '[]');
  const getCashiers = () => JSON.parse(localStorage.getItem('marketErpCashiers') || '[]');
  const getQueue = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const saveQueue = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const loadCashLoadsFromServer = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/cash-loads`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || !Array.isArray(data.cash_loads)) return;

      const entries = data.cash_loads.map((item) => ({
        id: item.id,
        registerId: item.kassa_id,
        registerName: item.kassa_adi || 'Kassa',
        type: item.yukleme_novu || 'unknown',
        typeLabel: item.yukleme_novu || 'Yükləmə',
        count: 1,
        createdAt: item.gonderilme_tarixi || item.created_at || new Date().toISOString(),
        dateLabel: new Date(item.gonderilme_tarixi || item.created_at || Date.now()).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        status: item.status,
      }));

      saveQueue(entries);
      renderQueue();
    } catch (error) {
      console.warn('Kassa yükləmələri yenilənmədi:', error);
    }
  };

  const ensureProducts = () => {
    const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    return products;
  };

  const getSourceItems = (type) => {
    switch (type) {
      case 'customers':
        return getCustomers();
      case 'employees':
        return getEmployees();
      case 'products':
        return ensureProducts();
      case 'cashiers':
        return getCashiers();
      case 'bonus-cards':
        return getCustomers();
      case 'warehouses':
        return JSON.parse(localStorage.getItem('marketErpWarehouses') || '[]');
      default:
        return [];
    }
  };

  const formatLabel = (type, item) => {
    if (type === 'customers' || type === 'bonus-cards') {
      return item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Müştəri';
    }
    if (type === 'employees') {
      return item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'İşçi';
    }
    if (type === 'cashiers') {
      return item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Kassir';
    }
    if (type === 'products') {
      return item.name || 'Məhsul';
    }
    if (type === 'warehouses') {
      return item.name || 'Anbar';
    }
    return item.name || 'Element';
  };

  const renderRegisters = () => {
    const registers = getRegisters();
    if (!registerSelect) return;

    if (!registers.length) {
      registerSelect.innerHTML = '<option value="">Kassa yoxdur</option>';
      return;
    }

    const options = [
      { value: ALL_REGISTERS_VALUE, label: 'Bütün kassalar' },
      ...registers.map((reg) => ({ value: String(reg.id), label: `${reg.name || 'Kassa'} • ${reg.workplace || '-'}` }))
    ];

    registerSelect.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
    if (!registerSelect.value || !options.some((option) => option.value === registerSelect.value)) {
      registerSelect.value = ALL_REGISTERS_VALUE;
    }
  };

  const renderList = () => {
    const type = typeSelect.value;
    const rows = getSourceItems(type);
    const selectedCount = rows.filter((item) => item && item.id).length;

    if (!rows.length) {
      itemList.innerHTML = '<div class="transfer-empty"><strong>Yüklənəcək məlumat yoxdur</strong><p>Seçilmiş kateqoriya üçün hazır qeyd tapılmadı.</p></div>';
      summary.textContent = '0 element hazırdır';
      return;
    }

    if (BULK_TYPES.has(type)) {
      const labelMap = {
        customers: 'Bütün müştərilər',
        employees: 'Bütün işçilər',
        cashiers: 'Bütün kassirlər',
        products: 'Bütün mallar',
        'bonus-cards': 'Bütün bonus kartları',
        warehouses: 'Bütün anbarlar'
      };

      itemList.innerHTML = `
        <div class="transfer-empty">
          <strong>${labelMap[type]}</strong>
          <p>Bu seçimdə siyahıdan fərdi element seçmək olmaz; sistem avtomatik olaraq bütün ${labelMap[type].toLowerCase()}i qəbul edir.</p>
        </div>
      `;
      summary.textContent = `${selectedCount} element hazırdır`;
      return;
    }

    itemList.innerHTML = rows.map((item) => `
      <label class="transfer-row">
        <input type="checkbox" value="${item.id}" data-transfer-item="${item.id}">
        <div>
          <strong>${formatLabel(type, item)}</strong>
          <small>${type === 'products' ? `${item.category || 'Kateqoriya'} • ${Number(item.price || 0).toFixed(2)} ₼` : item.phone || item.login || item.email || item.workplace || item.status || 'Məlumat'}</small>
        </div>
      </label>
    `).join('');

    summary.textContent = `${selectedCount} element hazırdır`;
  };

  const renderQueue = () => {
    const queue = getQueue();
    if (!queueList) return;

    if (!queue.length) {
      queueList.innerHTML = '<div class="transfer-empty"><strong>Hələ kassa yüklənməsi göndərilməyib</strong><p>Seçim etdiyiniz məlumatlar burada görünəcək.</p></div>';
      if (uploadEmpty) uploadEmpty.hidden = false;
      return;
    }

    if (uploadEmpty) uploadEmpty.hidden = true;
    queueList.innerHTML = queue.slice().reverse().map((entry) => `
      <div class="transfer-history-item">
        <div>
          <strong>${entry.registerName || 'Kassa'}</strong>
          <small>${entry.typeLabel || 'Yükləmə'} • ${entry.dateLabel || 'Bu gün'}</small>
        </div>
        <span>${entry.count || 0} ədəd</span>
      </div>
    `).join('');
  };

  const afterRender = () => {
    renderRegisters();
    renderList();
    renderQueue();
  };

  registerSelect?.addEventListener('change', () => {
    const selected = registerSelect.value;
    if (selected) {
      summary.textContent = `${getSourceItems(typeSelect.value).length} element hazırdır`;
    }
  });

  typeSelect?.addEventListener('change', () => {
    renderList();
  });

  sendButton?.addEventListener('click', async () => {
    const registerId = registerSelect?.value;
    const type = typeSelect?.value;
    const selectedBoxes = [...view.querySelectorAll('input[data-transfer-item]:checked')];

    if (!registerId) {
      window.showErpToast?.('Öncə kassanı seçin.');
      return;
    }

    if (!type) {
      window.showErpToast?.('Yükləmə növünü seçin.');
      return;
    }

    const availableRegisters = getRegisters();
    const targetRegisters = registerId === ALL_REGISTERS_VALUE
      ? availableRegisters.filter((item) => item && item.id)
      : availableRegisters.filter((item) => String(item.id) === String(registerId));

    if (!targetRegisters.length) {
      window.showErpToast?.('Göndəriləcək kassa tapılmadı.');
      return;
    }

    const availableRows = getSourceItems(type);
    const rows = BULK_TYPES.has(type)
      ? availableRows
      : availableRows.filter((item) => selectedBoxes.some((box) => String(box.value) === String(item.id)));

    if (!BULK_TYPES.has(type) && !selectedBoxes.length) {
      window.showErpToast?.('Öncə göndəriləcək elementləri seçin.');
      return;
    }

    if (!rows.length) {
      window.showErpToast?.('Göndəriləcək məlumat tapılmadı.');
      return;
    }

    const typeLabel = {
      customers: 'Müştərilər',
      employees: 'İşçilər',
      products: 'Mallar',
      cashiers: 'Kassirlər',
      'bonus-cards': 'Bonus kartları',
      warehouses: 'Anbarlar'
    }[type] || 'Yükləmə';

    let sentCount = 0;
    try {
      for (const register of targetRegisters) {
        const response = await fetch(`${getApiBaseUrl()}/api/cash-loads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kassa_id: Number(register.id),
            yukleme_novu: typeLabel,
            status: 0,
          })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          throw new Error(data.message || 'Yükləmə yazılmadı.');
        }
        sentCount += 1;
      }

      selectedBoxes.forEach((box) => { box.checked = false; });
      await loadCashLoadsFromServer();
      summary.textContent = `${sentCount} kassa üçün yükləmə yazıldı`;
      const registerNames = targetRegisters.map((item) => item.name || 'Kassa').join(', ');
      window.showErpToast?.(`${sentCount} kassa ${registerId === ALL_REGISTERS_VALUE ? 'bütün kassalara' : registerNames} göndərildi.`);
    } catch (error) {
      window.showErpToast?.(error.message || 'Server ilə əlaqə xətası.');
    }
  });

  afterRender();
  loadCashLoadsFromServer();
  window.kassalaraYuklemeModulu = { goster: afterRender };
})();
