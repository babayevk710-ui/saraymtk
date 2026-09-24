(() => {
  const view = document.querySelector('#sayim-view');
  if (!view) return;

  const STORAGE_KEY = 'marketErpSayimRows';
  const tableBody = view.querySelector('tbody');
  const searchInput = view.querySelector('input[type="search"]');
  const filterSelect = view.querySelector('select');

  const defaultRows = [
    {
      id: 'sayim-1',
      name: 'Ayran 1L',
      code: 'M-001',
      unit: 'l',
      stock: 58,
      counted: 60,
      status: 'normal',
      diff: 2
    },
    {
      id: 'sayim-2',
      name: 'Şokolad 100q',
      code: 'M-002',
      unit: 'əd',
      stock: 36,
      counted: 35,
      status: 'difference',
      diff: -1
    }
  ];

  const getRows = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) && parsed.length ? parsed : defaultRows;
    } catch {
      return defaultRows;
    }
  };

  const saveRows = (rows) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  };

  const statusText = (status) => (status === 'difference' ? 'Fərq var' : 'Normal');

  const renderRows = () => {
    if (!tableBody) return;

    let rows = getRows();

    if (searchInput && searchInput.value.trim()) {
      const term = searchInput.value.trim().toLowerCase();
      rows = rows.filter((row) => [row.name, row.code, row.unit].join(' ').toLowerCase().includes(term));
    }

    if (filterSelect && filterSelect.value !== 'all') {
      rows = rows.filter((row) => {
        if (filterSelect.value === 'main') return row.code !== 'M-002';
        if (filterSelect.value === 'storage') return row.code === 'M-002';
        return true;
      });
    }

    tableBody.innerHTML = rows.map((row) => `
      <tr data-row-id="${row.id}">
        <td>${row.name}</td>
        <td>${row.code}</td>
        <td>${row.unit}</td>
        <td><input type="number" value="${row.counted}" class="purchase-edit-field" data-role="counted" data-id="${row.id}"></td>
        <td>${row.stock}</td>
        <td>${row.diff >= 0 ? '+' : ''}${row.diff}</td>
        <td><span class="status-pill ${row.status === 'difference' ? 'inactive' : 'active'}">${statusText(row.status)}</span></td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('input[data-role="counted"]').forEach((input) => {
      input.addEventListener('input', () => {
        const nextRows = getRows().map((row) => {
          if (row.id !== input.dataset.id) return row;
          const counted = Number(input.value || 0);
          const diff = counted - row.stock;
          return {
            ...row,
            counted,
            diff,
            status: diff === 0 ? 'normal' : 'difference'
          };
        });

        saveRows(nextRows);
        renderRows();
      });
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderRows);
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', renderRows);
  }

  if (!localStorage.getItem(STORAGE_KEY)) {
    saveRows(defaultRows);
  }

  renderRows();
})();
