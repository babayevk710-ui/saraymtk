(() => {
  const warehouseNameInput = document.querySelector('#warehouse-name');
  const warehouseWorkplaceSelect = document.querySelector('#warehouse-workplace');
  const warehouseCapacityInput = document.querySelector('#warehouse-capacity');
  const warehouseList = document.querySelector('#warehouse-list');
  const warehouseEmpty = document.querySelector('#warehouse-empty');
  const warehouseTotalCount = document.querySelector('#warehouse-total-count');
  const addWarehouseButton = document.querySelector('#add-warehouse');

  const STORAGE_KEY = 'marketErpWarehouses';

  const getWarehouses = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  };

  const saveWarehouses = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const normalizeWarehouse = (row = {}) => ({
    id: row.id,
    name: row.anbar_adi || row.name || 'Anbar',
    workplaceId: row.is_yeri_id ?? row.workplace_id ?? null,
    workplace: row.is_yeri_adi || row.workplace || row.workplace_name || 'Market Mərkəz Filialı',
    capacity: row.pul_miqdari ?? row.capacity ?? 'Tutum qeyd olunmayıb',
    status: row.status === 'passiv' ? 'inactive' : 'active',
    createdAt: row.yaradilma_tarixi || row.createdAt || new Date().toISOString(),
  });

  const refreshWarehousesFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/warehouses', { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success' || !Array.isArray(data.warehouses)) return;
      saveWarehouses(data.warehouses.map(normalizeWarehouse));
      renderWarehouses();
    } catch (error) {
      console.warn('Anbarlar yenilənmədi:', error);
    }
  };

  const renderWarehouses = () => {
    if (!warehouseList || !warehouseTotalCount) return;

    const selectedWorkplaceId = warehouseWorkplaceSelect?.value;
    const items = getWarehouses().filter((warehouse) => {
      const warehouseWorkplaceId = warehouse.workplaceId ?? warehouse.is_yeri_id ?? null;
      return selectedWorkplaceId ? String(warehouseWorkplaceId) === String(selectedWorkplaceId) : true;
    });
    warehouseTotalCount.textContent = items.length;

    if (!items.length) {
      warehouseList.innerHTML = '';
      if (warehouseEmpty) warehouseEmpty.hidden = false;
      return;
    }

    if (warehouseEmpty) warehouseEmpty.hidden = true;
    warehouseList.innerHTML = items.map((warehouse) => `
      <li>
        <div>
          <strong>${warehouse.name}</strong>
          <small>${warehouse.workplace || 'İş yeri yoxdur'} • ${warehouse.capacity || 'Tutum qeyd olunmayıb'}</small>
        </div>
        <button type="button" data-remove-warehouse="${warehouse.id}">Sil</button>
      </li>
    `).join('');

    warehouseList.querySelectorAll('[data-remove-warehouse]').forEach((button) => {
      button.addEventListener('click', async () => {
        const targetId = button.dataset.removeWarehouse;
        if (!targetId) return;
        try {
          const response = await fetch(`http://94.20.88.181:5050/api/warehouses/${targetId}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok || data.status !== 'success') {
            if (window.showErpToast) window.showErpToast(data.message || 'Anbar silinmədi.');
            return;
          }
          await refreshWarehousesFromServer();
          if (window.showErpToast) window.showErpToast('Anbar silindi.');
        } catch (error) {
          if (window.showErpToast) window.showErpToast('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const addWarehouse = async () => {
    const name = warehouseNameInput?.value.trim();
    const workplace = warehouseWorkplaceSelect?.value || 'Market Mərkəz Filialı';
    const capacity = warehouseCapacityInput?.value.trim();

    if (!name || !workplace) {
      if (window.showErpToast) window.showErpToast('Anbar adı və iş yeri vacibdir.');
      return;
    }

    const workplaceRecord = JSON.parse(localStorage.getItem('marketErpWorkplaces') || '[]').find((item) => item.name === workplace || String(item.id) === String(workplace));
    const payload = {
      anbar_adi: name,
      is_yeri_id: workplaceRecord?.id ?? null,
      pul_miqdari: Number(capacity || 0),
      status: 'aktiv',
    };

    try {
      const response = await fetch('http://94.20.88.181:5050/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        if (window.showErpToast) window.showErpToast(data.message || 'Anbar yaradılmadı.');
        return;
      }
      if (warehouseNameInput) warehouseNameInput.value = '';
      if (warehouseCapacityInput) warehouseCapacityInput.value = '';
      await refreshWarehousesFromServer();
      if (window.showErpToast) window.showErpToast('Anbar əlavə edildi.');
    } catch (error) {
      if (window.showErpToast) window.showErpToast('Server ilə əlaqə xətası.');
    }
  };

  if (warehouseWorkplaceSelect) {
    warehouseWorkplaceSelect.addEventListener('change', renderWarehouses);
  }

  const ARCHIVE_KEY = 'marketErpWarehouseDocs';
  const warehouseDocSearch = document.querySelector('#warehouse-doc-search');
  const warehouseDocKindFilter = document.querySelector('#warehouse-doc-kind-filter');
  let warehouseDocsLoadedFromServer = false;

  const getWarehouseDocs = () => {
    try {
      return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    } catch (error) {
      return [];
    }
  };
  const saveWarehouseDocs = (items) => localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items));

  const loadWarehouseDocumentsFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/warehouse-documents', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result?.status === 'success' && Array.isArray(result.warehouse_documents)) {
        saveWarehouseDocs(result.warehouse_documents);
      }
    } catch (error) {
      console.warn('Anbar sənədləri serverdən alınmadı, lokal arxiv istifadə olunur.', error);
    } finally {
      warehouseDocsLoadedFromServer = true;
    }
    renderWarehouseDocuments();
  };
  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getFilteredWarehouseDocs = () => {
    const docs = getWarehouseDocs();
    const query = (warehouseDocSearch?.value || '').trim().toLowerCase();
    const kind = warehouseDocKindFilter?.value || 'all';

    return docs.filter((doc) => {
      const matchesKind = kind === 'all' || doc.kind === kind;
      if (!matchesKind) return false;

      if (!query) return true;

      const haystack = [
        doc.number,
        doc.date,
        doc.partyName,
        doc.user,
        doc.kindLabel,
        doc.status,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(query);
    }).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.number || '').localeCompare(String(a.number || '')));
  };

  const closeWarehouseDocContextMenu = () => {
    document.querySelectorAll('.warehouse-doc-context-menu').forEach((menu) => menu.remove());
  };

  const applyWarehouseDocAction = (id, action) => {
    const record = getWarehouseDocs().find((doc) => doc.id === id || doc.docId === id);
    if (!record) return;

    if (action === 'view') {
      if (window.marketErpOpenArchiveDocument) window.marketErpOpenArchiveDocument(id, 'view');
      closeWarehouseDocContextMenu();
      return;
    }
    if (action === 'edit') {
      if (record.locked) {
        if (window.showErpToast) window.showErpToast('Bu sənəd kilidlidir, dəyişdirmək olmaz.');
        closeWarehouseDocContextMenu();
        return;
      }
      if (window.marketErpOpenArchiveDocument) window.marketErpOpenArchiveDocument(id, 'edit');
      closeWarehouseDocContextMenu();
      return;
    }
    if (action === 'lock') {
      const docs = getWarehouseDocs();
      const nextDocs = docs.map((doc) => {
        if (doc.id === id || doc.docId === id) {
          return { ...doc, locked: !Boolean(doc.locked) };
        }
        return doc;
      });
      saveWarehouseDocs(nextDocs);
      renderWarehouseDocuments();
      if (window.showErpToast) {
        const lockedState = !(record.locked || false);
        window.showErpToast(lockedState ? 'Sənəd kilidləndi.' : 'Sənədin kilidi açıldı.');
      }
      closeWarehouseDocContextMenu();
      return;
    }
    if (action === 'delete' && window.confirm('Bu sənədi silmək istədiyinizə əminsiniz?')) {
      saveWarehouseDocs(getWarehouseDocs().filter((doc) => doc.id !== id && doc.docId !== id));
      renderWarehouseDocuments();
      if (window.showErpToast) window.showErpToast('Sənəd silindi.');
      closeWarehouseDocContextMenu();
    }
  };

  const openWarehouseDocContextMenu = (event, record) => {
    closeWarehouseDocContextMenu();
    const menu = document.createElement('div');
    menu.className = 'warehouse-doc-context-menu product-context-menu';
    menu.innerHTML = `
      <button type="button" data-warehouse-doc-context="view" data-warehouse-doc-id="${record.id}">Bax</button>
      <button type="button" data-warehouse-doc-context="edit" data-warehouse-doc-id="${record.id}" ${record.locked ? 'disabled' : ''}>Dəyişdir</button>
      <button type="button" data-warehouse-doc-context="lock" data-warehouse-doc-id="${record.id}">${record.locked ? 'Kilidi aç' : 'Kilidlə'}</button>
      <button type="button" data-warehouse-doc-context="delete" data-warehouse-doc-id="${record.id}">Sil</button>
    `;
    document.body.appendChild(menu);
    const x = Math.min(event.clientX || 0, window.innerWidth - 220);
    const y = Math.min(event.clientY || 0, window.innerHeight - 180);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.querySelectorAll('[data-warehouse-doc-context]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.warehouseDocContext;
        const id = button.dataset.warehouseDocId;
        applyWarehouseDocAction(id, action);
      });
    });

    document.addEventListener('click', closeWarehouseDocContextMenu, { once: true });
  };

  const renderWarehouseDocuments = () => {
    const list = document.querySelector('#warehouse-doc-list');
    const empty = document.querySelector('#warehouse-doc-empty');
    const count = document.querySelector('#warehouse-doc-count');
    const latestDate = document.querySelector('#warehouse-doc-latest-date');
    if (!list) return;

    const docs = getFilteredWarehouseDocs();
    if (count) count.textContent = String(docs.length);
    if (latestDate) latestDate.textContent = docs[0]?.date || '-';

    if (!docs.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    list.innerHTML = docs.map((doc) => `
      <tr data-warehouse-doc-id="${doc.id}">
        <td>${doc.date || '-'}</td>
        <td>${doc.number || '-'}</td>
        <td>${doc.kindLabel || 'Sənəd'}</td>
        <td>${doc.partyName || '-'}</td>
        <td>${doc.user || 'Admin'}</td>
        <td>${formatMoney(doc.total)} ₼</td>
        <td><span class="status-pill ${doc.locked ? 'inactive' : 'active'}">${doc.locked ? 'Kilidli' : 'Aktiv'}</span></td>
        <td>—</td>
      </tr>
    `).join('');

    list.querySelectorAll('tr[data-warehouse-doc-id]').forEach((row) => {
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const record = getWarehouseDocs().find((doc) => doc.id === row.dataset.warehouseDocId || doc.docId === row.dataset.warehouseDocId);
        if (!record) return;
        openWarehouseDocContextMenu(event, record);
      });
    });
  };

  const archiveDocument = (documentEntry, kind) => {
    const source = documentEntry || {};
    const entry = {
      id: `warehouse-doc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      docId: source.id || null,
      kind,
      kindLabel: {
        purchase: 'Alış Sənədi',
        sales: 'Satış Sənədi',
        'supplier-return': 'Firmaya Mal Qaytarılması',
      }[kind] || 'Sənəd',
      number: source.number || '-',
      date: source.date || new Date().toISOString().slice(0, 10),
      partyName: source.supplier || source.customer || source.company || '-',
      user: source.user || 'Admin',
      total: Number(source.total || 0),
      status: source.status || 'draft',
      locked: Boolean(source.locked),
      items: Array.isArray(source.items) ? source.items : [],
    };
    const docs = getWarehouseDocs();
    docs.unshift(entry);
    saveWarehouseDocs(docs);
    renderWarehouseDocuments();
    return entry;
  };

  const openArchiveDocument = (docId, mode = 'view') => {
    const record = getWarehouseDocs().find((doc) => doc.id === docId || doc.docId === docId);
    if (!record) return;
    if (record.locked && mode === 'edit') {
      if (window.showErpToast) window.showErpToast('Bu sənəd kilidlidir, baxış rejimində açılır.');
      mode = 'view';
    }
    const targetMap = {
      purchase: { href: '#alis-senedleri', selector: '#alis-senedleri-view', loader: 'openPurchaseDocFromArchive' },
      sales: { href: '#satis-senedleri', selector: '#satis-senedleri-view', loader: 'openSalesDocFromArchive' },
      'supplier-return': { href: '#firmaya-mal-qaytarilmasi', selector: '#firmaya-mal-qaytarilmasi-view', loader: 'openSupplierReturnDocFromArchive' },
      'customer-return': { href: '#musteriden-qayidan-mallar-view', selector: '#musteriden-qayidan-mallar-view', loader: 'openCustomerReturnDocFromArchive' },
    };
    const target = targetMap[record.kind];
    if (!target) return;
    if (typeof activateNavigation === 'function') {
      activateNavigation(target.href);
    } else if (window.activateNavigation) {
      window.activateNavigation(target.href);
    } else if (typeof setActiveModule === 'function') {
      setActiveModule(target.selector.replace('#', ''));
    } else if (typeof window.setActiveModule === 'function') {
      window.setActiveModule(target.selector.replace('#', ''));
    }
    if (window[target.loader]) window[target.loader](record.docId || record.id, mode, record);
  };

  if (warehouseDocSearch) {
    warehouseDocSearch.addEventListener('input', renderWarehouseDocuments);
  }
  if (warehouseDocKindFilter) {
    warehouseDocKindFilter.addEventListener('change', renderWarehouseDocuments);
  }

  window.renderWarehouses = renderWarehouses;
  window.marketErpArchiveDocument = archiveDocument;
  window.marketErpOpenArchiveDocument = openArchiveDocument;
  window.marketErpWarehouseDocumentsRender = () => {
    if (!warehouseDocsLoadedFromServer) {
      loadWarehouseDocumentsFromServer();
      return;
    }
    renderWarehouseDocuments();
  };
  renderWarehouses();
  renderWarehouseDocuments();
  loadWarehouseDocumentsFromServer();
})();
