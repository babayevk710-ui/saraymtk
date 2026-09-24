(() => {
  const view = document.querySelector('#satis-senedleri-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpSalesDocs';
  const DRAFT_KEY = 'marketErpSalesDraftItems';
  const PRODUCTS_KEY = 'marketErpProducts';
  const WORKPLACES_KEY = 'marketErpWorkplaces';
  const EMPLOYEES_KEY = 'marketErpEmployees';

  const form = view.querySelector('#sales-doc-form');
  const numberInput = view.querySelector('#sales-number');
  const dateInput = view.querySelector('#sales-date');
  const workplaceSelect = view.querySelector('#sales-workplace');
  const userSelect = view.querySelector('#sales-user');
  const customerInput = view.querySelector('#sales-customer');
  const customerPickerButton = view.querySelector('#sales-customer-picker');
  const customerPickerModal = document.querySelector('#sales-customer-picker-modal');
  const selectCreatedCustomer = (customer) => {
    if (!customer || !customerInput) return;
    customerInput.value = customer.name || customer.fullName || 'Müştəri';
    if (customerPickerModal) customerPickerModal.hidden = true;
    window.__erpAfterCreate = null;
  };
  const customerPickerList = document.querySelector('#sales-customer-picker-list');
  const customerPickerSearch = document.querySelector('#sales-customer-picker-search');
  const customerPickerCount = document.querySelector('#sales-customer-picker-count');
  const customerPickerClose = document.querySelector('#close-sales-customer-picker');
  const customerPickerCancel = document.querySelector('#cancel-sales-customer-picker');
  const customerPickerAdd = document.querySelector('#add-sales-customer');
  const itemTableBody = view.querySelector('#sales-item-list');
  const totalAmount = view.querySelector('#sales-total-amount');
  const totalDiscount = view.querySelector('#sales-total-discount');
  const subtotal = view.querySelector('#sales-subtotal');
  const vat = view.querySelector('#sales-total-vat');
  const netTotal = view.querySelector('#sales-net-total');

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

  const getSalesDocs = () => {
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

  const getSelectedItems = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveSelectedItems = (items) => localStorage.setItem(DRAFT_KEY, JSON.stringify(items));

  localStorage.removeItem(DRAFT_KEY);

  const applyLocalStockDelta = (items, direction) => {
    try {
      const products = getProducts();
      const next = products.map((product) => {
        const match = items.find((item) => {
          const code = String(item.code || item.mehsul_kodu || '').trim();
          return code && code === String(product.code || '').trim();
        });
        if (!match) return product;
        const qty = Number(match.qty || match.miqdari || 0);
        return { ...product, stock: Math.max(0, Number(product.stock || 0) + direction * qty) };
      });
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Lokal stok yenilənmədi.', error);
    }
  };

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const bindOnce = (element, key, callback) => {
    if (!element || element.dataset.boundKey === key) return;
    element.dataset.boundKey = key;
    element.addEventListener('click', callback);
  };

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
    const subtotalValue = rawTotal - discountTotal;
    const vatTotal = normalized.reduce((sum, item) => sum + Number(item.vatAmount || 0), 0);
    const netValue = subtotalValue + vatTotal;

    if (totalAmount) totalAmount.textContent = `${formatMoney(rawTotal)} ₼`;
    if (totalDiscount) totalDiscount.textContent = `${formatMoney(discountTotal)} ₼`;
    if (subtotal) subtotal.textContent = `${formatMoney(subtotalValue)} ₼`;
    if (vat) vat.textContent = `${formatMoney(vatTotal)} ₼`;
    if (netTotal) netTotal.textContent = `${formatMoney(netValue)} ₼`;
  };

  const renderRows = () => {
    const items = getSelectedItems().map(recalcDraftItem);

    if (!items.length) {
      itemTableBody.innerHTML = renderBlankProductRows(1);
      itemTableBody.querySelectorAll('.purchase-product-picker-trigger').forEach((button) => {
        button.addEventListener('click', () => {
          openSalesProductPicker();
        });
      });
      updateTotals([]);
      return;
    }

    const rows = items.map((item, index) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const discount = Number(item.discount || 0);
      const discountAmount = qty * price * (discount / 100);
      const netAmount = qty * price - discountAmount;

      return `
        <tr data-sales-row-id="${item.id}">
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
          <td><button type="button" class="inline-delete" data-remove-sales-item="${item.id}" aria-label="Sətiri sil">⌫</button></td>
        </tr>
      `;
    }).join('');

    itemTableBody.innerHTML = rows;
    updateTotals(items);

    itemTableBody.querySelectorAll('[data-remove-sales-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = getSelectedItems().filter((entry) => entry.id !== button.dataset.removeSalesItem);
        saveSelectedItems(next);
        renderRows();
      });
    });

    itemTableBody.querySelectorAll('.purchase-product-picker-trigger').forEach((button) => {
      button.addEventListener('click', () => {
        openSalesProductPicker();
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

  const modal = document.querySelector('#sales-product-picker-modal');
  const modalList = document.querySelector('#sales-product-picker-list');
  const modalSearch = document.querySelector('#sales-product-picker-search');
  const modalCount = document.querySelector('#sales-product-picker-count');
  const modalConfirm = document.querySelector('#confirm-sales-product-picker');
  const modalClose = document.querySelector('#close-sales-product-picker');
  const modalCancel = document.querySelector('#cancel-sales-product-picker');

  const renderPicker = () => {
    if (!modalList || !modalCount) return;

    const searchText = (modalSearch?.value || '').trim().toLowerCase();
    const filtered = ensureSampleProducts().filter((product) => {
      const barcodeItems = Array.isArray(product.barcodes) ? product.barcodes : (product.barcode ? [product.barcode] : []);
      const barcodeText = barcodeItems.join(' ');
      const searchableText = [product.name, product.code, product.category, product.unit, barcodeText, product.brand, product.company]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !searchText || searchableText.includes(searchText) || (product.name || '').toLowerCase().includes(searchText) || (barcodeText || '').toLowerCase().includes(searchText);
    });

    modalCount.textContent = `${filtered.length} məhsul`;
    modalList.innerHTML = filtered.map((product) => `
      <tr data-picker-product-id="${product.id}" class="purchase-picker-row">
        <td><input type="checkbox" class="purchase-picker-check" aria-label="${product.name} seç"></td>
        <td><strong>${product.name}</strong><small>${product.code}</small></td>
        <td>${product.category || '-'}</td>
        <td>${product.unit || 'əd'}</td>
        <td>${formatMoney(Number(product.satis_qiymeti ?? product.price ?? 0))} ₼</td>
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
        closeSalesProductPicker();
      });
    });

    const selectAll = document.querySelector('.sales-picker-select-all');
    if (selectAll) {
      selectAll.checked = filtered.length > 0 && modalList.querySelectorAll('.purchase-picker-check:checked').length === filtered.length;
      selectAll.onchange = () => {
        modalList.querySelectorAll('.purchase-picker-check').forEach((checkbox) => {
          checkbox.checked = selectAll.checked;
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

    const productMap = new Map(ensureSampleProducts().map((product) => [String(product.id), product]));
    const draftItems = [...getSelectedItems()];
    let changed = false;

    selectedIds.forEach((productId) => {
      const product = productMap.get(String(productId));
      if (!product) return;

      const existingIndex = draftItems.findIndex((entry) => String(entry.productId) === String(productId));
      if (existingIndex >= 0) {
        draftItems[existingIndex] = recalcDraftItem({
          ...draftItems[existingIndex],
          qty: Number(draftItems[existingIndex].qty || 0) + 1,
          name: product.name,
          code: product.code,
          price: Number(product.satis_qiymeti ?? product.price ?? 0),
          unit: product.unit || 'əd',
          tax: Number(product.tax ?? 0),
          discount: Number(draftItems[existingIndex].discount || 0),
        });
        changed = true;
        return;
      }

      draftItems.push({
        id: `sales-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        productId: product.id,
        name: product.name,
        code: product.code,
        qty: 1,
        price: Number(product.satis_qiymeti ?? product.price ?? 0),
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

    saveSelectedItems(draftItems);
    renderRows();
  };

  const openSalesProductPicker = () => {
    if (!modal) return;
    window.__erpActivePicker = 'sales';
    window.__erpPickerOwner = 'sales';
    renderPicker();
    modal.hidden = false;
    setTimeout(() => modalSearch?.focus(), 0);
  };

  const closeSalesProductPicker = () => {
    if (!modal) return;
    modal.hidden = true;
    if (window.__erpActivePicker === 'sales') window.__erpActivePicker = null;
    if (window.__erpPickerOwner === 'sales') window.__erpPickerOwner = null;
    if (modalSearch) modalSearch.value = '';
    renderPicker();
  };

  const getCustomerCards = () => {
    try {
      const cards = JSON.parse(localStorage.getItem('marketErpCustomerCards') || '[]');
      return Array.isArray(cards) ? cards : [];
    } catch {
      return [];
    }
  };

  const renderCustomerPicker = () => {
    if (!customerPickerList || !customerPickerCount) return;

    const query = (customerPickerSearch?.value || '').trim().toLowerCase();
    const customers = getCustomerCards().filter((customer) => {
      const text = [customer.name, customer.phone, customer.email, customer.cardNumber, customer.status].filter(Boolean).join(' ').toLowerCase();
      return !query || text.includes(query);
    });

    customerPickerCount.textContent = `${customers.length} müştəri`;
    customerPickerList.innerHTML = customers.length
      ? customers.map((customer) => `
        <tr class="purchase-picker-row sales-customer-picker-row" data-sales-customer-name="${customer.name}" data-sales-customer-id="${customer.id}">
          <td><strong>${customer.name}</strong><small>${customer.cardNumber || 'Kart yoxdur'}</small></td>
          <td>${customer.phone || '-'}</td>
          <td>${customer.email || '-'}</td>
          <td><span class="status-pill ${customer.status || 'active'}">${customer.status === 'blocked' ? 'Bloklanıb' : 'Aktiv'}</span></td>
        </tr>
      `).join('')
      : '<tr><td colspan="4">Heç bir müştəri tapılmadı.</td></tr>';

    customerPickerList.querySelectorAll('.sales-customer-picker-row').forEach((row) => {
      row.addEventListener('click', () => {
        const name = row.dataset.salesCustomerName;
        if (name && customerInput) {
          customerInput.value = name;
          closeSalesCustomerPicker();
        }
      });
    });
  };

  const openSalesCustomerPicker = () => {
    if (!customerPickerModal) return;
    window.__erpActivePicker = 'sales';
    window.__erpPickerOwner = 'sales';
    renderCustomerPicker();
    customerPickerModal.hidden = false;
    setTimeout(() => customerPickerSearch?.focus(), 0);
  };

  const closeSalesCustomerPicker = () => {
    if (!customerPickerModal) return;
    customerPickerModal.hidden = true;
    if (window.__erpActivePicker === 'sales') window.__erpActivePicker = null;
    if (window.__erpPickerOwner === 'sales') window.__erpPickerOwner = null;
    if (customerPickerSearch) customerPickerSearch.value = '';
    renderCustomerPicker();
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
    const loginOption = !employees.some((employee) => (employee.full_name || employee.name || employee.login_name || 'Admin') === currentLogin)
      ? `<option value="${currentLogin}">${currentLogin}</option>`
      : '';

    userSelect.innerHTML = `${employeeOptions}${loginOption}`;
    userSelect.value = currentLogin;
    userSelect.disabled = true;

    const defaultCustomer = getCustomerCards()[0]?.name || '';
    customerInput.value = defaultCustomer;
  };

  const setDefaultDate = () => {
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  };

  const setDefaultNumber = () => {
    if (!numberInput) return;
    numberInput.value = '';
    numberInput.placeholder = 'Server tərəfindən veriləcək';
  };

  const saveCurrentDoc = async (event) => {
    event.preventDefault();

    const date = dateInput?.value;
    const workplace = workplaceSelect?.value;
    const user = userSelect?.value;
    const customer = customerInput?.value?.trim();
    const items = getSelectedItems();

    if (!date || !workplace || !user || !customer || !items.length) {
      window.showErpToast?.('Tarix, iş yeri, müştəri və məhsul siyahısı tələb olunur. Sənəd nömrəsini server verəcək.');
      return;
    }

    const payload = {
      tarix: date,
      is_yeri_id: null,
      isdifadeci: user,
      musteri: customer,
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
      const response = await fetch('http://94.20.88.181:5050/api/sales-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Satış sənədi yadda saxlanılmadı.');
      }

      const number = String(result?.islem_nomresi || '').trim();
      if (numberInput && number) numberInput.value = number;

      const docs = getSalesDocs();
      const currentDoc = {
        id: `sales-${Date.now()}`,
        number,
        date,
        workplace,
        user,
        customer,
        items: items.map((item) => ({ ...item })),
        total: items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0),
        status: 'draft',
        locked: false,
      };
      docs.unshift(currentDoc);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      applyLocalStockDelta(items, -1);
      if (window.marketErpArchiveDocument) {
        window.marketErpArchiveDocument(currentDoc, 'sales');
      }
      saveSelectedItems([]);
      renderRows();
      form.reset();
      populateControls();
      setDefaultDate();
      setDefaultNumber();
      window.showErpToast?.('Satış sənədi yadda saxlanıldı.');
    } catch (error) {
      window.showErpToast?.(error.message || 'Satış sənədi yadda saxlanılmadı.');
    }
  };

  bindOnce(document.querySelector('#new-sales-product'), 'sales-new-product', () => {
    if (window.__erpActivePicker !== 'sales' || window.__erpPickerOwner !== 'sales') return;
    closeSalesProductPicker();
    if (window.openProductModal) {
      window.__erpAfterCreate = {
        type: 'product',
        picker: 'sales',
        owner: 'sales',
        callback: (product) => {
          if (product) {
            addProductsToDraft([product.id]);
          }
          window.__erpAfterCreate = null;
        }
      };
      window.openProductModal();
    }
  });

  modalSearch?.addEventListener('input', renderPicker);
  bindOnce(modalConfirm, 'sales-confirm', () => {
    if (window.__erpActivePicker !== 'sales' || window.__erpPickerOwner !== 'sales') return;
    const selectedIds = Array.from(modalList?.querySelectorAll('.purchase-picker-check:checked') || []).map((checkbox) => checkbox.closest('[data-picker-product-id]')?.dataset.pickerProductId).filter(Boolean);
    if (!selectedIds.length) {
      window.showErpToast?.('Məhsul seçin.');
      return;
    }
    addProductsToDraft(selectedIds);
    closeSalesProductPicker();
  });
  bindOnce(modalClose, 'sales-close', closeSalesProductPicker);
  bindOnce(modalCancel, 'sales-cancel', closeSalesProductPicker);
  modal?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && modal.hidden === false) {
      if (window.__erpActivePicker !== 'sales' || window.__erpPickerOwner !== 'sales') return;
      event.preventDefault();
      const selectedIds = Array.from(modalList?.querySelectorAll('.purchase-picker-check:checked') || []).map((checkbox) => checkbox.closest('[data-picker-product-id]')?.dataset.pickerProductId).filter(Boolean);
      if (!selectedIds.length) {
        window.showErpToast?.('Məhsul seçin.');
        return;
      }
      addProductsToDraft(selectedIds);
      closeSalesProductPicker();
    }
  });

  customerPickerSearch?.addEventListener('input', renderCustomerPicker);
  bindOnce(customerPickerClose, 'sales-customer-close', closeSalesCustomerPicker);
  bindOnce(customerPickerCancel, 'sales-customer-cancel', closeSalesCustomerPicker);
  bindOnce(customerPickerAdd, 'sales-customer-add', () => {
    if (window.__erpActivePicker !== 'sales' || window.__erpPickerOwner !== 'sales') return;
    closeSalesCustomerPicker();
    const openCard = document.querySelector('#add-customer-card');
    if (openCard) {
      window.__erpSelectionTarget = { selector: '#sales-customer' };
      window.__erpAfterCreate = { type: 'customer', targetSelector: '#sales-customer', callback: selectCreatedCustomer };
      openCard.click();
      return;
    }
    window.showErpToast?.('Müştəri kartı formu açılmadı.');
  });

  form?.addEventListener('submit', saveCurrentDoc);
  customerPickerButton?.addEventListener('click', openSalesCustomerPicker);
  window.__erpSelectCreatedCustomer = selectCreatedCustomer;

  const applyArchiveViewMode = (doc, mode = 'view') => {
    if (!doc) return;
    numberInput.value = doc.number || '';
    dateInput.value = doc.date || '';
    if (workplaceSelect && doc.workplace) workplaceSelect.value = doc.workplace;
    if (userSelect && doc.user) userSelect.value = doc.user;
    if (customerInput && doc.customer) customerInput.value = doc.customer;
    const normalizedItems = (Array.isArray(doc.items) ? doc.items : []).map((item, index) => ({
      ...item,
      id: item.id || `sales-archive-${doc.id || 'doc'}-${index}`,
      productId: item.productId || item.mehsul_id || null,
      name: item.name || item.mehsul_adi || 'Məhsul',
      code: item.code || item.mehsul_kodu || '',
      qty: Number(item.qty ?? item.miqdari ?? 0),
      price: Number(item.price ?? item.qiymeti ?? 0),
      unit: item.unit || item.vahidi || 'əd',
      discount: Number(item.discount ?? item.endirim ?? 0),
      tax: Number(item.tax ?? item.edv ?? 0),
    }));
    saveSelectedItems(normalizedItems);
    renderRows();

    const shouldReadOnly = mode === 'view';
    const saveButton = document.querySelector('#sales-save');
    if (saveButton) {
      saveButton.hidden = shouldReadOnly;
      saveButton.disabled = shouldReadOnly;
    }
    form?.querySelectorAll('input, select, textarea, button').forEach((element) => {
      if (element.matches('.module-close')) return;
      if (element.id === 'sales-save') {
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
    if (customerPickerButton) customerPickerButton.disabled = shouldReadOnly;
  };

  window.openSalesDocFromArchive = (docId, mode = 'view', archiveFallback = null) => {
    const doc = getSalesDocs().find((item) => item.id === docId || item.number === docId)
      || (archiveFallback ? {
        id: archiveFallback.docId || archiveFallback.id,
        number: archiveFallback.number,
        date: archiveFallback.date,
        workplace: archiveFallback.workplace,
        user: archiveFallback.user,
        customer: archiveFallback.partyName || archiveFallback.customer,
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
    if (mode === 'view') window.showErpToast?.('Sənəd baxış rejimində açıldı.');
  };

  populateControls();
  setDefaultDate();
  setDefaultNumber();
  saveSelectedItems([]);
  renderRows();

  const resetSalesDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    saveSelectedItems([]);
    if (typeof window.erpEnsureProductsLoaded === 'function') {
      window.erpEnsureProductsLoaded().then(() => renderRows());
    }
    renderRows();
  };

  window.salesDocumentsViewModule = { refresh: renderRows, reset: resetSalesDraft };
})();
