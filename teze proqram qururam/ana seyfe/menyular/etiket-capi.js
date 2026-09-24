(function () {
  const PRODUCT_STORAGE_KEY = 'marketErpProducts';
  const getProducts = () => JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]');
  const selected = [];

  const productList = document.querySelector('#label-product-list');
  const selectedList = document.querySelector('#label-selected-list');
  const previewName = document.querySelector('#label-preview-name');
  const previewCode = document.querySelector('#label-preview-code');
  const previewPrice = document.querySelector('#label-preview-price');
  const productCountEl = document.querySelector('#label-print-product-count');
  const selectedCountEl = document.querySelector('#label-print-selected-count');
  const searchInput = document.querySelector('#label-product-search');
  const barcodeInput = document.querySelector('#label-barcode-input');
  const terminalOpenButton = document.querySelector('#label-terminal-open');
  const terminalCloseButton = document.querySelector('#label-terminal-close');
  const terminalDrawer = document.querySelector('#label-terminal-drawer');
  const terminalDocList = document.querySelector('#label-terminal-doc-list');
  const clearButton = document.querySelector('#label-clear-list');
  const printButton = document.querySelector('#label-print-save');
  const formatSelect = document.querySelector('#label-print-format');
  const formatUnit = document.querySelector('#label-format-unit');
  const terminalQueue = [
    {
      id: 'TERM-010',
      date: '25.08.2026',
      sender: 'Nəsib Quliyev',
      status: 'Göndərilib',
      sent: true,
      items: [
        { name: 'Ayran 1L', code: 'M-001', quantity: 2, unit: 'əd' },
        { name: 'Süd 1L', code: 'M-002', quantity: 3, unit: 'əd' }
      ]
    },
    {
      id: 'TERM-011',
      date: '24.08.2026',
      sender: 'Ramil Hacıyev',
      status: 'Göndərilməyib',
      sent: false,
      items: [
        { name: 'Şokolad 100q', code: 'M-003', quantity: 1, unit: 'əd' },
        { name: 'Ayran 1L', code: 'M-001', quantity: 4, unit: 'əd' }
      ]
    }
  ];

  const normalizeLookupValue = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\/\\]+/g, '');
  const normalizeProductCode = (value) => {
    const text = String(value ?? '').trim();
    if (!text || text === 'NaN' || text === 'undefined' || text === 'null') return '';
    return text;
  };
  const getProductCode = (product) => normalizeProductCode(product?.mehsul_kodu || product?.code || product?.product_code || '');

  const findProduct = (needle) => {
    const rawValue = String(needle || '').trim();
    const value = normalizeLookupValue(rawValue);
    if (!value) return null;

    const items = getProducts();
    return items.find((item) => {
      const barcodeVariants = Array.isArray(item.barcodes) ? item.barcodes : [item.barcode || item.barcodes || ''];
      const normalizedBarcodes = barcodeVariants.map((code) => normalizeLookupValue(code));
      const barcodeMatch = normalizedBarcodes.some((code) => code === value || code.includes(value) || value.includes(code));
      const productCode = getProductCode(item);
      const codeMatch = normalizeLookupValue(productCode).includes(value) || value.includes(normalizeLookupValue(productCode));
      const nameMatch = normalizeLookupValue(item.name || '').includes(value) || value.includes(normalizeLookupValue(item.name || ''));
      const containsMatch = normalizeLookupValue(item.name || '').includes(value) || normalizeLookupValue(productCode).includes(value);
      return barcodeMatch || codeMatch || nameMatch || containsMatch;
    }) || null;
  };

  const normalizeProductId = (value) => String(value ?? '').trim();

  const getProductBarcode = (product) => {
    const values = Array.isArray(product?.barcodes) ? product.barcodes : [product?.barcode || ''];
    return values.map((value) => String(value || '').replace(/\D/g, '')).find((value) => value.length >= 12) || '';
  };

  const addProductToSelection = (product) => {
    if (!product) return false;

    const productId = normalizeProductId(product.id);
    const existing = selected.find((entry) => normalizeProductId(entry.id) === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      selected.push({ id: productId, name: product.name, code: getProductCode(product), barcode: getProductBarcode(product), plu: product.plu_kodu || product.plu || '', unit: product.unit || '', price: Number(product.price || 0), quantity: 1 });
    }

    renderSelectedList();
    updateSummary();
    updatePreview();
    return true;
  };

  const resetBarcodeInput = (input) => {
    if (!input) return;
    input.value = '';
    input.focus();
    const length = input.value.length;
    if (typeof input.setSelectionRange === 'function') {
      input.setSelectionRange(length, length);
    }
  };

  const addTerminalEntry = (entry) => {
    if (!entry || !Array.isArray(entry.items)) return;

    let added = 0;
    entry.items.forEach((item) => {
      const product = findProduct(item.code || item.name);
      if (!product) return;
      const productId = normalizeProductId(product.id);
      const existing = selected.find((entryItem) => normalizeProductId(entryItem.id) === productId);
      if (existing) {
        existing.quantity += Number(item.quantity || 1);
      } else {
        selected.push({
          id: productId,
          name: product.name,
          code: getProductCode(product),
          barcode: getProductBarcode(product),
          plu: product.plu_kodu || product.plu || '',
          unit: product.unit || '',
          price: Number(product.price || 0),
          quantity: Number(item.quantity || 1)
        });
      }
      added += 1;
    });

    if (!added) {
      if (window.showErpToast) window.showErpToast('Bu sənəddə əlavə edilə bilən məhsul yoxdur.');
      return;
    }

    renderSelectedList();
    updateSummary();
    updatePreview();

    if (terminalDrawer) terminalDrawer.hidden = true;
    if (barcodeInput) {
      resetBarcodeInput(barcodeInput);
    }
  };

  const renderTerminalQueue = () => {
    if (!terminalDocList) return;
    terminalDocList.innerHTML = terminalQueue.map((entry) => `
      <tr class="label-terminal-row" tabindex="0" data-terminal-doc='${JSON.stringify(entry)}'>
        <td>${entry.id}</td>
        <td>${entry.date}</td>
        <td>${entry.sender}</td>
        <td><span class="label-terminal-status ${entry.sent ? 'sent' : 'pending'}">${entry.status}</span></td>
      </tr>
    `).join('');

    terminalDocList.querySelectorAll('.label-terminal-row').forEach((row) => {
      const selectRow = () => {
        const doc = JSON.parse(row.dataset.terminalDoc || '{}');
        addTerminalEntry(doc);
      };

      row.addEventListener('dblclick', selectRow);
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectRow();
        }
      });
    });
  };

  const updateSummary = () => {
    const totalProducts = getProducts().length;
    const totalSelected = selected.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    if (productCountEl) productCountEl.textContent = String(totalProducts);
    if (selectedCountEl) selectedCountEl.textContent = String(totalSelected);
  };

  const updatePreview = () => {
    const firstItem = selected[0];
    if (previewName) previewName.textContent = firstItem ? firstItem.name : 'Məhsul seçin';
    if (previewCode) previewCode.textContent = firstItem ? firstItem.code : '-';
    if (previewPrice) previewPrice.textContent = firstItem ? `${Number(firstItem.price || 0).toFixed(2)} ₼` : '0.00 ₼';
  };

  const resetSelection = () => {
    selected.splice(0, selected.length);
    renderSelectedList();
    updateSummary();
    updatePreview();
  };

  const renderSelectedList = () => {
    if (!selectedList) return;

    if (!selected.length) {
      selectedList.innerHTML = '<tr><td colspan="4" class="label-empty-cell">Seçilən məhsul yoxdur</td></tr>';
      updatePreview();
      return;
    }

    selectedList.innerHTML = selected.map((item) => `
      <tr data-label-selected-id="${item.id}">
        <td>${item.name}</td>
        <td><input type="number" min="1" value="${item.quantity}" class="label-qty-input" data-label-qty-id="${item.id}"></td>
        <td>əd</td>
        <td><button type="button" class="secondary-button compact-button remove-label-item" data-label-remove-id="${item.id}">Sil</button></td>
      </tr>
    `).join('');

    selectedList.querySelectorAll('.label-qty-input').forEach((input) => {
      const product = selected.find((item) => normalizeProductId(item.id) === normalizeProductId(input.dataset.labelQtyId));
      if (!product) return;
      input.addEventListener('input', (event) => {
        const nextValue = Number(event.target.value || 0);
        product.quantity = nextValue > 0 ? nextValue : 1;
        updateSummary();
      });
    });

    selectedList.querySelectorAll('.remove-label-item').forEach((button) => {
      button.addEventListener('click', () => {
        const index = selected.findIndex((item) => normalizeProductId(item.id) === normalizeProductId(button.dataset.labelRemoveId));
        if (index >= 0) selected.splice(index, 1);
        renderSelectedList();
        updateSummary();
        updatePreview();
      });
    });
  };

  const renderProductList = () => {
    if (!productList) return;
    const items = getProducts();
    const query = (searchInput?.value || '').trim().toLowerCase();
    const filtered = items.filter((item) => {
      const haystack = [
        item.name,
        item.code,
        item.brand,
        item.category,
        item.warehouse,
        ...(Array.isArray(item.barcodes) ? item.barcodes : [item.barcode || ''])
      ].join(' ').toLowerCase();
      const normalizedHaystack = haystack.replace(/[\s_\-\/\\]+/g, '');
      const normalizedQuery = query.replace(/[\s_\-\/\\]+/g, '');
      return !query || normalizedHaystack.includes(normalizedQuery) || haystack.includes(query);
    });

    if (!filtered.length) {
      productList.innerHTML = '<tr><td colspan="5" class="label-empty-cell">Məhsul tapılmadı</td></tr>';
      return;
    }

    productList.innerHTML = filtered.map((item) => `
      <tr data-label-product-id="${item.id}">
        <td>${item.name}</td>
        <td>${getProductCode(item) || '-'}</td>
        <td>${Number(item.price || 0).toFixed(2)} ₼</td>
        <td>${Number(item.tax || 0)}%</td>
        <td><button type="button" class="primary-button compact-button add-label-item" data-label-product-id="${item.id}">Əlavə et</button></td>
      </tr>
    `).join('');

    productList.querySelectorAll('.add-label-item').forEach((button) => {
      button.addEventListener('click', () => {
        const product = items.find((item) => normalizeProductId(item.id) === normalizeProductId(button.dataset.labelProductId));
        if (!product) return;

        addProductToSelection(product);
      });
    });
  };

  const EAN_L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const EAN_G_CODES = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const EAN_R_CODES = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

  const toEan13 = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
    if (digits.length < 12) return '';
    const base = digits.slice(0, 12);
    const checksum = base.split('').reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0);
    return `${base}${(10 - (checksum % 10)) % 10}`;
  };

  const createEan13Svg = (value) => {
    const ean = toEan13(value);
    if (!ean) return '<div class="label-print-barcode-empty">Barkod yoxdur</div>';

    const parity = EAN_PARITY[Number(ean[0])];
    let pattern = '101';
    for (let index = 1; index <= 6; index += 1) {
      pattern += parity[index - 1] === 'L' ? EAN_L_CODES[Number(ean[index])] : EAN_G_CODES[Number(ean[index])];
    }
    pattern += '01010';
    for (let index = 7; index <= 12; index += 1) pattern += EAN_R_CODES[Number(ean[index])];
    pattern += '101';

    const moduleWidth = 2;
    const quietModules = 11;
    const svgWidth = (pattern.length + quietModules * 2) * moduleWidth;
    const bars = [...pattern].map((bit, index) => bit === '1'
      ? `<rect x="${(index + quietModules) * moduleWidth}" y="0" width="${moduleWidth}" height="46" fill="#111"/>`
      : '').join('');

    return `<svg width="${svgWidth}" height="58" viewBox="0 0 ${svgWidth} 58" xmlns="http://www.w3.org/2000/svg" aria-label="EAN-13 ${ean}">
      <rect width="100%" height="100%" fill="#fff"/>${bars}
      <text x="${quietModules * moduleWidth - 2}" y="57" font-family="Arial, sans-serif" font-size="12" fill="#111">${ean[0]}</text>
      <text x="${quietModules * moduleWidth + 14}" y="57" font-family="Arial, sans-serif" font-size="12" fill="#111">${ean.slice(1, 7)}</text>
      <text x="${(quietModules + 59) * moduleWidth}" y="57" font-family="Arial, sans-serif" font-size="12" fill="#111">${ean.slice(7)}</text>
    </svg>`;
  };
  const buildPrintHtml = (format) => {
    const labels = [];

    selected.forEach((item) => {
      const safeName = String(item.name || 'Məhsul').slice(0, 60);
      const safeBarcode = toEan13(item.barcode);
      const safePrice = Number(item.price || 0).toFixed(2);
      const safePlu = String(item.plu || '').replace(/[^0-9]/g, '').slice(0, 6);
      const isWeighted = String(item.unit || '').trim().toLowerCase() === 'kq';
      const quantity = Math.max(1, Number(item.quantity || 1));

      for (let index = 0; index < quantity; index += 1) {
        labels.push(`
          <div class="label-print-sheet${format === 'a4' ? ' a4-label' : ''}">
            <div class="label-print-name">${safeName}</div>
            <div class="label-print-row label-print-price-row">
              <span>Qiymət</span>
              <strong>${safePrice} ₼</strong>
            </div>
            ${format === 'a4' && isWeighted && safePlu ? `<div class="label-print-plu">PLU: <strong>${safePlu}</strong></div>` : ''}
            <div class="label-print-barcode-wrap">${createEan13Svg(safeBarcode)}</div>
          </div>
        `);
      }
    });

    return labels.join('');
  };

  const printSelectedLabels = () => {
    if (!selected.length) {
      if (window.showErpToast) window.showErpToast('Çap ediləcək məhsul seçin.');
      return;
    }

    const format = formatSelect?.value === 'a4' ? 'a4' : 'label';
    const totalCopies = selected.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) {
      if (window.showErpToast) window.showErpToast('Pəncərə bloklandı. Zəhmət olmasa pop-up-i icazə verin.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
      <html lang="az">
      <head>
        <meta charset="UTF-8">
        <title>Etiket Çapı</title>
        <style>
          @page {
            margin: 0;
            size: ${format === 'a4' ? 'A4 portrait' : '40mm 20mm'};
            orientation: portrait;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: ${format === 'a4' ? '210mm' : '40mm'};
            height: ${format === 'a4' ? '297mm' : '20mm'};
            background: #ffffff;
            font-family: Arial, sans-serif;
            overflow: ${format === 'a4' ? 'visible' : 'hidden'};
          }

          body {
            width: ${format === 'a4' ? '210mm' : '40mm'};
            height: ${format === 'a4' ? '297mm' : 'auto'};
            display: ${format === 'a4' ? 'grid' : 'block'};
            grid-template-columns: ${format === 'a4' ? 'repeat(3, 63mm)' : 'none'};
            grid-auto-rows: ${format === 'a4' ? '52mm' : 'auto'};
            gap: 0;
            padding: ${format === 'a4' ? '10mm 10.5mm' : '0'};
            box-sizing: border-box;
          }

          .label-print-sheet {
            width: ${format === 'a4' ? '63mm' : '40mm'};
            height: ${format === 'a4' ? '52mm' : '20mm'};
            box-sizing: border-box;
            padding: ${format === 'a4' ? '5mm 5mm 3mm' : '3mm 1.4mm 0.8mm'};
            margin: 0;
            border: 0;
            background: #fff;
            color: #111;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            overflow: hidden;
            position: relative;
            page-break-after: ${format === 'a4' ? 'auto' : 'always'};
            break-after: ${format === 'a4' ? 'auto' : 'page'};
          }

          .label-print-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .a4-label {
            border: 0.35mm solid #111;
            border-radius: 2mm;
            justify-content: flex-start;
            padding: 4mm 4.5mm 2.5mm;
          }

          .a4-label .label-print-name {
            font-size: 17px;
            font-weight: 800;
            line-height: 1.05;
            height: 10mm;
            min-height: 10mm;
            margin-bottom: 1.5mm;
            padding: 0;
            border: 0;
            text-transform: none;
            white-space: normal;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            text-overflow: ellipsis;
          }

          .a4-label .label-print-price-row {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            min-height: 15mm;
            padding: 1.5mm 3mm 1mm;
            margin: 0 0 1.5mm;
            border: 0.3mm solid #111;
            border-radius: 1.5mm;
            background: #f3f3f3;
            line-height: 1;
          }

          .a4-label .label-print-price-row strong {
            font-size: 27px;
            line-height: 1;
            margin: 1.2mm 0 0;
            letter-spacing: 0;
          }

          .a4-label .label-print-price-row span {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #444;
          }

          .label-print-plu {
            font-size: 10px;
            font-weight: 700;
            margin: 0.5mm 0 1mm;
          }

          .a4-label .label-print-barcode-wrap {
            margin-top: auto;
            transform: none;
          }

          .a4-label .label-print-barcode-wrap svg {
            height: 15mm;
            min-height: 15mm;
          }

          .label-print-name {
            font-size: 8.5px;
            font-weight: 700;
            line-height: 1.05;
            margin-bottom: 0.7mm;
            height: 3.2mm;
            min-height: 3.2mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            color: #000;
          }

          .label-print-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 5px;
            line-height: 1;
            margin-bottom: 0.4mm;
            width: 100%;
            color: #222;
          }

          .label-print-row strong {
            font-size: 7px;
          }

          .label-print-price-row {
            align-items: center;
            border-top: 0.25mm solid #222;
            padding-top: 0.7mm;
            margin-bottom: 0.3mm;
            font-size: 15px;
          }

          .label-print-price-row strong {
            font-size: 15px;
            font-weight: 700;
            color: #000;
            margin-right: 2mm;
          }

          .label-print-barcode-wrap {
            margin-top: 1.5mm;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            overflow: hidden;
            width: 100%;
            flex: 1;
            transform: translateY(1.5mm);
          }

          .label-print-barcode-wrap svg {
            display: block;
            width: 100%;
            max-width: 100%;
            height: 10.5mm;
            min-height: 10.5mm;
          }

          .label-print-barcode-empty {
            font-size: 5px;
            letter-spacing: 1px;
            color: #111;
          }
        </style>
      </head>
      <body>
        ${buildPrintHtml(format)}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 700);
    }, 250);

    if (window.showErpToast) window.showErpToast(`${totalCopies} etiket çap üçün hazırdır.`);
  };

  const render = () => {
    renderProductList();
    renderSelectedList();
    updateSummary();
    updatePreview();
  };

  if (searchInput) {
    searchInput.addEventListener('input', renderProductList);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const product = findProduct(searchInput.value);
      if (!product) {
        if (window.showErpToast) window.showErpToast('Məhsul tapılmadı.');
        searchInput.value = '';
        searchInput.focus();
        return;
      }
      addProductToSelection(product);
      searchInput.value = '';
      searchInput.focus();
    });
  }

  if (barcodeInput) {
    barcodeInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const product = findProduct(barcodeInput.value);
      if (!product) {
        if (window.showErpToast) window.showErpToast('Məhsul tapılmadı.');
        resetBarcodeInput(barcodeInput);
        return;
      }
      addProductToSelection(product);
      resetBarcodeInput(barcodeInput);
    });
  }

  if (terminalOpenButton && terminalDrawer) {
    terminalOpenButton.addEventListener('click', () => {
      if (barcodeInput) {
        barcodeInput.blur();
      }
      terminalDrawer.hidden = false;
      const firstRow = terminalDocList?.querySelector('.label-terminal-row');
      if (firstRow) firstRow.focus();
    });
  }

  if (terminalCloseButton && terminalDrawer) {
    terminalCloseButton.addEventListener('click', () => terminalDrawer.hidden = true);
  }

  if (terminalDrawer) {
    terminalDrawer.addEventListener('click', (event) => {
      if (event.target === terminalDrawer) terminalDrawer.hidden = true;
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      resetSelection();
    });
  }

  if (printButton) {
    printButton.addEventListener('click', () => {
      printSelectedLabels();
    });
  }

  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      const isA4 = formatSelect.value === 'a4';
      if (formatUnit) formatUnit.textContent = isA4 ? '3 x 5 etiket' : 'mm';
    });
  }

  document.addEventListener('mousedown', (event) => {
    if (document.querySelector('#etiket-basimi')?.hidden) return;
    const inLabelModule = event.target.closest('#etiket-basimi');
    const inDrawer = event.target.closest('#label-terminal-drawer');
    const targetInput = event.target.closest('#label-barcode-input');
    const targetSearch = event.target.closest('#label-product-search');
    const protectedControl = event.target.closest('.label-qty-input, .remove-label-item, .add-label-item, .label-selected-table, #label-clear-list, #label-print-save, #label-terminal-open, #label-terminal-close, #label-print-format, .label-terminal-row, .label-terminal-doc-table, .label-product-table');
    if (targetInput || targetSearch || inDrawer || protectedControl) return;
    if (inLabelModule) {
      window.setTimeout(() => {
        const active = document.querySelector('#etiket-basimi');
        if (active && !active.hidden && barcodeInput) {
          barcodeInput.focus();
        }
      }, 20);
    }
  });

  renderTerminalQueue();
  window.labelPrintModule = { render, selected, reset: resetSelection };
})();
