(() => {
  const getApiBaseUrl = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('marketErpServerSettings') || '{}');
      const baseIp = (saved.serverIp || saved.server_ip || '94.20.88.181').trim();
      const basePort = (saved.serverPort || saved.server_port || '5050').trim();
      return baseIp && basePort ? `http://${baseIp}:${basePort}` : 'http://94.20.88.181:5050';
    } catch (error) {
      return 'http://94.20.88.181:5050';
    }
  };

  const modal = document.querySelector('#cashier-modal');
  const form = document.querySelector('#cashier-form');
  const list = document.querySelector('#cashier-list');
  const empty = document.querySelector('#cashier-empty');
  const count = document.querySelector('#cashier-count');
  const search = document.querySelector('#cashier-search');
  const filter = document.querySelector('#cashier-filter');
  const storageKey = 'marketErpCashiers';

  if (!modal || !form || !list || !search || !filter) return;

  const field = (id) => form.querySelector(`#cashier-${id}`);
  const toast = (text, options) => window.showErpToast?.(text, options);
  const getCashiers = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const saveCashiers = (items) => localStorage.setItem(storageKey, JSON.stringify(items));
  let lastDeletedCashier = null;

  const restoreDeletedCashier = async () => {
    if (!lastDeletedCashier) {
      toast('Geri qaytarmaq üçün silinmiş kassir yoxdur.');
      return;
    }

    const restored = lastDeletedCashier;
    lastDeletedCashier = null;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/cashiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adi: restored.firstName || '',
          soyadi: restored.lastName || '',
          ata_adi: restored.fatherName || '',
          telefon: restored.phone || '',
          istifadeci_adi: restored.login || '',
          giris_kodu: restored.code || '',
          parola: restored.password || '',
        })
      });

      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        toast(data.message || 'Kassir geri qaytarılmadı.');
        return;
      }

      await fetchCashiersFromServer();
      toast('Kassir geri qaytarıldı.');
    } catch (error) {
      toast('Server ilə əlaqə xətası.');
    }
  };

  const normalizeCashierRecord = (row = {}) => {
    const adi = row.adi || row.firstName || row.first_name || row.ad || '';
    const soyadi = row.soyadi || row.lastName || row.last_name || row.soyad || '';
    const ataAdi = row.ata_adi || row.fatherName || row.father_name || row.ata_adi_adi || '';
    const fallbackName = row.name || row.full_name || row.ad_soyad || row.display_name || '';
    const adSoyad = [fallbackName, [adi, soyadi, ataAdi].filter(Boolean).join(' ').trim()].filter(Boolean).join(' ').trim();

    return {
      id: row.id,
      userId: row.user_id || row.userId || '',
      firstName: adi,
      lastName: soyadi,
      fatherName: ataAdi,
      name: adSoyad,
      phone: row.telefon || row.phone || '',
      login: row.istifadeci_adi || row.login || row.username || '',
      code: row.giris_kodu || row.code || '',
      password: row.parola || row.password || '',
      status: row.status || 'active',
      permissions: {},
      notes: row.notes || '',
    };
  };

  const fetchCashiersFromServer = async () => {
    try {
      let response;
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await fetch(`${getApiBaseUrl()}/api/cashiers`, { method: 'GET', cache: 'no-store' });
          break;
        } catch (fetchError) {
          lastError = fetchError;
          if (attempt === 1) throw fetchError;
        }
      }
      if (!response) throw lastError || new Error('Kassirlər serverdən cavabsız qaldı.');
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || !Array.isArray(data.cashiers)) {
        return;
      }

      const normalized = data.cashiers.map(normalizeCashierRecord);
      saveCashiers(normalized);
      render();
    } catch (error) {
      console.warn('Kassirlər serverdən yenilənmədi:', error);
    }
  };

  const buildForm = () => {
    form.innerHTML = `
      <input type="hidden" id="cashier-id">
      <div class="cashier-form-section">
        <p class="form-section-label">Şəxsi məlumatlar</p>
        <div class="form-grid">
          <label>Ad<input id="cashier-first-name" required placeholder="Aysel"></label>
          <label>Soyad<input id="cashier-last-name" required placeholder="Məmmədova"></label>
          <label>Ata adı<input id="cashier-father-name" placeholder="Rauf qızı"></label>
          <label>Telefon<input id="cashier-phone" type="tel" placeholder="+994 50 000 00 00"></label>
        </div>
      </div>

      <div class="cashier-form-section">
        <p class="form-section-label">Giriş məlumatları</p>
        <div class="form-grid">
          <label>Login<input id="cashier-login" required autocomplete="off" placeholder="aysel.m"></label>
          <label>Giriş kodu<input id="cashier-code" required inputmode="numeric" maxlength="6" placeholder="6 rəqəm"></label>
          <label>Parol<input id="cashier-password" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="new-password" placeholder="6 rəqəm"></label>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary-button" id="cancel-cashier-inline" type="button">Ləğv et</button>
        <button class="primary-button" type="submit">Yadda saxla</button>
      </div>
    `;

    const inlineCancelButton = form.querySelector('#cancel-cashier-inline');
    if (inlineCancelButton) {
      inlineCancelButton.addEventListener('click', closeModal);
    }

    const numericInputs = ['code'];
    numericInputs.forEach((name) => {
      const input = field(name);
      if (input) {
        input.addEventListener('input', (event) => {
          event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
        });
      }
    });

    const passwordInput = field('password');
    if (passwordInput) {
      passwordInput.addEventListener('input', (event) => {
        event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
      });
    }

    const phoneInput = field('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', (event) => {
        event.target.value = event.target.value.replace(/[^+0-9 ]/g, '').slice(0, 17);
      });
    }
  };

  const render = () => {
    const query = search.value.trim().toLocaleLowerCase('az-AZ');
    const cashiers = getCashiers().filter((cashier) => {
      const haystack = `${cashier.name || ''} ${cashier.login || ''} ${cashier.code || ''}`.toLocaleLowerCase('az-AZ');
      const matchesQuery = haystack.includes(query);
      return matchesQuery && (filter.value === 'all' || cashier.status === filter.value);
    });

    list.innerHTML = cashiers.map((cashier) => `
      <tr>
        <td>
          <div class="employee-person">
            <span>${(cashier.name || 'K').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'K'}</span>
            <div>
              <strong>${cashier.name || 'Kassir'}</strong>
              <small>${cashier.login || '-'}</small>
            </div>
          </div>
        </td>
        <td>
          <strong>${cashier.login || '-'}</strong>
          <small class="table-code">Kod: ${cashier.code || '-'}</small>
        </td>
        <td>
          <strong>${cashier.phone || '-'}</strong>
          <small class="table-code">${cashier.name || '-'}</small>
        </td>
        <td>
          <span class="status-badge ${cashier.status || 'active'}">Aktiv</span>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" data-cashier-edit="${cashier.id}" aria-label="Redaktə et">✎</button>
            <button type="button" data-cashier-delete="${cashier.id}" aria-label="Sil">⌫</button>
          </div>
        </td>
      </tr>
    `).join('');

    empty.hidden = cashiers.length > 0;
    count.textContent = `${cashiers.length} kassir`;

    list.querySelectorAll('[data-cashier-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const cashier = getCashiers().find((item) => String(item.id) === String(button.dataset.cashierEdit));
        openModal(cashier);
      });
    });

    list.querySelectorAll('[data-cashier-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.cashierDelete;
        if (!targetId || !window.confirm('Bu kassiri silmək istədiyinizə əminsiniz?')) return;

        const deletedCashier = getCashiers().find((item) => String(item.id) === String(targetId));
        if (!deletedCashier) return;

        lastDeletedCashier = deletedCashier;

        try {
          const response = await fetch(`${getApiBaseUrl()}/api/cashiers/${targetId}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok || data.status !== 'success') {
            lastDeletedCashier = null;
            toast(data.message || 'Kassir silinmədi.');
            return;
          }

          await fetchCashiersFromServer();
          toast('Kassir silindi.', {
            actionLabel: 'Geri qaytar',
            onAction: restoreDeletedCashier,
          });
        } catch (error) {
          lastDeletedCashier = null;
          toast('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const resetForm = () => {
    form.reset();
    const idField = field('id');
    if (idField) idField.value = '';
    document.querySelector('#cashier-title').textContent = 'Yeni kassir';
  };

  const openModal = (cashier = null) => {
    resetForm();

    if (cashier) {
      document.querySelector('#cashier-title').textContent = 'Kassiri redaktə et';
      const values = {
        id: cashier.id || '',
        'first-name': cashier.firstName || '',
        'last-name': cashier.lastName || '',
        'father-name': cashier.fatherName || '',
        phone: cashier.phone || '',
        login: cashier.login || '',
        code: cashier.code || '',
        password: cashier.password || '',
      };

      Object.entries(values).forEach(([key, value]) => {
        const input = field(key);
        if (input) input.value = value ?? '';
      });

      const passwordField = field('password');
      if (passwordField) passwordField.required = false;
    } else {
      const passwordField = field('password');
      if (passwordField) passwordField.required = true;
    }

    modal.hidden = false;
    const firstNameField = field('first-name');
    if (firstNameField) firstNameField.focus();
  };

  const closeModal = () => {
    modal.hidden = true;
  };

  document.querySelector('#add-cashier')?.addEventListener('click', () => openModal());
  document.querySelector('#close-cashier')?.addEventListener('click', closeModal);
  document.querySelector('#cancel-cashier')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstName = (field('first-name')?.value || '').trim();
    const lastName = (field('last-name')?.value || '').trim();
    const login = (field('login')?.value || '').trim();
    const code = (field('code')?.value || '').trim();
    const password = (field('password')?.value || '').trim();
    const id = field('id')?.value || '';

    if (!firstName || !lastName || !login || !code || !password) {
      toast('Ad, soyad, login, giriş kodu və parol tələb olunur.');
      return;
    }

    if (!/^\d{6}$/.test(password)) {
      toast('Parol yalnız 6 rəqəm olmalıdır.');
      return;
    }

    const payload = {
      adi: firstName,
      soyadi: lastName,
      ata_adi: (field('father-name')?.value || '').trim(),
      telefon: (field('phone')?.value || '').trim(),
      istifadeci_adi: login,
      giris_kodu: code,
      parola: password,
    };

    if (id) payload.id = id;

    try {
      const response = await fetch(id ? `${getApiBaseUrl()}/api/cashiers/${id}` : `${getApiBaseUrl()}/api/cashiers`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        toast(data.message || 'Kassir yadda saxlanılmadı.');
        return;
      }

      closeModal();
      await fetchCashiersFromServer();
      toast(id ? 'Kassir məlumatları yeniləndi.' : 'Yeni kassir əlavə edildi.');
    } catch (error) {
      toast('Server ilə əlaqə xətası.');
    }
  });

  buildForm();
  fetchCashiersFromServer();
  window.kassirModulu = { goster: render };
})();
