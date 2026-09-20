let riskStorageError = null;
const customerRepository = {
  key: 'risk-takip-v1',
  load() {
    let saved = null;
    try {
      saved = localStorage.getItem(this.key);
      const data = JSON.parse(saved || '[]');
      if (!Array.isArray(data)) throw new Error('Risk verisi dizi değil');
      return data.map(normalizeRiskRecord);
    } catch (error) {
      console.error('Risk kayıtları okunamadı:', error);
      riskStorageError = { backup: saved || '', message: 'Risk kayıtları okunamadı. Üzerine yazılmadı; mevcut veriyi indirin.' };
      return [];
    }
  },
  save(records) {
    if (riskStorageError) return false;
    const backup = JSON.stringify(records);
    try {
      localStorage.setItem(this.key, backup);
      return true;
    } catch (error) {
      console.error('Risk kayıtları kaydedilemedi:', error);
      showRiskStorageFailure('Risk değişiklikleri kaydedilemedi. Sayfayı kapatmadan veriyi indirin.', backup);
      return false;
    }
  }
};

let customers = customerRepository.load();
let crmCustomers = [];
let selectedId = null;
let filter = 'Risk değerlendirmede';
let editingNoteId = null;
let editingCustomerId = null;
let autoFilledRiskDate = false;
let toastTimer = null;
let searchTimer = null;

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function save() { return customerRepository.save(customers); }
function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2)
    .map(part => part[0]).join('').toLocaleUpperCase('tr-TR') || '?';
}
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}
function offerNumberOf(record) { return record.offerNumber ?? record.policyNumber ?? ''; }
function showRiskStorageFailure(message, backup) {
  let banner = $('#riskStorageFailure');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'riskStorageFailure';
    banner.className = 'risk-storage-failure';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = '<span></span><button type="button">Veriyi indir</button>';
    document.body.appendChild(banner);
  }
  banner.querySelector('span').textContent = message;
  const button = banner.querySelector('button');
  button.disabled = !backup;
  button.onclick = () => {
    const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'risk-takip-yedek.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function renderCrmCustomerOptions(selectedId = null) {
  const select = $('#linkedCrmCustomer');
  const selected = selectedId === null ? select.value || '' : selectedId;
  const missing = selected && !crmCustomers.some(customer => customer.id === selected);
  select.innerHTML = '<option value="">Bağımsız risk kaydı</option>' +
    (missing ? `<option value="${esc(selected)}">Bağlı CRM müşterisi yükleniyor veya bulunamadı</option>` : '') +
    crmCustomers.map(customer => `<option value="${esc(customer.id)}">${esc(customer.name)}${customer.tcLast4 ? ` · TC …${esc(customer.tcLast4)}` : ''}</option>`).join('');
  select.value = selected;
  updateLinkedCustomerName();
}
function updateLinkedCustomerName() {
  const linked = crmCustomers.find(customer => customer.id === $('#linkedCrmCustomer').value);
  $('#newCustomerName').readOnly = Boolean(linked);
  if (linked) $('#newCustomerName').value = linked.name;
}
function riskStatusClass(status) {
  return {
    'Risk değerlendirmede': 'risk-status-review',
    'İndirim onayı bekleniyor': 'risk-status-discount',
    'Onaylandı': 'risk-status-approved',
    'Geçersiz': 'risk-status-invalid',
    'Taslak': 'risk-status-draft'
  }[status] || 'risk-status-draft';
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

function confirmAction(title, message, confirmLabel, onConfirm) {
  const dialog = $('#confirmDialog');
  $('#confirmTitle').textContent = title;
  $('#confirmMessage').textContent = message;
  const button = $('#confirmActionButton');
  button.textContent = confirmLabel;
  button.onclick = () => { dialog.close(); onConfirm(); };
  dialog.showModal();
}

document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.onclick = () => document.getElementById(button.dataset.closeDialog).close();
});

