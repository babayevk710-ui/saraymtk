(() => {
  const form = document.querySelector('#login-form');
  const loginInput = document.querySelector('#login');
  const passwordInput = document.querySelector('#password');
  const message = document.querySelector('#form-message');
  const submitButton = form ? form.querySelector('.submit') : null;
  const toggleButton = document.querySelector('.toggle-password');

  const setMessage = (text, isSuccess = false) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('success', isSuccess);
  };

  const setButtonLoading = (loading) => {
    if (!submitButton) return;
    submitButton.disabled = loading;
    const span = submitButton.querySelector('span');
    if (span) {
      span.textContent = loading ? 'Giriş edilir...' : 'Daxil ol';
    }
  };

  if (toggleButton && passwordInput) {
    toggleButton.addEventListener('click', () => {
      const isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      toggleButton.textContent = isHidden ? 'GİZLƏT' : 'GÖSTƏR';
      toggleButton.setAttribute('aria-label', isHidden ? 'Şifrəni gizlət' : 'Şifrəni göstər');
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const login = (loginInput?.value || '').trim();
      const password = (passwordInput?.value || '').trim();

      if (!login || !password) {
        setMessage('Zəhmət olmasa login və şifrəni daxil edin.');
        return;
      }

      setButtonLoading(true);
      setMessage('Serverə məlumat göndərilir...');

      try {
        const response = await fetch('http://94.20.88.181:5050/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ login, password })
        });

        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
          setMessage('Giriş uğursuz oldu.');
          setButtonLoading(false);
          return;
        }

        const suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
        const products = Array.isArray(data.products) ? data.products : [];
        const workplaces = Array.isArray(data.workplaces) ? data.workplaces : [];
        const bonusCustomers = Array.isArray(data.bonus_customers || data.customer_cards) ? (data.bonus_customers || data.customer_cards) : [];
        const permissions = Array.isArray(data.permissions) ? data.permissions : [];

        const safeSetStorage = (key, value) => {
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (storageError) {
            console.warn(`localStorage quota exceeded for ${key}:`, storageError);
            return false;
          }
        };

        const compactProductList = products.map((product) => ({
          id: product.id,
          code: product.mehsul_kodu || product.code || '',
          name: product.mehsul_adi || product.name || 'Məhsul',
          productType: product.mehsul_tipi === 'mamul' ? 'Mamul' : product.mehsul_tipi === 'diger' ? 'Digər' : 'Ticari mal',
          category: product.kateqoriya || 'Ərzaq',
          company: product.satici_firma_id || '',
          warehouse: product.anbar_id || 'Əsas Anbar',
          unit: product.olcu_vahidi || 'ədəd',
          barcode: Array.isArray(product.barcodes) && product.barcodes.length ? product.barcodes[0] : '',
          barcodes: Array.isArray(product.barcodes) ? product.barcodes.slice(0, 10) : [],
          cost: Number(product.alis_qiymeti ?? product.cost ?? 0),
          price: Number(product.satis_qiymeti ?? product.price ?? 0),
          stock: Number(product.stok_sayi ?? product.stock ?? 0),
          taxMode: product.edv_status === 'azad' ? 'exempt' : 'taxable',
          tax: Number(product.edv_faizi ?? product.tax ?? 0),
          minStock: Number(product.minimum_stok ?? product.minStock ?? 0),
          bonusEnabled: product.bonus_tetbiq_edilir === 'beli',
          bonusRate: 0,
          bonusGroup: product.bonus_qrupu || 'Bütün müştərilər',
          status: product.status === 'passiv' ? 'passiv' : product.status === 'deaktiv' ? 'inactive' : 'active',
          createdAt: product.yaradilma_tarixi ? String(product.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10)
        }));

        const companyList = suppliers.map((supplier) => {
          const rawDebt = Number(supplier.aktiv_borc ?? supplier.debt ?? 0);
          const rawCreditLimit = Number(supplier.borc_limiti ?? supplier.creditLimit ?? 0);
          return {
            id: supplier.id,
            name: supplier.firma_adi || supplier.name || 'Firma',
            code: supplier.firma_kodu || supplier.code || '',
            status: supplier.status === 'passiv' ? 'inactive' : 'active',
            createdAt: supplier.yaradilma_tarixi ? String(supplier.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10),
            address: supplier.unvan || supplier.address || '',
            email: supplier.email || '',
            phone: supplier.telefon || supplier.phone || '',
            creditLimit: Number.isFinite(rawCreditLimit) ? rawCreditLimit : 0,
            debt: Number.isFinite(rawDebt) ? rawDebt : 0,
            debtStatus: supplier.borc_status || 'normal'
          };
        });
        const customerCardList = bonusCustomers.map((customer) => ({
          id: customer.id,
          firstName: customer.musteri_adi || customer.firstName || '',
          lastName: customer.musteri_soyadi || customer.lastName || '',
          fatherName: customer.ata_adi || customer.fatherName || '',
          name: [customer.musteri_adi || customer.firstName || '', customer.musteri_soyadi || customer.lastName || '', customer.ata_adi || customer.fatherName || ''].filter(Boolean).join(' '),
          phone: customer.telefon || customer.phone || '',
          email: customer.email || '',
          birthDate: customer.dogum_tarixi || customer.birthDate || '',
          address: customer.unvan || customer.address || '',
          cardType: customer.cardType || 'Standart',
          cardNumber: customer.kart_nomresi || customer.cardNumber || '',
          bonusBalance: Number(customer.bonus_balansi ?? customer.bonusBalance ?? 0),
          status: customer.status === 'passiv' || customer.status === 'blocked' ? 'blocked' : 'active',
          notes: customer.qeyd || customer.notes || '',
          createdAt: customer.yaradilma_tarixi || customer.createdAt || new Date().toISOString()
        }));

        safeSetStorage('marketErpCompanies', JSON.stringify(companyList));
        safeSetStorage('erpSuppliers', JSON.stringify(suppliers));
        safeSetStorage('marketErpCustomerCards', JSON.stringify(customerCardList));
        safeSetStorage('erpBonusCustomers', JSON.stringify(bonusCustomers));
        safeSetStorage('marketErpWorkplaces', JSON.stringify(workplaces.map((workplace) => ({
          id: workplace.id,
          name: workplace.is_yeri_adi || workplace.name || 'İş yeri',
          code: workplace.is_yeri_kodu || workplace.code || '',
          type: workplace.is_yeri_novu || workplace.type || 'filial',
          address: workplace.unvan || workplace.address || '',
          phone: workplace.telefon || workplace.phone || '',
          manager: workplace.rehber_adi || workplace.manager || '',
          status: workplace.status === 'passiv' ? 'inactive' : 'active',
          createdAt: workplace.yaradilma_tarixi ? String(workplace.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10)
        }))));
        safeSetStorage('marketErpProducts', JSON.stringify(compactProductList));

        const warehouseDocList = Array.isArray(data.warehouse_documents) ? data.warehouse_documents : [];
        safeSetStorage('marketErpWarehouseDocs', JSON.stringify(warehouseDocList));

        const loginRecord = {
          employeeId: data.user?.id ?? null,
          login: data.user?.login || login,
          name: data.user?.name || login,
          workplace: 'İdarəçi',
          permissions,
          loggedInAt: new Date().toISOString()
        };

        safeSetStorage('lastLogin', JSON.stringify(loginRecord));
        safeSetStorage('erpEmployeePermissions', JSON.stringify(permissions));
        setMessage(`${data.user?.name || login} üçün giriş təsdiqləndi.`, true);
        setButtonLoading(false);

        window.setTimeout(() => {
          window.location.href = '../ana seyfe/ana-sehife.html';
        }, 700);
      } catch (error) {
        setMessage('Serverə qoşulma uğursuz oldu. Serveri açın və port 5050 işlək olsun.');
        setButtonLoading(false);
      }
    });
  }
})();
