(() => {
  const view = document.querySelector('#muddeti-bitmis-view');
  if (!view) return;

  const searchInput = view.querySelector('#expired-product-search');
  const suggestionList = view.querySelector('#expired-product-suggestions');
  const qtyInput = view.querySelector('#expired-product-qty');
  const addButton = view.querySelector('#expired-product-add');
  const listBody = view.querySelector('#expired-product-list');
  const countLabel = view.querySelector('#expired-product-count');
  const emptyBox = view.querySelector('#expired-product-empty');
  const reasonInput = view.querySelector('#expired-product-reason');

  let selectedProduct = null;

  const getProducts = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('marketErpProducts') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const getCurrentLogin = () => {
    try {
      return JSON.parse(localStorage.getItem('lastLogin') || 'null')?.login || 'Admin';
    } catch {
      return 'Admin';
    }
  };

  const renderSuggestions = () => {
    if (!suggestionList) return;
    const query = (searchInput?.value || '').trim().toLowerCase();
    if (!query) {
      suggestionList.innerHTML = '';
      suggestionList.hidden = true;
      return;
    }

    const matches = getProducts()
      .filter((product) => {
        const barcodes = Array.isArray(product.barcodes) ? product.barcodes.join(' ') : String(product.barcode || '');
        const text = [product.name, product.code, barcodes, product.category, product.company]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(query);
      })
      .slice(0, 50);

    suggestionList.innerHTML = matches.map((product) => `
      <button type="button" class="expired-suggestion" data-expired-product-id="${product.id}">
        <strong>${product.name}</strong>
        <small>${product.code || ''} · Stok: ${Number(product.stock || 0)} ${product.unit || 'əd'}</small>
      </button>
    `).join('');
    suggestionList.hidden = matches.length === 0;

    suggestionList.querySelectorAll('.expired-suggestion').forEach((button) => {
      button.addEventListener('click', () => {
        selectedProduct = getProducts().find((product) => String(product.id) === String(button.dataset.expiredProductId)) || null;
        if (selectedProduct && searchInput) {
          searchInput.value = `${selectedProduct.name} (${selectedProduct.code || ''})`;
        }
        suggestionList.innerHTML = '';
        suggestionList.hidden = true;
        qtyInput?.focus();
      });
    });
  };

  const renderList = (rows) => {
    if (!listBody) return;
    if (!rows.length) {
      listBody.innerHTML = '';
      if (emptyBox) emptyBox.hidden = false;
      if (countLabel) countLabel.textContent = '0 məhsul';
      return;
    }

    if (emptyBox) emptyBox.hidden = true;
    if (countLabel) countLabel.textContent = `${rows.length} məhsul`;
    listBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${String(row.yaradilma_tarixi || '').slice(0, 10) || '-'}</td>
        <td><strong>${row.mehsul_adi || 'Məhsul'}</strong><small>${row.mehsul_kodu || ''}</small></td>
        <td>${Number(row.miqdari || 0)} ${row.vahidi || 'əd'}</td>
        <td>${row.sebeb || 'Müddəti bitib'}</td>
        <td>${row.isdifadeci || 'İstifadəçi'}</td>
      </tr>
    `).join('');
  };

  const loadExpiredProducts = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/expired-products', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result?.status === 'success' && Array.isArray(result.expired_products)) {
        renderList(result.expired_products);
        return;
      }
    } catch (error) {
      console.warn('Müddəti bitmiş mallar serverdən alınmadı.', error);
    }
    renderList([]);
  };

  const syncLocalStock = (product, qty) => {
    try {
      const products = getProducts();
      const next = products.map((item) => {
        if (String(item.id) !== String(product.id)) return item;
        return { ...item, stock: Math.max(0, Number(item.stock || 0) - qty) };
      });
      localStorage.setItem('marketErpProducts', JSON.stringify(next));
    } catch (error) {
      console.warn('Lokal stok yenilənmədi.', error);
    }
  };

  const addExpiredProduct = async () => {
    if (!selectedProduct) {
      window.showErpToast?.('Axtarışdan məhsul seçin.');
      return;
    }
    const qty = Number(qtyInput?.value || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      window.showErpToast?.('Miqdar 0-dan böyük olmalıdır.');
      return;
    }

    try {
      const response = await fetch('http://94.20.88.181:5050/api/expired-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mehsul_kodu: selectedProduct.code || '',
          mehsul_adi: selectedProduct.name || '',
          miqdari: qty,
          vahidi: selectedProduct.unit || 'əd',
          sebeb: (reasonInput?.value || 'Müddəti bitib').trim() || 'Müddəti bitib',
          isdifadeci: getCurrentLogin(),
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Məhsul əlavə edilmədi.');
      }

      syncLocalStock(selectedProduct, qty);
      selectedProduct = null;
      if (searchInput) searchInput.value = '';
      if (qtyInput) qtyInput.value = '';
      if (reasonInput) reasonInput.value = '';
      await loadExpiredProducts();
      window.showErpToast?.(result.message || 'Məhsul stokdan çıxıldı.');
    } catch (error) {
      window.showErpToast?.(error.message || 'Məhsul əlavə edilmədi.');
    }
  };

  searchInput?.addEventListener('input', () => {
    selectedProduct = null;
    renderSuggestions();
  });
  searchInput?.addEventListener('focus', renderSuggestions);
  document.addEventListener('click', (event) => {
    if (!suggestionList || suggestionList.hidden) return;
    if (event.target === searchInput || suggestionList.contains(event.target)) return;
    suggestionList.hidden = true;
  });
  addButton?.addEventListener('click', addExpiredProduct);
  qtyInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addExpiredProduct();
    }
  });

  window.muddetiBitmisModulu = { goster: loadExpiredProducts };
})();
