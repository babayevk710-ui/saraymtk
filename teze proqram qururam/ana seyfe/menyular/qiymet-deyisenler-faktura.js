(() => {
  const view = document.querySelector('#qiymet-deyisenler-faktura-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpPriceChangeDocs';

  const headerEl = view.querySelector('#qiymet-faktura-header');
  const subtitleEl = view.querySelector('#qiymet-faktura-subtitle');
  const numberEl = view.querySelector('#qiymet-faktura-number');
  const dateEl = view.querySelector('#qiymet-faktura-date');
  const senderEl = view.querySelector('#qiymet-faktura-sender');
  const statusEl = view.querySelector('#qiymet-faktura-status');
  const itemsEl = view.querySelector('#qiymet-faktura-items');
  const approveButton = view.querySelector('#qiymet-faktura-approve');
  const saveButton = view.querySelector('#qiymet-faktura-save');
  let activeInvoiceId = null;
  let activeDraftInvoice = null;

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const getDocs = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const refreshProductCatalogFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/products', { cache: 'no-store' });
      const data = await response.json();
      const products = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
      const mapped = products.map((product) => ({
        id: product?.id ?? product?.mehsul_id ?? `prod-${Math.random()}`,
        code: product?.mehsul_kodu || product?.code || '',
        name: product?.mehsul_adi || product?.name || 'Məhsul',
        productType: product?.mehsul_tipi === 'mamul' ? 'Mamul' : product?.mehsul_tipi === 'diger' ? 'Digər' : product?.productType || 'Ticari mal',
        category: product?.kateqoriya || product?.category || 'Ərzaq',
        company: product?.satici_firma_id || product?.company || '',
        warehouse: product?.anbar_id || product?.warehouse || 'Əsas Anbar',
        unit: product?.olcu_vahidi || product?.unit || 'ədəd',
        barcode: Array.isArray(product?.barcodes) && product.barcodes.length ? product.barcodes[0] : product?.barcode || '',
        barcodes: Array.isArray(product?.barcodes) ? product.barcodes : [],
        cost: Number(product?.alis_qiymeti ?? product?.cost ?? 0),
        price: Number(product?.satis_qiymeti ?? product?.price ?? 0),
        stock: Number(product?.stok_sayi ?? product?.stock ?? 0),
        taxMode: product?.edv_status === 'azad' ? 'exempt' : 'taxable',
        tax: Number(product?.edv_faizi ?? product?.tax ?? 0),
        minStock: Number(product?.minimum_stok ?? product?.minStock ?? 0),
        bonusEnabled: product?.bonus_tetbiq_edilir === 'beli' || product?.bonusEnabled === true || product?.bonusEnabled === 'true',
        bonusGroup: product?.bonus_qrupu || product?.bonusGroup || 'Bütün müştərilər',
        status: product?.status === 'passiv' || product?.status === 'inactive' ? 'passiv' : 'aktiv',
        notes: product?.qeyd || product?.notes || '',
        createdAt: product?.yaradilma_tarixi || product?.createdAt || new Date().toISOString().slice(0, 10),
      }));

      localStorage.setItem('marketErpProducts', JSON.stringify(mapped));
      if (typeof window.renderProducts === 'function') {
        window.renderProducts();
      }
      return mapped;
    } catch (error) {
      console.warn('Product catalog refresh failed:', error);
      return JSON.parse(localStorage.getItem('marketErpProducts') || '[]');
    }
  };

  const loadDocsFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/qiymet-deyisenler', { cache: 'no-store' });
      const data = await response.json();
      const docs = Array.isArray(data?.price_change_documents) ? data.price_change_documents : [];
      const normalized = docs.map((doc) => ({
        id: String(doc?.id ?? `doc-${Date.now()}-${Math.random()}`),
        number: doc?.faktura_nomresi || '-',
        date: doc?.tarix || '-',
        sender: doc?.gonderen_adam || 'Mərkəz',
        status: normalizePriceChangeStatus(doc?.faktura_statusu || doc?.statusu || 'draft'),
        approver: doc?.gonderen_adam || 'Mərkəz',
        items: Array.isArray(doc?.lines) ? doc.lines.map((item, index) => {
          const previousPrice = Number(item?.kohne_satis_qiymeti ?? 0);
          return {
            id: String(item?.id ?? `${doc?.id ?? 'doc'}-item-${index}`),
            name: item?.mehsul_adi || 'Məhsul',
            code: item?.mehsul_kodu || '-',
            previousPrice,
            newPrice: Number(item?.yeni_satis_qiymeti ?? item?.kohne_satis_qiymeti ?? 0),
            previousPurchasePrice: Number(item?.kohne_alis_qiymeti ?? 0),
            purchasePrice: Number(item?.yeni_alis_qiymeti ?? item?.kohne_alis_qiymeti ?? 0),
            qty: item?.real_stok ?? item?.miqdari ?? 1,
            rate: item?.faizi,
            ...item,
          };
        }) : [],
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      console.warn('Qiymət dəyişən faktura serverdən alınmadı:', error);
      return getDocs();
    }
  };

  const normalizePriceChangeStatus = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (['approved', 'qebul_edildi', 'confirmed', 'tesdiqlendi', '1'].includes(normalized)) return 'approved';
    if (['pending', 'bekleyir', 'waiting', 'gözləyir', '2'].includes(normalized)) return 'pending';
    if (['rejected', 'legv_edildi', 'cancelled', 'reddedildi', '3'].includes(normalized)) return 'rejected';
    if (['draft', 'qaralama', 'new'].includes(normalized)) return 'draft';
    if (normalized === 'aktiv') return 'approved';
    if (normalized === 'passiv') return 'rejected';
    return 'pending';
  };

  const statusLabel = (status) => ({
    approved: 'Təsdiqləndi',
    pending: 'Gözləyir',
    draft: 'Qaralama',
    rejected: 'Rədd edildi',
  })[normalizePriceChangeStatus(status)] || 'Aktiv';

  const FIXED_EXTRA = 0.2;

  const recalcRate = (purchasePrice, previousPrice, newPrice) => {
    const safePurchase = toSafeNumber(purchasePrice || 0);
    const safeNew = toSafeNumber(newPrice || 0);

    if (!safePurchase || !Number.isFinite(safePurchase) || safePurchase === 0) return 0;
    return ((safeNew - safePurchase) / safePurchase) * 100;
  };

  const toSafeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const priceDiffWarning = (item) => {
    const baseSale = toSafeNumber(item.previousPrice || item.oldPrice || 0);
    const currentSale = toSafeNumber(item.newPrice || item.currentPrice || 0);
    const oldPurchase = toSafeNumber(item.previousPurchasePrice || 0);
    const currentPurchase = toSafeNumber(item.purchasePrice || 0);
    const saleChanged = baseSale > 0 && currentSale > 0 && Math.abs(currentSale - baseSale) > 0.009;
    const purchaseChanged = oldPurchase > 0 && currentPurchase > 0 && Math.abs(currentPurchase - oldPurchase) > 0.009;
    return saleChanged || purchaseChanged;
  };

  const buildInvoicePayload = (invoice, nextStatus = invoice?.status || 'draft') => {
    const items = Array.isArray(invoice?.items) ? invoice.items.map((item) => {
      const oldPurchase = toSafeNumber(item.previousPurchasePrice || item.purchasePrice || 0);
      const newPurchase = toSafeNumber(item.purchasePrice || item.newPurchasePrice || oldPurchase || 0);
      const oldSale = toSafeNumber(item.previousPrice || item.oldPrice || 0);
      const newSale = toSafeNumber(item.newPrice || item.currentPrice || oldSale || 0);
      const rate = toSafeNumber(item.rate ?? recalcRate(newPurchase, oldSale, newSale));
      return {
        mehsul_adi: item.name || item.mehsul_adi || '',
        mehsul_kodu: item.code || item.mehsul_kodu || '',
        miqdari: item.qty || item.real_stok || 1,
        kohne_alis_qiymeti: oldPurchase,
        yeni_alis_qiymeti: newPurchase,
        kohne_satis_qiymeti: oldSale,
        yeni_satis_qiymeti: newSale,
        faizi: rate,
        real_stok: item.stock || item.quantity || item.qty || item.real_stok || 1,
      };
    }) : [];

    return {
      id: invoice?.id,
      faktura_nomresi: invoice?.number,
      tarix: invoice?.date,
      gonderen_adam: invoice?.sender,
      status: nextStatus,
      statusu: nextStatus === 'approved' ? 'aktiv' : nextStatus === 'rejected' ? 'passiv' : 'aktiv',
      faktura_statusu: nextStatus === 'approved' ? 'qebul_edildi' : nextStatus === 'rejected' ? 'legv_edildi' : 'bekleyir',
      items,
    };
  };

  const invoiceMatchesId = (entryId, targetId) => String(entryId) === String(targetId);

  const saveInvoiceStatus = async (invoiceId, nextStatus) => {
    const invoice = activeDraftInvoice && invoiceMatchesId(activeDraftInvoice.id, invoiceId)
      ? activeDraftInvoice
      : getDocs().find((entry) => invoiceMatchesId(entry.id, invoiceId)) || null;
    if (!invoice) return false;

    const payload = buildInvoicePayload({ ...invoice, status: nextStatus }, nextStatus);

    try {
      const response = await fetch(`http://94.20.88.181:5050/api/qiymet-deyisenler/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Status yenilənmədi.');
      }

      const docs = getDocs();
      const index = docs.findIndex((entry) => invoiceMatchesId(entry.id, invoiceId));
      if (index !== -1) {
        docs[index] = {
          ...docs[index],
          status: nextStatus,
          approver: nextStatus === 'approved' ? 'Təsdiqləyən: Admin' : nextStatus === 'rejected' ? 'Ləğv edən: Admin' : docs[index].approver || 'Qaralama',
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      }
      if (nextStatus === 'approved') {
        await refreshProductCatalogFromServer();
      }
      if (window.priceChangeListModule?.render) window.priceChangeListModule.render();
      return true;
    } catch (error) {
      console.warn('Status DB yenilənməsi xətası:', error);
      return false;
    }
  };

  const persistDraftInvoice = async (statusOverride) => {
    if (!activeInvoiceId || !activeDraftInvoice) return;

    const nextStatus = statusOverride || activeDraftInvoice.status || 'draft';
    const payload = buildInvoicePayload({ ...activeDraftInvoice, status: nextStatus }, nextStatus);

    try {
      const response = await fetch(`http://94.20.88.181:5050/api/qiymet-deyisenler/${activeInvoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Sənəd yadda saxlanılmadı.');
      }
    } catch (error) {
      console.warn('Sənəd DB yenilənməsi xətası:', error);
    }

    const docs = getDocs();
    const index = docs.findIndex((doc) => invoiceMatchesId(doc.id, activeInvoiceId));
    if (index !== -1) {
      docs[index] = {
        ...docs[index],
        ...activeDraftInvoice,
        status: nextStatus,
        approver: nextStatus === 'approved' ? 'Təsdiqləyən: Admin' : nextStatus === 'rejected' ? 'Ləğv edən: Admin' : docs[index].approver || 'Qaralama',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    }
    if (window.priceChangeListModule?.render) window.priceChangeListModule.render();
    activeDraftInvoice = null;
    if (typeof window.showPriceChangeList === 'function') {
      window.showPriceChangeList();
    } else if (typeof window.closeCurrentModule === 'function') {
      window.closeCurrentModule('qiymet-deyisenler-faktura-view');
    } else {
      view.hidden = true;
    }
  };

  const saveCurrentInvoiceAsDraft = () => {
    if (!activeInvoiceId) return;
    persistDraftInvoice('draft');
  };

  const syncItemFieldInputs = (itemId, item) => {
    if (!itemsEl) return;
    const inputs = itemsEl.querySelectorAll('.price-change-input[data-item-id="' + itemId + '"]');
    inputs.forEach((input) => {
      const field = input.dataset.field;
      if (field === 'rate') {
        const rateValue = toSafeNumber(item.rate ?? recalcRate(
          toSafeNumber(item.purchasePrice || item.previousPurchasePrice || 0),
          toSafeNumber(item.previousPrice || 0),
          toSafeNumber(item.newPrice || item.previousPrice || 0)
        ));
        input.value = rateValue.toFixed(2);
      }
      if (field === 'newPrice') {
        input.value = toSafeNumber(item.newPrice || item.previousPrice || 0).toFixed(2);
      }
    });
  };

  const updateInvoiceItem = (invoiceId, itemId, patch) => {
    if (!activeDraftInvoice || !invoiceMatchesId(activeDraftInvoice.id, invoiceId)) {
      const docs = getDocs();
      const invoice = docs.find((doc) => invoiceMatchesId(doc.id, invoiceId));
      activeDraftInvoice = invoice ? JSON.parse(JSON.stringify(invoice)) : null;
    }

    if (!activeDraftInvoice) return;

    const itemIndex = activeDraftInvoice.items.findIndex((item) => String(item.id) === String(itemId));
    if (itemIndex === -1) return;

    const currentItem = activeDraftInvoice.items[itemIndex];
    const nextItem = {
      ...currentItem,
      ...patch,
    };

    const purchasePrice = toSafeNumber(patch.purchasePrice ?? nextItem.purchasePrice ?? currentItem.purchasePrice ?? currentItem.previousPurchasePrice ?? 0);
    const previousPrice = toSafeNumber(patch.previousPrice ?? nextItem.previousPrice ?? currentItem.previousPrice ?? currentItem.newPrice ?? 0);
    if (patch.purchasePrice !== undefined) {
      nextItem.purchasePrice = purchasePrice;
    }

    if (patch.rate !== undefined) {
      const nextRate = toSafeNumber(patch.rate);
      if (purchasePrice === 0) {
        nextItem.rate = 0;
        nextItem.newPrice = previousPrice;
      } else {
        nextItem.rate = nextRate;
        nextItem.newPrice = purchasePrice * (1 + nextRate / 100) + FIXED_EXTRA;
      }
    }

    if (patch.newPrice !== undefined) {
      const nextSalePrice = toSafeNumber(patch.newPrice);
      nextItem.newPrice = nextSalePrice;
      nextItem.rate = purchasePrice === 0 ? 0 : recalcRate(purchasePrice, previousPrice, nextSalePrice);
    }

    if (patch.previousPrice !== undefined) {
      nextItem.previousPrice = toSafeNumber(patch.previousPrice);
    }

    activeDraftInvoice.items[itemIndex] = nextItem;
    syncItemFieldInputs(itemId, nextItem);
  };

  const filterRealItems = (invoice) => {
    const catalog = JSON.parse(localStorage.getItem('marketErpProducts') || '[]');
    const entries = Array.isArray(invoice?.items) ? invoice.items : [];
    const filtered = entries.filter((item) => {
      const itemCode = String(item?.code || item?.mehsul_kodu || '').trim();
      const itemName = String(item?.name || item?.mehsul_adi || '').trim();
      return catalog.some((product) => {
        const productCode = String(product?.code || product?.mehsul_kodu || '').trim();
        const productName = String(product?.name || product?.mehsul_adi || '').trim();
        return Boolean((productCode && itemCode && productCode === itemCode) || (productName && itemName && productName === itemName));
      });
    });
    return { ...invoice, items: filtered };
  };

  const openInvoice = async (invoiceId) => {
    activeInvoiceId = invoiceId;
    const docs = await loadDocsFromServer();
    const invoice = docs.find((doc) => invoiceMatchesId(doc.id, invoiceId)) || docs[0];
    if (!invoice) return;

    let purchaseQtyMap = {};
    try {
      const response = await fetch('http://94.20.88.181:5050/api/reports/alis-hesabati', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result?.status === 'success' && Array.isArray(result.rows)) {
        purchaseQtyMap = result.rows.reduce((acc, row) => {
          const code = String(row.mehsul_kodu || '').trim();
          if (!code) return acc;
          acc[code] = (acc[code] || 0) + Number(row.miqdari || 0);
          return acc;
        }, {});
      }
    } catch (error) {
      console.warn('Alış miqdarları alınmadı:', error);
    }

    const catalog = typeof window.erpGetProducts === 'function' ? window.erpGetProducts() : [];
    activeDraftInvoice = JSON.parse(JSON.stringify(filterRealItems(invoice)));
    (activeDraftInvoice.items || []).forEach((item) => {
      const code = String(item.code || item.mehsul_kodu || '').trim();
      item.purchaseQty = purchaseQtyMap[code] ?? 0;
      const catalogProduct = catalog.find((p) => String(p.code || '').trim() === code);
      if (catalogProduct) {
        item.stock = Number(catalogProduct.stock ?? catalogProduct.stok_sayi ?? 0);
        if (!toSafeNumber(item.previousPrice)) {
          item.previousPrice = Number(catalogProduct.price ?? catalogProduct.satis_qiymeti ?? 0);
        }
        if (!toSafeNumber(item.newPrice)) {
          item.newPrice = toSafeNumber(item.previousPrice);
        }
      }
    });

    if (headerEl) headerEl.textContent = invoice.number || 'Faktura detayları';
    if (subtitleEl) subtitleEl.textContent = `${invoice.date || '-'} • ${invoice.sender || 'Mərkəz'}`;
    if (numberEl) numberEl.textContent = invoice.number || '-';
    if (dateEl) dateEl.textContent = invoice.date || '-';
    if (senderEl) senderEl.textContent = `${invoice.sender || '-'}${invoice.approver ? ` / ${invoice.approver}` : ''}`;
    if (statusEl) {
      statusEl.textContent = statusLabel(invoice.status || 'draft');
      statusEl.className = 'status-pill';
      statusEl.classList.add(invoice.status || 'draft');
    }
    const normalizedStatus = normalizePriceChangeStatus(invoice.status || 'draft');
    if (approveButton) {
      const isApproved = normalizedStatus === 'approved';
      approveButton.textContent = isApproved ? 'Təsdiqlənib' : 'Təsdiq et';
      approveButton.disabled = isApproved;
      approveButton.hidden = isApproved;
    }
    if (saveButton) {
      saveButton.hidden = normalizedStatus === 'approved';
      saveButton.textContent = 'Yadda saxla';
    }
    if (statusEl) {
      statusEl.textContent = statusLabel(normalizedStatus);
      statusEl.className = 'status-pill';
      statusEl.classList.add(normalizedStatus);
    }

    if (!itemsEl) return;

    const rows = (activeDraftInvoice.items || []).map((item) => {
      const previousPrice = toSafeNumber(item.previousPrice || 0);
      const oldPurchasePrice = toSafeNumber(item.previousPurchasePrice || item.purchasePrice || 0);
      const purchasePrice = toSafeNumber(item.purchasePrice || oldPurchasePrice || 0);
      const currentPrice = toSafeNumber(item.newPrice !== undefined ? item.newPrice : previousPrice);
      const calculatedBaseRate = purchasePrice === 0 ? 0 : toSafeNumber(item.rate !== undefined ? item.rate : recalcRate(purchasePrice, previousPrice, currentPrice));
      const calculatedAmount = purchasePrice === 0 ? currentPrice + FIXED_EXTRA : purchasePrice * (1 + calculatedBaseRate / 100) + FIXED_EXTRA;
      const warningRow = priceDiffWarning(item);

      const stockCount = toSafeNumber(item.stock || item.quantity || 0);
      const purchaseQty = toSafeNumber(item.purchaseQty || 0);

      return `
        <tr class="${warningRow ? 'warning-row' : ''}" data-item-id="${item.id}">
          <td><strong>${item.name || 'Məhsul'}</strong></td>
          <td>${item.code || '-'}</td>
          <td>${formatMoney(oldPurchasePrice)} ₼</td>
          <td><strong>${formatMoney(purchasePrice)} ₼</strong></td>
          <td><input class="price-change-input" data-field="rate" data-item-id="${item.id}" type="text" inputmode="decimal" value="${calculatedBaseRate.toFixed(2)}"></td>
          <td>${formatMoney(previousPrice)} ₼</td>
          <td><input class="price-change-input" data-field="newPrice" data-item-id="${item.id}" type="text" inputmode="decimal" value="${currentPrice.toFixed(2)}"></td>
          <td><strong>${purchaseQty}</strong></td>
          <td><strong>${stockCount}</strong></td>
        </tr>
      `;
    }).join('');

    itemsEl.innerHTML = rows || `
      <tr>
        <td colspan="9" class="table-empty-cell">Faktura içində məhsul yoxdur.</td>
      </tr>
    `;

    itemsEl.querySelectorAll('.price-change-input').forEach((input) => {
      input.addEventListener('input', (event) => {
        const target = event.target;
        target.dataset.manual = 'true';
        const itemId = target.dataset.itemId;
        const field = target.dataset.field;
        const current = (activeDraftInvoice?.items || []).find((item) => String(item.id) === String(itemId));
        if (!current) return;

        const previousPrice = toSafeNumber(current.previousPrice || 0);
        const nextValue = target.value;

        if (field === 'rate') {
          updateInvoiceItem(activeInvoiceId, itemId, { rate: Number(String(nextValue).replace(',', '.')) });
        } else if (field === 'newPrice') {
          updateInvoiceItem(activeInvoiceId, itemId, { newPrice: Number(String(nextValue).replace(',', '.')) });
        }

        const item = (activeDraftInvoice?.items || []).find((entry) => String(entry.id) === String(itemId)) || current;

        const purchaseBase = toSafeNumber(item.purchasePrice || item.previousPurchasePrice || 0);
        const computedCurrentPrice = toSafeNumber(item.newPrice !== undefined ? item.newPrice : previousPrice);
        const computedRate = purchaseBase === 0 ? 0 : recalcRate(purchaseBase, previousPrice, computedCurrentPrice);

        if (field === 'newPrice') {
          const rateInputs = itemsEl.querySelectorAll('[data-field="rate"][data-item-id="' + itemId + '"]');
          rateInputs.forEach((rateInput) => {
            if (rateInput !== target) rateInput.value = computedRate.toFixed(2);
          });
        }

        const row = itemsEl.querySelector('[data-item-id="' + itemId + '"]');
        if (row) {
          const oldPurchase = toSafeNumber(item.previousPurchasePrice || 0);
          const currentPurchase = toSafeNumber(item.purchasePrice || 0);
          const newSaleNow = field === 'newPrice' ? toSafeNumber(nextValue) : computedCurrentPrice;
          const saleChanged = previousPrice > 0 && newSaleNow > 0 && Math.abs(newSaleNow - previousPrice) > 0.009;
          const purchaseChanged = oldPurchase > 0 && currentPurchase > 0 && Math.abs(currentPurchase - oldPurchase) > 0.009;
          row.classList.toggle('warning-row', saleChanged || purchaseChanged);
        }
      });

      input.addEventListener('blur', (event) => {
        const target = event.target;
        const raw = String(target.value || '').replace(',', '.').trim();
        const parsed = Number(raw);
        if (raw !== '' && Number.isFinite(parsed)) {
          target.value = parsed.toFixed(2);
        }
      });
    });
  };

  approveButton?.addEventListener('click', async () => {
    if (!activeInvoiceId) return;
    const ok = await saveInvoiceStatus(activeInvoiceId, 'approved');
    if (ok) {
      await loadDocsFromServer();
      if (window.priceChangeListModule?.render) window.priceChangeListModule.render();
      if (typeof window.showPriceChangeList === 'function') {
        window.showPriceChangeList();
      }
    }
  });

  saveButton?.addEventListener('click', () => { if (activeInvoiceId) persistDraftInvoice('draft'); });

  window.priceChangeInvoiceModule = { openInvoice };
})();
