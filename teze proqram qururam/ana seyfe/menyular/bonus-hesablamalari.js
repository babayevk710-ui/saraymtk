(() => {
  const bonusView = document.querySelector('#bonus-view');
  const bonusRuleModal = document.querySelector('#bonus-rule-modal');
  const bonusRuleForm = document.querySelector('#bonus-rule-form');
  const ruleList = document.querySelector('#bonus-rule-list');
  const ruleEmpty = document.querySelector('#bonus-rule-empty');
  const storageKey = 'marketErpBonusCampaign';
  let ruleType = 'amount';
  const branches = ['Market Mərkəz Filialı', 'Nizami Filialı', '28 May Filialı'];
  const days = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'];

  const showMessage = (text) => window.showErpToast?.(text);
  const getCampaign = () => JSON.parse(localStorage.getItem(storageKey) || '{"rules":[]}');
  const saveCampaign = (campaign) => localStorage.setItem(storageKey, JSON.stringify(campaign));
  const value = (id) => document.querySelector(`#${id}`).value;
  const checked = (id) => document.querySelector(`#${id}`).checked;

  document.querySelector('#bonus-branches').innerHTML = branches.map((branch, index) => `<label class="bonus-check"><input type="checkbox" value="${branch}"${index === 0 ? ' checked' : ''}><span>${branch}</span></label>`).join('');
  document.querySelector('#bonus-days').innerHTML = days.map((day, index) => `<label class="bonus-check"><input type="checkbox" value="${day}"${index < 6 ? ' checked' : ''}><span>${day}</span></label>`).join('');

  const renderRules = () => {
    const campaign = getCampaign();
    ruleList.innerHTML = campaign.rules.map((rule, index) => `<article class="bonus-rule-card"><div class="rule-number">${String(index + 1).padStart(2, '0')}</div><div class="rule-main"><div class="rule-card-top"><strong>${rule.name || 'Adsız qayda'}</strong><span>${rule.typeLabel}</span></div><p>${rule.conditionText} → <b>${rule.giftText}</b></p><small>${rule.extraText}</small></div><button class="rule-delete" type="button" data-rule-delete="${index}" aria-label="Qaydanı sil">×</button></article>`).join('');
    ruleEmpty.hidden = campaign.rules.length > 0;
    ruleList.querySelectorAll('[data-rule-delete]').forEach((button) => button.addEventListener('click', () => {
      const updated = getCampaign();
      updated.rules.splice(Number(button.dataset.ruleDelete), 1);
      saveCampaign(updated);
      renderRules();
      showMessage('Bonus qaydası silindi.');
    }));
  };

  const collectCampaign = () => ({
    name: value('bonus-name'), status: value('bonus-status'), startDate: value('bonus-start-date'), endDate: value('bonus-end-date'),
    startTime: value('bonus-start-time'), endTime: value('bonus-end-time'),
    branches: [...document.querySelectorAll('#bonus-branches input:checked')].map((input) => input.value),
    days: [...document.querySelectorAll('#bonus-days input:checked')].map((input) => input.value),
    customer: value('bonus-customer'), minTotal: value('bonus-min-total'), customerLimit: value('bonus-customer-limit'),
    totalLimit: value('bonus-total-limit'), stackable: checked('bonus-stackable'), cardRequired: checked('bonus-card-required'), notes: value('bonus-notes'), rules: getCampaign().rules
  });

  const fillCampaign = () => {
    const campaign = getCampaign();
    if (!campaign.name) return;
    const fieldMap = { name: 'name', status: 'status', 'start-date': 'startDate', 'end-date': 'endDate', 'start-time': 'startTime', 'end-time': 'endTime', customer: 'customer', 'min-total': 'minTotal', 'customer-limit': 'customerLimit', 'total-limit': 'totalLimit', notes: 'notes' };
    Object.entries(fieldMap).forEach(([key, campaignKey]) => {
      const id = `bonus-${key}`;
      if (document.querySelector(`#${id}`)) document.querySelector(`#${id}`).value = campaign[campaignKey] ?? '';
    });
    document.querySelector('#bonus-stackable').checked = Boolean(campaign.stackable);
    document.querySelector('#bonus-card-required').checked = Boolean(campaign.cardRequired);
    document.querySelectorAll('#bonus-branches input').forEach((input) => { input.checked = campaign.branches?.includes(input.value); });
    document.querySelectorAll('#bonus-days input').forEach((input) => { input.checked = campaign.days?.includes(input.value); });
  };

  document.querySelector('#save-bonus-campaign').addEventListener('click', () => {
    const form = document.querySelector('#bonus-settings');
    if (!form.reportValidity()) return;
    if (value('bonus-end-date') < value('bonus-start-date')) {
      showMessage('Bitiş tarixi başlanğıc tarixindən əvvəl ola bilməz.');
      return;
    }
    if (value('bonus-end-time') <= value('bonus-start-time')) {
      showMessage('Bitiş saatı başlanğıc saatından sonra olmalıdır.');
      return;
    }
    if (!document.querySelector('#bonus-branches input:checked')) {
      showMessage('Ən azı bir filial seçilməlidir.');
      return;
    }
    if (!document.querySelector('#bonus-days input:checked')) {
      showMessage('Ən azı bir həftə günü seçilməlidir.');
      return;
    }
    saveCampaign(collectCampaign());
    renderRules();
    showMessage('Bonus kampaniyası yadda saxlanıldı.');
  });

  document.querySelectorAll('.rule-type').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.rule-type').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    ruleType = button.dataset.ruleType;
  }));

  document.querySelector('#add-bonus-rule').addEventListener('click', () => { bonusRuleForm.reset(); bonusRuleModal.hidden = false; document.querySelector('#rule-name').focus(); });
  document.querySelector('#close-bonus-rule').addEventListener('click', () => { bonusRuleModal.hidden = true; });
  document.querySelector('#cancel-bonus-rule').addEventListener('click', () => { bonusRuleModal.hidden = true; });
  bonusRuleModal.addEventListener('click', (event) => { if (event.target === bonusRuleModal) bonusRuleModal.hidden = true; });

  bonusRuleForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const conditionLabels = { quantity: 'Miqdar', price: 'Qiymət', total: 'Cəmi məbləğ', percentage: 'Faiz' };
    const giftType = value('rule-gift-type');
    const condition = value('rule-condition');
    const rule = {
      name: value('rule-name'), typeLabel: { amount: 'Məbləğə görə', quantity: 'Miqdara görə', product: 'Məhsula görə', category: 'Kateqoriyaya görə' }[ruleType],
      conditionText: `${conditionLabels[condition]}: ${value(`rule-condition-${condition === 'percentage' ? 'total' : condition}`) || '0'}${condition === 'percentage' ? '%' : ''}`,
      giftText: `${giftType} · miqdar: ${value('rule-gift-quantity') || '0'} · ${value('rule-gift-value') || '0'} AZN`,
      extraText: [value('rule-gift-product') ? `Hədiyyə: ${value('rule-gift-product')}` : '', checked('rule-first-purchase') ? 'İlk alış' : '', checked('rule-online-only') ? 'Onlayn satış' : '', checked('rule-cashier-approval') ? 'Kassir təsdiqi' : '', `Prioritet: ${value('rule-priority') || '1'}`].filter(Boolean).join(' · ')
    };
    const campaign = getCampaign();
    campaign.rules = [...(campaign.rules || []), rule];
    saveCampaign(campaign);
    bonusRuleModal.hidden = true;
    renderRules();
    showMessage('Bonus qaydası əlavə edildi.');
  });

  window.bonusModulu = { goster: () => { fillCampaign(); renderRules(); } };
})();