function render() {
  const term = $('#searchInput').value.trim().toLocaleLowerCase('tr-TR');
  const matches = customers.filter(record => {
    const matchesFilter = filter === 'all' || record.status === filter;
    const matchesSearch = !term || [record.name, record.company, offerNumberOf(record)]
      .some(value => String(value || '').toLocaleLowerCase('tr-TR').includes(term));
    return matchesFilter && matchesSearch;
  });
  $('#customerList').innerHTML = matches.length ? matches.map(record => {
    const number = offerNumberOf(record);
    return `<article class="customer-card">
      <button class="risk-card-open" data-id="${esc(record.id)}" type="button" aria-label="${esc(record.name)} başvuru detayını aç"></button>
      <div class="risk-card-customer"><span class="avatar">${esc(initials(record.name))}</span><strong>${esc(record.name)}</strong></div>
      <div class="risk-card-field risk-card-company-field"><span class="risk-card-label">Firma</span><strong class="risk-card-company">${esc(record.company || 'Belirtilmedi')}</strong></div>
      <div class="risk-card-field risk-card-status-field"><span class="risk-card-label">Aşama</span><span class="risk-list-status ${riskStatusClass(record.status)}">${esc(record.status || 'Taslak')}</span></div>
      <div class="risk-card-field risk-card-date-field"><span class="risk-card-label">Gönderim</span><span class="risk-card-date">${esc(submissionSummary(record))}</span></div>
      <div class="risk-card-field risk-card-offer-field"><span class="risk-card-label">Teklif No</span><span class="risk-card-offer-value"><strong>${esc(number || '—')}</strong><button class="risk-copy-button" data-copy-id="${esc(record.id)}" type="button" aria-label="${esc(record.name)} teklif numarasını kopyala" title="Teklif numarasını kopyala" ${number ? '' : 'disabled'}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></span></div>
      <span class="risk-card-arrow" aria-hidden="true">›</span>
    </article>`;
  }).join('') : `<p class="no-notes">${term ? 'Aramanızla eşleşen başvuru yok.' : 'Bu aşamada başvuru yok.'}</p>`;
  $('#allCount').textContent = customers.length;
  $('#reviewCount').textContent = customers.filter(item => item.status === 'Risk değerlendirmede').length;
  $('#discountCount').textContent = customers.filter(item => item.status === 'İndirim onayı bekleniyor').length;
  $('#approvedCount').textContent = customers.filter(item => item.status === 'Onaylandı').length;
  document.querySelectorAll('.filter').forEach(button => {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderDetail();
}

function renderDetail() {
  const record = customers.find(item => item.id === selectedId);
  if (!record) return;
  const number = offerNumberOf(record);
  $('#customerName').textContent = record.name;
  $('#customerMeta').textContent = record.company || 'Sigorta şirketi belirtilmedi';
  $('#riskSubmittedAt').textContent = dateOnlyLabel(record.submittedAt);
  $('#discountSubmittedAt').textContent = dateOnlyLabel(record.discountSubmittedAt);
  $('#detailOfferNumber').textContent = number || 'Henüz girilmedi';
  $('#copyOfferNumber').disabled = !number;
  $('#customerOfferDate').hidden = !record.offerDate;
  $('#customerOfferDate').textContent = record.offerDate
    ? `Teklif tarihi: ${dateOnlyLabel(record.offerDate)}` : '';
  const status = $('#statusBadge');
  status.value = record.status;
  status.className = riskStatusClass(record.status);
  $('#notesList').innerHTML = record.notes.length
    ? [...record.notes].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(note => `<article class="note-card"><p>${esc(note.text)}</p><div class="note-footer"><span>${esc(dateLabel(note.updatedAt))}${note.createdAt !== note.updatedAt ? ' · Düzenlendi' : ''}</span><span class="note-actions"><button data-edit="${esc(note.id)}" title="Notu düzenle" aria-label="Notu düzenle">Düzenle</button><button class="delete-note" data-delete="${esc(note.id)}" title="Notu sil" aria-label="Notu sil">Sil</button></span></div></article>`).join('')
    : '<div class="no-notes">Henüz not yok. İlk notunuzu ekleyin.</div>';
}

function updateDateRequirements(autoFill = false) {
  const status = $('#newCustomerStatus').value;
  const riskDate = $('#newCustomerSubmittedAt');
  const discountDate = $('#newDiscountSubmittedAt');
  const original = customers.find(item => item.id === editingCustomerId)?.status;
  riskDate.required = status === 'Risk değerlendirmede' &&
    (!editingCustomerId || original !== status);
  discountDate.required = status === 'İndirim onayı bekleniyor' &&
    (!editingCustomerId || original !== status);
  $('#riskDateRequired').hidden = !riskDate.required;
  $('#riskDateOptional').hidden = riskDate.required;
  $('#discountDateRequired').hidden = !discountDate.required;
  $('#discountDateOptional').hidden = discountDate.required;
  if (autoFill && status !== 'Risk değerlendirmede' && autoFilledRiskDate) {
    riskDate.value = '';
    autoFilledRiskDate = false;
  }
  if (autoFill && riskDate.required && !riskDate.value) {
    riskDate.value = riskDateKey(new Date());
    autoFilledRiskDate = true;
  }
  if (autoFill && discountDate.required && !discountDate.value) discountDate.value = riskDateKey(new Date());
}

function openCustomerForm(record = null) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'sorbi:request-crm-customers' }, '*');
  }
  editingCustomerId = record?.id || null;
  autoFilledRiskDate = !record;
  $('#customerForm').reset();
  $('#newCustomerName').value = record?.name || '';
  renderCrmCustomerOptions(record?.customerId || '');
  $('#newCustomerCompany').value = record?.company || '';
  $('#newCustomerPolicyNumber').value = record ? offerNumberOf(record) : '';
  $('#newCustomerSubmittedAt').value = record?.submittedAt ||
    (!record ? riskDateKey(new Date()) : '');
  $('#newDiscountSubmittedAt').value = record?.discountSubmittedAt || '';
  $('#newCustomerOfferDate').value = record?.offerDate || '';
  $('#newCustomerStatus').value = record?.status || 'Risk değerlendirmede';
  $('#newCustomerSubmittedAt').max = riskDateKey(new Date());
  $('#newDiscountSubmittedAt').max = riskDateKey(new Date());
  updateDateRequirements();
  $('#customerDialogTitle').textContent = record ? 'Başvuru bilgilerini düzenle' : 'Yeni risk kaydı';
  $('#saveCustomerButton').textContent = record ? 'Değişiklikleri kaydet' : 'Risk kaydını oluştur';
  $('#customerDialog').showModal();
  $('#newCustomerName').focus();
}

