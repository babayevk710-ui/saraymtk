const loginSession = (() => {
  try {
    return JSON.parse(localStorage.getItem('lastLogin') || 'null');
  } catch (error) {
    return null;
  }
})();

if (!loginSession) {
  window.location.href = '../login seyfesi/login.html';
}

const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.querySelector('#page-title');
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.querySelector('#menu-toggle');
const toast = document.querySelector('#toast');
const fallbackLogin = { login: 'Admin', workplace: 'İdarəçi', permissions: [] };
const VALID_MENU_KEYS = new Set([
  'qiymet-deyisenler',
  'etiket-basimi',
  'sayim-view',
  'firmaya-mal-qaytarilmasi-view',
  'musteriden-qayidan-mallar-view',
  'alis-senedleri',
  'satis-senedleri',
  'anbar-senedleri',
  'kassa-ayarları',
  'cashier-view',
  'kassalara-yukleme',
  'anbar-ayarları',
  'bonus-kart-ayarları',
  'bonus-hesablamalari',
  'yetkiler',
  'isciler',
  'is-yerleri',
  'mallarin-siyahisi',
  'firmalarin-siyahisi',
  'musteri-ayarları',
  'qiymet-deyisenler-view'
]);
const normalizePermissionKey = (value = '') => String(value || '').replace(/^#/, '').replace(/^\//, '').trim().toLowerCase();
const isValidPermissionKey = (value = '') => VALID_MENU_KEYS.has(normalizePermissionKey(value));
const getAllowedMenuKeys = () => {
  try {
    const loginData = JSON.parse(localStorage.getItem('lastLogin') || 'null');
    const loginName = String(loginData?.login || '').trim().toLowerCase();
    const permissions = Array.isArray(loginData?.permissions) ? loginData.permissions : [];
    const fallbackPermissions = JSON.parse(localStorage.getItem('erpEmployeePermissions') || '[]');
    const effectivePermissions = permissions.length
      ? permissions
      : Array.isArray(fallbackPermissions)
        ? fallbackPermissions
        : [];

    if (effectivePermissions.length) {
      return effectivePermissions
        .map((item) => normalizePermissionKey(item))
        .filter((item) => item && isValidPermissionKey(item));
    }

    const isAdminLogin = loginName === 'admin' || loginName === 'administrator';
    if (isAdminLogin) return null;

    return [];
  } catch (error) {
    return null;
  }
};
const applySidebarPermissions = () => {
  const allowedKeys = getAllowedMenuKeys();
  const isUnrestricted = allowedKeys === null;

  navItems.forEach((item) => {
    const key = normalizePermissionKey(item.getAttribute('href'));
    const isVisible = isUnrestricted || allowedKeys.includes(key);
    item.hidden = !isVisible;
    item.style.display = isVisible ? '' : 'none';
  });
};
window.addEventListener('erp-permissions-updated', () => {
  applySidebarPermissions();
});
const getCurrentLogin = () => {
  try {
    const current = JSON.parse(localStorage.getItem('lastLogin') || 'null');
    return current || fallbackLogin;
  } catch (error) {
    return fallbackLogin;
  }
};
const lastLogin = getCurrentLogin();
const currentUserName = (lastLogin?.login || 'Admin').trim();
const currentUserRole = lastLogin?.workplace || 'İdarəçi';
const dashboardParts = document.querySelectorAll('.dashboard-columns');
const contentArea = document.querySelector('.content-area');
const workspaceTabs = document.querySelector('#workspace-tabs');
const headerShortcuts = document.querySelectorAll('.header-shortcut');
const employeesView = document.querySelector('#employees-view');
const permissionsView = document.querySelector('#permissions-view');
const bonusView = document.querySelector('#bonus-view');
const customerCardsView = document.querySelector('#customer-cards-view');
const cashierView = document.querySelector('#cashier-view');
const kassaSettingsView = document.querySelector('#kassa-ayarları-view');
const kassalaraYuklemeView = document.querySelector('#kassalara-yukleme-view');
const productsView = document.querySelector('#products-view');
const companiesView = document.querySelector('#companies-view');
const sayimView = document.querySelector('#sayim-view');
const firmayaMalQaytarilmasiView = document.querySelector('#firmaya-mal-qaytarilmasi-view');
const musteridenQayidanMallarView = document.querySelector('#musteriden-qayidan-mallar-view');
const workplacesView = document.querySelector('#workplaces-view');
const warehouseSettingsView = document.querySelector('#warehouse-settings-view');
const moduleCloseButtons = document.querySelectorAll('.module-close');
const shortcutList = document.querySelector('#shortcut-list');
const shortcutCount = document.querySelector('#shortcut-count');
const editShortcutsButton = document.querySelector('#edit-shortcuts');
const mainActions = document.querySelector('.main-actions');
const bonusSettings = document.querySelector('#bonus-settings');
const toggleBonusSettings = document.querySelector('#toggle-bonus-settings');
const serverSettingsForm = document.querySelector('#server-settings-form');
const saveServerSettingsButton = document.querySelector('#save-server-config');
const SERVER_SETTINGS_STORAGE_KEY = 'marketErpServerSettings';
const SERVER_SETTINGS_FIELD_MAP = {
  serverIp: 'server-ip',
  serverPort: 'server-port',
  dbHost: 'db-host',
  dbPort: 'db-port',
  dbUser: 'db-user',
  dbPassword: 'db-password',
  taxDeviceIp: 'tax-device-ip',
  taxDevicePort: 'tax-device-port'
};
const getDefaultServerSettings = () => ({
  serverIp: '94.20.88.181',
  serverPort: '5050',
  dbHost: 'localhost',
  dbPort: '3306',
  dbUser: 'root',
  dbPassword: '',
  taxDeviceIp: '',
  taxDevicePort: ''
});
const getServerSettings = () => {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SERVER_SETTINGS_STORAGE_KEY) || '{}');
    return { ...getDefaultServerSettings(), ...savedSettings };
  } catch (error) {
    return getDefaultServerSettings();
  }
};
const populateServerSettings = () => {
  if (!serverSettingsForm) return;
  const settings = getServerSettings();
  Object.entries(SERVER_SETTINGS_FIELD_MAP).forEach(([key, fieldId]) => {
    const input = document.getElementById(fieldId);
    if (input) input.value = settings[key] || '';
  });
};
const saveServerSettings = () => {
  if (!serverSettingsForm) return;
  const nextSettings = {};

  Object.entries(SERVER_SETTINGS_FIELD_MAP).forEach(([key, fieldId]) => {
    const input = document.getElementById(fieldId);
    nextSettings[key] = input ? input.value.trim() : '';
  });

  localStorage.setItem(SERVER_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  if (typeof window.showErpToast === 'function') {
    window.showErpToast('Server ayarları yadda saxlanıldı.');
  }
};

saveServerSettingsButton?.addEventListener('click', saveServerSettings);
serverSettingsForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveServerSettings();
});
populateServerSettings();

const workplaceModal = document.querySelector('#workplace-modal');
const addWorkplaceButton = document.querySelector('#add-workplace');
const workplaceForm = document.querySelector('#workplace-form');
const workplaceNameInput = document.querySelector('#workplace-name');
const workplaceTypeInput = document.querySelector('#workplace-type');
const workplaceAddressInput = document.querySelector('#workplace-address');
const workplacePhoneInput = document.querySelector('#workplace-phone');
const workplaceManagerInput = document.querySelector('#workplace-manager');
const workplaceStatusInput = document.querySelector('#workplace-status');
const workplaceList = document.querySelector('#workplace-list');
const workplaceEmpty = document.querySelector('#workplace-empty');
const workplaceTotalCount = document.querySelector('#workplace-total-count');
const warehouseList = document.querySelector('#warehouse-list');
const warehouseEmpty = document.querySelector('#warehouse-empty');
const warehouseNameInput = document.querySelector('#warehouse-name');
const warehouseWorkplaceSelect = document.querySelector('#warehouse-workplace');
const warehouseCapacityInput = document.querySelector('#warehouse-capacity');
const warehouseTotalCount = document.querySelector('#warehouse-total-count');
const selectedWorkplaceLabel = document.querySelector('#selected-workplace-label');
const addWarehouseButton = document.querySelector('#add-warehouse');
const addWarehouseFormButton = document.querySelector('#add-warehouse-form');
const SHORTCUT_STORAGE_KEY = 'marketErpShortcuts';
const WORKPLACE_STORAGE_KEY = 'marketErpWorkplaces';
const WAREHOUSE_STORAGE_KEY = 'marketErpWarehouses';
const CASH_REGISTER_STORAGE_KEY = 'marketErpCashRegisters';
let activeModuleId = null;
let isShortcutEditing = false;
let openModuleIds = [];
const moduleLabels = {
  'employees-view': 'İşçilər',
  'permissions-view': 'Yetkilər',
  'bonus-view': 'Bonus',
  'customer-cards-view': 'Müştəri Ayarları',
  'products-view': 'Malların Siyahısı',
  'companies-view': 'Firmaların Siyahısı',
  'qiymet-deyisenler-view': 'Qiymət Dəyişilənlər',
  'qiymet-deyisenler-faktura-view': 'Faktura detalı',
  'sayim-view': 'Sayım',
  'etiket-basimi': 'Etiket Çapı',
  'firmaya-mal-qaytarilmasi-view': 'Firmaya Mal Qaytarılması',
  'musteriden-qayidan-mallar-view': 'Müştəridən Qayıdan Mallar',
  'satis-senedleri-view': 'Satış Sənədləri',
  'alis-senedleri-view': 'Alış Sənədləri',
  'anbar-senedleri-view': 'Anbar Sənədləri',
  'cashier-view': 'Kassir Ayarları',
  'kassa-ayarları-view': 'Kassa Ayarları',
  'kassalara-yukleme-view': 'Kassalara Yükləmə',
  'workplaces-view': 'İş yerləri',
  'warehouse-settings-view': 'Anbar Ayarları',
  'muddeti-bitmis-view': 'Müddəti Bitmiş Mallar',
  'hesabatlar-view': 'Hesabatlar',
  'alis-hesabatlari-view': 'Alış Hesabatları',
  'satis-hesabatlari-view': 'Satış Hesabatları',
  'qaliq-hesabatlari-view': 'Qalıq Hesabatları',
};
bonusSettings?.classList.add('collapsed');
toggleBonusSettings?.addEventListener('click', () => {
  const isCollapsed = bonusSettings.classList.toggle('collapsed');
  toggleBonusSettings.textContent = isCollapsed ? 'Məlumatları aç' : 'Məlumatları bağla';
  toggleBonusSettings.setAttribute('aria-expanded', String(!isCollapsed));
});

if (lastLogin?.workplace) document.querySelector('#branch-name').textContent = lastLogin.workplace;

