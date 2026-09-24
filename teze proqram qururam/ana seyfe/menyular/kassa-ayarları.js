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

  const modal = document.querySelector('#kassa-modal');
  const form = document.querySelector('#kassa-form');
  const list = document.querySelector('#kassa-list');
  const empty = document.querySelector('#kassa-empty');
  const count = document.querySelector('#kassa-count');
  const search = document.querySelector('#kassa-search');
  const filter = document.querySelector('#kassa-filter');
  const storageKey = 'marketErpCashRegisters';
  const workplaceStorageKey = 'marketErpWorkplaces';
  const warehouseStorageKey = 'marketErpWarehouses';

  if (!modal || !form || !list || !search || !filter) return;

  const field = (id) => form.querySelector(`#kassa-${id}`);
  const toast = (text) => window.showErpToast?.(text);
  const getRegisters = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const saveRegisters = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

  const getWorkplaceOptions = () => {
    const workplaces = JSON.parse(localStorage.getItem(workplaceStorageKey) || '[]');
    if (!workplaces.length) {
      return [{ label: 'Market Mərkəz Filialı', value: '' }];
    }
    return workplaces.map((item) => ({ label: item.name || item.is_yeri_adi || 'Filial', value: String(item.id ?? '') })).filter((item) => item.value !== '');
  };

  const getWarehouseOptions = () => {
    const warehouses = JSON.parse(localStorage.getItem(warehouseStorageKey) || '[]');
    const selectedWorkplace = field('workplace')?.value || '';
    const items = selectedWorkplace
      ? warehouses.filter((item) => String(item.workplaceId ?? item.is_yeri_id ?? '') === String(selectedWorkplace))
      : warehouses;
    if (!items.length) {
      return [{ label: 'Əsas anbar', value: '' }];
    }
    return items.map((item) => ({ label: item.name || item.anbar_adi || 'Anbar', value: String(item.id ?? '') })).filter((item) => item.value !== '');
  };

  const setOptions = (select, values, selectedValue) => {
    if (!select) return;
    const normalizedValues = values.map((value) => typeof value === 'string' ? { label: value, value } : value);
    select.innerHTML = normalizedValues.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
    const fallback = normalizedValues[0]?.value || '';
    const safeSelected = normalizedValues.some((item) => item.value === String(selectedValue)) ? String(selectedValue) : fallback;
    if (safeSelected) select.value = safeSelected;
  };

  const populateSelects = () => {
    const workplaceSelect = field('workplace');
    const warehouseSelect = field('warehouse');
    const cashierSelect = field('cashier');
    const priceList = field('price-list');

    if (workplaceSelect) {
      const values = getWorkplaceOptions();
      setOptions(workplaceSelect, values.length ? values : [{ label: 'Market Mərkəz Filialı', value: '' }], workplaceSelect.value || values[0]?.value || '');
    }

    if (warehouseSelect) {
      const values = getWarehouseOptions();
      setOptions(warehouseSelect, values.length ? values : [{ label: 'Əsas anbar', value: '' }], warehouseSelect.value || values[0]?.value || '');
    }

    if (cashierSelect) {
      const cashiers = JSON.parse(localStorage.getItem('marketErpCashiers') || '[]');
      const values = cashiers.length ? cashiers.map((item) => ({ label: item.name || `${item.firstName} ${item.lastName}`, value: String(item.id ?? '') })) : [{ label: 'Kassir 1', value: '' }];
      setOptions(cashierSelect, values, cashierSelect.value || values[0]?.value || '');
    }

    if (priceList) {
      const values = ['Bazar qiyməti', 'Topdan qiymət', 'Kassada qiymət', 'Xüsusi tarif'];
      setOptions(priceList, values, priceList.value || values[0]);
    }
  };

  const resetForm = () => {
    form.reset();
    const idField = field('id');
    if (idField) idField.value = '';
    document.querySelector('#kassa-title').textContent = 'Yeni kassa';
    populateSelects();
    const discountField = field('discount');
    if (discountField) discountField.value = '0';
    const statusField = field('status');
    if (statusField) statusField.value = 'active';
    const syncField = field('sync');
    if (syncField) syncField.value = 'online';
  };

  const refreshCashRegistersFromServer = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/cash-registers`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || !Array.isArray(data.cash_registers)) {
        return;
      }

      const normalized = data.cash_registers.map((row) => ({
        id: row.id,
        name: row.kassa_adi || 'Kassa',
        workplace: row.is_yeri_adi || row.filiali || '',
        workplaceId: row.filiali ?? '',
        warehouse: row.anbar_adi || row.anbar_id || '',
        warehouseId: row.anbar_id ?? '',
        status: 'active',
        type: 'Standart POS',
        ip: '',
        port: '',
        printer: '',
        terminal: '',
        priceList: 'Bazar qiyməti',
        sync: 'online',
      }));

      saveRegisters(normalized);
      render();
    } catch (error) {
      console.warn('Kassalar serverdən yenilənmədi:', error);
    }
  };

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const registers = getRegisters().filter((item) => {
      const haystack = `${item.name || ''} ${item.workplace || ''} ${item.warehouse || ''} ${item.ip || ''} ${item.printer || ''}`.toLowerCase();
      const matchesQuery = haystack.includes(query);
      return matchesQuery && (filter.value === 'all' || item.status === filter.value);
    });

    list.innerHTML = registers.map((item) => `
      <tr>
        <td><strong>${item.name || 'Kassa'}</strong><small class="table-code">${item.type || 'Standart POS'}</small></td>
        <td>${item.workplace || '-'}<small class="table-code">${item.warehouse || '-'}</small></td>
        <td>${item.ip || '-'}<small class="table-code">${item.port || '-'}</small></td>
        <td>${item.printer || '-'}<small class="table-code">${item.terminal || '-'}</small></td>
        <td>${item.priceList || 'Bazar qiyməti'}<small class="table-code">${item.sync || 'online'}</small></td>
        <td><span class="status-badge ${item.status || 'active'}">${item.status === 'offline' ? 'Offline' : item.status === 'maintenance' ? 'Xidmətdə' : 'Aktiv'}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" data-kassa-edit="${item.id}" aria-label="Redaktə et">✎</button>
            <button type="button" data-kassa-delete="${item.id}" aria-label="Sil">⌫</button>
          </div>
        </td>
      </tr>
    `).join('');

    empty.hidden = registers.length > 0;
    count.textContent = `${registers.length} kassa`;

    list.querySelectorAll('[data-kassa-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const register = getRegisters().find((item) => item.id === button.dataset.kassaEdit);
        openModal(register);
      });
    });

    list.querySelectorAll('[data-kassa-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.kassaDelete;
        if (!targetId || !window.confirm('Bu kassa konfiqurasiyasını silmək istədiyinizə əminsiniz?')) return;

        try {
          const response = await fetch(`${getApiBaseUrl()}/api/cash-registers/${targetId}`, { method: 'DELETE' });
          const data = await response.json();

          if (!response.ok || data.status !== 'success') {
            toast(data.message || 'Kassa silinmədi.');
            return;
          }

          await refreshCashRegistersFromServer();
          toast('Kassa silindi.');
        } catch (error) {
          toast('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const openModal = (register = null) => {
    resetForm();

    if (register) {
      document.querySelector('#kassa-title').textContent = 'Kassanı redaktə et';
      const values = {
        id: register.id || '',
        name: register.name || '',
        workplace: register.workplace || '',
        warehouse: register.warehouse || '',
        type: register.type || 'Standart POS',
        ip: register.ip || '',
        port: register.port || '',
        'price-list': register.priceList || 'Bazar qiyməti',
        discount: register.discount || '0',
        'sales-limit': register.salesLimit || '',
        'return-limit': register.returnLimit || '',
        status: register.status || 'active',
        sync: register.sync || 'online',
        printer: register.printer || '',
        terminal: register.terminal || '',
        serial: register.serial || '',
        cashier: register.cashier || '',
        notes: register.notes || '',
      };

      Object.entries(values).forEach(([key, value]) => {
        const input = field(key);
        if (input) input.value = value ?? '';
      });
    }

    populateSelects();
    modal.hidden = false;
    field('name')?.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
  };

  document.querySelector('#add-kassa-ayar')?.addEventListener('click', () => openModal());
  document.querySelector('#close-kassa-modal')?.addEventListener('click', closeModal);
  document.querySelector('#cancel-kassa')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = (field('name')?.value || '').trim();
    const workplaceId = field('workplace')?.value || '';
    const warehouseId = field('warehouse')?.value || '';
    const id = field('id')?.value || '';

    if (!name || !workplaceId || !warehouseId) {
      toast('Kassa adı, filial və anbar seçimi tələb olunur.');
      return;
    }

    const payload = {
      kassa_adi: name,
      filiali: Number(workplaceId),
      anbar_id: Number(warehouseId),
    };

    if (id) payload.id = id;

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(id ? `${apiBaseUrl}/api/cash-registers/${id}` : `${apiBaseUrl}/api/cash-registers`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        toast(data.message || 'Kassa yadda saxlanılmadı.');
        return;
      }

      closeModal();
      await refreshCashRegistersFromServer();
      toast(id ? 'Kassa məlumatları yeniləndi.' : 'Yeni kassa əlavə edildi.');
    } catch (error) {
      toast('Server ilə əlaqə xətası.');
    }
  });

  populateSelects();
  refreshCashRegistersFromServer();
  window.kassaAyarModulu = { goster: render };
})();
