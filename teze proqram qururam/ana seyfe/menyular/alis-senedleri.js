(() => {
  const view = document.querySelector('#alis-senedleri-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpPurchaseDocs';
  const PRODUCTS_KEY = 'marketErpProducts';
  const WORKPLACES_KEY = 'marketErpWorkplaces';
  const EMPLOYEES_KEY = 'marketErpEmployees';

  const getPurchaseDocs = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const savePurchaseDocs = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  const getProducts = () => (typeof window.erpGetProducts === 'function'
    ? window.erpGetProducts()
    : (JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]')));
  const getWorkplaces = () => JSON.parse(localStorage.getItem(WORKPLACES_KEY) || '[]');
  const getEmployees = () => JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
  const getWarehouseDocs = () => {
    try {
      return JSON.parse(localStorage.getItem('marketErpWarehouseDocs') || '[]');
    } catch {
      return [];
    }
  };

  const ensureSampleProducts = () => {
    try {
      const products = typeof window.erpGetProducts === 'function'
        ? window.erpGetProducts()
        : JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.warn('Məhsul siyahısı oxunmadı.', error);
      return [];
    }
  };

  const seedDocs = () => {
    const current = getPurchaseDocs();
    if (current.length) return current;

    const sample = [
      {
        id: 'doc-1',
        number: 'AL-2026-001',
        date: '2026-08-20',
        workplace: 'Market Mərkəz Filialı',
        user: 'Admin',
        supplier: 'Araz MMC',
        status: 'draft',
        total: 1250.5,
        items: [
          { name: 'Süd 1L', qty: 30, price: 3.5 },
          { name: 'Şokolad 100q', qty: 20, price: 4.2 }
        ]
      }
    ];

    savePurchaseDocs(sample);
    return sample;
  };

  const form = view.querySelector('#purchase-doc-form');
  const list = view.querySelector('#purchase-doc-list');
  const empty = view.querySelector('#purchase-doc-empty');
  const count = view.querySelector('#purchase-doc-count');
  const workplaceSelect = view.querySelector('#purchase-workplace');
  const userSelect = view.querySelector('#purchase-user');
  const itemTableBody = view.querySelector('#purchase-item-list');
  const totalAmount = view.querySelector('#purchase-total-amount');
  const supplierInput = view.querySelector('#purchase-supplier');
  const supplierPickerButton = view.querySelector('#purchase-supplier-picker');
  const purchaseSupplierPickerModal = document.querySelector('#purchase-supplier-picker-modal');
  const purchaseSupplierPickerList = document.querySelector('#purchase-supplier-picker-list');
  const purchaseSupplierPickerSearch = document.querySelector('#purchase-supplier-picker-search');
  const purchaseSupplierPickerCount = document.querySelector('#purchase-supplier-picker-count');
  const purchaseSupplierPickerClose = document.querySelector('#close-purchase-supplier-picker');
  const purchaseSupplierPickerCancel = document.querySelector('#cancel-purchase-supplier-picker');
  const purchaseSupplierPickerAdd = document.querySelector('#add-purchase-supplier');
  const statusSelect = view.querySelector('#purchase-status');
  const selectCreatedCompany = (company) => {
    if (!company || !supplierInput) return;
    supplierInput.value = company.name || 'Tədarükçü';
    if (purchaseSupplierPickerModal) purchaseSupplierPickerModal.hidden = true;
    window.__erpAfterCreate = null;
  };
  const docNumberInput = view.querySelector('#purchase-number');
  const docDateInput = view.querySelector('#purchase-date');

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const bindOnce = (element, key, callback) => {
    if (!element || element.dataset.boundKey === key) return;
    element.dataset.boundKey = key;
    element.addEventListener('click', callback);
  };

  const getActiveProducts = () => ensureSampleProducts().filter((product) => (product.status || 'active') === 'active');

  const isActiveProduct = (product) => {
    const rawStatus = String(product?.status ?? 'active').toLowerCase();
    return rawStatus === '' || rawStatus === 'active' || rawStatus === 'aktiv' || rawStatus === 'enabled' || rawStatus === '1';
  };

  const PURCHASE_DRAFT_KEY = 'marketErpPurchaseDraftItems';

  const getSelectedItems = () => {
    const table = JSON.parse(localStorage.getItem(PURCHASE_DRAFT_KEY) || '[]');
    const items = Array.isArray(table) ? table : [];
    return items;
  };

  const saveSelectedItems = (items) => localStorage.setItem(PURCHASE_DRAFT_KEY, JSON.stringify(items));

  const applyLocalStockDelta = (items, direction) => {
    try {
      const products = getProducts();
      const next = products.map((product) => {
        const match = items.find((item) => {
          const code = String(item.mehsul_kodu || item.code || '').trim();
          return code && code === String(product.code || '').trim();
        });
        if (!match) return product;
        const qty = Number(match.miqdari || match.qty || 0);
        return { ...product, stock: Math.max(0, Number(product.stock || 0) + direction * qty) };
      });
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Lokal stok yenilənmədi.', error);
    }
  };

  const getSelectedWorkplaceId = () => {
    const selectedName = workplaceSelect?.value || '';
    const workplaces = getWorkplaces();
    const match = workplaces.find((item) => {
      const names = [item.name, item.is_yeri_adi, item.workplace_name, item.adi].filter(Boolean);
      return names.includes(selectedName);
    });
    const rawId = match?.id ?? match?.is_yeri_id ?? match?.workplace_id;
    const numericId = Number(rawId);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
  };

  const populateStaticSelects = () => {
    const workplaces = getWorkplaces();
    workplaceSelect.innerHTML = workplaces.length
      ? workplaces.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')
      : '<option value="Market Mərkəz Filialı">Market Mərkəz Filialı</option>';

    const currentLogin = (() => {
      try {
        return JSON.parse(localStorage.getItem('lastLogin') || 'null')?.login || 'Admin';
      } catch (error) {
        return 'Admin';
      }
    })();

    const employees = getEmployees();
    const employeeOptions = employees.length
      ? employees.map((item) => `<option value="${item.full_name || item.name || item.login_name || 'İdarəçi'}">${item.full_name || item.name || item.login_name || 'İdarəçi'}</option>`).join('')
      : '';

    const loginOption = !employees.some((item) => (item.full_name || item.name || item.login_name || 'İdarəçi') === currentLogin)
      ? `<option value="${currentLogin}">${currentLogin}</option>`
      : '';

    userSelect.innerHTML = `${employeeOptions}${loginOption}`;
    userSelect.value = currentLogin;
    userSelect.disabled = true;

    const products = ensureSampleProducts();
    return products;
  };

  const purchaseProductPickerModal = document.querySelector('#purchase-product-picker-modal');
  const purchaseProductPickerList = document.querySelector('#purchase-product-picker-list');
  const purchaseProductPickerSearch = document.querySelector('#purchase-product-picker-search');
  const purchaseProductPickerCount = document.querySelector('#purchase-product-picker-count');
  const purchaseProductPickerConfirm = document.querySelector('#confirm-purchase-picker');
  const purchaseProductPickerNew = document.querySelector('#new-purchase-product');
  const purchaseProductPickerClose = document.querySelector('#close-purchase-product-picker');
  const purchaseProductPickerCancel = document.querySelector('#cancel-purchase-picker');
  const selectedPurchasePickerProductIds = new Set();
  let activePurchasePickerRowIndex = null;

  const renderBlankProductRows = (count = 1) => {
    return Array.from({ length: count }, (_, index) => `
      <tr class="purchase-empty-row" data-purchase-placeholder="true">
        <td>${index + 1}</td>
        <td class="purchase-product-picker-cell">
          <button type="button" class="purchase-product-picker-trigger" data-picker-row="${index}" aria-label="Məhsul seç">•••</button>
          <span class="purchase-product-cell-label">Məhsul seç</span>
        </td>
        <td>—</td>
        <td><input class="purchase-edit-field" type="number" min="0" step="1" value="0" data-placeholder="true"></td>
        <td><input class="purchase-edit-field" type="text" value="əd" data-placeholder="true"></td>
        <td><input class="purchase-edit-field" type="number" min="0" step="0.01" value="0" data-placeholder="true"></td>
        <td><input class="purchase-edit-field" type="number" min="0" max="100" step="1" value="0" data-placeholder="true"></td>
        <td>0.00 ₼</td>
        <td>0.00 ₼</td>
        <td>0.00 ₼</td>
        <td><button type="button" class="inline-delete" aria-label="Sətiri sil">⌫</button></td>
      </tr>
    `).join('');
  };

  const recalcDraftItem = (item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    const discount = Number(item.discount || 0);
    const discountAmount = qty * price * (discount / 100);
    const taxableBase = qty * price - discountAmount;
    return {
      ...item,
      qty,
      price,
      discount,
      discountAmount,
      taxableBase,
      netAmount: taxableBase,
      total: qty * price,
    };
  };

  const getSelectedPickerProductIds = () => {
    return Array.from(selectedPurchasePickerProductIds);
  };

  const renderPurchaseProductPicker = () => {
    if (!purchaseProductPickerList || !purchaseProductPickerCount) return;

    const products = ensureSampleProducts();
    const search = (purchaseProductPickerSearch?.value || '').trim().toLowerCase();
    const filtered = products.filter((product) => {
      const barcodeItems = Array.isArray(product.barcodes)
        ? product.barcodes
        : (product.barcode ? [product.barcode] : []);
      const barcodeText = barcodeItems.join(' ');
      const text = [
        product.name,
        product.code,
        product.mehsul_kodu,
        product.product_code,
        product.category,
        product.unit,
        barcodeText,
        product.brand,
        product.company,
        product.firma_adi,
        product.warehouse,
        product.productType,
      ].filter(Boolean).join(' ').toLowerCase();
      const normalizedText = text.replace(/[\s_\-/\\]+/g, '');
      const normalizedSearch = search.replace(/[\s_\-/\\]+/g, '');
      return !search || text.includes(search) || normalizedText.includes(normalizedSearch);
    });

    purchaseProductPickerCount.textContent = `${filtered.length} məhsul`;
    purchaseProductPickerList.innerHTML = filtered.map((product) => {
      const purchasePrice = Number(product.alis_qiymeti ?? product.cost ?? product.price ?? 0);
      return `
        <tr data-picker-product-id="${product.id}" class="purchase-picker-row">
          <td><input type="checkbox" class="purchase-picker-check" aria-label="${product.name} seç" ${selectedPurchasePickerProductIds.has(String(product.id)) ? 'checked' : ''}></td>
          <td>
            <strong>${product.name}</strong>
            <small>${product.code}</small>
          </td>
          <td>${product.category || '-'}</td>
          <td>${product.unit || 'əd'}</td>
          <td>${formatMoney(purchasePrice)} ₼</td>
        </tr>
      `;
    }).join('');

    purchaseProductPickerList.querySelectorAll('.purchase-picker-row').forEach((row) => {
      const checkbox = row.querySelector('.purchase-picker-check');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          const productId = String(row.dataset.pickerProductId || '');
          if (checkbox.checked) selectedPurchasePickerProductIds.add(productId);
          else selectedPurchasePickerProductIds.delete(productId);
          row.classList.toggle('is-selected', checkbox.checked);
        });
      }
      row.addEventListener('click', (event) => {
        if (event.target === checkbox || event.target.closest('input')) return;
        const nextChecked = !checkbox.checked;
        checkbox.checked = nextChecked;
        const productId = String(row.dataset.pickerProductId || '');
        if (nextChecked) selectedPurchasePickerProductIds.add(productId);
        else selectedPurchasePickerProductIds.delete(productId);
        row.classList.toggle('is-selected', nextChecked);
      });
      row.addEventListener('dblclick', () => {
        addProductsToDraft([String(row.dataset.pickerProductId)]);
      });
    });

    const pickerSelectAll = document.querySelector('.purchase-picker-select-all');
    if (pickerSelectAll) {
      pickerSelectAll.checked = filtered.length > 0 && filtered.every((product) => selectedPurchasePickerProductIds.has(String(product.id)));
      pickerSelectAll.onchange = () => {
        filtered.forEach((product) => {
          const productId = String(product.id);
          if (pickerSelectAll.checked) selectedPurchasePickerProductIds.add(productId);
          else selectedPurchasePickerProductIds.delete(productId);
        });
        renderPurchaseProductPicker();
      };
    }
  };

  const openPurchaseProductPicker = (rowIndex = null) => {
    if (!purchaseProductPickerModal) return;
    activePurchasePickerRowIndex = rowIndex;
    window.__erpActivePicker = 'purchase';
    window.__erpPickerOwner = 'purchase';
    renderPurchaseProductPicker();
    purchaseProductPickerModal.hidden = false;
    setTimeout(() => purchaseProductPickerSearch?.focus(), 0);
  };

  const closePurchaseProductPicker = () => {
    if (!purchaseProductPickerModal) return;
    purchaseProductPickerModal.hidden = true;
    activePurchasePickerRowIndex = null;
    if (window.__erpActivePicker === 'purchase') {
      window.__erpActivePicker = null;
    }
    if (window.__erpPickerOwner === 'purchase') {
      window.__erpPickerOwner = null;
    }
    purchaseProductPickerSearch.value = '';
    selectedPurchasePickerProductIds.clear();
    renderPurchaseProductPicker();
  };

  const getCompanies = () => JSON.parse(localStorage.getItem('marketErpCompanies') || '[]');
  const isActiveCompany = (company) => {
    const rawStatus = String(company?.status ?? 'active').toLowerCase();
    return rawStatus === '' || rawStatus === 'active' || rawStatus === 'aktiv' || rawStatus === 'enabled' || rawStatus === '1';
  };

  const renderPurchaseSupplierPicker = () => {
    if (!purchaseSupplierPickerList || !purchaseSupplierPickerCount) return;

    const companies = getCompanies().filter(isActiveCompany);
    const search = (purchaseSupplierPickerSearch?.value || '').trim().toLowerCase();
    const filtered = companies.filter((company) => {
      const text = [company.name, company.code, company.email, company.phone, company.address].join(' ').toLowerCase();
      return !search || text.includes(search);
    });

    purchaseSupplierPickerCount.textContent = `${filtered.length} firma`;
    purchaseSupplierPickerList.innerHTML = filtered.length
      ? filtered.map((company) => `
          <tr data-purchase-supplier-id="${company.id}" class="purchase-picker-row supplier-picker-row" data-purchase-supplier-name="${company.name}">
            <td><strong>${company.name}</strong></td>
            <td>${company.code || '-'}</td>
            <td>${company.phone || '-'}</td>
            <td><span class="status-pill ${company.status || 'active'}">${company.status === 'inactive' ? 'passiv' : 'aktiv'}</span></td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">Heç bir firma tapılmadı.</td></tr>';

    purchaseSupplierPickerList.querySelectorAll('.supplier-picker-row').forEach((row) => {
      row.addEventListener('click', () => {
        const name = row.dataset.purchaseSupplierName;
        const targetInput = window.erpSupplierPickerTarget || supplierInput;
        if (name && targetInput) {
          targetInput.value = name;
          window.erpSupplierPickerTarget = null;
          closePurchaseSupplierPicker();
        }
      });
    });
  };

  const openPurchaseSupplierPicker = () => {
    if (!purchaseSupplierPickerModal) return;
    const target = window.erpSupplierPickerTarget || supplierInput;
    window.__erpActivePicker = target === document.querySelector('#supplier-return-company') ? 'supplier-return' : 'purchase';
    renderPurchaseSupplierPicker();
    purchaseSupplierPickerModal.hidden = false;
    setTimeout(() => purchaseSupplierPickerSearch?.focus(), 0);
  };

  const closePurchaseSupplierPicker = () => {
    if (!purchaseSupplierPickerModal) return;
    purchaseSupplierPickerModal.hidden = true;
    if (purchaseSupplierPickerSearch) purchaseSupplierPickerSearch.value = '';
    if (window.__erpActivePicker === 'purchase' || window.__erpActivePicker === 'supplier-return') {
      window.__erpActivePicker = null;
    }
    window.erpSupplierPickerTarget = null;
  };

  const addProductsToDraft = (productIds) => {
    const rawIds = Array.isArray(productIds) ? productIds : [productIds];
    const selectedIdSet = new Set(
      rawIds
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((id) => String(id ?? '').trim())
        .filter(Boolean)
    );

    if (!selectedIdSet.size) {
      const fallback = getSelectedPickerProductIds();
      fallback.forEach((id) => selectedIdSet.add(String(id).trim()));
    }

    if (!selectedIdSet.size) {
      window.showErpToast?.('Məhsul seçin.');
      return;
    }

    const products = ensureSampleProducts();
    const lookupMap = new Map();
    products.forEach((product) => {
      const productIdKey = String(product.id ?? '').trim();
      const codeKey = String(product.code ?? product.mehsul_kodu ?? product.product_code ?? '').trim();
      const nameKey = String(product.name ?? '').trim();
      if (productIdKey) lookupMap.set(productIdKey, product);
      if (codeKey) lookupMap.set(codeKey, product);
      if (nameKey) lookupMap.set(nameKey, product);
    });

    const nextItems = Array.from(selectedIdSet)
      .map((rawKey) => {
        const normalizedKey = String(rawKey ?? '').trim();
        if (!normalizedKey) return null;
        const directMatch = lookupMap.get(normalizedKey) || lookupMap.get(normalizedKey.toLowerCase());
        if (directMatch) return directMatch;
        const numericKey = String(Number(normalizedKey));
        return lookupMap.get(numericKey) || lookupMap.get(numericKey.toLowerCase()) || null;
      })
      .filter(Boolean)
      .filter((product, index, list) => list.findIndex((entry) => String(entry.id) === String(product.id)) === index)
      .map((product) => {
        const purchasePrice = Number(product.alis_qiymeti ?? product.cost ?? product.price ?? 0);
        return {
          id: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
          productId: product.id,
          name: product.name,
          code: product.code,
          qty: 1,
          price: purchasePrice,
          unit: product.unit || 'əd',
        };
      });

    if (!nextItems.length) {
      window.showErpToast?.('Seçilmiş məhsul tapılmadı.');
      return;
    }

    const existing = getSelectedItems();
    saveSelectedItems([...existing, ...nextItems]);
    updateDraftItems();
    closePurchaseProductPicker();
  };

  const refreshDraftSummary = () => {
    const items = getSelectedItems().map(recalcDraftItem);
    const rawTotal = items.reduce((total, item) => total + Number(item.total || 0), 0);
    const discountTotal = items.reduce((total, item) => total + Number(item.discountAmount || 0), 0);
    const netTotal = rawTotal - discountTotal;

    const totalAmountDisplay = document.querySelector('#purchase-total-amount');
    const totalDiscountDisplay = document.querySelector('#purchase-total-discount');
    const netDisplay = document.querySelector('#purchase-net-total');

    if (totalAmountDisplay) totalAmountDisplay.textContent = `${formatMoney(rawTotal)} ₼`;
    if (totalDiscountDisplay) totalDiscountDisplay.textContent = `${formatMoney(discountTotal)} ₼`;
    if (netDisplay) netDisplay.textContent = `${formatMoney(netTotal)} ₼`;
  };

  const updateDraftItems = () => {
    const items = getSelectedItems().map(recalcDraftItem);
    const rawTotal = items.reduce((total, item) => total + Number(item.total || 0), 0);
    const discountTotal = items.reduce((total, item) => total + Number(item.discountAmount || 0), 0);
    const netTotal = rawTotal - discountTotal;

    if (itemTableBody) {
      const rows = items.map((item, index) => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const discount = Number(item.discount || 0);
        const discountAmount = qty * price * (discount / 100);
        const netAmount = qty * price - discountAmount;
        return `
          <tr data-purchase-row-id="${item.id}">
            <td>${index + 1}</td>
            <td class="purchase-product-picker-cell">
              <button type="button" class="purchase-product-picker-trigger" data-picker-row="${index}" aria-label="Məhsul seç">•••</button>
              <div>
                <strong>${item.name || 'Məhsul seç'}</strong>
                <small>${item.code || 'Kod'}</small>
              </div>
            </td>
            <td><input class="purchase-edit-field" data-field="code" data-item-id="${item.id}" type="text" value="${item.code || ''}" readonly></td>
            <td><input class="purchase-edit-field" data-field="qty" data-item-id="${item.id}" type="number" min="0" step="1" value="${qty}"></td>
            <td><input class="purchase-edit-field" data-field="unit" data-item-id="${item.id}" type="text" value="${item.unit || 'əd'}" readonly></td>
            <td><input class="purchase-edit-field" data-field="price" data-item-id="${item.id}" type="number" min="0" step="0.01" value="${price}"></td>
            <td><input class="purchase-edit-field" data-field="discount" data-item-id="${item.id}" type="number" min="0" max="100" step="1" value="${discount}"></td>
            <td data-cell="discount-amount">${formatMoney(discountAmount)} ₼</td>
            <td data-cell="net-amount">${formatMoney(netAmount)} ₼</td>
            <td data-cell="total-amount">${formatMoney(qty * price)} ₼</td>
            <td><button type="button" class="inline-delete" data-remove-purchase-item="${item.id}" aria-label="Sətiri sil">⌫</button></td>
          </tr>
        `;
      }).join('');

      const placeholderRows = items.length ? 1 : 1;
      itemTableBody.innerHTML = `${rows}${renderBlankProductRows(placeholderRows)}`;
    }

    const totalAmountDisplay = document.querySelector('#purchase-total-amount');
    const totalDiscountDisplay = document.querySelector('#purchase-total-discount');
    const netDisplay = document.querySelector('#purchase-net-total');

    if (totalAmountDisplay) totalAmountDisplay.textContent = `${formatMoney(rawTotal)} ₼`;
    if (totalDiscountDisplay) totalDiscountDisplay.textContent = `${formatMoney(discountTotal)} ₼`;
    if (netDisplay) netDisplay.textContent = `${formatMoney(netTotal)} ₼`;

    itemTableBody?.querySelectorAll('[data-remove-purchase-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = getSelectedItems().filter((item) => item.id !== button.dataset.removePurchaseItem);
        saveSelectedItems(next);
        updateDraftItems();
      });
    });

    itemTableBody?.querySelectorAll('.purchase-product-picker-trigger').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        openPurchaseProductPicker(Number(button.dataset.pickerRow || 0));
      });
      button.addEventListener('dblclick', (event) => {
        event.preventDefault();
        const products = ensureSampleProducts();
        if (!products.length) return;
        addProductsToDraft([products[0].id]);
      });
    });

    itemTableBody?.querySelectorAll('.purchase-edit-field').forEach((input) => {
      if (input.dataset.placeholder === 'true') return;
      const lockedFields = ['code', 'unit'];
      const isLockedField = lockedFields.includes(input.dataset.field);
      if (isLockedField) {
        input.setAttribute('readonly', 'readonly');
        return;
      }

      input.addEventListener('focus', () => {
        const numericFields = ['qty', 'discount', 'price'];
        if (numericFields.includes(input.dataset.field) && input.value === '0') {
          input.value = '';
        }
      });

      input.addEventListener('input', () => {
        const itemId = input.dataset.itemId;
        const field = input.dataset.field;
        if (!itemId || !field) return;
        const items = getSelectedItems();
        const next = items.map((item) => {
          if (item.id !== itemId) return item;
          const numericFields = ['qty', 'discount', 'price'];
          const updated = { ...item, [field]: numericFields.includes(field) ? Number(input.value || 0) : input.value };
          return recalcDraftItem(updated);
        });
        saveSelectedItems(next);

        const row = input.closest('tr');
        if (row) {
          const item = next.find((entry) => entry.id === itemId);
          const discountCell = row.querySelector('[data-cell="discount-amount"]');
          const netCell = row.querySelector('[data-cell="net-amount"]');
          const totalCell = row.querySelector('[data-cell="total-amount"]');
          if (item) {
            const qty = Number(item.qty || 0);
            const price = Number(item.price || 0);
            const discount = Number(item.discount || 0);
            const discountAmount = qty * price * (discount / 100);
            const netAmount = qty * price - discountAmount;
            if (discountCell) discountCell.textContent = `${formatMoney(discountAmount)} ₼`;
            if (netCell) netCell.textContent = `${formatMoney(netAmount)} ₼`;
            if (totalCell) totalCell.textContent = `${formatMoney(qty * price)} ₼`;
          }
        }

        refreshDraftSummary();
      });
    });

    itemTableBody?.querySelectorAll('tr[data-purchase-row-id]').forEach((row) => {
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const rowId = row.dataset.purchaseRowId;
        const item = getSelectedItems().find((entry) => entry.id === rowId);
        if (!item) return;

        const menu = document.createElement('div');
        menu.className = 'product-context-menu';
        menu.innerHTML = `
          <button type="button" data-purchase-row-action="edit" data-purchase-row-id="${rowId}">Məhsulu redaktə et</button>
          <button type="button" data-purchase-row-action="new" data-purchase-row-id="${rowId}">Yeni məhsul yarat</button>
          <button type="button" data-purchase-row-action="delete" data-purchase-row-id="${rowId}">Sətiri sil</button>
        `;

        document.body.appendChild(menu);
        const x = Math.min(event.clientX || 0, window.innerWidth - 220);
        const y = Math.min(event.clientY || 0, window.innerHeight - 140);
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        menu.querySelectorAll('[data-purchase-row-action]').forEach((button) => {
          button.addEventListener('click', () => {
            const action = button.dataset.purchaseRowAction;
            if (action === 'delete') {
              const next = getSelectedItems().filter((entry) => entry.id !== rowId);
              saveSelectedItems(next);
              updateDraftItems();
            }
            if (action === 'edit') {
              const product = ensureSampleProducts().find((entry) => entry.id === item.productId || entry.name === item.name);
              if (product && window.openProductModal) window.openProductModal(product);
            }
            if (action === 'new') {
              if (window.openProductModal) window.openProductModal();
            }
            menu.remove();
          });
        });

        document.addEventListener('click', () => menu.remove(), { once: true });
      });
    });
  };

  const addProductToDraft = (productIds) => {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    const selectedIds = ids.length ? ids : getSelectedPickerProductIds();
    if (!selectedIds || !selectedIds.length) {
      window.showErpToast?.('Məhsul seçin.');
      return;
    }
    addProductsToDraft(selectedIds);
  };

  const resetForm = () => {
    if (form) form.reset();
    if (docNumberInput) {
      docNumberInput.value = '';
      docNumberInput.placeholder = 'Server tərəfindən veriləcək';
    }
    if (docDateInput) docDateInput.value = new Date().toISOString().slice(0, 10);
    if (statusSelect) statusSelect.value = 'draft';
    if (supplierInput) supplierInput.value = '';
    if (workplaceSelect) workplaceSelect.value = getWorkplaces()[0]?.name || 'Market Mərkəz Filialı';
    const currentLogin = (() => {
      try {
        return JSON.parse(localStorage.getItem('lastLogin') || 'null')?.login || 'Admin';
      } catch (error) {
        return 'Admin';
      }
    })();
    if (userSelect) {
      userSelect.value = currentLogin;
      userSelect.disabled = true;
    }
    saveSelectedItems([]);
    updateDraftItems();

    const saveButton = document.querySelector('#purchase-save');
    if (saveButton) {
      saveButton.hidden = false;
      saveButton.disabled = false;
    }
    form?.querySelectorAll('input, select, textarea, button').forEach((element) => {
      element.disabled = false;
    });
    if (userSelect) userSelect.disabled = true;
    if (supplierPickerButton) supplierPickerButton.disabled = false;
  };

  window.resetPurchaseForm = resetForm;

  const renderDocs = async () => {
    if (!list) return;

    try {
      const response = await fetch('http://94.20.88.181:5050/api/purchase-documents', { cache: 'no-store' });
      const result = await response.json();
      const docs = response.ok && result?.status === 'success' && Array.isArray(result.purchase_documents)
        ? result.purchase_documents.map((row) => ({
            id: row.id,
            number: row.islem_nomresi,
            date: row.tarix ? String(row.tarix).slice(0, 10) : '',
            workplace: row.is_yeri_id || 'Filial',
            user: row.isdifadeci || 'İstifadəçi',
            supplier: row.tedarukcu || 'Tedarükçü',
            total: Number(row.toplam || 0),
            status: 'draft',
            items: [],
          }))
        : seedDocs();

      const rows = docs.map((doc) => `
        <tr>
          <td><strong>${doc.number}</strong></td>
          <td>${doc.date}</td>
          <td>${doc.workplace}</td>
          <td>${doc.user}</td>
          <td>${doc.supplier}</td>
          <td>${formatMoney(doc.total)} ₼</td>
          <td><span class="status-pill ${doc.status || 'draft'}">${doc.status === 'approved' ? 'Təsdiqlənib' : doc.status === 'sent' ? 'Göndərilib' : 'Qaralama'}</span></td>
        </tr>
      `).join('');

      list.innerHTML = rows;
      if (count) count.textContent = `${docs.length} sənəd`;
      if (empty) empty.hidden = docs.length > 0;
    } catch (error) {
      const docs = seedDocs();
      const rows = docs.map((doc) => `
        <tr>
          <td><strong>${doc.number}</strong></td>
          <td>${doc.date}</td>
          <td>${doc.workplace}</td>
          <td>${doc.user}</td>
          <td>${doc.supplier}</td>
          <td>${formatMoney(doc.total)} ₼</td>
          <td><span class="status-pill ${doc.status || 'draft'}">${doc.status === 'approved' ? 'Təsdiqlənib' : doc.status === 'sent' ? 'Göndərilib' : 'Qaralama'}</span></td>
        </tr>
      `).join('');

      list.innerHTML = rows;
      if (count) count.textContent = `${docs.length} sənəd`;
      if (empty) empty.hidden = docs.length > 0;
    }
  };

  const saveCurrentDoc = async (event) => {
    event.preventDefault();
    const date = docDateInput?.value;
    const workplace = workplaceSelect?.value;
    const user = userSelect?.value;
    const supplier = supplierInput?.value.trim();
    const status = statusSelect?.value || 'draft';
    const items = getSelectedItems().map((item) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const discount = Number(item.discount || 0);
      const discountAmount = qty * price * (discount / 100);
      const total = qty * price - discountAmount;
      return {
        mehsul_kodu: item.code || item.mehsul_kodu || '',
        mehsul_adi: item.name || item.mehsul_adi || '',
        miqdari: qty,
        vahidi: item.unit || 'əd',
        qiymeti: price,
        endirim: discount,
        toplam: total,
      };
    });

    if (!date || !workplace || !user || !supplier || !items.length) {
      window.showErpToast?.('Tarix, iş yeri, istifadəçi, tədarükçü və məhsul siyahısı tələb olunur. Sənəd nömrəsini server verəcək.');
      return;
    }

    const invoiceTotal = items.reduce((sum, item) => sum + Number(item.toplam || 0), 0);

    const payload = {
      tarix: date,
      is_yeri_id: getSelectedWorkplaceId(),
      isdifadeci: user,
      tedarukcu: supplier,
      items,
      status,
      toplam: invoiceTotal,
      invoice_total: invoiceTotal,
    };

    try {
      const response = await fetch('http://94.20.88.181:5050/api/purchase-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Alış sənədi yadda saxlanılmadı.');
      }

      const number = String(result?.islem_nomresi || '').trim();
      if (docNumberInput && number) docNumberInput.value = number;

      const docs = getPurchaseDocs();
      docs.unshift({
        id: `doc-${Date.now()}`,
        number,
        date,
        workplace,
        user,
        supplier,
        status,
        total: items.reduce((sum, item) => sum + Number(item.toplam || 0), 0),
        items: items.map((item) => ({ ...item })),
        locked: false,
      });
      savePurchaseDocs(docs);
      applyLocalStockDelta(items, 1);

      if (window.marketErpArchiveDocument) {
        window.marketErpArchiveDocument(docs[0], 'purchase');
      }

      try {
        const supplierResponse = await fetch('http://94.20.88.181:5050/api/suppliers', { cache: 'no-store' });
        const supplierResult = await supplierResponse.json();
        if (supplierResponse.ok && supplierResult?.status === 'success' && Array.isArray(supplierResult.suppliers)) {
          const normalized = supplierResult.suppliers.map((supplier) => ({
            id: supplier.id ?? `company-${Date.now()}`,
            name: supplier.firma_adi || supplier.name || 'Firma',
            code: supplier.firma_kodu || supplier.code || '',
            status: supplier.status === 'passiv' ? 'inactive' : 'active',
            createdAt: supplier.yaradilma_tarixi ? String(supplier.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10),
            address: supplier.unvan || supplier.address || '',
            email: supplier.email || '',
            phone: supplier.telefon || supplier.phone || '',
            creditLimit: Number(supplier.borc_limiti ?? supplier.creditLimit ?? 0),
            debt: Number(supplier.aktiv_borc ?? supplier.debt ?? 0),
            debtStatus: supplier.borc_status || 'normal',
          }));
          localStorage.setItem('marketErpCompanies', JSON.stringify(normalized));
        }
      } catch (supplierError) {
        console.warn('Supplier debt refresh failed', supplierError);
      }

      saveSelectedItems([]);
      renderDocs();
      resetForm();
      window.showErpToast?.(result.message || 'Alış sənədi yadda saxlanıldı.');
    } catch (error) {
      window.showErpToast?.(error.message || 'Alış sənədi yadda saxlanılmadı.');
    }
  };

  purchaseProductPickerSearch?.addEventListener('input', () => {
    if (window.__erpActivePicker && window.__erpActivePicker !== 'purchase') return;
    renderPurchaseProductPicker();
  });
  bindOnce(purchaseProductPickerConfirm, 'purchase-confirm', () => {
    const selectedIds = getSelectedPickerProductIds();
    if (!selectedIds.length) {
      window.showErpToast?.('Ən azı bir məhsul seçin.');
      return;
    }
    addProductsToDraft(selectedIds);
  });
  bindOnce(purchaseProductPickerNew, 'purchase-new', () => {
    if (window.__erpActivePicker !== 'purchase' || window.__erpPickerOwner !== 'purchase') return;
    closePurchaseProductPicker();
    if (window.openProductModal) {
      window.__erpAfterCreate = {
        type: 'product',
        picker: 'purchase',
        owner: 'purchase',
        callback: (product) => {
          if (!product) return;
          addProductsToDraft([product.id]);
          window.__erpAfterCreate = null;
        }
      };
      window.openProductModal();
    }
  });
  bindOnce(purchaseProductPickerClose, 'purchase-close', closePurchaseProductPicker);
  bindOnce(purchaseProductPickerCancel, 'purchase-cancel', closePurchaseProductPicker);
  purchaseProductPickerModal?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && purchaseProductPickerModal.hidden === false) {
      event.preventDefault();
      const selectedIds = getSelectedPickerProductIds();
      if (selectedIds.length) addProductsToDraft(selectedIds);
    }
  });

  purchaseSupplierPickerSearch?.addEventListener('input', renderPurchaseSupplierPicker);
  bindOnce(purchaseSupplierPickerClose, 'purchase-supplier-close', closePurchaseSupplierPicker);
  bindOnce(purchaseSupplierPickerCancel, 'purchase-supplier-cancel', closePurchaseSupplierPicker);
  bindOnce(purchaseSupplierPickerAdd, 'purchase-supplier-add', () => {
    if (window.__erpActivePicker !== 'purchase' || window.__erpPickerOwner !== 'purchase') return;
    closePurchaseSupplierPicker();
    const addCompanyButton = document.querySelector('#add-company');
    if (addCompanyButton) {
      window.__erpSelectionTarget = { selector: '#purchase-supplier' };
      window.__erpAfterCreate = { type: 'company', targetSelector: '#purchase-supplier', callback: selectCreatedCompany };
      addCompanyButton.click();
      return;
    }
    window.showErpToast?.('Firma formu açılmadı.');
  });
  supplierPickerButton?.addEventListener('click', openPurchaseSupplierPicker);
  window.__erpSelectCreatedCompany = selectCreatedCompany;

  populateStaticSelects();
  resetForm();
  renderDocs();
  updateDraftItems();

  form?.addEventListener('submit', saveCurrentDoc);
  view.querySelector('#purchase-reset')?.addEventListener('click', resetForm);

  const applyArchiveViewMode = (doc, mode = 'view') => {
    if (!doc) return;
    docNumberInput.value = doc.number || '';
    docDateInput.value = doc.date || '';
    if (workplaceSelect && doc.workplace) workplaceSelect.value = doc.workplace;
    if (userSelect && doc.user) userSelect.value = doc.user;
    if (supplierInput && doc.supplier) supplierInput.value = doc.supplier;
    if (statusSelect && doc.status) statusSelect.value = doc.status;
    const normalizedItems = (Array.isArray(doc.items) ? doc.items : []).map((item, index) => ({
      ...item,
      id: item.id || `purchase-archive-${doc.id || 'doc'}-${index}`,
      productId: item.productId || item.mehsul_id || null,
      name: item.name || item.mehsul_adi || 'Məhsul',
      code: item.code || item.mehsul_kodu || '',
      qty: Number(item.qty ?? item.miqdari ?? 0),
      price: Number(item.price ?? item.qiymeti ?? 0),
      unit: item.unit || item.vahidi || 'əd',
      discount: Number(item.discount ?? item.endirim ?? 0),
    }));
    saveSelectedItems(normalizedItems);
    updateDraftItems();

    const shouldReadOnly = mode === 'view';
    const saveButton = document.querySelector('#purchase-save');
    if (saveButton) {
      saveButton.hidden = shouldReadOnly;
      saveButton.disabled = shouldReadOnly;
    }
    form?.querySelectorAll('input, select, textarea, button').forEach((element) => {
      if (element.matches('.module-close')) return;
      if (element.id === 'purchase-save') {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.matches('input, select, textarea')) {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.matches('.inline-delete, .purchase-product-picker-trigger, .inline-picker-button')) {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.tagName === 'BUTTON') {
        element.disabled = shouldReadOnly;
      }
    });
    if (shouldReadOnly) {
      supplierPickerButton.disabled = true;
    } else {
      supplierPickerButton.disabled = false;
    }
  };

  window.openPurchaseDocFromArchive = (docId, mode = 'view', archiveFallback = null) => {
    const doc = getPurchaseDocs().find((item) => item.id === docId || item.number === docId)
      || (archiveFallback ? {
        id: archiveFallback.docId || archiveFallback.id,
        number: archiveFallback.number,
        date: archiveFallback.date,
        workplace: archiveFallback.workplace,
        user: archiveFallback.user,
        supplier: archiveFallback.partyName || archiveFallback.supplier,
        status: archiveFallback.status,
        items: archiveFallback.items,
      } : null);
    if (!doc) return;
    const archiveRecord = getWarehouseDocs().find((item) => item.docId === doc.id || item.number === doc.number) || null;
    if (archiveRecord && archiveRecord.locked && mode === 'edit') {
      mode = 'view';
      window.showErpToast?.('Bu sənəd kilidlidir, baxış rejimində açılır.');
    }
    applyArchiveViewMode(doc, mode);
    if (mode === 'view') {
      window.showErpToast?.('Sənəd baxış rejimində açıldı.');
    }
  };

  window.openPurchaseProductPicker = openPurchaseProductPicker;
  window.closePurchaseProductPicker = closePurchaseProductPicker;
  window.openPurchaseSupplierPicker = openPurchaseSupplierPicker;
  window.closePurchaseSupplierPicker = closePurchaseSupplierPicker;

  const showPurchaseModule = async () => {
    if (typeof window.erpEnsureProductsLoaded === 'function') {
      await window.erpEnsureProductsLoaded();
    }
    renderDocs();
  };

  window.alisSenedleriModulu = { goster: showPurchaseModule };
})();