const syncCurrentUserHeader = () => {
  const login = getCurrentLogin();
  const userName = (login?.login || 'Admin').trim();
  const role = login?.workplace || 'İdarəçi';
  const headerUserName = document.querySelector('#header-user-name');
  const headerUserRole = document.querySelector('#header-user-role');
  const headerUserInitials = document.querySelector('#header-user-initials');

  if (headerUserName) headerUserName.textContent = userName;
  if (headerUserRole) headerUserRole.textContent = role;
  if (headerUserInitials) {
    const initials = userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'KA';
    headerUserInitials.textContent = initials;
  }

  const branchName = document.querySelector('#branch-name');
  if (branchName && login?.workplace) branchName.textContent = login.workplace;
};

const userMenuToggle = document.querySelector('#user-menu-toggle');
const userDropdown = document.querySelector('#user-dropdown');
const logoutButton = document.querySelector('#logout-button');

const toggleUserMenu = (forceState) => {
  if (!userDropdown || !userMenuToggle) return;
  const shouldOpen = typeof forceState === 'boolean' ? forceState : userDropdown.hidden;
  userDropdown.hidden = !shouldOpen;
  userMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
};

userMenuToggle?.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleUserMenu();
});

logoutButton?.addEventListener('click', () => {
  try {
    localStorage.removeItem('lastLogin');
    localStorage.removeItem('erpEmployeePermissions');
  } catch (error) {
    // no-op
  }
  toggleUserMenu(false);
  window.location.href = '../login seyfesi/login.html';
});

document.addEventListener('click', (event) => {
  if (!userMenuToggle || !userDropdown) return;
  if (!userMenuToggle.contains(event.target) && !userDropdown.contains(event.target)) {
    toggleUserMenu(false);
  }
});

syncCurrentUserHeader();
applySidebarPermissions();

const showToast = (text, options = {}) => {
  const actionLabel = options.actionLabel;
  const onAction = typeof options.onAction === 'function' ? options.onAction : null;

  toast.innerHTML = '';
  const textNode = document.createTextNode(text);
  toast.appendChild(textNode);

  if (actionLabel && onAction) {
    const actionButton = document.createElement('button');
    actionButton.type = 'button';
    actionButton.className = 'toast-action-btn';
    actionButton.textContent = actionLabel;
    actionButton.addEventListener('click', () => {
      onAction();
      toast.classList.remove('visible');
    });
    toast.appendChild(actionButton);
    toast.classList.add('toast-with-action');
  } else {
    toast.classList.remove('toast-with-action');
  }

  toast.classList.add('visible');
  window.clearTimeout(toast._erpHideTimeout);
  toast._erpHideTimeout = window.setTimeout(() => {
    toast.classList.remove('visible');
    toast.classList.remove('toast-with-action');
  }, 2800);
};
window.showErpToast = showToast;

const getWorkplaces = () => JSON.parse(localStorage.getItem(WORKPLACE_STORAGE_KEY) || '[]');
const saveWorkplaces = (items) => localStorage.setItem(WORKPLACE_STORAGE_KEY, JSON.stringify(items));
const getWarehouses = () => JSON.parse(localStorage.getItem(WAREHOUSE_STORAGE_KEY) || '[]');
const saveWarehouses = (items) => localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(items));

const refreshWorkplacesFromServer = async () => {
  try {
    const response = await fetch('http://94.20.88.181:5050/api/workplaces', { method: 'GET' });
    const data = await response.json();
    if (!response.ok || data.status !== 'success' || !Array.isArray(data.workplaces)) return;

    const normalized = data.workplaces.map((workplace) => ({
      id: workplace.id,
      name: workplace.is_yeri_adi || workplace.name || 'İş yeri',
      code: workplace.is_yeri_kodu || workplace.code || '',
      type: workplace.is_yeri_novu || workplace.type || 'filial',
      address: workplace.unvan || workplace.address || '',
      phone: workplace.telefon || workplace.phone || '',
      manager: workplace.rehber_adi || workplace.manager || '',
      status: workplace.status === 'passiv' || workplace.status === 'inactive' ? 'inactive' : 'active',
      createdAt: workplace.yaradilma_tarixi ? String(workplace.yaradilma_tarixi).slice(0, 10) : new Date().toISOString().slice(0, 10)
    }));

    saveWorkplaces(normalized);
    renderWorkplaces();
    populateWarehouseSelect();
    if (typeof window.renderWarehouses === 'function') window.renderWarehouses();
  } catch (error) {
    console.warn('İş yerləri serverdən yenilənmədi:', error);
  }
};

const populateWarehouseSelect = () => {
  if (!warehouseWorkplaceSelect) return;
  const workplaces = getWorkplaces();
  const selectedValue = warehouseWorkplaceSelect.value || String(workplaces[0]?.id ?? '');

  warehouseWorkplaceSelect.innerHTML = workplaces.length
    ? workplaces.map((workplace) => `<option value="${workplace.id ?? ''}">${workplace.name}</option>`).join('')
    : '<option value="">İlk əvvə iş yeri yaradın</option>';

  if (workplaces.length && [...warehouseWorkplaceSelect.options].some((option) => option.value === String(selectedValue))) {
    warehouseWorkplaceSelect.value = String(selectedValue);
  } else if (workplaces.length) {
    warehouseWorkplaceSelect.value = String(workplaces[0].id ?? '');
  }
};

const renderWorkplaces = () => {
  if (!workplaceList || !workplaceEmpty || !workplaceTotalCount) return;
  const workplaces = getWorkplaces();
  workplaceTotalCount.textContent = String(workplaces.length);

  if (!workplaces.length) {
    workplaceList.innerHTML = '';
    workplaceEmpty.hidden = false;
    return;
  }

  workplaceEmpty.hidden = true;
  workplaceList.innerHTML = workplaces.map((workplace) => `
    <div class="workplace-item" data-workplace-id="${workplace.id ?? ''}" data-workplace-name="${workplace.name}">
      <div class="workplace-item-main">
        <div class="workplace-badge">${workplace.type?.charAt(0)?.toUpperCase() || 'F'}</div>
        <div class="workplace-meta">
          <strong>${workplace.name}</strong>
          <small>${workplace.address || 'Ünvan qeyd olunmayıb'} • ${workplace.manager || 'Məsul şəxs yoxdur'}</small>
        </div>
      </div>
      <div class="workplace-actions">
        <span class="status-pill ${workplace.status || 'active'}">${workplace.status === 'inactive' ? 'passiv' : 'aktiv'}</span>
        <button type="button" class="inline-delete" data-remove-workplace="${workplace.id ?? ''}" aria-label="${workplace.name} iş yerini sil">Sil</button>
      </div>
    </div>
  `).join('');

  workplaceList.querySelectorAll('[data-remove-workplace]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const targetId = button.dataset.removeWorkplace;
      if (!targetId) return;

      try {
        const response = await fetch(`http://94.20.88.181:5050/api/workplaces/${targetId}`, { method: 'DELETE' });
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
          showToast(data.message || 'İş yeri silinmədi.');
          return;
        }

        await refreshWorkplacesFromServer();
        showToast('İş yeri silindi.');
      } catch (error) {
        showToast('Server ilə əlaqə xətası.');
      }
    });
  });
};

const normalizeWarehouse = (row = {}) => ({
  id: row.id,
  name: row.anbar_adi || row.name || 'Anbar',
  workplaceId: row.is_yeri_id ?? row.workplace_id ?? null,
  workplace: row.is_yeri_adi || row.workplace || row.workplace_name || 'Market Mərkəz Filialı',
  capacity: row.pul_miqdari ?? row.capacity ?? 'Tutum qeyd olunmayıb',
  status: row.status === 'passiv' ? 'inactive' : 'active',
  createdAt: row.yaradilma_tarixi || row.createdAt || new Date().toISOString(),
});

const refreshWarehousesFromServer = async () => {
  try {
    const response = await fetch('http://94.20.88.181:5050/api/warehouses', { method: 'GET' });
    const data = await response.json();
    if (!response.ok || data.status !== 'success' || !Array.isArray(data.warehouses)) return;

    const normalized = data.warehouses.map(normalizeWarehouse);
    saveWarehouses(normalized);
    renderWarehouses();
  } catch (error) {
    console.warn('Anbarlar serverdən yenilənmədi:', error);
  }
};