$('#newCustomerButton').onclick = () => openCustomerForm();
$('#linkedCrmCustomer').onchange = updateLinkedCustomerName;
$('#editCustomerButton').onclick = () => {
  const record = customers.find(item => item.id === selectedId);
  if (record) openCustomerForm(record);
};
$('#newCustomerStatus').onchange = () => updateDateRequirements(true);
$('#newCustomerSubmittedAt').addEventListener('input', () => { autoFilledRiskDate = false; });
$('#customerForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#newCustomerName').value.trim();
  if (!name) return;
  const values = {
    name,
    customerId: $('#linkedCrmCustomer').value || null,
    company: $('#newCustomerCompany').value.trim(),
    offerNumber: $('#newCustomerPolicyNumber').value.trim(),
    submittedAt: !editingCustomerId && $('#newCustomerStatus').value === 'Taslak'
      ? '' : $('#newCustomerSubmittedAt').value,
    discountSubmittedAt: $('#newDiscountSubmittedAt').value,
    offerDate: $('#newCustomerOfferDate').value,
    status: $('#newCustomerStatus').value
  };
  if (editingCustomerId) {
    const record = customers.find(item => item.id === editingCustomerId);
    if (!record) return;
    Object.assign(record, values);
  } else {
    const record = { id: crypto.randomUUID(), ...values, notes: [], createdAt: new Date().toISOString() };
    customers.unshift(record);
    selectedId = record.id;
  }
  const saved = save();
  if (saved) showToast(editingCustomerId ? 'Başvuru güncellendi' : 'Risk kaydı oluşturuldu');
  $('#customerDialog').close();
  render();
  if (!$('#detailDialog').open) $('#detailDialog').showModal();
});

$('#statusBadge').addEventListener('change', () => {
  const record = customers.find(item => item.id === selectedId);
  if (!record) return;
  record.status = $('#statusBadge').value;
  if (record.status === 'Risk değerlendirmede' && !record.submittedAt)
    record.submittedAt = riskDateKey(new Date());
  if (record.status === 'İndirim onayı bekleniyor' && !record.discountSubmittedAt)
    record.discountSubmittedAt = riskDateKey(new Date());
  const saved = save();
  render();
  if (saved) showToast('Aşama güncellendi');
});

