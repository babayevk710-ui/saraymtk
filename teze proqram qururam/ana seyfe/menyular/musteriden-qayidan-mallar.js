(() => {
  const view = document.querySelector('#musteriden-qayidan-mallar-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpCustomerReturnDocs';
  const formatMoney = (value) => Number(value || 0).toLocaleString('az-AZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const getDocs = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveDocs = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  const seedDocs = () => {
    const current = getDocs();
    if (current.length) return current;
    saveDocs([]);
    return [];
  };

  const renderCustomerReturnDocs = () => {
    const list = view.querySelector('#customer-return-doc-list');
    const empty = view.querySelector('#customer-return-doc-empty');
    const count = view.querySelector('#customer-return-doc-count');
    const latest = view.querySelector('#customer-return-doc-latest-date');

    if (!list) return;

    const docs = getDocs().slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (count) count.textContent = String(docs.length);
    if (latest) latest.textContent = docs[0]?.date || '-';

    if (!docs.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    list.innerHTML = docs.map((doc) => `
      <tr data-customer-return-id="${doc.id}">
        <td>${doc.date || '-'}</td>
        <td>${doc.number || '-'}</td>
        <td>${formatMoney(doc.total || 0)} ₼</td>
        <td><span class="status-pill ${doc.status === 'Kilidli' ? 'inactive' : 'active'}">${doc.status || 'Aktiv'}</span></td>
        <td><button type="button" class="customer-return-view-btn" data-customer-return-view="${doc.id}">Bax</button></td>
      </tr>
    `).join('');

    bindCustomerReturnRows();
  };

  const closeCustomerReturnMenu = () => {
    document.querySelectorAll('.customer-return-context-menu').forEach((menu) => menu.remove());
  };

  const applyCustomerReturnAction = (id, action) => {
    const docs = getDocs();
    const doc = docs.find((item) => item.id === id);
    if (!doc) return;

    if (action === 'view') {
      openCustomerReturnDetailsModal(doc);
      if (window.showErpToast) {
        window.showErpToast(`Qaytarma siyahısı: ${doc.number || 'Sənəd'} baxış rejimində açıldı.`);
      }
      closeCustomerReturnMenu();
      return;
    }

    if (action === 'edit') {
      const nextDocs = docs.map((item) => {
        if (item.id !== id) return item;
        return { ...item, status: item.status === 'Kilidli' ? 'Aktiv' : 'Aktiv' };
      });
      saveDocs(nextDocs);
      renderCustomerReturnDocs();
      if (window.showErpToast) window.showErpToast(`Qaytarma siyahısı: ${doc.number || 'Sənəd'} yeniləndi.`);
      closeCustomerReturnMenu();
      return;
    }

    if (action === 'delete' && window.confirm('Bu qaytarma siyahısını silmək istədiyinizə əminsiniz?')) {
      saveDocs(docs.filter((item) => item.id !== id));
      renderCustomerReturnDocs();
      if (window.showErpToast) window.showErpToast('Qaytarma siyahısı silindi.');
      closeCustomerReturnMenu();
    }
  };

  const openCustomerReturnDetailsModal = (doc) => {
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop customer-return-details-modal';
    modalBackdrop.style.display = 'flex';
    modalBackdrop.style.zIndex = '1200';

    const lineItems = (doc.items || []).map((item, index) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      const total = qty * price;
      return `
        <tr>
          <td>${index + 1}</td>
          <td><div class="customer-return-item-name"><strong>${item.name || 'Məhsul'}</strong><small>${item.code || '-'}</small></div></td>
          <td>${qty}</td>
          <td>${item.unit || 'əd'}</td>
          <td>${formatMoney(price)} ₼</td>
          <td>${formatMoney(total)} ₼</td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="6">Məhsul yoxdur</td></tr>';

    modalBackdrop.innerHTML = `
      <section class="customer-return-robot-modal" role="dialog" aria-modal="true" aria-label="Müştəridən qaytarılan mallar" style="max-width: 980px; width: min(980px, calc(100vw - 32px));">
        <div class="customer-return-modal-header">
          <div>
            <div class="section-kicker">QAYTARILMIŞ MALLAR / SƏNƏD</div>
            <h2>${doc.number || 'Sənəd'}</h2>
          </div>
          <button class="close-modal" type="button" aria-label="Pəncərəni bağla">×</button>
        </div>

        <div class="customer-return-modal-body">
          <div class="customer-return-hero-grid">
            <div class="customer-return-hero-card accent">
              <span>Faktura nömrəsi</span>
              <strong>${doc.number || '-'}</strong>
            </div>
            <div class="customer-return-hero-card">
              <span>Tarix</span>
              <strong>${doc.date || '-'}</strong>
            </div>
            <div class="customer-return-hero-card">
              <span>Müştəri</span>
              <strong>${doc.customer || '-'}</strong>
            </div>
            <div class="customer-return-hero-card">
              <span>Toplam</span>
              <strong>${formatMoney(doc.total || 0)} ₼</strong>
            </div>
          </div>

          <div class="customer-return-meta-grid">
            <div><span>İş yeri</span><strong>${doc.workplace || '-'}</strong></div>
            <div><span>İstifadəçi</span><strong>${doc.user || 'Admin'}</strong></div>
            <div><span>Status</span><strong class="customer-return-status ${doc.status === 'Kilidli' ? 'inactive' : 'active'}">${doc.status || 'Aktiv'}</strong></div>
          </div>

          <div class="customer-return-table-wrap">
            <table class="customer-return-detail-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Məhsul</th>
                  <th>Miqdar</th>
                  <th>Vahid</th>
                  <th>Qiymət</th>
                  <th>Toplam</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    const closeModal = () => modalBackdrop.remove();
    modalBackdrop.querySelector('.close-modal')?.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (event) => {
      if (event.target === modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.querySelector('.customer-return-details-modal')) {
        closeModal();
      }
    }, { once: true });
    document.body.appendChild(modalBackdrop);
  };

  const openCustomerReturnMenu = (event, doc) => {
    closeCustomerReturnMenu();
    const menu = document.createElement('div');
    menu.className = 'customer-return-context-menu product-context-menu';
    menu.innerHTML = `
      <button type="button" data-customer-return-action="view" data-customer-return-id="${doc.id}">Bax</button>
      <button type="button" data-customer-return-action="delete" data-customer-return-id="${doc.id}">Sil</button>
    `;
    document.body.appendChild(menu);

    const x = Math.min(event.clientX || 0, window.innerWidth - 220);
    const y = Math.min(event.clientY || 0, window.innerHeight - 150);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    menu.querySelectorAll('[data-customer-return-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.customerReturnAction;
        const id = button.dataset.customerReturnId;
        const targetDoc = getDocs().find((item) => item.id === id);
        if (action === 'view' && targetDoc) {
          openCustomerReturnDetailsModal(targetDoc);
          closeCustomerReturnMenu();
          if (window.showErpToast) window.showErpToast(`Qaytarma siyahısı: ${targetDoc.number || 'Sənəd'} baxış rejimində.`);
          return;
        }
        applyCustomerReturnAction(id, action);
      });
    });

    document.addEventListener('click', closeCustomerReturnMenu, { once: true });
  };

  const bindCustomerReturnRows = () => {
    view.querySelectorAll('#customer-return-doc-list tr[data-customer-return-id]').forEach((row) => {
      row.oncontextmenu = (event) => {
        event.preventDefault();
        const doc = getDocs().find((item) => item.id === row.dataset.customerReturnId);
        if (doc) openCustomerReturnMenu(event, doc);
      };

      const button = row.querySelector('[data-customer-return-view]');
      if (!button) return;

      button.addEventListener('click', () => {
        const docId = button.dataset.customerReturnView;
        const doc = getDocs().find((item) => item.id === docId);
        if (doc) openCustomerReturnDetailsModal(doc);
      });
    });
  };

  seedDocs();
  renderCustomerReturnDocs();
  bindCustomerReturnRows();

  window.customerReturnDocsRender = renderCustomerReturnDocs;
  window.customerReturnModulu = { goster: renderCustomerReturnDocs };
  window.openCustomerReturnDocFromArchive = (docId, mode = 'view') => {
    const doc = getDocs().find((item) => item.id === docId || item.number === docId);
    if (!doc) return;
    if (mode === 'edit') {
      const updated = getDocs().map((item) => item.id === doc.id ? { ...item, status: 'Aktiv' } : item);
      saveDocs(updated);
    }
    renderCustomerReturnDocs();
    openCustomerReturnDetailsModal(doc);
    if (window.showErpToast) {
      const text = mode === 'edit' ? `Qaytarma siyahısı: ${doc.number || 'Sənəd'} redaktə rejimində.` : `Qaytarma siyahısı: ${doc.number || 'Sənəd'} baxış rejimində.`;
      window.showErpToast(text);
    }
  };
})();