const renderWarehouses = () => {
  if (!warehouseList || !warehouseEmpty || !warehouseTotalCount) return;

  const selectedWorkplaceId = warehouseWorkplaceSelect?.value;
  const selectedWorkplaceName = getWorkplaces().find((workplace) => String(workplace.id) === String(selectedWorkplaceId))?.name || getWorkplaces()[0]?.name || 'Market Mərkəz Filialı';

  const warehouses = getWarehouses().filter((warehouse) => {
    const warehouseWorkplaceId = warehouse.workplaceId ?? warehouse.is_yeri_id ?? null;
    const workplace = getWorkplaces().find((item) => String(item.id) === String(warehouseWorkplaceId));
    return selectedWorkplaceId
      ? String(warehouseWorkplaceId) === String(selectedWorkplaceId) || workplace?.name === warehouse.workplace
      : true;
  });

  warehouseTotalCount.textContent = String(warehouses.length);

  if (selectedWorkplaceLabel) selectedWorkplaceLabel.textContent = selectedWorkplaceName;

  if (!warehouses.length) {
    warehouseList.innerHTML = '';
    warehouseEmpty.hidden = false;
    return;
  }

  warehouseEmpty.hidden = true;
  warehouseList.innerHTML = warehouses.map((warehouse) => `
    <li>
      <div>
        <strong>${warehouse.name}</strong>
        <small>${warehouse.workplace || 'İş yeri yoxdur'} • ${warehouse.capacity || 'Tutum qeyd olunmayıb'}</small>
      </div>
      <button type="button" data-remove-warehouse="${warehouse.id}">Sil</button>
    </li>
  `).join('');

  warehouseList.querySelectorAll('[data-remove-warehouse]').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.removeWarehouse;
      if (!targetId) return;

      try {
        const response = await fetch(`http://94.20.88.181:5050/api/warehouses/${targetId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          showToast(data.message || 'Anbar silinmədi.');
          return;
        }
        await refreshWarehousesFromServer();
        showToast('Anbar silindi.');
      } catch (error) {
        showToast('Server ilə əlaqə xətası.');
      }
    });
  });
};

const closeWorkplaceModal = () => {
  if (workplaceModal) workplaceModal.hidden = true;
  if (workplaceForm) workplaceForm.reset();
};

const openWorkplaceModal = () => {
  if (!workplaceModal) return;
  workplaceModal.hidden = false;
  if (workplaceTypeInput) workplaceTypeInput.value = 'filial';
  if (workplaceStatusInput) workplaceStatusInput.value = 'active';
};

const addWorkplace = async (event) => {
  event.preventDefault();
  if (!workplaceNameInput || !workplaceAddressInput) return;

  const name = workplaceNameInput.value.trim();
  const address = workplaceAddressInput.value.trim();
  if (!name || !address) {
    showToast('İş yeri adı və ünvanı tələb olunur.');
    return;
  }

  const payload = {
    is_yeri_adi: name,
    is_yeri_kodu: `IS-${Date.now().toString().slice(-6)}`,
    is_yeri_novu: workplaceTypeInput?.value || 'filial',
    unvan: address,
    telefon: workplacePhoneInput?.value.trim() || '',
    rehber_adi: workplaceManagerInput?.value.trim() || '',
    status: workplaceStatusInput?.value || 'active'
  };

  try {
    const response = await fetch('http://94.20.88.181:5050/api/workplaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      showToast(data.message || 'İş yeri yaradılmadı.');
      return;
    }

    if (typeof window.refreshWorkplacesFromServer === 'function') {
      await window.refreshWorkplacesFromServer();
    } else {
      renderWorkplaces();
      populateWarehouseSelect();
    }

    closeWorkplaceModal();
    showToast('İş yeri yadda saxlanıldı.');
  } catch (error) {
    showToast('Server ilə əlaqə xətası.');
  }
};

const addWarehouse = async () => {
  const name = warehouseNameInput?.value.trim();
  const workplaceIdValue = warehouseWorkplaceSelect?.value;
  const capacity = warehouseCapacityInput?.value.trim();

  if (!name) {
    showToast('Anbar adı tələb olunur.');
    return;
  }

  const workplaces = getWorkplaces();
  if (!workplaces.length) {
    showToast('İlk əvvəl iş yeri yaradın.');
    return;
  }

  const workplaceRecord = workplaces.find((item) => String(item.id) === String(workplaceIdValue));
  if (!workplaceRecord) {
    showToast('Seçilmiş iş yeri DB-də tapılmadı.');
    return;
  }

  const payload = {
    anbar_adi: name,
    is_yeri_id: workplaceRecord.id,
    pul_miqdari: Number(capacity || 0),
    status: 'aktiv',
  };

  try {
    const response = await fetch('http://94.20.88.181:5050/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success') {
      showToast(data.message || 'Anbar yaradılmadı.');
      return;
    }

    if (warehouseNameInput) warehouseNameInput.value = '';
    if (warehouseCapacityInput) warehouseCapacityInput.value = '';
    await refreshWarehousesFromServer();
    showToast('Anbar əlavə edildi.');
  } catch (error) {
    showToast('Server ilə əlaqə xətası.');
  }
};

const labelPrintView = document.querySelector('#etiket-basimi');
const priceChangeListView = document.querySelector('#qiymet-deyisenler-view');
const priceChangeDetailView = document.querySelector('#qiymet-deyisenler-faktura-view');
const moduleViews = [employeesView, permissionsView, bonusView, customerCardsView, productsView, companiesView, priceChangeListView, priceChangeDetailView, sayimView, labelPrintView, firmayaMalQaytarilmasiView, musteridenQayidanMallarView, cashierView, kassaSettingsView, kassalaraYuklemeView, workplacesView, warehouseSettingsView, document.querySelector('#anbar-senedleri-view')].filter(Boolean);

const purchaseDocumentsView = document.querySelector('#alis-senedleri-view');
const salesDocumentsView = document.querySelector('#satis-senedleri-view');
const warehouseDocumentsView = document.querySelector('#anbar-senedleri-view');
const expiredProductsView = document.querySelector('#muddeti-bitmis-view');
const reportsView = document.querySelector('#hesabatlar-view');
const purchaseReportsView = document.querySelector('#alis-hesabatlari-view');
const salesReportsView = document.querySelector('#satis-hesabatlari-view');
const stockReportsView = document.querySelector('#qaliq-hesabatlari-view');
const moduleViewsWithPurchase = [employeesView, permissionsView, bonusView, customerCardsView, productsView, companiesView, priceChangeListView, priceChangeDetailView, sayimView, labelPrintView, firmayaMalQaytarilmasiView, musteridenQayidanMallarView, cashierView, kassaSettingsView, kassalaraYuklemeView, workplacesView, warehouseSettingsView, purchaseDocumentsView, salesDocumentsView, warehouseDocumentsView, expiredProductsView, reportsView, purchaseReportsView, salesReportsView, stockReportsView].filter(Boolean);

const syncHeaderShortcuts = (activeHref) => {
  headerShortcuts.forEach((button) => {
    const isActive = button.dataset.headerLink === activeHref;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
};

const renderWorkspaceTabs = () => {
  if (!workspaceTabs) return;
  if (!openModuleIds.length) {
    workspaceTabs.innerHTML = '';
    return;
  }

  workspaceTabs.innerHTML = openModuleIds.map((viewId) => {
    const isActive = activeModuleId === viewId;
    return `
      <button class="workspace-tab ${isActive ? 'active' : ''}" type="button" data-tab-target="${viewId}">
        <span>${moduleLabels[viewId] || viewId}</span>
        <span class="workspace-close" data-close-view="${viewId}" aria-label="${moduleLabels[viewId] || viewId} bölməsini bağla">×</span>
      </button>
    `;
  }).join('');

  workspaceTabs.querySelectorAll('.workspace-tab').forEach((button) => {
    button.addEventListener('click', (event) => {
      const closeTarget = event.target.closest('[data-close-view]');
      if (closeTarget) return;
      setActiveModule(button.dataset.tabTarget);
    });
  });

  workspaceTabs.querySelectorAll('[data-close-view]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      closeCurrentModule(button.dataset.closeView);
    });
  });
};

const setActiveModule = (viewId) => {
  if (!viewId) return;
  if (!openModuleIds.includes(viewId)) {
    openModuleIds.push(viewId);
  }

  activeModuleId = viewId;

  moduleViewsWithPurchase.forEach((view) => {
    const shouldShow = view.id === viewId;
    view.hidden = !shouldShow;
    view.classList.toggle('active', shouldShow);
    if (shouldShow) {
      view.scrollTop = 0;
    }
  });
  if (contentArea) {
    contentArea.classList.remove('employees-open', 'permissions-open', 'bonus-open', 'customer-cards-open', 'cashier-open', 'kassa-open', 'workplaces-open');
    if (viewId === 'employees-view') contentArea.classList.add('employees-open');
    if (viewId === 'permissions-view') contentArea.classList.add('permissions-open');
    if (viewId === 'bonus-view') contentArea.classList.add('bonus-open');
    if (viewId === 'customer-cards-view') contentArea.classList.add('customer-cards-open');
    if (viewId === 'cashier-view') contentArea.classList.add('cashier-open');
    if (viewId === 'kassa-ayarları-view') contentArea.classList.add('kassa-open');
    if (viewId === 'workplaces-view') contentArea.classList.add('workplaces-open');
  }
  if (viewId === 'employees-view') syncHeaderShortcuts('#isciler');
  else if (viewId === 'permissions-view') syncHeaderShortcuts('#yetkiler');
  else if (viewId === 'bonus-view') syncHeaderShortcuts('#bonus-hesablamalari');
  else if (viewId === 'customer-cards-view') syncHeaderShortcuts('#musteri-ayarları');
  else if (viewId === 'companies-view') syncHeaderShortcuts('#firmalarin-siyahisi');
  else if (viewId === 'etiket-basimi') syncHeaderShortcuts('#etiket-basimi');
  else if (viewId === 'alis-senedleri-view') syncHeaderShortcuts('#alis-senedleri');
  else if (viewId === 'satis-senedleri-view') syncHeaderShortcuts('#satis-senedleri');
  else if (viewId === 'kassa-ayarları-view') syncHeaderShortcuts('#kassa-ayarları');
  else if (viewId === 'kassalara-yukleme-view') syncHeaderShortcuts('#kassalara-yukleme');
  else if (viewId === 'cashier-view') syncHeaderShortcuts('#cashier-view');
  else if (viewId === 'workplaces-view') syncHeaderShortcuts('#is-yerleri');
  else if (viewId === 'warehouse-settings-view') syncHeaderShortcuts('#anbar-ayarları');

  renderWorkspaceTabs();
};

const resetModuleViews = () => {
  moduleViewsWithPurchase.forEach((view) => {
    view.hidden = true;
    view.classList.remove('active');
    view.scrollTop = 0;
  });
  if (contentArea) {
    contentArea.classList.remove('employees-open', 'permissions-open', 'bonus-open', 'customer-cards-open', 'cashier-open', 'kassa-open', 'workplaces-open');
  }
  syncHeaderShortcuts(null);
};

const showDashboard = () => {
  window.labelPrintModule?.reset?.();
  resetModuleViews();
  dashboardParts.forEach((part) => { part.hidden = false; });
  activeModuleId = null;
  openModuleIds = [];
  renderWorkspaceTabs();
  pageTitle.textContent = 'İş paneli';
  navItems.forEach((item) => item.classList.remove('active'));
};

const closeCurrentModule = (viewId = activeModuleId) => {
  if (!viewId) return;
  if (viewId === 'etiket-basimi') {
    window.labelPrintModule?.reset?.();
  }

  if (viewId === 'satis-senedleri-view') {
    window.salesDocumentsViewModule?.reset?.();
  }

  if (viewId === 'qiymet-deyisenler-faktura-view') {
    const remaining = openModuleIds.filter((id) => id !== viewId);
    const hasListOpen = remaining.includes('qiymet-deyisenler-view');

    openModuleIds = remaining;
    if (activeModuleId === viewId) {
      activeModuleId = hasListOpen ? 'qiymet-deyisenler-view' : null;
    }

    if (activeModuleId) {
      setActiveModule(activeModuleId);
    } else {
      showDashboard();
    }
    return;
  }

  openModuleIds = openModuleIds.filter((id) => id !== viewId);
  if (activeModuleId === viewId) {
    activeModuleId = openModuleIds.at(-1) || null;
  }

  if (activeModuleId) {
    setActiveModule(activeModuleId);
  } else {
    showDashboard();
  }
};

const getShortcuts = () => JSON.parse(localStorage.getItem(SHORTCUT_STORAGE_KEY) || '[]');
const saveShortcuts = (shortcuts) => localStorage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(shortcuts));

const shortcutIcon = (href) => document.querySelector(`.nav-item[href="${href}"] .nav-icon`)?.textContent || '•';

const addShortcut = (href) => {
  const shortcuts = getShortcuts();
  if (shortcuts.includes(href)) {
    showToast('Bu bölmə artıq əlavə olunub.');
    return;
  }
  shortcuts.push(href);
  saveShortcuts(shortcuts);
  renderShortcuts();
  showToast('Qısa yol əlavə edildi.');
};

const removeShortcut = (href) => {
  saveShortcuts(getShortcuts().filter((shortcut) => shortcut !== href));
  renderShortcuts();
  showToast('Qısa yol silindi.');
};

const renderShortcuts = () => {
  const shortcuts = getShortcuts();
  shortcutCount.textContent = `${shortcuts.length} bölmə`;
  shortcutList.innerHTML = shortcuts.length ? shortcuts.map((href, index) => {
    const item = document.querySelector(`.nav-item[href="${href}"]`);
    if (!item) return '';
    return `<div class="main-action${index === 0 ? ' featured' : ''}" role="button" tabindex="0" draggable="true" data-shortcut-target="${href}"><span class="action-symbol">${shortcutIcon(href)}</span><div><strong>${item.dataset.title}</strong><small>Menyu bölməsinə keçid</small></div><b>↗</b><button class="shortcut-card-remove" type="button" data-remove-shortcut="${href}" aria-label="Qısa yolu sil">×</button></div>`;
  }).join('') : '<div class="shortcut-empty"><strong>Qısa yol əlavə edin</strong><p>Düzənlə düyməsinə basın və sol menyudan bir bölməni bura sürükləyin.</p></div>';

  shortcutList.querySelectorAll('[data-shortcut-target]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (!event.target.closest('[data-remove-shortcut]')) activateNavigation(card.dataset.shortcutTarget);
    });
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/shortcut', card.dataset.shortcutTarget);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  shortcutList.querySelectorAll('[data-remove-shortcut]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      removeShortcut(button.dataset.removeShortcut);
    });
  });
};

const setShortcutEditing = (editing) => {
  isShortcutEditing = editing;
  mainActions.classList.toggle('shortcut-editing', editing);
  editShortcutsButton.setAttribute('aria-expanded', String(editing));
  editShortcutsButton.textContent = editing ? 'Hazırdır' : 'Düzənlə';
};

const showEmployees = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('employees-view');
  window.isciModulu?.goster();
};

const showPermissions = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('permissions-view');
  window.isciModulu?.goster();
};

const showBonus = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('bonus-view');
  window.bonusModulu?.goster();
};

const showCustomerCards = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('customer-cards-view');
  window.musteriKartModulu?.goster();
};

const refreshProductsFromServer = async () => {
  await ensureProductsLoaded();
};

const showProducts = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('products-view');
  renderProducts();
  refreshProductsFromServer();
};

const showCompanies = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('companies-view');
  window.firmaModulu?.goster?.();
};

const showStockCounting = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('sayim-view');
};

const showLabelPrint = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('etiket-basimi');
  window.labelPrintModule?.render?.();
  window.setTimeout(() => {
    const focusTarget = document.querySelector('#label-barcode-input') || document.querySelector('#label-product-search');
    if (focusTarget) {
      focusTarget.focus();
      const length = focusTarget.value.length;
      if (typeof focusTarget.setSelectionRange === 'function') focusTarget.setSelectionRange(length, length);
    }
  }, 60);
};

const showPriceChangeList = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('qiymet-deyisenler-view');
  window.priceChangeListModule?.render?.();
};

const showPriceChangeInvoice = (invoiceId) => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  if (!openModuleIds.includes('qiymet-deyisenler-view')) {
    openModuleIds.push('qiymet-deyisenler-view');
  }
  setActiveModule('qiymet-deyisenler-faktura-view');
  window.priceChangeInvoiceModule?.openInvoice?.(invoiceId);
};

window.showPriceChangeList = showPriceChangeList;
window.showPriceChangeInvoice = showPriceChangeInvoice;

const releaseLabelFocusLock = () => {
  if (window.labelFocusLock) {
    window.labelFocusLock = false;
  }
};

const keepLabelBarcodeFocus = () => {
  if (activeModuleId !== 'etiket-basimi') {
    releaseLabelFocusLock();
    return;
  }

  const target = document.querySelector('#label-barcode-input');
  if (!target || target !== document.activeElement) {
    window.labelFocusLock = true;
    target?.focus();
    const length = target?.value?.length || 0;
    if (target && typeof target.setSelectionRange === 'function') {
      target.setSelectionRange(length, length);
    }
  }
};

const showSupplierReturn = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('firmaya-mal-qaytarilmasi-view');
  window.supplierReturnModulu?.goster?.();
};

const showCustomerReturns = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('musteriden-qayidan-mallar-view');
  window.customerReturnModulu?.goster?.();
  window.customerReturnDocsRender?.();
};

const showPurchaseDocuments = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('alis-senedleri-view');
  if (window.resetPurchaseForm) {
    window.resetPurchaseForm();
  }
  window.alisSenedleriModulu?.goster?.();
};

window.showPurchaseDocuments = showPurchaseDocuments;

const showSalesDocuments = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('satis-senedleri-view');
  window.salesDocumentsViewModule?.reset?.();
};

const showWarehouseDocuments = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('anbar-senedleri-view');
  window.marketErpWarehouseDocumentsRender?.();
};

const showExpiredProducts = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('muddeti-bitmis-view');
  window.muddetiBitmisModulu?.goster?.();
};

const showReports = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('hesabatlar-view');
  window.hesabatlarModulu?.goster?.('hesabatlar-view');
};

const showPurchaseReports = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('alis-hesabatlari-view');
  window.hesabatlarModulu?.goster?.('alis-hesabatlari-view');
};

const showSalesReports = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('satis-hesabatlari-view');
  window.hesabatlarModulu?.goster?.('satis-hesabatlari-view');
};

const showStockReports = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('qaliq-hesabatlari-view');
  window.hesabatlarModulu?.goster?.('qaliq-hesabatlari-view');
};

const showCashiers = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('cashier-view');
  window.kassirModulu?.goster?.();
};

const showCashRegisterSettings = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('kassa-ayarları-view');
  window.kassaAyarModulu?.goster?.();
};

const showKassalaraYukleme = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('kassalara-yukleme-view');
  window.kassalaraYuklemeModulu?.goster?.();
};

const showWorkplaces = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('workplaces-view');
  renderWorkplaces();
};

const showWarehouseSettings = () => {
  dashboardParts.forEach((part) => { part.hidden = true; });
  setActiveModule('warehouse-settings-view');
  populateWarehouseSelect();
  renderWarehouses();
};

const normalizeNavigationTarget = (targetHref) => {
  if (targetHref === '#kassir-ayarları') return '#cashier-view';
  if (targetHref === '#kassa-ayarları') return '#kassa-ayarları-view';
  if (targetHref === '#alis-senedleri') return '#alis-senedleri-view';
  if (targetHref === '#satis-senedleri') return '#satis-senedleri-view';
  if (targetHref === '#anbar-senedleri') return '#anbar-senedleri-view';
  if (targetHref === '#kassalara-yukleme') return '#kassalara-yukleme-view';
  if (targetHref === '#musteri-ayarları') return '#customer-cards-view';
  if (targetHref === '#bonus-kart-ayarları') return '#customer-cards-view';
  if (targetHref === '#mallarin-siyahisi') return '#products-view';
  if (targetHref === '#qiymet-deyisenler') return '#qiymet-deyisenler-view';
  if (targetHref === '#sayim' || targetHref === '#sayim-view') return '#sayim-view';
  if (targetHref === '#etiket-basimi' || targetHref === '#etiket-basimi-view') return '#etiket-basimi';
  if (targetHref === '#firmaya-mal-qaytarilmasi' || targetHref === '#firmaya-mal-qaytarilmasi-view') return '#firmaya-mal-qaytarilmasi-view';
  if (targetHref === '#musteriden-qayidan-mallar' || targetHref === '#musteriden-qayidan-mallar-view') return '#musteriden-qayidan-mallar-view';
  if (targetHref === '#muddeti-bitmis' || targetHref === '#muddeti-bitmis-view') return '#muddeti-bitmis-view';
  if (targetHref === '#hesabatlar' || targetHref === '#hesabatlar-view') return '#hesabatlar-view';
  if (targetHref === '#alis-hesabatlari' || targetHref === '#alis-hesabatlari-view') return '#alis-hesabatlari-view';
  if (targetHref === '#satis-hesabatlari' || targetHref === '#satis-hesabatlari-view') return '#satis-hesabatlari-view';
  if (targetHref === '#qaliq-hesabatlari' || targetHref === '#qaliq-hesabatlari-view') return '#qaliq-hesabatlari-view';
  return targetHref;
};

const activateNavigation = (targetHref) => {
  const currentActiveId = activeModuleId;
  const currentTarget = normalizeNavigationTarget(targetHref || '');
  if (currentActiveId === 'etiket-basimi' && currentTarget !== '#etiket-basimi' && currentTarget !== '#etiket-basimi-view') {
    window.labelPrintModule?.reset?.();
  }
  releaseLabelFocusLock();
  const normalized = normalizeNavigationTarget(targetHref);
  const target = [...navItems].find((item) => item.getAttribute('href') === normalized || item.getAttribute('href') === targetHref);
  if (!target) return;

  const implementedPaths = {
    '#isciler': showEmployees,
    '#yetkiler': showPermissions,
    '#bonus-hesablamalari': showBonus,
    '#bonus-kart-ayarları': showCustomerCards,
    '#musteri-ayarları': showCustomerCards,
    '#mallarin-siyahisi': showProducts,
    '#firmalarin-siyahisi': showCompanies,
    '#qiymet-deyisenler': showPriceChangeList,
    '#qiymet-deyisenler-view': showPriceChangeList,
    '#qiymet-deyisenler-faktura-view': showPriceChangeList,
    '#products-view': showProducts,
    '#companies-view': showCompanies,
    '#sayim-view': showStockCounting,
    '#sayim': showStockCounting,
    '#etiket-basimi': showLabelPrint,
    '#etiket-basimi-view': showLabelPrint,
    '#firmaya-mal-qaytarilmasi-view': showSupplierReturn,
    '#firmaya-mal-qaytarilmasi': showSupplierReturn,
    '#musteriden-qayidan-mallar-view': showCustomerReturns,
    '#musteriden-qayidan-mallar': showCustomerReturns,
    '#satis-senedleri': showSalesDocuments,
    '#satis-senedleri-view': showSalesDocuments,
    '#alis-senedleri': showPurchaseDocuments,
    '#alis-senedleri-view': showPurchaseDocuments,
    '#anbar-senedleri': showWarehouseDocuments,
    '#muddeti-bitmis': showExpiredProducts,
    '#muddeti-bitmis-view': showExpiredProducts,
    '#hesabatlar': showReports,
    '#hesabatlar-view': showReports,
    '#alis-hesabatlari': showPurchaseReports,
    '#alis-hesabatlari-view': showPurchaseReports,
    '#satis-hesabatlari': showSalesReports,
    '#satis-hesabatlari-view': showSalesReports,
    '#qaliq-hesabatlari': showStockReports,
    '#qaliq-hesabatlari-view': showStockReports,
    '#anbar-senedleri-view': showWarehouseDocuments,
    '#cashier-view': showCashiers,
    '#kassa-ayarları-view': showCashRegisterSettings,
    '#kassa-ayarları': showCashRegisterSettings,
    '#kassalara-yukleme': showKassalaraYukleme,
    '#kassalara-yukleme-view': showKassalaraYukleme,
    '#kassir-ayarları': showCashiers,
    '#is-yerleri': showWorkplaces,
    '#anbar-ayarları': showWarehouseSettings,
  };

  navItems.forEach((item) => item.classList.remove('active'));
  target.classList.add('active');
  pageTitle.textContent = target.dataset.title;

  const handler = implementedPaths[normalized] || implementedPaths[targetHref];
  if (handler) {
    handler();
    return;
  }

  showToast('Bu bölmə hələ hazır deyil. Açıq tablar saxlanır.');
};

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    activateNavigation(item.getAttribute('href'));
    sidebar.classList.remove('open');
  });
});

headerShortcuts.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.headerLink;
    if (!target) return;
    activateNavigation(target);
  });
});

moduleCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    closeCurrentModule(button.dataset.closeView || activeModuleId);
  });
});

editShortcutsButton?.addEventListener('click', () => setShortcutEditing(!isShortcutEditing));

shortcutList?.addEventListener('dragover', (event) => {
  if (!isShortcutEditing) return;
  event.preventDefault();
  shortcutList.classList.add('drop-active');
});
shortcutList?.addEventListener('dragleave', () => shortcutList.classList.remove('drop-active'));
shortcutList?.addEventListener('drop', (event) => {
  if (!isShortcutEditing) return;
  event.preventDefault();
  shortcutList.classList.remove('drop-active');
  const target = event.dataTransfer.getData('text/shortcut');
  if (target) addShortcut(target);
});

navItems.forEach((item) => {
  item.setAttribute('draggable', 'true');
  item.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/shortcut', item.getAttribute('href')));
});

const PRODUCT_STORAGE_KEY = 'marketErpProducts';
window.__erpSelectionTarget = null;
const triggerAfterCreate = (createdItem) => {
  const pending = window.__erpAfterCreate;
  const currentOwner = window.__erpPickerOwner || window.__erpActivePicker || pending?.owner;
  const pendingOwner = pending?.owner || pending?.picker;

  if (pendingOwner && currentOwner && pendingOwner !== currentOwner) {
    window.__erpAfterCreate = null;
    window.__erpSelectionTarget = null;
    return false;
  }

  const targetSelectors = [
    pending?.targetSelector,
    window.__erpSelectionTarget?.selector,
    pending?.type === 'company' ? '#purchase-supplier' : null,
    pending?.type === 'company' ? '#supplier-return-company' : null,
    pending?.type === 'customer' ? '#sales-customer' : null,
  ].filter(Boolean);

  const fallbackText = createdItem?.name || createdItem?.title || createdItem?.fullName || createdItem?.code || '';

  try {
    targetSelectors.forEach((selector) => {
      const target = document.querySelector(selector);
      if (target && fallbackText) {
        target.value = fallbackText;
      }
    });

    if (pending?.callback) {
      pending.callback(createdItem);
    }
  } finally {
    window.__erpAfterCreate = null;
    window.__erpSelectionTarget = null;
  }

  return true;
};
window.__erpTriggerAfterCreate = triggerAfterCreate;
const productForm = document.querySelector('#product-form');
const productModal = document.querySelector('#product-modal');
const addProductButton = document.querySelector('#add-product');
const productTableBody = document.querySelector('#product-list');
const productEmpty = document.querySelector('#product-empty');
const productCount = document.querySelector('#product-count');
const productStatusButtons = Array.from(document.querySelectorAll('.product-status-filter'));
const productTypeFilter = document.querySelector('#product-type-filter');
const productCompanyFilter = document.querySelector('#product-company-filter');
const productSearch = document.querySelector('#product-search');
const productWarehouseSelect = document.querySelector('#product-warehouse');
const bulkDeleteProductsButton = document.querySelector('#bulk-delete-products');
let currentProductBarcodes = [];

const normalizeBarcodes = (value) => {
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => typeof item === 'string' ? item.split(',') : [item])
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const renderProductBarcodeList = (values = currentProductBarcodes) => {
  const barcodeList = document.querySelector('#product-barcode-list');
  const barcodeInput = document.querySelector('#product-barcode-input');
  currentProductBarcodes = normalizeBarcodes(values);

  if (!barcodeList) return;
  if (!currentProductBarcodes.length) {
    barcodeList.innerHTML = '<span class="barcode-empty">Heç bir barkod əlavə edilməyib</span>';
    if (barcodeInput) barcodeInput.value = '';
    return;
  }

  barcodeList.innerHTML = currentProductBarcodes.map((barcode, index) => `
    <span class="barcode-pill">
      ${barcode}
      <button type="button" class="barcode-remove" data-index="${index}" aria-label="${barcode} barkodunu sil">×</button>
    </span>
  `).join('');
};

const calculateEan13CheckDigit = (baseDigits) => {
  const digits = String(baseDigits || '').replace(/\D+/g, '').slice(0, 12);
  if (digits.length !== 12) return '';

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = Number(digits[index]);
    sum += digit * (index % 2 === 0 ? 1 : 3);
  }

  const remainder = sum % 10;
  return String((10 - remainder) % 10);
};

const isManualBarcodeValueAllowed = (value) => /^\d+$/.test(String(value || '').trim()) && String(value || '').trim().length >= 4;

const generateProductEan13Barcode = (usedBarcodes = currentProductBarcodes, unitValue = '') => {
  const usedSet = new Set((Array.isArray(usedBarcodes) ? usedBarcodes : []).map((barcode) => String(barcode || '').trim()).filter(Boolean));
  const prefix = String(unitValue || document.querySelector('#product-unit')?.value || '').trim().toLowerCase() === 'kq' ? '22' : '20';
  let candidate = '';

  do {
    const randomBody = String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
    const baseDigits = `${prefix}${randomBody}`;
    const checkDigit = calculateEan13CheckDigit(baseDigits);
    candidate = checkDigit ? `${baseDigits}${checkDigit}` : '';
  } while (!candidate || usedSet.has(candidate));

  return candidate;
};

const addProductBarcode = () => {
  const barcodeInput = document.querySelector('#product-barcode-input');
  if (!barcodeInput) return;

  const rawValue = sanitizeNumericBarcodeValue(barcodeInput.value);

  if (rawValue && !isManualBarcodeValueAllowed(rawValue)) {
    showToast('Barkod yalnız rəqəmdən ibarət olmalı və minimum 4 simvol olmalıdır.');
    barcodeInput.focus();
    return;
  }

  const unitValue = document.querySelector('#product-unit')?.value || '';
  const nextBarcode = rawValue || generateProductEan13Barcode(currentProductBarcodes, unitValue);

  if (!nextBarcode) {
    barcodeInput.focus();
    return;
  }

  if (!currentProductBarcodes.includes(nextBarcode)) {
    currentProductBarcodes.push(nextBarcode);
  }

  barcodeInput.value = '';
  renderProductBarcodeList(currentProductBarcodes);
};

const normalizeProductCode = (value) => {
  const text = String(value ?? '').trim();
  if (!text || text === 'NaN' || text === 'undefined' || text === 'null') return '';
  return text;
};
const getProductCode = (product) => normalizeProductCode(product?.mehsul_kodu || product?.code || product?.product_code || '');
let __productsCache = null;
let __productsLoadPromise = null;
const getProducts = () => {
  if (__productsCache) return __productsCache;
  try {
    return JSON.parse(localStorage.getItem(PRODUCT_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};
const saveProducts = (items) => {
  __productsCache = Array.isArray(items) ? items : [];
  try {
    localStorage.removeItem(PRODUCT_STORAGE_KEY);
  } catch {
    // yaddaş limiti problemi aradan qalxır — artıq localStorage istifadə olunmur
  }
};

const ensureProductsLoaded = () => {
  if (__productsCache) return Promise.resolve(__productsCache);
  if (__productsLoadPromise) return __productsLoadPromise;
  __productsLoadPromise = (async () => {
    try {
      const response = await fetch('http://94.20.88.181:5050/api/products', { cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result?.status === 'success' && Array.isArray(result.products)) {
        __productsCache = result.products.map((p) => ({
          id: p.id ?? `srv-${p.mehsul_kodu || p.product_code}`,
          name: p.mehsul_adi || '-',
          code: String(p.mehsul_kodu || p.product_code || p.code || '').trim(),
          brand: p.brend || p.brand || '-',
          company: p.satici_firma_id != null ? String(p.satici_firma_id) : (p.company || ''),
          category: p.kateqoriya || p.category || '-',
          warehouse: p.anbar_id != null ? String(p.anbar_id) : (p.warehouse || '-'),
          stock: Number(p.stok_sayi ?? p.stock ?? 0),
          cost: Number(p.alis_qiymeti ?? p.cost ?? 0),
          price: Number(p.satis_qiymeti ?? p.price ?? 0),
          tax: Number(p.edv_faizi ?? p.tax ?? 0),
          status: p.status || 'aktiv',
          productType: p.mehsul_tipi || p.productType || 'Mamul',
          unit: p.olcu_vahidi || p.unit || '',
          plu_kodu: p.plu_kodu || '',
          lf_code: p.lf_code || '',
          barcodes: Array.isArray(p.barcodes) ? p.barcodes : [],
          barcode: p.barcode || '',
        }));
      } else {
        __productsCache = [];
      }
    } catch (error) {
      console.warn('Məhsullar serverdən yüklənmədi.', error);
      __productsCache = [];
    } finally {
      __productsLoadPromise = null;
    }
    return __productsCache;
  })();
  return __productsLoadPromise;
};

window.erpGetProducts = getProducts;
window.erpEnsureProductsLoaded = ensureProductsLoaded;
window.erpSaveProducts = saveProducts;

const seedProducts = () => {
  const current = getProducts();
  return current;
};

const getProductWarehouseOptions = () => {
  const warehouses = JSON.parse(localStorage.getItem('marketErpWarehouses') || '[]');
  const fallback = ['Əsas Anbar', 'Mərkəzi Anbar', 'Çatdırılma anbarı'];
  return warehouses.length ? warehouses.map((item) => item.name) : fallback;
};

const getSupplierOptions = () => {
  try {
    const rawSuppliers = JSON.parse(localStorage.getItem('marketErpCompanies') || localStorage.getItem('erpSuppliers') || '[]');
    if (!Array.isArray(rawSuppliers)) return [];
    return rawSuppliers
      .map((supplier) => ({
        id: supplier.id ?? supplier.ID ?? '',
        name: supplier.name || supplier.firma_adi || supplier.company || 'Firma',
      }))
      .filter((supplier) => supplier.id || supplier.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'az'));
  } catch (error) {
    return [];
  }
};

const syncProductSupplierSelect = (selectedSupplierId = '', selectedSupplierName = '') => {
  const supplierSelect = document.querySelector('#product-company');
  if (!supplierSelect) return;

  const suppliers = getSupplierOptions();
  supplierSelect.innerHTML = ['<option value="">Heç biri</option>']
    .concat(
      suppliers.map((supplier) => `<option value="${String(supplier.id)}">${supplier.name}</option>`)
    )
    .join('');

  const resolvedValue = String(selectedSupplierId || '').trim();
  const fallbackMatch = suppliers.find((supplier) => String(supplier.id) === resolvedValue)
    || suppliers.find((supplier) => String(supplier.name || '').trim().toLowerCase() === String(selectedSupplierName || '').trim().toLowerCase());

  supplierSelect.value = fallbackMatch ? String(fallbackMatch.id) : '';
};

const populateProductCompanyFilterOptions = () => {
  if (!productCompanyFilter) return;

  const companyNames = Array.from(new Set(
    getProducts()
      .map((product) => String(product.company || product.firma_adi || '').trim())
      .filter(Boolean)
  ));

  const supplierNames = getSupplierOptions().map((supplier) => supplier.name);
  const options = Array.from(new Set([...supplierNames, ...companyNames].filter(Boolean))).sort((a, b) => a.localeCompare(b, 'az'));
  const currentValue = productCompanyFilter.value || '';

  productCompanyFilter.innerHTML = ['<option value="all">Bütün firmalar</option>']
    .concat(options.map((name) => `<option value="${name}">${name}</option>`))
    .join('');

  productCompanyFilter.value = currentValue === 'all' || options.includes(currentValue) ? currentValue : 'all';
  if (!productCompanyFilter.dataset.initialized) {
    productCompanyFilter.dataset.initialized = 'true';
    productCompanyFilter.value = 'all';
  }
};

const refreshProductSupplierOptions = async () => {
  try {
    const response = await fetch('http://94.20.88.181:5050/api/suppliers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data?.status !== 'success' || !Array.isArray(data.suppliers)) return;

    const normalized = data.suppliers.map((supplier) => ({
      id: supplier.id ?? `supplier-${Date.now()}`,
      name: supplier.firma_adi || supplier.name || 'Firma',
      code: supplier.firma_kodu || supplier.code || '',
      status: supplier.status === 'passiv' ? 'inactive' : 'active',
      address: supplier.unvan || supplier.address || '',
      email: supplier.email || '',
      phone: supplier.telefon || supplier.phone || '',
      creditLimit: Number(supplier.borc_limiti ?? 0),
      debt: Number(supplier.aktiv_borc ?? 0),
      debtStatus: supplier.borc_status || 'normal',
    }));

    localStorage.setItem('marketErpCompanies', JSON.stringify(normalized));
    syncProductSupplierSelect();
    populateProductCompanyFilterOptions();
  } catch (error) {
    // no-op: leave existing list intact when the server is unavailable
  }
};

const getNextProductCode = async () => {
  // Yeni TM kodu yalnız save zamanı serverdə yaradılır.
  // Bu səbəbdən form açıldıqda kodu boş saxlamaq daha təhlükəsizdir.
  return '';
};

const getNextSequentialBarcode = () => {
  const products = getProducts();
  const usedNumbers = new Set(
    products
      .flatMap((product) => {
        const barcodes = Array.isArray(product.barcodes) ? product.barcodes : [product.barcode || ''];
        return barcodes
          .map((barcode) => String(barcode || '').trim())
          .filter((barcode) => /^\d+$/.test(barcode));
      })
      .map((barcode) => Number(barcode))
      .filter((value) => Number.isInteger(value) && value > 0)
  );

  let nextValue = 1;
  while (usedNumbers.has(nextValue)) {
    nextValue += 1;
  }

  return String(nextValue);
};

const getNextLfCode = () => {
  const products = getProducts();
  const usedCodes = new Set(
    products
      .map((product) => String(product.lf_code || product.lfCode || '').trim())
      .filter((code) => /^\d{4}$/.test(code))
  );

  let nextValue = 1;
  while (usedCodes.has(String(nextValue).padStart(4, '0'))) {
    nextValue += 1;
  }

  return String(nextValue).padStart(4, '0');
};

const sanitizeNumericBarcodeValue = (value) => String(value || '').replace(/\D+/g, '');

const syncProductBarcodeField = () => {
  const unitInput = document.querySelector('#product-unit');
  const barcodeInput = document.querySelector('#product-barcode-input');
  const addBarcodeButton = document.querySelector('#add-product-barcode');
  if (!unitInput) return;

  if (barcodeInput) {
    barcodeInput.value = sanitizeNumericBarcodeValue(barcodeInput.value);
  }
  if (addBarcodeButton) addBarcodeButton.disabled = false;

  renderProductBarcodeList(currentProductBarcodes);
};

const syncProductLfField = (isExistingLfProduct = false) => {
  const unitInput = document.querySelector('#product-unit');
  const lfField = document.querySelector('#product-lf-code-field');
  const pluField = document.querySelector('#product-plu-code-field');
  const lfInput = document.querySelector('#product-lf-code');
  const pluInput = document.querySelector('#product-plu-code');
  if (!unitInput || !lfField || !lfInput) return;

  const isKq = String(unitInput.value || '').trim().toLowerCase() === 'kq';
  lfField.hidden = !isKq;
  if (pluField) pluField.hidden = !isKq;

  if (!isKq) {
    lfInput.value = '';
    lfInput.disabled = true;
    lfInput.readOnly = true;
    lfInput.required = false;
    if (pluInput) {
      pluInput.value = '';
      pluInput.disabled = true;
      pluInput.readOnly = true;
    }
    return;
  }

  const currentLfCode = String(lfInput.value || '').trim();
  lfInput.value = currentLfCode;
  lfInput.required = true;
  lfInput.disabled = false;
  lfInput.readOnly = true;

  if (pluInput) {
    pluInput.value = String(pluInput.value || '').trim();
    pluInput.disabled = false;
    pluInput.readOnly = true;
  }
};

const populateProductWarehouseOptions = () => {
  if (!productWarehouseSelect) return;
  const options = getProductWarehouseOptions();
  const currentValue = productWarehouseSelect.value || options[0] || 'Əsas Anbar';
  productWarehouseSelect.innerHTML = options.map((warehouse) => `<option value="${warehouse}">${warehouse}</option>`).join('');
  if (options.includes(currentValue)) productWarehouseSelect.value = currentValue;
};

const getProductTaxMode = (product) => {
  if (!product) return 'taxable';
  if (product.taxMode === 'exempt') return 'exempt';
  if (product.taxMode === 'taxable') return 'taxable';
  return Number(product.tax || 0) === 0 ? 'exempt' : 'taxable';
};

const syncProductTaxField = () => {
  const taxMode = document.querySelector('#product-tax-mode');
  const taxValue = document.querySelector('#product-tax');
  if (!taxMode || !taxValue) return;

  const isExempt = taxMode.value === 'exempt';
  taxValue.readOnly = true;
  taxValue.disabled = false;
  taxValue.value = isExempt ? '0' : '18';
};

const openProductModal = async (product = null) => {
  if (!productModal || !productForm) return;
  productModal.hidden = false;
  productForm.reset();
  currentProductBarcodes = [];

  const titleEl = document.querySelector('#product-title');
  const idInput = document.querySelector('#product-id');
  const codeInput = document.querySelector('#product-code');
  const typeInput = document.querySelector('#product-type');
  const categoryInput = document.querySelector('#product-category');
  const taxModeInput = document.querySelector('#product-tax-mode');
  const taxInput = document.querySelector('#product-tax');
  const statusInput = document.querySelector('#product-status');
  const bonusEnabledInput = document.querySelector('#product-bonus-enabled');
  const bonusGroupInput = document.querySelector('#product-bonus-group');
  const warehouseInput = document.querySelector('#product-warehouse');
  const nameInput = document.querySelector('#product-name');
  const brandInput = document.querySelector('#product-brand');
  const companyInput = document.querySelector('#product-company');
  const unitInput = document.querySelector('#product-unit');
  const lfCodeInput = document.querySelector('#product-lf-code');
  const pluCodeInput = document.querySelector('#product-plu-code');
  const notesInput = document.querySelector('#product-notes');
  const hasExistingLfCode = Boolean(product && (product.lf_code || product.lfCode));

  if (!product) {
    if (titleEl) titleEl.textContent = 'Yeni məhsul';
    if (idInput) idInput.value = '';
    if (codeInput) {
      codeInput.value = '';
      codeInput.readOnly = true;
      codeInput.placeholder = 'Save etdikdən sonra avtomatik yaradılacaq';
    }
    if (typeInput) typeInput.value = 'Ticari mal';
    if (categoryInput) categoryInput.value = 'Ərzaq';
    if (taxModeInput) taxModeInput.value = 'taxable';
    if (taxInput) taxInput.value = '18';
    if (statusInput) statusInput.value = 'active';
    if (bonusEnabledInput) bonusEnabledInput.value = 'true';
    if (bonusGroupInput) bonusGroupInput.value = 'Bütün müştərilər';
    const defaultWarehouse = getProductWarehouseOptions()[0] || 'Əsas Anbar';
    if (warehouseInput) warehouseInput.value = defaultWarehouse;
    if (companyInput) syncProductSupplierSelect('', '');
    if (unitInput) unitInput.value = 'ədəd';
    if (lfCodeInput) lfCodeInput.value = '';
    if (pluCodeInput) pluCodeInput.value = '';
    currentProductBarcodes = [];
    syncProductTaxField();
    syncProductBarcodeField();
    syncProductLfField(false);
    renderProductBarcodeList(currentProductBarcodes);
    return;
  }

  if (titleEl) titleEl.textContent = 'Məhsulu redaktə et';
  if (idInput) idInput.value = product.id || '';
  if (codeInput) {
    codeInput.value = getProductCode(product);
    codeInput.readOnly = true;
  }
  if (nameInput) nameInput.value = product.name || '';
  if (typeInput) typeInput.value = product.productType || 'Mamul';
  if (categoryInput) categoryInput.value = product.category || 'Ərzaq';
  if (brandInput) brandInput.value = product.brand || '';
  if (companyInput) syncProductSupplierSelect(product?.satici_firma_id || '', product?.company || product?.firma_adi || '');
  if (warehouseInput) warehouseInput.value = product.warehouse || (getProductWarehouseOptions()[0] || 'Əsas Anbar');
  if (unitInput) unitInput.value = product.unit || 'ədəd';
  if (lfCodeInput) lfCodeInput.value = product.lf_code || product.lfCode || '';
  if (pluCodeInput) pluCodeInput.value = product.plu_kodu || product.pluCode || '';
  currentProductBarcodes = normalizeBarcodes(product.barcodes || product.barcode || []);
  renderProductBarcodeList(currentProductBarcodes);
  if (taxModeInput) taxModeInput.value = getProductTaxMode(product);
  if (taxInput) taxInput.value = Number(product.tax ?? 0);
  syncProductTaxField();
  syncProductBarcodeField();
  syncProductLfField(hasExistingLfCode);
  if (statusInput) statusInput.value = product.status === 'passiv' || product.status === 'inactive' ? 'inactive' : 'active';
  if (bonusEnabledInput) bonusEnabledInput.value = product.bonusEnabled === true || product.bonus_tetbiq_edilir === 'beli' || product.bonus_tetbiq_edilir === 'true' || product.bonusEnabled === 'true' ? 'true' : 'false';
  if (bonusGroupInput) bonusGroupInput.value = product.bonusGroup || 'Bütün müştərilər';
  if (notesInput) notesInput.value = product.notes || '';
};

const closeProductModal = () => {
  if (productModal) productModal.hidden = true;
  productForm?.reset();
};

const closeProductContextMenu = () => {
  document.querySelectorAll('.product-context-menu').forEach((menu) => menu.remove());
};

const openProductContextMenu = (event, product) => {
  closeProductContextMenu();
  const menu = document.createElement('div');
  menu.className = 'product-context-menu';

  menu.innerHTML = `
    <button type="button" data-product-action="edit" data-product-id="${product.id}">Düzəliş et</button>
    <button type="button" data-product-action="delete" data-product-id="${product.id}">Sil</button>
  `;
  document.body.appendChild(menu);
  const x = Math.min(event.clientX || 0, window.innerWidth - 240);
  const y = Math.min(event.clientY || 0, window.innerHeight - 170);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  menu.querySelectorAll('[data-product-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.productId;
      const selectedProduct = getProducts().find((item) => String(item.id) === String(id));
      if (!selectedProduct) return;

      const action = button.dataset.productAction;
      if (action === 'edit') {
        openProductModal(selectedProduct);
        closeProductContextMenu();
        return;
      }

      if (action === 'delete') {
        if (!window.confirm(`"${selectedProduct.name}" məhsulunu silmək istədiyinizə əminsiniz?`)) {
          closeProductContextMenu();
          return;
        }
        saveProducts(getProducts().filter((item) => item.id !== id));
        renderProducts();
        showToast('Məhsul silindi.');
        closeProductContextMenu();
        return;
      }
      closeProductContextMenu();
    });
  });

  document.addEventListener('click', closeProductContextMenu, { once: true });
};

const toggleBulkDeleteButton = () => {
  if (!bulkDeleteProductsButton) return;
  const checked = productTableBody ? productTableBody.querySelectorAll('.grid-row-check:checked').length : 0;
  bulkDeleteProductsButton.hidden = checked === 0;
  bulkDeleteProductsButton.textContent = checked ? `Seçilənləri sil (${checked})` : 'Seçilənləri sil';
};

const renderProducts = async () => {
  await ensureProductsLoaded();
  const products = getProducts();
  const search = (productSearch?.value || '').trim().toLowerCase();
  const filter = productStatusButtons.find((button) => button.classList.contains('active'))?.dataset.status || 'all';
  const productType = productTypeFilter?.value || 'all';
  const selectedCompany = String(productCompanyFilter?.value || '').trim();

  const activeSearch = Boolean(search);
  const hasExplicitCompanySelection = selectedCompany && selectedCompany !== 'all';

  if (!activeSearch && !hasExplicitCompanySelection) {
    if (productCount) productCount.textContent = '0 məhsul';
    if (productTableBody) productTableBody.innerHTML = '';
    if (productEmpty) {
      productEmpty.hidden = false;
      productEmpty.textContent = 'Məhsul siyahısı boşdur. Axtarış və ya firma seçimi etdikdən sonra görünəcək.';
    }
    return;
  }

  const filtered = products.filter((product) => {
    const barcodeText = normalizeBarcodes(product.barcodes || product.barcode || []).join(' ');
    const productCode = getProductCode(product);
    const productCompanyName = String(product.company || product.firma_adi || '').trim();
    const productSupplierId = String(product.satici_firma_id ?? '').trim();
    const matchesCompany = !selectedCompany || selectedCompany === 'all'
      || productCompanyName.toLowerCase() === selectedCompany.toLowerCase()
      || productSupplierId === String(selectedCompany).trim();

    if (!matchesCompany) return false;

    const searchable = [product.name, productCode, product.brand, productCompanyName, product.category, product.warehouse, product.productType || 'Mamul', barcodeText].join(' ').toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesFilter = filter === 'all' || product.status === filter;
    const matchesType = productType === 'all' || (product.productType || 'Mamul') === productType;
    return matchesSearch && matchesFilter && matchesType;
  });

  if (productCount) productCount.textContent = `${filtered.length} məhsul`;

  if (!filtered.length) {
    if (productTableBody) productTableBody.innerHTML = '';
    if (productEmpty) productEmpty.hidden = false;
    return;
  }

  if (!productTableBody) return;

  if (productEmpty) productEmpty.hidden = true;
  productTableBody.innerHTML = filtered.map((product) => {
    const productCode = getProductCode(product);
    const barcodeText = normalizeBarcodes(product.barcodes || product.barcode || []).join(', ') || 'Barcode yoxdur';
    const pluCode = product.plu_kodu || product.pluCode || '';
    const normalizedStatus = product.status === 'passiv' || product.status === 'inactive' ? 'passiv' : 'aktiv';
    const statusLabel = normalizedStatus === 'aktiv' ? 'aktiv' : 'passiv';
    const lfCode = product.lf_code || product.lfCode || '';
    return `
    <tr data-product-row="${product.id}">
      <td class="product-select-cell"><input type="checkbox" class="grid-row-check" aria-label="${product.name} seç"></td>
      <td>
        <div class="product-name-cell">
          <span class="product-code">${productCode || 'TM-'}</span>
          <div>
            <strong>${product.name}</strong>
            <small>${barcodeText}${pluCode ? ` · PLU: ${pluCode}` : ''}</small>
          </div>
        </div>
      </td>
      <td><span class="type-pill">${product.productType || 'Mamul'}</span></td>
      <td>${productCode || 'TM-'}</td>
      <td>${product.category || '-'}</td>
      <td>${product.brand || product.company || '-'}</td>
      <td>${product.warehouse || '-'}</td>
      <td>${Number(product.stock || 0)}</td>
      <td><strong>${Number(product.cost || 0).toFixed(2)} ₼</strong></td>
      <td>
        <div class="price-stack">
          <strong>${Number(product.price || 0).toFixed(2)} ₼</strong>
          <small>Alış ${Number(product.cost || 0).toFixed(2)} ₼</small>
        </div>
      </td>
      <td>${Number(product.tax || 0)}%</td>
      <td>${(product.unit || '').toLowerCase() === 'kq' ? (lfCode || '-') : '-'}</td>
      <td><span class="bonus-pill active">Qaydalardan</span></td>
      <td><span class="status-pill ${normalizedStatus === 'aktiv' ? 'active' : 'inactive'}">${statusLabel}</span></td>
    </tr>
  `;
  }).join('');

  productTableBody.querySelectorAll('[data-product-row]').forEach((row) => {
    row.addEventListener('click', () => {
      const matchingProduct = getProducts().find((item) => String(item.id) === String(row.dataset.productRow));
      if (!matchingProduct) return;
      openProductModal(matchingProduct);
    });

    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const matchingProduct = getProducts().find((item) => String(item.id) === String(row.dataset.productRow));
      if (!matchingProduct) return;
      openProductContextMenu(event, matchingProduct);
    });
  });

  productTableBody.querySelectorAll('.grid-row-check').forEach((checkbox) => {
    checkbox.addEventListener('change', toggleBulkDeleteButton);
    checkbox.addEventListener('click', (event) => event.stopPropagation());
  });

  const selectAllCheckbox = document.querySelector('.grid-select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = productTableBody.querySelectorAll('.grid-row-check').length > 0 && productTableBody.querySelectorAll('.grid-row-check:checked').length === productTableBody.querySelectorAll('.grid-row-check').length;
    selectAllCheckbox.onchange = () => {
      productTableBody.querySelectorAll('.grid-row-check').forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
      });
      toggleBulkDeleteButton();
    };
  }

  toggleBulkDeleteButton();
};

if (productForm) {
  const addBarcodeButton = document.querySelector('#add-product-barcode');
  if (addBarcodeButton) {
    addBarcodeButton.addEventListener('click', addProductBarcode);
  }

  document.querySelector('#product-barcode-input')?.addEventListener('input', (event) => {
    const sanitized = sanitizeNumericBarcodeValue(event.target.value);
    event.target.value = sanitized;
  });

  document.querySelector('#product-barcode-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const sanitized = sanitizeNumericBarcodeValue(event.target.value);
      if (!sanitized) {
        event.target.value = '';
        addProductBarcode();
        return;
      }

      if (!isManualBarcodeValueAllowed(sanitized)) {
        event.target.value = sanitized;
        showToast('Barkod yalnız rəqəmdən ibarət olmalı və minimum 4 simvol olmalıdır.');
        event.target.focus();
        return;
      }

      event.target.value = sanitized;
      addProductBarcode();
    }
  });

  document.querySelector('#product-barcode-list')?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.barcode-remove');
    if (!removeButton) return;
    const index = Number(removeButton.dataset.index);
    if (Number.isNaN(index)) return;
    currentProductBarcodes.splice(index, 1);
    renderProductBarcodeList(currentProductBarcodes);
  });

  document.querySelector('#product-tax-mode')?.addEventListener('change', syncProductTaxField);
  document.querySelector('#product-unit')?.addEventListener('change', () => {
    syncProductBarcodeField();
    syncProductLfField();
  });

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const idInput = document.querySelector('#product-id');
    const codeInput = document.querySelector('#product-code');
    const nameInput = document.querySelector('#product-name');
    const categoryInput = document.querySelector('#product-category');
    const brandInput = document.querySelector('#product-brand');
    const companyInput = document.querySelector('#product-company');
    const warehouseInput = document.querySelector('#product-warehouse');
    const unitInput = document.querySelector('#product-unit');
    const lfCodeInput = document.querySelector('#product-lf-code');
    const pluCodeInput = document.querySelector('#product-plu-code');
    const taxModeInput = document.querySelector('#product-tax-mode');
    const taxInput = document.querySelector('#product-tax');
    const typeInput = document.querySelector('#product-type');
    const statusInput = document.querySelector('#product-status');
    const bonusEnabledInput = document.querySelector('#product-bonus-enabled');
    const bonusGroupInput = document.querySelector('#product-bonus-group');
    const notesInput = document.querySelector('#product-notes');

    if (!idInput || !codeInput || !nameInput || !categoryInput || !brandInput || !companyInput || !warehouseInput || !unitInput || !lfCodeInput || !taxModeInput || !taxInput || !typeInput || !statusInput || !bonusEnabledInput || !bonusGroupInput) return;

    const id = idInput.value;
    const unitValue = String(unitInput.value || '').trim().toLowerCase();
    const lfCodeValue = String(lfCodeInput.value || '').trim();
    const pluCodeValue = String(pluCodeInput ? pluCodeInput.value : '').trim();
    const rawBarcodes = normalizeBarcodes(currentProductBarcodes);
    const taxMode = taxModeInput.value;
    const products = getProducts();
    const existing = products.find((item) => String(item.id) === String(id || '')) || null;
    const isExistingProduct = Boolean(id && !String(id).startsWith('prod-')) || Boolean(existing && !String(existing.id || '').startsWith('prod-'));
    const submittedCode = normalizeProductCode(codeInput.value || '');
    const normalizedStatus = statusInput.value === 'inactive' ? 'passiv' : statusInput.value === 'passiv' ? 'passiv' : 'aktiv';
    const normalizedBonusEnabled = bonusEnabledInput.value === 'true' || bonusEnabledInput.value === 'beli' || bonusEnabledInput.value === 'yes';
    const finalBarcodes = rawBarcodes;
    const selectedSupplierValue = String(companyInput.value || '').trim();
    const selectedSupplierName = selectedSupplierValue
      ? (getSupplierOptions().find((supplier) => String(supplier.id) === selectedSupplierValue)?.name || '')
      : '';
    const next = {
      ...(existing || {}),
      id: id || existing?.id || `prod-${Date.now()}`,
      code: isExistingProduct ? (getProductCode(existing || {}) || submittedCode) : submittedCode,
      name: nameInput.value.trim(),
      category: categoryInput.value,
      brand: brandInput.value.trim(),
      company: selectedSupplierName,
      satici_firma_id: selectedSupplierValue ? Number(selectedSupplierValue) : null,
      warehouse: warehouseInput.value,
      unit: unitInput.value,
      lf_code: unitValue === 'kq' ? lfCodeValue : '',
      plu_kodu: unitValue === 'kq' ? pluCodeValue : '',
      barcode: finalBarcodes[0] || existing?.barcode || '',
      barcodes: finalBarcodes.length ? finalBarcodes : existing?.barcodes || [],
      cost: Number(existing?.cost ?? 0),
      price: Number(existing?.price ?? 0),
      taxMode,
      tax: taxMode === 'exempt' ? 0 : Number(taxInput.value || 0),
      stock: Number(existing?.stock ?? 0),
      minStock: Number(existing?.minStock ?? 0),
      productType: typeInput.value || 'Ticari mal',
      status: normalizedStatus,
      bonusEnabled: normalizedBonusEnabled,
      bonusGroup: bonusGroupInput.value || 'Bütün müştərilər',
      notes: notesInput.value.trim(),
    };

    const afterCreate = window.__erpAfterCreate;

    if (!next.name) {
      showToast('Məhsul adı daxil edilməlidir.');
      return;
    }

    if (!next.barcodes || !next.barcodes.length) {
      showToast('Məhsul üçün barkod daxil edilməlidir.');
      return;
    }

    const payload = {
      ...(isExistingProduct ? { id: next.id } : {}),
      mehsul_kodu: isExistingProduct ? (getProductCode(next) || '') : submittedCode,
      mehsul_adi: next.name,
      mehsul_tipi: next.productType === 'Mamul' ? 'mamul' : next.productType === 'Digər' ? 'diger' : 'ticari_mal',
      kateqoriya: next.category,
      satici_firma_id: next.satici_firma_id ?? null,
      anbar_id: null,
      olcu_vahidi: next.unit,
      lf_code: unitValue === 'kq' ? lfCodeValue : '',
      plu_kodu: unitValue === 'kq' ? pluCodeValue : '',
      alis_qiymeti: Number(next.cost || 0),
      satis_qiymeti: Number(next.price || 0),
      stok_sayi: Number(next.stock || 0),
      edv_status: next.taxMode === 'exempt' ? 'azad' : 'daxilidir',
      edv_faizi: Number(next.tax || 0),
      minimum_stok: Number(next.minStock || 0),
      bonus_tetbiq_edilir: next.bonusEnabled ? 'beli' : 'xeyir',
      bonus_qrupu: next.bonusGroup || 'Bütün müştərilər',
      status: next.status || 'aktiv',
      barcodes: next.barcodes || []
    };

    try {
      const url = isExistingProduct ? `http://94.20.88.181:5050/api/products/${encodeURIComponent(next.id)}` : 'http://94.20.88.181:5050/api/products';
      const response = await fetch(url, {
        method: isExistingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok || result?.status !== 'success') {
        throw new Error(result?.message || 'Məhsul yadda saxlanılmadı.');
      }

      const savedProduct = result?.product || {};
      const savedCode = normalizeProductCode(savedProduct.mehsul_kodu || savedProduct.code || next.code || '');
      const savedLfCode = normalizeProductCode(savedProduct.lf_code || savedProduct.lfCode || next.lf_code || next.lfCode || '');
      const savedPluCode = normalizeProductCode(savedProduct.plu_kodu || savedProduct.pluCode || next.plu_kodu || next.pluCode || '');
      const savedId = result?.product?.id ?? next.id;
      const normalizedBarcodeList = Array.isArray(savedProduct.barcodes) && savedProduct.barcodes.length
        ? savedProduct.barcodes
        : (Array.isArray(next.barcodes) && next.barcodes.length ? next.barcodes : normalizeBarcodes(next.barcode || savedProduct.barcode || []));
      const updatedProduct = {
        ...next,
        id: savedId,
        code: savedCode,
        mehsul_kodu: savedCode,
        lf_code: savedLfCode,
        lfCode: savedLfCode,
        plu_kodu: savedPluCode,
        pluCode: savedPluCode,
        barcode: normalizedBarcodeList[0] || next.barcode || '',
        barcodes: normalizedBarcodeList,
      };
      if (codeInput) {
        codeInput.value = savedCode;
        codeInput.readOnly = true;
      }
      const index = products.findIndex((item) => String(item.id) === String(next.id) || String(item.id) === String(savedId));
      if (index >= 0) products[index] = updatedProduct;
      else products.unshift(updatedProduct);
      saveProducts(products);
      renderProducts();
      closeProductModal();

      if (afterCreate?.type === 'product') {
        triggerAfterCreate(next);
      } else {
        window.__erpAfterCreate = null;
        window.__erpSelectionTarget = null;
      }

      if (window.__erpAfterCreate?.type === 'product' && typeof window.__erpAfterCreate.callback === 'function') {
        window.__erpAfterCreate.callback(next);
        window.__erpAfterCreate = null;
        window.__erpSelectionTarget = null;
      }

      showToast(result.message || 'Məhsul yadda saxlanıldı.');
    } catch (error) {
      showToast(error.message || 'Məhsul yadda saxlanılmadı.');
    }
  });
}