$('#customerList').onclick = event => {
  const copyButton = event.target.closest('[data-copy-id]');
  if (copyButton) {
    copyOfferNumber(copyButton.dataset.copyId);
    return;
  }
  const card = event.target.closest('[data-id]');
  if (!card) return;
  selectedId = card.dataset.id;
  renderDetail();
  $('#detailDialog').showModal();
};
$('#detailDialog').addEventListener('click', event => {
  if (event.target === $('#detailDialog')) $('#detailDialog').close();
});
$('#customerDialog').addEventListener('click', event => {
  const dialog = $('#customerDialog');
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
document.querySelectorAll('.filter').forEach(button => {
  button.onclick = () => { filter = button.dataset.filter; render(); };
});
$('#searchInput').addEventListener('input', () => {
  $('#searchClear').hidden = !$('#searchInput').value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 160);
});
$('#searchClear').onclick = () => {
  clearTimeout(searchTimer);
  $('#searchInput').value = '';
  $('#searchClear').hidden = true;
  render();
  $('#searchInput').focus();
};

async function copyOfferNumber(id) {
  const record = customers.find(item => item.id === id);
  const number = record && offerNumberOf(record);
  if (!number) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(number);
  } catch (error) {
    const helper = document.createElement('textarea');
    helper.value = number;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    let copied = false;
    try { copied = document.execCommand?.('copy') === true; }
    catch (copyError) { copied = false; }
    finally { helper.remove(); }
    if (!copied) { showToast('Tarayıcı kopyalamaya izin vermedi'); return; }
  }
  showToast('Teklif numarası kopyalandı');
}
$('#copyOfferNumber').onclick = () => copyOfferNumber(selectedId);

$('#addNoteButton').onclick = () => {
  editingNoteId = null;
  $('#noteDialogLabel').textContent = 'YENİ NOT';
  $('#noteDialogTitle').textContent = 'Not ekle';
  $('#saveNoteButton').textContent = 'Notu kaydet';
  $('#noteForm').reset();
  $('#noteDialog').showModal();
  $('#noteText').focus();
};
$('#notesList').onclick = event => {
  const record = customers.find(item => item.id === selectedId);
  if (!record) return;
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const note = record.notes.find(item => item.id === editId);
    if (!note) return;
    editingNoteId = editId;
    $('#noteDialogLabel').textContent = 'NOT DÜZENLE';
    $('#noteDialogTitle').textContent = 'Notu düzenle';
    $('#saveNoteButton').textContent = 'Değişiklikleri kaydet';
    $('#noteText').value = note.text;
    $('#noteDialog').showModal();
    $('#noteText').focus();
  }
  if (deleteId) {
    confirmAction('Notu sil', 'Bu notu kalıcı olarak silmek istiyor musunuz?', 'Notu sil', () => {
      record.notes = record.notes.filter(item => item.id !== deleteId);
      const saved = save(); render(); if (saved) showToast('Not silindi');
    });
  }
};
$('#noteForm').addEventListener('submit', event => {
  event.preventDefault();
  const text = $('#noteText').value.trim();
  const record = customers.find(item => item.id === selectedId);
  if (!text || !record) return;
  const now = new Date().toISOString();
  if (editingNoteId) {
    const note = record.notes.find(item => item.id === editingNoteId);
    if (!note) return;
    note.text = text;
    note.updatedAt = now;
  } else {
    record.notes.push({ id: crypto.randomUUID(), text, createdAt: now, updatedAt: now });
  }
  const saved = save();
  $('#noteDialog').close();
  render();
  if (saved) showToast(editingNoteId ? 'Not güncellendi' : 'Not eklendi');
});

$('#deleteCustomerButton').onclick = () => {
  const record = customers.find(item => item.id === selectedId);
  if (!record) return;
  confirmAction('Risk kaydını sil', `“${record.name}” kaydı ve tüm notları kalıcı olarak silinecek.`, 'Kaydı sil', () => {
    customers = customers.filter(item => item.id !== selectedId);
    selectedId = null;
    $('#detailDialog').close();
    const saved = save(); render(); if (saved) showToast('Risk kaydı silindi');
  });
};

window.addEventListener('message', event => {
  if (event.source !== window.parent || event.data?.type !== 'sorbi:crm-customers' ||
      !Array.isArray(event.data.customers)) return;
  crmCustomers = event.data.customers.filter(item => item &&
    typeof item.id === 'string' && typeof item.name === 'string');
  let changed = false;
  customers.forEach(record => {
    const linked = crmCustomers.find(item => item.id === record.customerId);
    if (linked && record.name !== linked.name) {
      record.name = linked.name;
      changed = true;
    }
  });
  if (changed) save();
  if ($('#customerDialog').open) renderCrmCustomerOptions($('#linkedCrmCustomer').value);
  render();
});
if (window.parent !== window) {
  window.parent.postMessage({ type: 'sorbi:request-crm-customers' }, '*');
}

if (riskStorageError) {
  showRiskStorageFailure(riskStorageError.message, riskStorageError.backup);
  $('#newCustomerButton').disabled = true;
}
render();
