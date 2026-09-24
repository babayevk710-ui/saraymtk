(() => {
  const employeeModal = document.querySelector('#employee-modal');
  const employeeForm = document.querySelector('#employee-form');
  const employeeList = document.querySelector('#employee-list');
  const employeeEmpty = document.querySelector('#employee-empty');
  const employeeCount = document.querySelector('#employee-count');
  const employeeSearch = document.querySelector('#employee-search');
  const employeeFilter = document.querySelector('#employee-filter');
  const assignmentEmployee = document.querySelector('#assignment-employee');
  const assignmentTitle = document.querySelector('#assignment-title');
  const assignmentMethod = document.querySelector('#assignment-method');
  const assignmentStatus = document.querySelector('#assignment-status');
  const assignmentBranch = document.querySelector('#assignment-branch');
  const assignmentTime = document.querySelector('#assignment-time');
  const assignmentDetails = document.querySelector('#assignment-details');
  const assignmentMenuList = document.querySelector('#assignment-menu-list');
  const assignmentSaveButton = document.querySelector('#save-employee-permission');
  const addEmployeeButton = document.querySelector('#add-employee');
  const closeEmployeeButton = document.querySelector('#close-employee-modal');
  const cancelEmployeeButton = document.querySelector('#cancel-employee');
  const permissionList = document.querySelector('#permission-list');

  const storageKey = 'marketErpEmployees';
  const assignmentStorageKey = 'marketErpAssignments';
  const apiUrl = 'http://94.20.88.181:5050';
  const validMenuKeys = new Set([
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
  const normalizeMenuKey = (value = '') => String(value || '').replace(/^#/, '').replace(/^\//, '').trim().toLowerCase();
  const permissions = [...document.querySelectorAll('.nav-item')]
    .map((item) => [
      normalizeMenuKey(item.getAttribute('href') || ''),
      item.dataset.title || item.textContent.trim()
    ])
    .filter(([key]) => key && validMenuKeys.has(key));

  const activeBranch = (() => {
    try {
      return JSON.parse(localStorage.getItem('lastLogin') || 'null')?.workplace || 'Esas Anbar';
    } catch (error) {
      return 'Esas Anbar';
    }
  })();

  let employeeCache = [];

  const showMessage = (text) => {
    if (window.showErpToast) {
      window.showErpToast(text);
      return;
    }
    alert(text);
  };

  const field = (id) => document.querySelector(`#employee-${id}`);

  const getWorkplaces = () => {
    try {
      return JSON.parse(localStorage.getItem('marketErpWorkplaces') || '[]');
    } catch (error) {
      return [];
    }
  };

  const getEmployees = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      employeeCache = Array.isArray(saved) ? saved : [];
    } catch (error) {
      employeeCache = [];
    }
    return employeeCache;
  };

  const saveEmployees = (employees) => {
    localStorage.setItem(storageKey, JSON.stringify(employees));
  };

  const normalizeDbEmployee = (employee = {}) => {
    const fullName = employee.iscinin_adi || employee.full_name || '';
    const [firstName, ...rest] = fullName.split(' ');
    return {
      id: employee.id,
      full_name: fullName,
      first_name: firstName || '',
      last_name: rest.join(' ') || '',
      login_name: employee.login || employee.login_name || '',
      phone: employee.telefon || employee.phone || '',
      password: employee.parola || employee.password || '',
      salary: Number(employee.maas ?? employee.salary ?? 0),
      shift: employee.is_rejimi || employee.shift || 'Tam iş günü',
      hire_date: employee.baslama_tarixi ? String(employee.baslama_tarixi).slice(0, 10) : (employee.hire_date || new Date().toISOString().slice(0, 10)),
      status: employee.status === 'passiv' || employee.status === 'inactive' ? 'inactive' : 'active',
      position_name: employee.position_name || 'İşçi',
      workplace_name: employee.is_yeri_adi || employee.workplace_name || activeBranch,
      workplace_id: employee.is_yeri_id ?? employee.workplace_id ?? null,
      permissions: Array.isArray(employee.permissions) ? employee.permissions : []
    };
  };

  const refreshEmployeesFromServer = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/employees`, { method: 'GET' });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') return;

      const rows = Array.isArray(data.employees) ? data.employees.map((employee) => normalizeDbEmployee(employee)) : [];
      employeeCache = rows;
      saveEmployees(rows);
      render();
      populateAssignmentEmployees();
    } catch (error) {
      console.warn('İşçilər serverdən yüklənmədi:', error);
    }
  };

  const populateWorkplaceOptions = (selectElement, defaultName = activeBranch) => {
    if (!selectElement) return;
    const workplaces = getWorkplaces();
    const options = workplaces.length
      ? workplaces.map((workplace) => `<option value="${workplace.id}" ${String(workplace.name) === String(defaultName) ? 'selected' : ''}>${workplace.name}</option>`).join('')
      : `<option value="">${defaultName}</option>`;

    selectElement.innerHTML = options;
    if (!workplaces.length) {
      selectElement.value = '';
      return;
    }

    const selected = workplaces.find((workplace) => String(workplace.name) === String(defaultName)) || workplaces[0];
    selectElement.value = selected ? String(selected.id) : '';
  };

  const loadWorkplaces = () => {
    if (field('workplace')) {
      const workplaces = getWorkplaces();
      if (workplaces.length) {
        populateWorkplaceOptions(field('workplace'), activeBranch);
      } else {
        field('workplace').value = activeBranch;
      }
    }
    if (assignmentBranch) {
      const workplaces = getWorkplaces();
      if (workplaces.length) populateWorkplaceOptions(assignmentBranch, activeBranch);
    }
  };

  const getSelectedWorkplaceId = () => {
    const workplaceInput = field('workplace');
    if (!workplaceInput) return null;
    const workplaces = getWorkplaces();
    const selectedId = workplaceInput.value;
    if (selectedId && workplaces.some((workplace) => String(workplace.id) === String(selectedId))) {
      return Number(selectedId);
    }
    const chosen = workplaces.find((workplace) => workplace.name === workplaceInput.value || String(workplace.id) === String(workplaceInput.value));
    return chosen ? Number(chosen.id) : null;
  };

  const syncPermissionIndicators = (root = document) => {
    const selector = root === document ? '#permission-list .permission-option' : '#assignment-menu-list .permission-option';
    root.querySelectorAll(selector).forEach((option) => {
      const input = option.querySelector('input');
      const badge = option.querySelector('.permission-badge');
      const isChecked = !!input?.checked;
      option.classList.toggle('is-active', isChecked);
      option.classList.toggle('is-inactive', !isChecked);
      if (badge) {
        badge.textContent = isChecked ? 'İcazə var' : 'Yox';
      }
    });
  };

  const renderAssignmentMenuList = () => {
    if (!assignmentMenuList) return;
    assignmentMenuList.innerHTML = permissions.map(([key, label]) => `
      <label class="permission-option">
        <input type="checkbox" value="${key}" data-label="${label}">
        <span class="permission-content">
          <span class="permission-name">${label}</span>
          <span class="permission-badge">Yox</span>
        </span>
      </label>
    `).join('');
    assignmentMenuList.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => syncPermissionIndicators(assignmentMenuList));
    });
    syncPermissionIndicators(assignmentMenuList);
  };

  const populatePermissionList = () => {
    if (!permissionList) return;
    permissionList.innerHTML = permissions.map(([value, label]) => `
      <label class="permission-option">
        <input type="checkbox" value="${value}">
        <span class="permission-content">
          <span class="permission-name">${label}</span>
          <span class="permission-badge">Yox</span>
        </span>
      </label>
    `).join('');
    permissionList.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => syncPermissionIndicators());
    });
    syncPermissionIndicators();
  };

  const populateAssignmentEmployees = () => {
    if (!assignmentEmployee) return;
    if (!employeeCache.length) {
      assignmentEmployee.innerHTML = '<option value="">İşçi yoxdur</option>';
      return;
    }
    assignmentEmployee.innerHTML = '<option value="">İşçi seçin</option>' + employeeCache.map((employee) => `
      <option value="${employee.id}">${employee.full_name || 'İşçi'} (${employee.login_name || 'login'})</option>
    `).join('');
  };

  const updateCurrentSessionPermissions = (nextPermissions = []) => {
    try {
      const currentLogin = JSON.parse(localStorage.getItem('lastLogin') || 'null') || {};
      const refreshedLogin = {
        ...currentLogin,
        permissions: Array.isArray(nextPermissions) ? nextPermissions : []
      };
      localStorage.setItem('lastLogin', JSON.stringify(refreshedLogin));
      localStorage.setItem('erpEmployeePermissions', JSON.stringify(refreshedLogin.permissions));
      window.dispatchEvent(new CustomEvent('erp-permissions-updated', {
        detail: { permissions: refreshedLogin.permissions }
      }));
    } catch (error) {
      console.warn('Current session permissions could not be refreshed:', error);
    }
  };

  const saveEmployeeAssignment = () => {
    const employeeId = assignmentEmployee?.value;
    const employee = employeeCache.find((item) => String(item.id) === String(employeeId));
    const selectedItems = assignmentMenuList ? [...assignmentMenuList.querySelectorAll('input:checked')] : [];

    if (!employee) {
      showMessage('Öncə işçi seçin.');
      return;
    }
    if (!selectedItems.length) {
      showMessage('Ən azı bir menyu seçin.');
      return;
    }

    const currentLogin = JSON.parse(localStorage.getItem('lastLogin') || 'null') || {};
    const assignment = {
      employeeId: employee.id,
      employeeName: employee.full_name || 'İşçi',
      employeeLogin: employee.login_name || 'login',
      assignedByName: currentLogin.login || 'Admin',
      assignedByLogin: currentLogin.login || 'admin',
      assignmentMethod: assignmentMethod?.value || 'manual',
      assignmentTitle: assignmentTitle?.value.trim() || 'Menyu yetkiləndirməsi',
      status: assignmentStatus?.value || 'active',
      branchName: assignmentBranch?.value || activeBranch,
      assignedSections: selectedItems.map((item) => item.value),
      sectionNames: selectedItems.map((item) => item.dataset.label),
      details: assignmentDetails?.value.trim() || 'İşçiyə menyu icazələri verildi.',
      assignmentTime: assignmentTime?.value || new Date().toISOString().slice(0, 16)
    };

    const assignments = JSON.parse(localStorage.getItem(assignmentStorageKey) || '[]');
    assignments.push(assignment);
    localStorage.setItem(assignmentStorageKey, JSON.stringify(assignments));
    showMessage('İşçi yetkiləndirməsi yadda saxlanıldı.');

    if (assignmentTitle) assignmentTitle.value = '';
    if (assignmentDetails) assignmentDetails.value = '';
    if (assignmentMenuList) {
      assignmentMenuList.querySelectorAll('input').forEach((input) => {
        input.checked = false;
      });
    }
  };

  const render = () => {
    if (!employeeList) return;

    const searchText = (employeeSearch?.value || '').trim().toLocaleLowerCase();
    const filterValue = employeeFilter?.value || 'all';
    const filtered = employeeCache.filter((employee) => {
      const fullName = employee.full_name || '';
      const login = employee.login_name || '';
      const query = `${fullName} ${login}`.toLocaleLowerCase();
      return query.includes(searchText) && (filterValue === 'all' || (employee.status || 'active') === filterValue);
    });

    employeeList.innerHTML = filtered.map((employee) => {
      const fullName = employee.full_name || 'İşçi';
      const initials = fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
      const role = employee.position_name || 'İşçi';
      const status = employee.status || 'active';
      const login = employee.login_name || 'login';
      const permissions = Array.isArray(employee.permissions) ? employee.permissions : [];
      const permissionText = permissions.length ? `${permissions.length} bölmə` : 'Yox';
      const permissionLabel = permissions.length ? permissions.slice(0, 2).join(', ') + (permissions.length > 2 ? '…' : '') : 'Heç biri';
      return `
        <tr>
          <td>
            <div class="employee-person">
              <span>${initials || 'İŞ'}</span>
              <div>
                <strong>${fullName}</strong>
                <small>${login}</small>
              </div>
            </div>
          </td>
          <td>${role}</td>
          <td>${employee.phone || '-'}</td>
          <td>${Number(employee.salary || 0).toLocaleString('az-AZ')} ₼</td>
          <td>${employee.shift || 'Tam iş günü'}</td>
          <td>
            <div class="permission-pill ${permissions.length ? 'has-permission' : 'no-permission'}" title="${permissionLabel}">
              <span>${permissionText}</span>
            </div>
          </td>
          <td><span class="status-badge ${status}">${status === 'active' ? 'Aktiv' : 'Passiv'}</span></td>
          <td>
            <div class="row-actions">
              <button type="button" data-edit="${employee.id}" aria-label="Redaktə et">✎</button>
              <button type="button" data-delete="${employee.id}" aria-label="Sil">⌫</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (employeeEmpty) employeeEmpty.hidden = filtered.length > 0;
    if (employeeCount) employeeCount.textContent = `${filtered.length} işçi`;

    employeeList.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = employeeCache.find((employee) => String(employee.id) === String(button.dataset.edit));
        if (target) openModal(target);
      });
    });

    employeeList.querySelectorAll('[data-delete]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.delete;
        if (!window.confirm('Bu işçini silmək istədiyinizə əminsiniz?')) return;

        try {
          const response = await fetch(`${apiUrl}/api/employees/${id}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok || data.status !== 'success') {
            showMessage(data.message || 'İşçi silinmədi.');
            return;
          }
          await refreshEmployeesFromServer();
          showMessage('İşçi silindi.');
        } catch (error) {
          showMessage('Server ilə əlaqə xətası.');
        }
      });
    });
  };

  const resetForm = () => {
    if (!employeeForm) return;
    employeeForm.reset();
    const idField = field('id');
    if (idField) idField.value = '';
    const startDateField = field('start-date');
    if (startDateField) startDateField.value = new Date().toISOString().slice(0, 10);
    document.querySelectorAll('#permission-list input').forEach((input) => {
      input.checked = false;
    });
    if (field('password')) {
      field('password').value = '';
      field('password').dataset.currentPassword = '';
      field('password').placeholder = 'İşçi parolu';
      field('password').required = true;
    }
    if (field('workplace')) {
      loadWorkplaces();
      const workplaces = getWorkplaces();
      if (workplaces.length) {
        field('workplace').value = String(workplaces[0].id);
      } else {
        field('workplace').value = activeBranch;
      }
    }
  };

  const openModal = (employee = null) => {
    if (!employeeModal) return;
    resetForm();
    const title = document.querySelector('#employee-modal-title');
    if (title) title.textContent = employee ? 'İşçini redaktə et' : 'Yeni işçi';

    if (employee) {
      if (field('id')) field('id').value = employee.id || '';
      if (field('name')) field('name').value = employee.full_name || '';
      if (field('role')) field('role').value = employee.position_name || 'İşçi';
      if (field('workplace')) {
        const workplaces = getWorkplaces();
        const workplaceId = employee.workplace_id ?? workplaces.find((item) => item.name === employee.workplace_name)?.id;
        field('workplace').value = workplaceId ? String(workplaceId) : (employee.workplace_name || activeBranch);
      }
      if (field('phone')) field('phone').value = employee.phone || '+994 50 0000000';
      if (field('login')) field('login').value = employee.login_name || '';
      if (field('password')) {
        field('password').required = false;
        field('password').value = employee.password || '';
        field('password').dataset.currentPassword = employee.password || '';
        field('password').placeholder = employee.password ? 'Köhnə parol avtomatik qeyd olunur' : 'İşçi parolu';
      }
      if (field('salary')) field('salary').value = employee.salary || 0;
      if (field('shift')) field('shift').value = employee.shift || 'Tam iş günü';
      if (field('start-date')) field('start-date').value = employee.hire_date || new Date().toISOString().slice(0, 10);
      if (field('status')) field('status').value = employee.status === 'inactive' ? 'inactive' : 'active';

      document.querySelectorAll('#permission-list input').forEach((input) => {
        input.checked = Array.isArray(employee.permissions) && employee.permissions.includes(input.value);
      });
      syncPermissionIndicators();
    } else {
      if (field('workplace')) {
        const workplaces = getWorkplaces();
        if (workplaces.length) field('workplace').value = String(workplaces[0].id);
        else field('workplace').value = activeBranch;
      }
      if (field('password')) field('password').required = true;
      syncPermissionIndicators();
    }

    employeeModal.hidden = false;
    if (field('name')) field('name').focus();
  };

  const closeModal = () => {
    if (employeeModal) employeeModal.hidden = true;
  };

  if (field('phone')) {
    field('phone').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 12);
    });
  }

  if (field('salary')) {
    field('salary').addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/[^\d.]/g, '');
    });
  }

  if (addEmployeeButton) addEmployeeButton.addEventListener('click', () => openModal());
  if (closeEmployeeButton) closeEmployeeButton.addEventListener('click', closeModal);
  if (cancelEmployeeButton) cancelEmployeeButton.addEventListener('click', closeModal);
  if (employeeModal) employeeModal.addEventListener('click', (event) => { if (event.target === employeeModal) closeModal(); });
  if (employeeSearch) employeeSearch.addEventListener('input', render);
  if (employeeFilter) employeeFilter.addEventListener('change', render);
  if (assignmentSaveButton) assignmentSaveButton.addEventListener('click', saveEmployeeAssignment);
  if (assignmentTime) assignmentTime.value = new Date().toISOString().slice(0, 16);

  if (employeeForm) {
    employeeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const idValue = (field('id')?.value || '').trim();
      const fullName = (field('name')?.value || '').trim();
      const loginValue = (field('login')?.value || '').trim();
      const typedPassword = (field('password')?.value || '').trim();
      const currentPassword = (field('password')?.dataset.currentPassword || '').trim();
      const effectivePassword = typedPassword || currentPassword;
      const workplaceId = getSelectedWorkplaceId();
      const selectedPermissions = [...document.querySelectorAll('#permission-list input:checked')].map((input) => input.value);

      const isEdit = Boolean(idValue);
      if (!fullName || !loginValue || (!effectivePassword && !isEdit)) {
        showMessage('Ad, login və parol tələb olunur.');
        return;
      }

      if (!effectivePassword) {
        showMessage('İşçi parolu mövcud deyil. Yeni parol yazın və ya mövcud parolu saxlayın.');
        return;
      }

      const payload = {
        id: idValue || undefined,
        iscinin_adi: fullName,
        is_yeri_id: workplaceId,
        telefon: (field('phone')?.value || '').trim(),
        login: loginValue,
        parola: effectivePassword,
        maas: Number(field('salary')?.value || 0),
        is_rejimi: field('shift')?.value || 'Tam iş günü',
        baslama_tarixi: field('start-date')?.value || new Date().toISOString().slice(0, 10),
        status: field('status')?.value === 'inactive' ? 'passiv' : 'aktiv',
        permissions: selectedPermissions
      };

      try {
        const url = idValue ? `${apiUrl}/api/employees/${idValue}` : `${apiUrl}/api/employees`;
        const method = idValue ? 'PUT' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok || data.status !== 'success') {
          showMessage(data.message || 'İşçi yadda saxlanılmadı.');
          return;
        }

        const savedEmployeeId = Number(idValue || payload.id || 0);
        const currentLogin = JSON.parse(localStorage.getItem('lastLogin') || 'null') || {};
        const currentEmployeeId = Number(currentLogin.employeeId || 0);
        if (currentEmployeeId && savedEmployeeId && currentEmployeeId === savedEmployeeId) {
          updateCurrentSessionPermissions(selectedPermissions);
        }

        await refreshEmployeesFromServer();
        closeModal();
        showMessage('İşçi yadda saxlanıldı.');
      } catch (error) {
        showMessage('Server ilə əlaqə xətası.');
      }
    });
  }

  renderAssignmentMenuList();
  populatePermissionList();
  loadWorkplaces();
  getEmployees();
  populateAssignmentEmployees();
  render();
  refreshEmployeesFromServer();
})();