window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;

if (addProductButton) {
  addProductButton.addEventListener('click', async () => {
    await refreshProductSupplierOptions();
    openProductModal();
  });
}

(async () => {
  await refreshProductSupplierOptions();
})();
if (bulkDeleteProductsButton) {
  bulkDeleteProductsButton.addEventListener('click', async () => {
    const checkedIds = Array.from(productTableBody.querySelectorAll('.grid-row-check:checked')).map((checkbox) => checkbox.closest('[data-product-row]')?.dataset.productRow).filter(Boolean);
    if (!checkedIds.length) return;
    if (!window.confirm(`${checkedIds.length} məhsulu silmək istədiyinizə əminsiniz?`)) return;

    try {
      for (const id of checkedIds) {
        const response = await fetch(`http://94.20.88.181:5050/api/products/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok || result?.status !== 'success') {
          throw new Error(result?.message || 'Məhsul silinmədı.');
        }
      }
    } catch (error) {
      showToast(error.message || 'Silinmə xətası.');
      return;
    }

    const updated = getProducts().filter((product) => !checkedIds.includes(product.id));
    saveProducts(updated);
    renderProducts();
    showToast('Seçilən məhsullar silindi.');
  });
}
if (document.querySelector('#close-product-modal')) {
  document.querySelector('#close-product-modal').addEventListener('click', closeProductModal);
}
if (document.querySelector('#cancel-product')) {
  document.querySelector('#cancel-product').addEventListener('click', closeProductModal);
}
productStatusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    productStatusButtons.forEach((item) => item.classList.toggle('active', item === button));
    renderProducts();
  });
});

if (productTypeFilter) {
  productTypeFilter.addEventListener('change', renderProducts);
}
if (productCompanyFilter) {
  productCompanyFilter.addEventListener('change', renderProducts);
}
if (productSearch) {
  productSearch.addEventListener('input', renderProducts);
}

renderShortcuts();
populateWarehouseSelect();
populateProductWarehouseOptions();
populateProductCompanyFilterOptions();
renderWorkplaces();
renderWarehouses();
renderProducts();
if (window.labelPrintModule?.render) window.labelPrintModule.render();

if (addWorkplaceButton) {
  addWorkplaceButton.addEventListener('click', openWorkplaceModal);
}
if (workplaceForm && !workplaceForm.dataset.erpWorkplaceBound) {
  workplaceForm.dataset.erpWorkplaceBound = 'true';
  workplaceForm.addEventListener('submit', addWorkplace);
}
if (document.querySelector('#close-workplace-modal')) {
  document.querySelector('#close-workplace-modal').addEventListener('click', closeWorkplaceModal);
}
if (document.querySelector('#cancel-workplace')) {
  document.querySelector('#cancel-workplace').addEventListener('click', closeWorkplaceModal);
}
if (addWarehouseButton) {
  addWarehouseButton.addEventListener('click', addWarehouse);
}
if (addWarehouseFormButton) {
  addWarehouseFormButton.addEventListener('click', addWarehouse);
}

document.querySelectorAll('.quick-panel a').forEach((link) => {
  link.addEventListener('click', () => {
    activateNavigation(link.getAttribute('href'));
  });
});

menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

