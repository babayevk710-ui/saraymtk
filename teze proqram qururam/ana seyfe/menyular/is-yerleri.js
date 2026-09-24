(() => {
  const workplacesView = document.querySelector('#workplaces-view');
  const workplaceModal = document.querySelector('#workplace-modal');
  const workplaceForm = document.querySelector('#workplace-form');
  const workplaceIdInput = document.querySelector('#workplace-id');
  const workplaceCodeInput = document.querySelector('#workplace-code');
  const workplaceNameInput = document.querySelector('#workplace-name');
  const workplaceTypeInput = document.querySelector('#workplace-type');
  const workplaceAddressInput = document.querySelector('#workplace-address');
  const workplacePhoneInput = document.querySelector('#workplace-phone');
  const workplaceManagerInput = document.querySelector('#workplace-manager');
  const workplaceStatusInput = document.querySelector('#workplace-status');
  const workplaceList = document.querySelector('#workplace-list');
  const workplaceEmpty = document.querySelector('#workplace-empty');
  const workplaceTotalCount = document.querySelector('#workplace-total-count');
  const warehouseWorkplaceSelect = document.querySelector('#warehouse-workplace');
  const addWorkplaceButton = document.querySelector('#add-workplace');
  const closeWorkplaceModalButton = document.querySelector('#close-workplace-modal');
  const cancelWorkplaceButton = document.querySelector('#cancel-workplace');

  const STORAGE_KEY = 'marketErpWorkplaces';

  const apiUrl = 'http://94.20.88.181:5050';

  const getWorkplaces = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  };

  const saveWorkplaces = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const normalizeDbWorkplace = (workplace = {}) => ({
    id: workplace.id,
    name: workplace.is_yeri_adi || workplace.name || 'İş yeri',
    code: workplace.is_yeri_kodu || workplace.code || `IS-${Date.now()}`,
    type: workplace.is_yeri_novu || workplace.type || 'filial',
    address: workplace.unvan || workplace.address || '',
    phone: workplace.telefon || workplace.phone || '',
    manager: workplace.rehber_adi || workplace.manager || '',
    status: workplace.status === 'passiv' || workplace.status === 'inactive' ? 'inactive' : 'active',
    createdAt: workplace.yaradilma_tarixi || workplace.createdAt || new Date().toISOString().slice(0, 10)
  });

  const normalizeUiWorkplace = (workplace = {}) => ({
    id: workplace.id,
    is_yeri_adi: workplace.name || '',
    is_yeri_kodu: workplace.code || `IS-${Date.now()}`,
    is_yeri_novu: workplace.type || 'filial',
    unvan: workplace.address || '',
    telefon: workplace.phone || '',
    rehber_adi: workplace.manager || '',
    status: workplace.status === 'inactive' || workplace.status === 'passiv' ? 'passiv' : 'aktiv'
  });

  const refreshWorkplacesFromServer = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/workplaces`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') return;
      const normalized = Array.isArray(data.workplaces) ? data.workplaces.map((item) => normalizeDbWorkplace(item)) : [];
      saveWorkplaces(normalized);
      renderWorkplaces();
      populateWarehouseSelect();
      if (window.renderWarehouses) window.renderWarehouses();
    } catch (error) {
      console.warn('İş yerləri serverdən yüklənmədi:', error);
    }
  };

  const populateWarehouseSelect = () => {
    if (!warehouseWorkplaceSelect) return;
    const workplaces = getWorkplaces();
    const selected = warehouseWorkplaceSelect.value || String(workplaces[0]?.id ?? '');
    warehouseWorkplaceSelect.innerHTML = workplaces.length
      ? workplaces.map((item) => `<option value="${item.id ?? ''}">${item.name}</option>`).join('')
      : '<option value="">İlk əvvə iş yeri yaradın</option>';
    warehouseWorkplaceSelect.value = [...warehouseWorkplaceSelect.options].some((option) => option.value === String(selected)) ? String(selected) : warehouseWorkplaceSelect.options[0]?.value || '';
  };

  const renderWorkplaces = () => {
    if (!workplaceList || !workplaceEmpty || !workplaceTotalCount) return;
    const workplaces = getWorkplaces();
    workplaceTotalCount.textContent = workplaces.length;

    if (!workplaces.length) {
      workplaceList.innerHTML = '';
      workplaceEmpty.hidden = false;
      return;
    }

    workplaceEmpty.hidden = true;
    workplaceList.innerHTML = workplaces.map((workplace) => `
      <div class="workplace-item" data-workplace-id="${workplace.id ?? ''}" data-workplace-name="${workplace.name}">
        <div class="workplace-item-main">
          <div class="workplace-badge">${(workplace.type || 'F').charAt(0).toUpperCase()}</div>
          <div class="workplace-meta">
            <strong>${workplace.name}</strong>
            <small>${workplace.address || 'Ünvan yoxdur'} • ${workplace.manager || 'Məsul şəxs yoxdur'}</small>
          </div>
        </div>
        <div class="workplace-actions">
          <span class="status-pill ${workplace.status || 'active'}">${workplace.status === 'inactive' || workplace.status === 'passiv' ? 'passiv' : 'aktiv'}</span>
          <button type="button" class="inline-edit" data-edit-workplace="${workplace.id ?? ''}" aria-label="${workplace.name} redaktə et">Düzəliş</button>
          <button type="button" class="inline-delete" data-remove-workplace="${workplace.id ?? ''}" aria-label="${workplace.name} sil">Sil</button>
        </div>
      </div>
    `).join('');

    workplaceList.querySelectorAll('[data-edit-workplace]').forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.editWorkplace;
        const target = getWorkplaces().find((item) => String(item.id) === String(targetId));
        if (!target) return;
        if (workplaceModal) workplaceModal.hidden = false;
        if (workplaceIdInput) workplaceIdInput.value = target.id || '';
        if (workplaceCodeInput) workplaceCodeInput.value = target.code || '';
        if (workplaceNameInput) workplaceNameInput.value = target.name || '';
        if (workplaceTypeInput) workplaceTypeInput.value = target.type || 'filial';
        if (workplaceAddressInput) workplaceAddressInput.value = target.address || '';
        if (workplacePhoneInput) workplacePhoneInput.value = target.phone || '';
        if (workplaceManagerInput) workplaceManagerInput.value = target.manager || '';
        if (workplaceStatusInput) workplaceStatusInput.value = target.status === 'inactive' ? 'inactive' : 'active';
      });
    });

    workplaceList.querySelectorAll('[data-remove-workplace]').forEach((button) => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.removeWorkplace;
        const target = getWorkplaces().find((item) => String(item.id) === String(targetId));
        if (!target || target.id == null) return;

        try {
          const response = await fetch(`${apiUrl}/api/workplaces/${target.id}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok || data.status !== 'success') {
            if (window.showErpToast) window.showErpToast(data.message || 'İş yeri silinmədi.');
            return;
          }

          await refreshWorkplacesFromServer();
          if (window.showErpToast) window.showErpToast('İş yeri silindi.');
        } catch (error) {
          if (window.showErpToast) window.showErpToast('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const closeModal = () => {
    if (workplaceModal) workplaceModal.hidden = true;
    if (workplaceForm) workplaceForm.reset();
    if (workplaceIdInput) workplaceIdInput.value = '';
  };

  if (addWorkplaceButton) {
    addWorkplaceButton.addEventListener('click', () => {
      if (workplaceModal) workplaceModal.hidden = false;
      if (workplaceIdInput) workplaceIdInput.value = '';
      if (workplaceCodeInput) workplaceCodeInput.value = `IS-${Date.now().toString().slice(-6)}`;
      if (workplaceTypeInput) workplaceTypeInput.value = 'filial';
      if (workplaceStatusInput) workplaceStatusInput.value = 'active';
    });
  }

  if (closeWorkplaceModalButton) closeWorkplaceModalButton.addEventListener('click', closeModal);
  if (cancelWorkplaceButton) cancelWorkplaceButton.addEventListener('click', closeModal);
  if (workplaceModal) {
    workplaceModal.addEventListener('click', (event) => {
      if (event.target === workplaceModal) closeModal();
    });
  }

  if (workplaceForm && !workplaceForm.dataset.erpWorkplaceBound) {
    workplaceForm.dataset.erpWorkplaceBound = 'true';
    workplaceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = workplaceNameInput?.value.trim();
      const address = workplaceAddressInput?.value.trim();
      if (!name || !address) {
        if (window.showErpToast) window.showErpToast('İş yeri adı və ünvanı vacibdir.');
        return;
      }

      const code = workplaceCodeInput?.value.trim() || `IS-${Date.now().toString().slice(-6)}`;
      const existingWorkplaces = getWorkplaces();
      const payload = {
        id: workplaceIdInput?.value || undefined,
        name,
        code,
        type: workplaceTypeInput?.value || 'filial',
        address,
        phone: workplacePhoneInput?.value.trim() || '',
        manager: workplaceManagerInput?.value.trim() || '',
        status: workplaceStatusInput?.value || 'active'
      };

      const apiPayload = normalizeUiWorkplace(payload);
      const method = payload.id ? 'PUT' : 'POST';
      const url = payload.id ? `${apiUrl}/api/workplaces/${payload.id}` : `${apiUrl}/api/workplaces`;

      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          if (window.showErpToast) window.showErpToast(data.message || 'İş yeri yadda saxlanılmadı.');
          return;
        }

        const nextItem = normalizeDbWorkplace({
          ...(apiPayload),
          id: data.workplace?.id || payload.id || Date.now(),
          is_yeri_adi: apiPayload.is_yeri_adi,
          is_yeri_novu: apiPayload.is_yeri_novu,
          unvan: apiPayload.unvan,
          telefon: apiPayload.telefon,
          rehber_adi: apiPayload.rehber_adi,
          is_yeri_kodu: apiPayload.is_yeri_kodu,
          status: apiPayload.status,
          yaradilma_tarixi: new Date().toISOString().slice(0, 10)
        });

        const updated = payload.id
          ? existingWorkplaces.map((item) => (String(item.id) === String(payload.id) ? nextItem : item))
          : [nextItem, ...existingWorkplaces];

        saveWorkplaces(updated);
        renderWorkplaces();
        populateWarehouseSelect();
        if (window.renderWarehouses) window.renderWarehouses();
        closeModal();
        if (window.showErpToast) window.showErpToast('İş yeri yadda saxlanıldı.');
      } catch (error) {
        if (window.showErpToast) window.showErpToast('Server ilə əlaqə xətası.');
      }
    });
  }

  window.renderWorkplaces = renderWorkplaces;
  window.populateWarehouseSelect = populateWarehouseSelect;
  window.refreshWorkplacesFromServer = refreshWorkplacesFromServer;
  refreshWorkplacesFromServer();
})();
