(() => {
  const view = document.querySelector('#qiymet-deyisenler-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpPriceChangeDocs';
  const PRODUCTS_KEY = 'marketErpProducts';

  const listEl = view.querySelector('#qiymet-deyisenler-list');
  const countEl = view.querySelector('#qiymet-deyisenler-count');
  const searchInput = view.querySelector('#qiymet-deyisenler-search');

  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const getProducts = () => {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const getDocs = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveDocs = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const normalizeServerDoc = (doc) => {
    const items = Array.isArray(doc?.lines) ? doc.lines : Array.isArray(doc?.items) ? doc.items : [];
    const documentId = String(doc?.id ?? doc?.price_change_document_id ?? `price-doc-${Date.now()}`);
    return {
      id: documentId,
      number: doc?.faktura_nomresi || doc?.number || '-',
      date: doc?.tarix || doc?.date || '-',
      sender: doc?.gonderen_adam || doc?.sender || 'Mərkəz',
      status: normalizePriceChangeStatus(doc?.faktura_statusu || doc?.statusu || doc?.status || 'draft'),
      approver: doc?.gonderen_adam || doc?.approver || 'Mərkəz',
      items: items.map((item, index) => ({
        id: String(item?.id ?? `${documentId}-item-${index}`),
        name: item?.mehsul_adi || item?.name || 'Məhsul',
        code: item?.mehsul_kodu || item?.code || '-',
        previousPrice: item?.kohne_satis_qiymeti ?? item?.previousPrice ?? 0,
        newPrice: item?.yeni_satis_qiymeti ?? item?.newPrice ?? 0,
        previousPurchasePrice: item?.kohne_alis_qiymeti ?? item?.previousPurchasePrice ?? 0,
        purchasePrice: item?.yeni_alis_qiymeti ?? item?.purchasePrice ?? item?.kohne_alis_qiymeti ?? 0,
        qty: item?.real_stok ?? item?.qty ?? item?.miqdari ?? 1,
        ...item,
      })),
    };
  };

  const loadDocsFromServer = async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/qiymet-deyisenler', { cache: 'no-store' });
      const data = await response.json();
      const rows = Array.isArray(data?.price_change_documents) ? data.price_change_documents : [];
      const normalized = rows.map(normalizeServerDoc);
      saveDocs(normalized);
      return normalized;
    } catch (error) {
      console.warn('Qiymət dəyişən sənədlər serverdən alınmadı:', error);
      return getDocs();
    }
  };

  const normalizeProductMatch = (product) => ({
    code: String(product?.code || product?.mehsul_kodu || '').trim(),
    name: String(product?.name || product?.mehsul_adi || '').trim(),
  });

  const hasRealCatalogMatch = (item, catalog) => {
    const itemCode = String(item?.code || item?.mehsul_kodu || '').trim();
    const itemName = String(item?.name || item?.mehsul_adi || '').trim();

    return catalog.some((product) => {
      const match = normalizeProductMatch(product);
      return Boolean((match.code && itemCode && match.code === itemCode) || (match.name && itemName && match.name === itemName));
    });
  };

  const filterRealCatalogItems = (doc) => {
    const catalog = getProducts();
    const rawItems = Array.isArray(doc?.items) ? doc.items : Array.isArray(doc?.lines) ? doc.lines : [];
    const filteredItems = rawItems.filter((item) => hasRealCatalogMatch(item, catalog));

    return {
      ...doc,
      items: filteredItems,
    };
  };

  const ensureProducts = () => {
    const existing = getProducts();
    return existing;
  };

  const ensureInitialDocs = () => {
    const docs = getDocs();
    if (docs.length) return docs;

    const productCatalog = ensureProducts();
    const buildInvoice = (number, date, sender, status, items) => ({
      id: `price-doc-${number}`,
      number,
      date,
      sender,
      status,
      items,
    });

    const sample = [
      buildInvoice('F-2026-001', '2026-08-18', 'Aysel Quliyeva', 'approved', [
        { id: 'line-1', name: 'Ayran 1L', code: 'M-001', purchasePrice: 3.1, previousPurchasePrice: 3.0, previousPrice: 4.2, newPrice: 4.8, qty: 36 },
        { id: 'line-2', name: 'Şokolad 100q', code: 'M-002', purchasePrice: 4.8, previousPurchasePrice: 4.8, previousPrice: 6.4, newPrice: 7.1, qty: 18 },
        { id: 'line-3', name: 'Çörək 250q', code: 'CHQ-250', purchasePrice: 2.1, previousPurchasePrice: 2.0, previousPrice: 2.9, newPrice: 3.4, qty: 42 },
      ]),
      buildInvoice('F-2026-002', '2026-08-19', 'Namiq Əliyev', 'pending', [
        { id: 'line-4', name: 'Süd 1L', code: 'SUD-001', purchasePrice: 2.7, previousPurchasePrice: 2.7, previousPrice: 3.5, newPrice: 3.9, qty: 54 },
        { id: 'line-5', name: 'Yumurta 10 əd', code: 'YUM-010', purchasePrice: 4.2, previousPurchasePrice: 4.1, previousPrice: 5.6, newPrice: 6.2, qty: 30 },
      ]),
      buildInvoice('F-2026-003', '2026-08-20', 'Ləman Həsənova', 'draft', [
        { id: 'line-6', name: 'Ayran 1L', code: 'M-001', purchasePrice: 3.3, previousPurchasePrice: 3.2, previousPrice: 4.8, newPrice: 5.1, qty: 24 },
      ]),
    ];

    const enriched = sample.map((invoice) => ({
      ...invoice,
      items: invoice.items.map((item) => {
        const product = productCatalog.find((entry) => entry.code === item.code || entry.name === item.name);
        return {
          ...item,
          category: product?.category || 'Ərzaq',
          unit: product?.unit || 'əd',
        };
      }),
    }));

    saveDocs(enriched);
    return enriched;
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

  const statusLabel = (status) => {
    const map = {
      approved: 'Təsdiqləndi',
      pending: 'Gözləyir',
      draft: 'Qaralama',
      new: 'Yeni sənəd',
      rejected: 'Rədd edildi',
    };
    return map[normalizePriceChangeStatus(status)] || 'Aktiv';
  };

  const createNewInvoice = () => {
    if (typeof window.showPurchaseDocuments === 'function') {
      window.showPurchaseDocuments();
      if (typeof window.resetPurchaseForm === 'function') {
        window.resetPurchaseForm();
      }
      return;
    }

    const docs = getDocs();
    const timeStamp = Date.now();
    const date = new Date().toISOString().slice(0, 10);
    const number = `F-${String(timeStamp).slice(-6)}`;
    const newDoc = {
      id: `price-doc-new-${timeStamp}`,
      number,
      date,
      sender: 'Yeni sənəd',
      status: 'new',
      approver: 'Qaralama',
      items: [],
    };

    saveDocs([newDoc, ...docs]);
    window.showPriceChangeInvoice?.(newDoc.id);
    render();
  };

  const render = async () => {
    const docs = (await loadDocsFromServer()).map(filterRealCatalogItems).filter((doc) => (doc.items || []).length > 0);
    const searchValue = (searchInput?.value || '').trim().toLowerCase();
    const filtered = docs.filter((doc) => {
      if (!searchValue) return true;
      const haystack = [doc.number, doc.date, doc.sender, ...(doc.items || []).map((item) => `${item.name || item.mehsul_adi || ''} ${item.code || item.mehsul_kodu || ''}`)].join(' ').toLowerCase();
      return haystack.includes(searchValue);
    });

    if (countEl) countEl.textContent = `${filtered.length} faktura`;
    if (!listEl) return;

    listEl.innerHTML = filtered.map((doc) => {
      const diffTotal = (doc.items || []).reduce((sum, item) => sum + (Number(item.newPrice || 0) - Number(item.previousPrice || 0)) * Number(item.qty || 0), 0);
      const status = normalizePriceChangeStatus(doc.status || 'draft');
      const approvalState = status === 'approved' ? 'approved' : status === 'pending' ? 'pending' : status === 'new' ? 'new' : 'waiting';
      return `
        <tr>
          <td class="invoice-approval-cell"><span class="invoice-square ${approvalState}" aria-label="Faktura statusu"><span>✓</span></span></td>
          <td><strong>${doc.number}</strong></td>
          <td>${doc.date}</td>
          <td><div class="invoice-person"><strong>${doc.sender || 'Mərkəz'}</strong><small>${doc.approver || 'Şəxs qeyd edilməyib'}</small></div></td>
          <td><span class="status-pill ${status}">${statusLabel(status)}</span></td>
          <td>${formatMoney(diffTotal)} ₼</td>
          <td><button type="button" class="primary-button" data-open-price-doc="${doc.id}">Aç</button></td>
        </tr>
      `;
    }).join('');

    listEl.querySelectorAll('[data-open-price-doc]').forEach((button) => {
      button.addEventListener('click', () => {
        const invoiceId = button.dataset.openPriceDoc;
        window.showPriceChangeInvoice?.(invoiceId);
      });
    });
  };

  searchInput?.addEventListener('input', () => render());
  document.querySelector('#qiymet-deyisenler-new-invoice')?.addEventListener('click', createNewInvoice);

  window.priceChangeListModule = { render };
  render();
})();
