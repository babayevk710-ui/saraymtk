(() => {
  const modal = document.querySelector('#company-modal');
  const form = document.querySelector('#company-form');
  const list = document.querySelector('#company-list');
  const empty = document.querySelector('#company-empty');
  const count = document.querySelector('#company-count');
  const search = document.querySelector('#company-search');
  const filter = document.querySelector('#company-filter');
  const storageKey = 'marketErpCompanies';

  const normalizeServerCompany = (supplier = {}) => {
    const rawCreditLimit = Number(supplier.borc_limiti ?? supplier.creditLimit ?? 0);
    const rawDebt = Number(supplier.aktiv_borc ?? supplier.debt ?? 0);
    const creditLimit = Number.isFinite(rawCreditLimit) ? rawCreditLimit : 0;
    const activeDebt = Number.isFinite(rawDebt) ? rawDebt : 0;
    const debtStatus = supplier.borc_status || 'normal';

    return {
      id: supplier.id ?? `company-${Date.now()}`,
      name: supplier.firma_adi || supplier.name || 'Firma',
      code: supplier.firma_kodu || supplier.code || '',
      status: supplier.status === 'passiv' ? 'inactive' : 'active',
      createdAt: supplier.yaradilma_tarixi ? String(supplier.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10),
      address: supplier.unvan || supplier.address || '',
      email: supplier.email || '',
      phone: supplier.telefon || supplier.phone || '',
      creditLimit,
      debt: activeDebt,
      debtStatus
    };
  };

  const getCompanies = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved) && saved.length) {
        const normalized = saved.map((company) => ({
          ...company,
          debt: Number.isFinite(Number(company.debt ?? company.aktiv_borc ?? 0)) ? Number(company.debt ?? company.aktiv_borc ?? 0) : 0,
          debtStatus: company.debtStatus || company.borc_status || 'normal',
          creditLimit: Number.isFinite(Number(company.creditLimit ?? company.borc_limiti ?? 0)) ? Number(company.creditLimit ?? company.borc_limiti ?? 0) : 0,
        }));
        if (JSON.stringify(normalized) !== JSON.stringify(saved)) localStorage.setItem(storageKey, JSON.stringify(normalized));
        return normalized;
      }

      const serverSuppliers = JSON.parse(localStorage.getItem('erpSuppliers') || '[]');
      if (Array.isArray(serverSuppliers) && serverSuppliers.length) {
        const normalized = serverSuppliers.map(normalizeServerCompany);
        localStorage.setItem(storageKey, JSON.stringify(normalized));
        return normalized;
      }

      return [];
    } catch (error) {
      return [];
    }
  };

  const saveCompanies = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

  const generateCompanyCode = () => {
    const companies = getCompanies();
    const numericCodes = companies
      .map((company) => Number(String(company.code || '').replace(/\D/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);

    const nextNumber = numericCodes.length ? Math.max(...numericCodes) + 1 : 1;
    return `F-${String(nextNumber).padStart(3, '0')}`;
  };

  const showMessage = (text) => window.showErpToast?.(text);

  const normalizePhone = (value = '') => String(value).replace(/[^0-9+()\-\s]/g, '').slice(0, 20);
  const normalizeCreditLimit = (value) => Number(String(value).replace(/[^0-9.\-]/g, '') || 0);

  const bindPhoneInput = () => {
    const phoneInput = document.querySelector('#company-phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', () => {
      phoneInput.value = normalizePhone(phoneInput.value);
    });
  };

  const seedCompanies = () => {
    const current = getCompanies();
    return current;
  };

  const closeCompanyContextMenu = () => {
    document.querySelectorAll('.company-context-menu').forEach((menu) => menu.remove());
  };

  const openCompanyContextMenu = (event, company) => {
    closeCompanyContextMenu();
    const menu = document.createElement('div');
    menu.className = 'company-context-menu product-context-menu';
    menu.innerHTML = `
      <button type="button" data-company-action="edit" data-company-id="${company.id}">Düzəliş et</button>
      <button type="button" data-company-action="delete" data-company-id="${company.id}">Sil</button>
    `;

    document.body.appendChild(menu);
    const x = Math.min(event.clientX || 0, window.innerWidth - 220);
    const y = Math.min(event.clientY || 0, window.innerHeight - 120);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.querySelectorAll('[data-company-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.companyAction;
        const id = button.dataset.companyId;
        const selected = getCompanies().find((companyItem) => companyItem.id === id);
        if (!selected) return;

        if (action === 'edit') {
          openModal(selected);
        }
        if (action === 'delete') {
          if (!window.confirm('Bu firmayı silmək istədiyinizə əminsiniz?')) return;
          saveCompanies(getCompanies().filter((companyItem) => companyItem.id !== id));
          render();
          showMessage('Firma silindi.');
        }
        closeCompanyContextMenu();
      });
    });

    document.addEventListener('click', closeCompanyContextMenu, { once: true });
  };

  const refreshCompaniesFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/suppliers', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || data?.status !== 'success' || !Array.isArray(data.suppliers)) return;

      const normalized = data.suppliers.map(normalizeServerCompany);
      localStorage.setItem(storageKey, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      return null;
    }
  };

  const render = async () => {
    await refreshCompaniesFromServer();
    const companies = seedCompanies();
    const query = (search?.value || '').trim().toLowerCase();
    const selectedStatus = filter?.value || 'all';

    const filtered = companies.filter((company) => {
      const matchesQuery = !query || [company.name, company.code, company.email, company.phone, company.address].join(' ').toLowerCase().includes(query);
      const matchesStatus = selectedStatus === 'all' || company.status === selectedStatus;
      return matchesQuery && matchesStatus;
    });

    count.textContent = `${filtered.length} firma`;

    if (!filtered.length) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    list.innerHTML = filtered.map((company) => {
      const creditLimit = Number(company.creditLimit ?? 0);
      const activeDebt = Number(company.debt ?? company.aktiv_borc ?? 0);
      const debtStatus = company.debtStatus || 'normal';
      const statusText = debtStatus === 'limit_asib' ? 'İcazə var' : 'İcazə yoxdur';

      return `
        <tr data-company-row="${company.id}">
          <td>${company.createdAt ? company.createdAt.slice(0, 10) : '-'}</td>
          <td><strong>${company.name}</strong></td>
          <td>${company.code || '-'}</td>
          <td><span class="status-pill ${company.status || 'active'}">${company.status === 'inactive' ? 'passiv' : 'aktiv'}</span></td>
          <td>${company.address || '-'}</td>
          <td>${company.email || '-'}</td>
          <td>${company.phone || '-'}</td>
          <td><strong>${creditLimit.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼</strong></td>
          <td>
            <div class="debt-summary ${debtStatus === 'limit_asib' ? 'is-ok' : 'is-danger'}">
              <strong>${activeDebt.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼</strong>
              <small>${statusText}</small>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button type="button" data-company-edit="${company.id}" aria-label="Firmayı redaktə et">✎</button>
              <button type="button" data-company-delete="${company.id}" aria-label="Firmayı sil">⌫</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    list.querySelectorAll('[data-company-row]').forEach((row) => {
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const company = getCompanies().find((companyItem) => companyItem.id === row.dataset.companyRow);
        if (company) openCompanyContextMenu(event, company);
      });
    });

    list.querySelectorAll('[data-company-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const company = getCompanies().find((companyItem) => String(companyItem.id) === String(button.dataset.companyEdit));
        if (company) openModal(company);
      });
    });

    list.querySelectorAll('[data-company-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.companyDelete;
        if (!window.confirm('Bu firmayı silmək istədiyinizə əminsiniz?')) return;

        try {
          const response = await fetch(`http://94.20.88.181:5050/api/suppliers/${id}`, { method: 'DELETE' });
          const result = await response.json();
          if (!response.ok || result?.status !== 'success') {
            throw new Error(result?.message || 'Firma silinmədı.');
          }
        } catch (error) {
          showMessage(error.message || 'Silinmə xətası.');
          return;
        }

        saveCompanies(getCompanies().filter((company) => company.id !== id));
        render();
        showMessage('Firma silindi.');
      });
    });
  };

  const resetForm = () => {
    form.reset();
    document.querySelector('#company-id').value = '';
    document.querySelector('#company-code').value = generateCompanyCode();
    document.querySelector('#company-created-at').value = new Date().toISOString().slice(0, 10);
    document.querySelector('#company-status').value = 'active';
    document.querySelector('#company-debt').value = '0';
    document.querySelector('#company-debt-status').value = 'normal';
    document.querySelector('#company-modal-title').textContent = 'Yeni firma';
  };

  const openModal = (company = null) => {
    resetForm();
    if (company) {
      document.querySelector('#company-id').value = company.id || '';
      document.querySelector('#company-name').value = company.name || '';
      document.querySelector('#company-code').value = company.code || '';
      document.querySelector('#company-created-at').value = company.createdAt ? company.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      document.querySelector('#company-status').value = company.status || 'active';
      document.querySelector('#company-address').value = company.address || '';
      document.querySelector('#company-email').value = company.email || '';
      document.querySelector('#company-phone').value = normalizePhone(company.phone);
      document.querySelector('#company-debt').value = Number(company.creditLimit ?? 0);
      document.querySelector('#company-debt-status').value = company.debtStatus || 'normal';
      document.querySelector('#company-modal-title').textContent = 'Firmayı redaktə et';
    }
    modal.hidden = false;
    document.querySelector('#company-name').focus();
  };

  const closeModal = () => {
    modal.hidden = true;
  };

  document.querySelector('#add-company')?.addEventListener('click', () => openModal());
  document.querySelector('#close-company-modal')?.addEventListener('click', closeModal);
  document.querySelector('#cancel-company')?.addEventListener('click', closeModal);
  bindPhoneInput();
  search?.addEventListener('input', render);
  filter?.addEventListener('change', render);
  render();

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.querySelector('#company-id').value.trim();
    const name = document.querySelector('#company-name').value.trim();
    const code = document.querySelector('#company-code').value.trim();
    const createdAt = document.querySelector('#company-created-at').value.trim();
    const status = document.querySelector('#company-status').value || 'active';
    const address = document.querySelector('#company-address').value.trim();
    const email = document.querySelector('#company-email').value.trim();
    const phone = normalizePhone(document.querySelector('#company-phone').value);
    const creditLimit = normalizeCreditLimit(document.querySelector('#company-debt').value);
    const debtStatus = document.querySelector('#company-debt-status').value || 'normal';
    const activeDebt = 0;

    if (!name || !code) {
      showMessage('Firma adı və kodu tələb olunur.');
      return;
    }

    const payload = {
      firma_adi: name,
      firma_kodu: code,
      status: status === 'inactive' ? 'passiv' : 'aktiv',
      unvan: address,
      email,
      telefon: phone,
      borc_limiti: creditLimit,
      aktiv_borc: activeDebt,
      borc_status: debtStatus,
      yaradilma_tarixi: createdAt || new Date().toISOString().slice(0, 10)
    };

    try {
      const url = id ? `http://94.20.88.181:5050/api/suppliers/${id}` : 'http://94.20.88.181:5050/api/suppliers';
      const response = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(id ? { ...payload, id } : payload)
      });

      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Firma yadda saxlanılmadı.');
      }

      const created = result.supplier || { id: id || `company-${Date.now()}`, ...payload };
      const item = {
        id: String(created.id || `company-${Date.now()}`),
        name: created.firma_adi || name,
        code: created.firma_kodu || code,
        status: (created.status || payload.status) === 'passiv' ? 'inactive' : 'active',
        createdAt: created.yaradilma_tarixi ? String(created.yaradilma_tarixi).slice(0, 10) : (createdAt || new Date().toISOString().slice(0, 10)),
        address: created.unvan || address,
        email: created.email || email,
        phone: created.telefon || phone,
        creditLimit: Number(created.borc_limiti ?? creditLimit),
        debt: Number(created.aktiv_borc ?? activeDebt),
        debtStatus: created.borc_status || debtStatus
      };

      const companies = getCompanies();
      const index = companies.findIndex((company) => String(company.id) === String(item.id));
      if (index >= 0) companies[index] = item;
      else companies.unshift(item);
      saveCompanies(companies);

      render();
      closeModal();

      const autoCreate = window.__erpAfterCreate;
      if (autoCreate?.type === 'company') {
        window.__erpTriggerAfterCreate?.(item);
      } else {
        const fallbackSelector = window.__erpSelectionTarget?.selector || '#purchase-supplier';
        const fallbackTarget = document.querySelector(fallbackSelector) || document.querySelector('#supplier-return-company');
        if (fallbackTarget && item?.name) fallbackTarget.value = item.name;
        window.__erpAfterCreate = null;
        window.__erpSelectionTarget = null;
      }

      showMessage(result.message || 'Firma yadda saxlanıldı.');
    } catch (error) {
      showMessage(error.message || 'Firma yadda saxlanılmadı.');
    }
  });

  window.firmaModulu = { goster: render };
})();
