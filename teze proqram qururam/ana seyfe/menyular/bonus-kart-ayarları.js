(() => {
  const modal = document.querySelector('#customer-card-modal');
  const form = document.querySelector('#customer-card-form');
  const list = document.querySelector('#customer-list');
  const empty = document.querySelector('#customer-empty');
  const count = document.querySelector('#customer-count');
  const search = document.querySelector('#customer-search');
  const filter = document.querySelector('#customer-filter');
  const storageKey = 'marketErpCustomerCards';
  const apiUrl = 'http://94.20.88.181:5050';
  const field = (id) => document.querySelector(`#customer-${id}`);
  const showMessage = (text) => window.showErpToast?.(text);
  const getCards = () => JSON.parse(localStorage.getItem(storageKey) || '[]');
  const saveCards = (cards) => localStorage.setItem(storageKey, JSON.stringify(cards));

  const normalizeCard = (row = {}) => {
    const firstName = row.musteri_adi || row.firstName || '';
    const lastName = row.musteri_soyadi || row.lastName || '';
    const fatherName = row.ata_adi || row.fatherName || '';
    const name = [firstName, lastName, fatherName].filter(Boolean).join(' ');
    const card = {
      id: row.id,
      firstName,
      lastName,
      fatherName,
      name,
      phone: row.telefon || row.phone || '',
      email: row.email || '',
      birthDate: row.dogum_tarixi || row.birthDate || '',
      address: row.unvan || row.address || '',
      cardType: row.cardType || 'Standart',
      cardNumber: row.kart_nomresi || row.cardNumber || '',
      bonusBalance: Number(row.bonus_balansi ?? row.bonusBalance ?? 0),
      limit: row.limit || '',
      status: row.status === 'passiv' || row.status === 'blocked' ? 'blocked' : 'active',
      notes: row.qeyd || row.notes || '',
      createdAt: row.yaradilma_tarixi || row.createdAt || new Date().toISOString()
    };
    return card;
  };

  const fetchCards = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/bonus-customers`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Bonus kartlar yüklənmədi.');
      }
      const cards = Array.isArray(data.customers) ? data.customers.map(normalizeCard) : [];
      saveCards(cards);
      return cards;
    } catch (error) {
      return getCards();
    }
  };

  const render = async () => {
    const cards = await fetchCards();
    const query = search.value.trim().toLocaleLowerCase('az-AZ');
    const visibleCards = cards.filter((card) => {
      const matches = `${card.name} ${card.phone} ${card.cardNumber} ${card.email}`.toLocaleLowerCase('az-AZ').includes(query);
      return matches && (filter.value === 'all' || (filter.value === 'blocked' ? card.status === 'blocked' : card.status === 'active'));
    });

    list.innerHTML = visibleCards.map((card) => `
      <tr>
        <td>
          <div class="employee-person">
            <span>${(card.name || 'M').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>${card.name}</strong>
              <small>${card.cardNumber}</small>
            </div>
          </div>
        </td>
        <td>${card.phone}</td>
        <td>${card.email || '—'}</td>
        <td>${card.cardType}</td>
        <td><strong>${Number(card.bonusBalance || 0).toLocaleString('az-AZ')} bal</strong></td>
        <td><span class="status-badge ${card.status}">${card.status === 'active' ? 'Aktiv' : 'Bloklanıb'}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" data-customer-edit="${card.id}" aria-label="Redaktə et">✎</button>
            <button type="button" data-customer-delete="${card.id}" aria-label="Sil">⌫</button>
          </div>
        </td>
      </tr>
    `).join('');

    empty.hidden = visibleCards.length > 0;
    count.textContent = `${visibleCards.length} kart`;

    list.querySelectorAll('[data-customer-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = cards.find((card) => String(card.id) === String(button.dataset.customerEdit));
        if (target) openModal(target);
      });
    });

    list.querySelectorAll('[data-customer-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Bu müştəri kartını silmək istədiyinizə əminsiniz?')) return;
        try {
          const response = await fetch(`${apiUrl}/api/bonus-customers/${button.dataset.customerDelete}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok || data.status !== 'success') {
            showMessage(data.message || 'Müştəri kartı silinmədi.');
            return;
          }
          await render();
          showMessage('Müştəri kartı silindi.');
        } catch (error) {
          showMessage('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const resetForm = () => { form.reset(); field('id').value = ''; field('bonus-balance').value = '0'; document.querySelector('#customer-card-title').textContent = 'Yeni müştəri kartı'; };

  const openModal = (card = null) => {
    resetForm();
    if (card) {
      document.querySelector('#customer-card-title').textContent = 'Müştəri kartını redaktə et';
      const name = (card.name || '').split(' ');
      const values = {
        ...card,
        id: card.id,
        'first-name': card.firstName || name[0] || '',
        'last-name': card.lastName || name[1] || '',
        'father-name': card.fatherName || name.slice(2).join(' ') || '',
        'phone': card.phone || '',
        'email': card.email || '',
        'birth-date': card.birthDate || '',
        'address': card.address || '',
        'card-type': card.cardType || 'Standart',
        'card-number': card.cardNumber || '',
        'bonus-balance': card.bonusBalance ?? 0,
        'limit': card.limit || '',
        'status': card.status === 'blocked' ? 'blocked' : 'active',
        'notes': card.notes || ''
      };
      Object.entries(values).forEach(([key, value]) => { if (field(key)) field(key).value = value ?? ''; });
      field('password')?.removeAttribute('required');
    }
    modal.hidden = false;
    field('first-name').focus();
  };

  const closeModal = () => { modal.hidden = true; };

  field('phone').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^+0-9 ]/g, '').slice(0, 17); });
  field('card-number').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 16); });
  field('bonus-balance').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/\D/g, ''); });
  field('limit').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/\D/g, ''); });
  document.querySelector('#add-customer-card').addEventListener('click', () => openModal());
  document.querySelector('#close-customer-card').addEventListener('click', closeModal);
  document.querySelector('#cancel-customer-card').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
  search.addEventListener('input', render);
  filter.addEventListener('change', render);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = field('id').value || null;
    const firstName = field('first-name').value.trim();
    const lastName = field('last-name').value.trim();
    const fatherName = field('father-name').value.trim();
    const payload = {
      id: id || undefined,
      musteri_adi: firstName,
      musteri_soyadi: lastName,
      ata_adi: fatherName,
      telefon: field('phone').value.trim(),
      email: field('email').value.trim(),
      dogum_tarixi: field('birth-date').value,
      unvan: field('address').value.trim(),
      kart_nomresi: field('card-number').value.trim(),
      bonus_balansi: Number(field('bonus-balance').value || 0),
      status: field('status').value === 'blocked' ? 'passiv' : 'aktiv',
      qeyd: field('notes').value.trim(),
    };

    try {
      const url = id ? `${apiUrl}/api/bonus-customers/${id}` : `${apiUrl}/api/bonus-customers`;
      const method = id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        showMessage(data.message || 'Müştəri kartı yadda saxlanılmadı.');
        return;
      }
      closeModal();
      await render();
      showMessage(id ? 'Müştəri kartı yeniləndi.' : 'Yeni müştəri kartı əlavə edildi.');
    } catch (error) {
      showMessage('Server ilə əlaqə xətası.');
    }
  });

  window.musteriKartModulu = { goster: render };
  render();
})();
