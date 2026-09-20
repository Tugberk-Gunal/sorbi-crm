/* Risk kayıtlarının tarih ve eski veri uyumluluğu. */
function normalizeRiskRecord(record) {
  const source = record && typeof record === 'object' ? record : {};
  return {
    ...source,
    status: source.status === 'Olumsuz' ? 'Geçersiz' : source.status,
    offerNumber: source.offerNumber ?? source.policyNumber ?? '',
    submittedAt: source.submittedAt || '',
    discountSubmittedAt: source.discountSubmittedAt || '',
    notes: Array.isArray(source.notes) ? source.notes : []
  };
}

function parseRiskDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 &&
    date.getDate() === day ? date : null;
}

function riskDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

function dateOnlyLabel(value) {
  const date = parseRiskDate(value);
  return date ? new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date) : '—';
}

function submissionSummary(record, today = riskDateKey(new Date())) {
  if (record.status === 'Taslak') return 'Henüz gönderilmedi';
  const discountStage = record.status === 'İndirim onayı bekleniyor' ||
    (record.status !== 'Risk değerlendirmede' && Boolean(parseRiskDate(record.discountSubmittedAt)));
  const date = discountStage ? record.discountSubmittedAt : record.submittedAt;
  if (!parseRiskDate(date)) {
    return 'Gönderim tarihi belirtilmedi';
  }
  const label = discountStage ? 'İndirim onayına gönderildi' : 'Riske gönderildi';
  const yesterday = parseRiskDate(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const when = date === today ? 'Bugün' : date === riskDateKey(yesterday) ? 'Dün' : dateOnlyLabel(date);
  return `${label}: ${when}`;
}
