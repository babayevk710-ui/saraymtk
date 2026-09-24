(() => {
  const view = document.querySelector('#firmaya-mal-qaytarilmasi-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpSupplierReturnDocs';
  const DRAFT_KEY = 'marketErpSupplierReturnDraftItems';
  const PRODUCTS_KEY = 'marketErpProducts';
  const WORKPLACES_KEY = 'marketErpWorkplaces';
  const EMPLOYEES_KEY = 'marketErpEmployees';
  const COMPANIES_KEY = 'marketErpCompanies';

  const form = view.querySelector('#supplier-return-form');
  let supplierReturnEditingId = null;
  const numberInput = view.querySelector('#supplier-return-number');
  const dateInput = view.querySelector('#supplier-return-date');
  const workplaceSelect = view.querySelector('#supplier-return-workplace');
  const userSelect = view.querySelector('#supplier-return-user');
  const companyInput = view.querySelector('#supplier-return-company');
  const supplierPickerButton = view.querySelector('#supplier-return-company-picker');
  const itemTableBody = view.querySelector('#supplier-return-item-list');
  const totalAmountEl = view.querySelector('#supplier-return-total-amount');
  const totalDiscountEl = view.querySelector('#supplier-return-total-discount');
  const subtotalEl = view.querySelector('#supplier-return-subtotal');
  const vatEl = view.querySelector('#supplier-return-total-vat');
  const netTotalEl = view.querySelector('#supplier-return-net-total');

  const getProducts = () => {
    if (typeof window.erpGetProducts === 'function') {
      return window.erpGetProducts();
    }
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getWorkplaces = () => {
    try {
      return JSON.parse(localStorage.getItem(WORKPLACES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getEmployees = () => {
    try {
      return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getCompanies = () => {
    try {
      return JSON.parse(localStorage.getItem(COMPANIES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getReturnDocs = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getWarehouseDocs = () => {
    try {
      return JSON.parse(localStorage.getItem('marketErpWarehouseDocs') || '[]');
    } catch {
      return [];
    }
  };

  const saveReturnDocs = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const ensureSampleProducts = () => {
    const products = getProducts();
    return products;
  };

  const getCurrentLogin = () => {
    try {
      return JSON.parse(localStorage.getItem('lastLogin') || 'null')?.login || 'Admin';
    } catch {
      return 'Admin';
    }
  };

  const isActiveProduct = (product) => {
    const raw = String(product?.status ?? 'active').toLowerCase();
    return raw === '' || raw === 'active' || raw === 'aktiv' || raw === 'enabled' || raw === '1';
  };

  const getActiveProducts = () => ensureSampleProducts().filter((product) => isActiveProduct(product));

  const isActiveCompany = (company) => {
    const raw = String(company?.status ?? 'active').toLowerCase();
    return raw === '' || raw === 'active' || raw === 'aktiv' || raw === 'enabled' || raw === '1';
  };

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const getSelectedItems = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveSelectedItems = (items) => localStorage.setItem(DRAFT_KEY, JSON.stringify(items));

  const recalcDraftItem = (item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.price || 0);
    const discount = Number(item.discount || 0);
    const taxRate = Number(item.tax ?? item.edv ?? 0);
    const discountAmount = qty * price * (discount / 100);
    const taxableBase = qty * price - discountAmount;
    const vatAmount = taxableBase * (taxRate / 100);
    const netAmount = taxableBase + vatAmount;

    return {
      ...item,
      qty,
      price,
      discount,
      tax: taxRate,
      discountAmount,
      taxableBase,
      vatAmount,
      netAmount,
      total: qty * price,
    };
  };

  const updateTotals = (items) => {
    const normalized = (items || []).map(recalcDraftItem);
    const rawTotal = normalized.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const discountTotal = normalized.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const subtotal = rawTotal - discountTotal;
    const vatTotal = normalized.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
    const netTotal = subtotal + vatTotal;

    if (totalAmountEl) totalAmountEl.textContent = `${formatMoney(rawTotal)} ₼`;
    if (totalDiscountEl) totalDiscountEl.textContent = `${formatMoney(discountTotal)} ₼`;
    if (subtotalEl) subtotalEl.textContent = `${formatMoney(subtotal)} ₼`;
    if (vatEl) vatEl.textContent = `${formatMoney(vatTotal)} ₼`;
    if (netTotalEl) netTotalEl.textContent = `${formatMoney(netTotal)} ₼`;
  };

  const renderRows = () => {
    const items = getSelectedItems().map(recalcDraftItem);
    const rows = items.map((item, index) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const discount = Number(item.discount || 0);
      const discountAmount = qty * price * (discount / 100);
      const netAmount = qty * price - discountAmount;

      return `
        <tr data-supplier-return-row-id="${item.id}">
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
          <td><button type="button" class="inline-delete" data-remove-supplier-return-item="${item.id}" aria-label="Sətiri sil">⌫</button></td>
        </tr>
      `;
    }).join('');

    const placeholderRows = items.length === 0 ? 1 : 0;
    itemTableBody.innerHTML = `${rows}${Array.from({ length: placeholderRows }, (_, index) => `
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
    `).join('')}`;

    updateTotals(items);

    itemTableBody.querySelectorAll('[data-remove-supplier-return-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const current = getSelectedItems();
        const next = current.filter((entry) => entry.id !== button.dataset.removeSupplierReturnItem);
        saveSelectedItems(next);
        renderRows();
      });
    });

    itemTableBody.querySelectorAll('.purchase-product-picker-trigger').forEach((button) => {
      button.addEventListener('click', () => {
        openSupplierReturnProductPicker();
      });
    });

    itemTableBody.querySelectorAll('.purchase-edit-field').forEach((input) => {
      if (input.dataset.placeholder === 'true') return;
      const field = input.dataset.field;
      if (!field) return;
      if (['code', 'unit'].includes(field)) {
        input.setAttribute('readonly', 'readonly');
        return;
      }

      input.addEventListener('input', () => {
        const itemId = input.dataset.itemId;
        if (!itemId) return;

        const next = getSelectedItems().map((item) => {
          if (item.id !== itemId) return item;
          const rawValue = input.value;
          const value = ['qty', 'price', 'discount'].includes(field) ? Number(rawValue || 0) : rawValue;
          return recalcDraftItem({ ...item, [field]: value });
        });

        saveSelectedItems(next);
        renderRows();
      });
    });
  };

  const modal = document.querySelector('#purchase-product-picker-modal');
  const modalList = document.querySelector('#purchase-product-picker-list');
  const modalSearch = document.querySelector('#purchase-product-picker-search');
  const modalCount = document.querySelector('#purchase-product-picker-count');
  const modalConfirm = document.querySelector('#confirm-purchase-picker');
  const modalClose = document.querySelector('#close-purchase-product-picker');
  const modalCancel = document.querySelector('#cancel-purchase-picker');
  const modalSelectAll = document.querySelector('.purchase-picker-select-all');

  const renderPicker = () => {
    if (!modalList || !modalCount) return;

    const searchQuery = (modalSearch?.value || '').trim().toLowerCase();
    const filtered = getActiveProducts().filter((product) => {
      const barcodeItems = Array.isArray(product.barcodes)
        ? product.barcodes
        : (product.barcode ? [product.barcode] : []);
      const barcodeText = barcodeItems.join(' ');
      const text = [
        product.name,
        product.code,
        product.category,
        product.unit,
        barcodeText,
        product.brand,
        product.company,
      ].filter(Boolean).join(' ').toLowerCase();
      return !searchQuery || text.includes(searchQuery) || (product.name || '').toLowerCase().includes(searchQuery) || (barcodeText || '').toLowerCase().includes(searchQuery);
    });

    modalCount.textContent = `${filtered.length} məhsul`;
    modalList.innerHTML = filtered.map((product) => `
      <tr data-picker-product-id="${product.id}" class="purchase-picker-row">
        <td><input type="checkbox" class="purchase-picker-check" aria-label="${product.name} seç"></td>
        <td><strong>${product.name}</strong><small>${product.code}</small></td>
        <td>${product.category || '-'}</td>
        <td>${product.unit || 'əd'}</td>
        <td>${formatMoney(Number(product.alis_qiymeti ?? product.cost ?? product.price ?? 0))} ₼</td>
      </tr>
    `).join('');

    modalList.querySelectorAll('.purchase-picker-row').forEach((row) => {
      const checkbox = row.querySelector('.purchase-picker-check');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          row.classList.toggle('is-selected', checkbox.checked);
        });
      }
      row.addEventListener('click', (event) => {
        if (!checkbox || event.target === checkbox || event.target.closest('input')) return;
        checkbox.checked = !checkbox.checked;
        row.classList.toggle('is-selected', checkbox.checked);
      });
      row.addEventListener('dblclick', () => {
        addProductsToDraft([String(row.dataset.pickerProductId)]);
        closeSupplierReturnProductPicker();
      });
    });

    if (modalSelectAll) {
      modalSelectAll.checked = filtered.length > 0 && modalList.querySelectorAll('.purchase-picker-check:checked').length === filtered.length;
      modalSelectAll.onchange = () => {
        modalList.querySelectorAll('.purchase-picker-check').forEach((checkbox) => {
          checkbox.checked = modalSelectAll.checked;
        });
      };
    }
  };

  const addProductsToDraft = (productIds) => {
    const selectedIds = Array.from(new Set((productIds || []).map((id) => String(id).trim()).filter(Boolean)));
    if (!selectedIds.length) {
      window.showErpToast?.('Məhsul seçin.');
      return;
    }

    const productsById = new Map(getActiveProducts().map((product) => [String(product.id), product]));
    const nextItems = [...getSelectedItems()];
    let changed = false;

    selectedIds.forEach((productId) => {
      const product = productsById.get(String(productId));
      if (!product) return;

      const existingIndex = nextItems.findIndex((entry) => String(entry.productId) === String(productId));
      if (existingIndex >= 0) {
        const current = nextItems[existingIndex];
        nextItems[existingIndex] = recalcDraftItem({
          ...current,
          qty: Number(current.qty || 0) + 1,
          name: product.name,
          code: product.code,
          price: Number(product.alis_qiymeti ?? product.cost ?? product.price ?? 0),
          unit: product.unit || 'əd',
          tax: Number(product.tax ?? 0),
          discount: Number(current.discount || 0),
        });
        changed = true;
        return;
      }

      nextItems.push({
        id: `supplier-return-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        productId: product.id,
        name: product.name,
        code: product.code,
        qty: 1,
        price: Number(product.alis_qiymeti ?? product.cost ?? product.price ?? 0),
        unit: product.unit || 'əd',
        tax: Number(product.tax ?? 0),
        discount: 0,
      });
      changed = true;
    });

    if (!changed) {
      window.showErpToast?.('Bu məhsul artıq siyahıda var.');
      return;
    }

    saveSelectedItems(nextItems);
    renderRows();
  };

  const openSupplierReturnProductPicker = () => {
    if (!modal) return;
    window.__erpActivePicker = 'supplier-return';
    renderPicker();
    modal.hidden = false;
    setTimeout(() => modalSearch?.focus(), 0);
  };

  const selectCreatedProduct = (product) => {
    if (!product) return;
    const item = {
      id: `supplier-return-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      productId: product.id,
      name: product.name,
      code: product.code,
      qty: 1,
      price: Number(product.price || 0),
      unit: product.unit || 'əd',
      tax: Number(product.tax ?? 0),
      discount: 0,
    };
    const next = [...getSelectedItems(), item];
    saveSelectedItems(next);
    renderRows();
    window.__erpAfterCreate = null;
  };

  window.__erpSelectCreatedSupplierReturnProduct = selectCreatedProduct;

  const closeSupplierReturnProductPicker = () => {
    if (!modal) return;
    modal.hidden = true;
    if (window.__erpActivePicker === 'supplier-return') {
      window.__erpActivePicker = null;
    }
    if (modalSearch) modalSearch.value = '';
    renderPicker();
  };

  const bindPickerEvents = () => {
    document.querySelector('#new-purchase-product')?.addEventListener('click', () => {
      if (window.__erpActivePicker !== 'supplier-return') return;
      closeSupplierReturnProductPicker();
      if (window.openProductModal) {
        window.__erpAfterCreate = {
          type: 'product',
          picker: 'supplier-return',
          owner: 'supplier-return',
          callback: (product) => {
            if (product) {
              selectCreatedProduct(product);
            }
            window.__erpAfterCreate = null;
          }
        };
        window.openProductModal();
      }
    });

    modalSearch?.addEventListener('input', () => {
      if (window.__erpActivePicker !== 'supplier-return') return;
      renderPicker();
    });
    modalConfirm?.addEventListener('click', () => {
      if (window.__erpActivePicker !== 'supplier-return') return;
      const selectedIds = Array.from(modalList?.querySelectorAll('.purchase-picker-check:checked') || []).map((checkbox) => checkbox.closest('[data-picker-product-id]')?.dataset.pickerProductId).filter(Boolean);
      if (!selectedIds.length) {
        window.showErpToast?.('Məhsul seçin.');
        return;
      }
      addProductsToDraft(selectedIds);
      closeSupplierReturnProductPicker();
    });
    modalClose?.addEventListener('click', closeSupplierReturnProductPicker);
    modalCancel?.addEventListener('click', closeSupplierReturnProductPicker);
    modal?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && modal.hidden === false) {
        if (window.__erpActivePicker !== 'supplier-return') return;
        event.preventDefault();
        const selectedIds = Array.from(modalList?.querySelectorAll('.purchase-picker-check:checked') || []).map((checkbox) => checkbox.closest('[data-picker-product-id]')?.dataset.pickerProductId).filter(Boolean);
        if (!selectedIds.length) {
          window.showErpToast?.('Məhsul seçin.');
          return;
        }
        addProductsToDraft(selectedIds);
        closeSupplierReturnProductPicker();
      }
    });

    window.openSupplierReturnProductPicker = openSupplierReturnProductPicker;
    window.closeSupplierReturnProductPicker = closeSupplierReturnProductPicker;
  };

  const populateControls = () => {
    const workplaces = getWorkplaces();
    workplaceSelect.innerHTML = workplaces.length
      ? workplaces.map((item) => `<option value="${item.name}">${item.name}</option>`).join('')
      : '<option value="Market Mərkəz Filialı">Market Mərkəz Filialı</option>';

    const employees = getEmployees();
    const currentLogin = getCurrentLogin();
    const employeeOptions = employees.length
      ? employees.map((employee) => `<option value="${employee.full_name || employee.name || employee.login_name || 'Admin'}">${employee.full_name || employee.name || employee.login_name || 'Admin'}</option>`).join('')
      : '';
    const fallback = !employees.some((employee) => (employee.full_name || employee.name || employee.login_name || 'Admin') === currentLogin)
      ? `<option value="${currentLogin}">${currentLogin}</option>`
      : '';

    userSelect.innerHTML = `${employeeOptions}${fallback || ''}`;
    userSelect.value = currentLogin;
    userSelect.disabled = true;

    const companyName = getCompanies().find(isActiveCompany)?.name || 'Araz MMC';
    companyInput.value = companyName;
    workplaceSelect.value = workplaces[0]?.name || 'Market Mərkəz Filialı';
  };

  const setDefaultDate = () => {
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }
  };

  const setDefaultNumber = () => {
    if (!numberInput) return;
    numberInput.value = '';
    numberInput.placeholder = 'Server tərəfindən veriləcək';
  };

  const reinitDocument = () => {
    populateControls();
    setDefaultDate();
    setDefaultNumber();
    supplierReturnEditingId = null;
    localStorage.removeItem(DRAFT_KEY);
    saveSelectedItems([]);
    renderRows();
  };

  supplierPickerButton?.addEventListener('click', () => {
    if (window.openPurchaseSupplierPicker) {
      window.erpSupplierPickerTarget = companyInput;
      window.openPurchaseSupplierPicker();
    }
  });

  const selectCreatedSupplierCompany = (company) => {
    if (!company || !companyInput) return;
    companyInput.value = company.name || 'Firma';
    window.__erpAfterCreate = null;
  };

  window.__erpSelectCreatedSupplierCompany = selectCreatedSupplierCompany;

  const addSupplierCompanyButton = document.querySelector('#add-purchase-supplier');
  addSupplierCompanyButton?.addEventListener('click', () => {
    if (window.__erpActivePicker !== 'supplier-return') return;
    if (document.querySelector('#add-company')) {
      window.__erpSelectionTarget = { selector: '#supplier-return-company' };
      window.__erpAfterCreate = { type: 'company', targetSelector: '#supplier-return-company', callback: selectCreatedSupplierCompany };
      document.querySelector('#add-company')?.click();
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const date = dateInput?.value;
    const workplace = workplaceSelect?.value;
    const user = userSelect?.value;
    const company = companyInput?.value?.trim();
    const items = getSelectedItems();

    if (!date || !workplace || !user || !company || !items.length) {
      window.showErpToast?.('Qaytarma sənədində tarix, iş yeri, firma və məhsul siyahısı vacibdir. Nömrəni server verəcək.');
      return;
    }

    if (supplierReturnEditingId) {
      window.showErpToast?.('Redaktə rejimi hələ serverə göndərilmir.');
      return;
    }

    const payload = {
      tarix: date,
      is_yeri_id: null,
      isdifadeci: user,
      firma: company,
      items: items.map((item) => ({
        mehsul_kodu: item.code || item.mehsul_kodu || '',
        mehsul_adi: item.name || item.mehsul_adi || '',
        miqdari: Number(item.qty || item.miqdari || 0),
        vahidi: item.unit || item.vahidi || 'əd',
        qiymeti: Number(item.price || item.qiymeti || 0),
        endirim: Number(item.discount || item.endirim || 0),
        toplam: Number(item.qty || item.miqdari || 0) * Number(item.price || item.qiymeti || 0) - Number(item.discount || item.endirim || 0),
      })),
    };

    try {
      const response = await fetch('http://94.20.88.181:5050/api/supplier-return-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Firmaya mal qaytarılması yadda saxlanılmadı.');
      }

      const number = String(result?.qaytarma_nomresi || '').trim();
      if (numberInput && number) numberInput.value = number;

      const total = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
      const docs = getReturnDocs();
      const currentDoc = {
        id: `sreturn-${Date.now()}`,
        number,
        date,
        workplace,
        user,
        company,
        status: 'draft',
        total,
        items: items.map((item) => ({ ...item })),
        locked: false,
      };
      docs.unshift(currentDoc);
      saveReturnDocs(docs);
      if (window.marketErpArchiveDocument) {
        window.marketErpArchiveDocument(currentDoc, 'supplier-return');
      }
      saveSelectedItems([]);
      supplierReturnEditingId = null;
      form.reset();
      populateControls();
      setDefaultDate();
      setDefaultNumber();
      renderRows();
      window.showErpToast?.('Firmaya mal qaytarılması yadda saxlanıldı.');
    } catch (error) {
      window.showErpToast?.(error.message || 'Firmaya mal qaytarılması yadda saxlanılmadı.');
    }
  });

  const applyArchiveViewMode = (doc, mode = 'view') => {
    if (!doc) return;
    supplierReturnEditingId = mode === 'edit' ? doc.id : null;
    numberInput.value = doc.number || '';
    dateInput.value = doc.date || '';
    if (workplaceSelect && doc.workplace) workplaceSelect.value = doc.workplace;
    if (userSelect && doc.user) userSelect.value = doc.user;
    if (companyInput && doc.company) companyInput.value = doc.company;
    saveSelectedItems(Array.isArray(doc.items) ? doc.items.map((item) => ({ ...item })) : []);
    renderRows();

    const shouldReadOnly = mode === 'view';
    const saveButton = document.querySelector('#supplier-return-save');
    if (saveButton) {
      saveButton.hidden = shouldReadOnly;
      saveButton.disabled = shouldReadOnly;
    }
    form?.querySelectorAll('input, select, textarea, button').forEach((element) => {
      if (element.matches('.module-close')) return;
      if (element.id === 'supplier-return-save') {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.matches('input, select, textarea')) {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.matches('.purchase-product-picker-trigger, .inline-delete, .inline-picker-button')) {
        element.disabled = shouldReadOnly;
        return;
      }
      if (element.tagName === 'BUTTON') {
        element.disabled = shouldReadOnly;
      }
    });
    if (supplierPickerButton) supplierPickerButton.disabled = shouldReadOnly;
  };

  window.openSupplierReturnDocFromArchive = (docId, mode = 'view') => {
    const doc = getReturnDocs().find((item) => item.id === docId || item.number === docId);
    if (!doc) return;
    const archiveRecord = getWarehouseDocs().find((item) => item.docId === doc.id || item.number === doc.number) || null;
    if (archiveRecord && archiveRecord.locked && mode === 'edit') {
      mode = 'view';
      window.showErpToast?.('Bu sənəd kilidlidir, baxış rejimində açılır.');
    }
    applyArchiveViewMode(doc, mode);
    if (mode === 'view') window.showErpToast?.('Sənəd baxış rejimində açıldı.');
  };

  bindPickerEvents();
  populateControls();
  setDefaultDate();
  setDefaultNumber();
  renderRows();

  const showSupplierReturnModule = async () => {
    if (typeof window.erpEnsureProductsLoaded === 'function') {
      await window.erpEnsureProductsLoaded();
    }
    reinitDocument();
  };

  window.supplierReturnModulu = { goster: showSupplierReturnModule };
})();
