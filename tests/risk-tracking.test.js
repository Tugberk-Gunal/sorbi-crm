const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '../assets/risk-tracking');
const source = fs.readFileSync(path.join(root, 'risk-logic.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
function logic() {
    const context = {};
    vm.createContext(context);
    vm.runInContext(source, context);
    return context;
}

test('risk kartı geri sayım yerine gönderim gününü belirtir', () => {
    const { submissionSummary } = logic();
    const record = { status: 'Risk değerlendirmede', submittedAt: '2026-09-19' };
    assert.equal(submissionSummary(record, '2026-09-20'), 'Riske gönderildi: Dün');
    assert.equal(submissionSummary(record, '2026-09-19'), 'Riske gönderildi: Bugün');
    assert.match(submissionSummary(record, '2026-09-25'), /^Riske gönderildi: 19 /);
});

test('indirim aşamasında indirim gönderim tarihi gösterilir', () => {
    const { submissionSummary } = logic();
    const record = {
        status: 'İndirim onayı bekleniyor',
        submittedAt: '2026-09-01',
        discountSubmittedAt: '2026-09-19'
    };
    assert.equal(submissionSummary(record, '2026-09-20'), 'İndirim onayına gönderildi: Dün');
});

test('tarih yoksa süre uydurulmaz; taslak henüz gönderilmemiştir', () => {
    const { submissionSummary } = logic();
    assert.equal(submissionSummary({ status: 'Risk değerlendirmede' }, '2026-09-20'),
        'Gönderim tarihi belirtilmedi');
    assert.equal(submissionSummary({ status: 'Taslak' }, '2026-09-20'),
        'Henüz gönderilmedi');
    assert.equal(submissionSummary({ status: 'Taslak', submittedAt: '2026-09-20' }, '2026-09-20'),
        'Henüz gönderilmedi');
});

test('eski risk kayıtları ve teklif numarası korunur', () => {
    const { normalizeRiskRecord } = logic();
    const record = normalizeRiskRecord({
        id: 'old', status: 'Risk değerlendirmede',
        policyNumber: 'TEKLIF-42', offerDate: '2026-09-01'
    });
    assert.equal(record.offerNumber, 'TEKLIF-42');
    assert.equal(record.submittedAt, '');
    assert.equal(record.offerDate, '2026-09-01');
    assert.equal(normalizeRiskRecord({ status: 'Olumsuz' }).status, 'Geçersiz');
});

test('detay penceresi teklif numarası ve kopyalama düğmesini içerir', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /<dialog id="detailDialog"/);
    assert.match(html, /id="detailOfferNumber"/);
    assert.match(html, /id="copyOfferNumber"/);
    assert.match(html, /<option>Geçersiz<\/option>/);
    assert.doesNotMatch(html, /<option>Olumsuz<\/option>/);
    assert.doesNotMatch(html, /id="detailPanel"|id="resizeHandle"|3 iş günü/);
});

test('risk kayıt formu geniş ve etiketli alanlarla düzenlenir', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'crm-integration.css'), 'utf8');
    assert.match(html, /<dialog id="customerDialog" aria-labelledby="customerDialogTitle">/);
    assert.match(html, /id="newCustomerCompany" list="insuranceCompanyOptions"/);
    for (const company of ['Türkiye Sigorta', 'Ak Sigorta', 'HDI']) {
        assert.match(html, new RegExp(`<option value="${company}">`));
    }
    for (const id of ['linkedCrmCustomer', 'newCustomerName', 'newCustomerCompany',
        'newCustomerPolicyNumber', 'newCustomerStatus', 'newCustomerSubmittedAt',
        'newDiscountSubmittedAt', 'newCustomerOfferDate']) {
        assert.match(html, new RegExp(`<label[^>]*for="${id}"`));
    }
    assert.match(css, /#customerDialog\s*\{[^}]*width:\s*min\(720px/);
    assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.risk-form-fields\s*\{\s*grid-template-columns:\s*1fr/);
    assert.match(appSource, /\$\('#riskDateRequired'\)\.hidden = !riskDate\.required/);
    assert.match(appSource, /\$\('#discountDateRequired'\)\.hidden = !discountDate\.required/);
});

test('başvuru araması ortalanır ve gönderim bilgisi okunaklıdır', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'crm-integration.css'), 'utf8');
    assert.doesNotMatch(html, /id="riskListTitle"|class="risk-list-hint"|>BAŞVURULAR</);
    assert.match(css, /\.panel-header\s*\{[^}]*justify-content:\s*center/);
    assert.match(css, /\.risk-card-date\s*\{[^}]*font-size:\s*14px/);
});

test('risk filtrelerinde durumlar ve sayılar sade, ayırt edilebilir kartlardır', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'crm-integration.css'), 'utf8');
    for (const kind of ['review', 'discount', 'approved', 'all']) {
        assert.match(html, new RegExp(`risk-filter-${kind}`));
    }
    assert.match(html, /<span>Risk değerlendirme<\/span><b id="reviewCount">/);
    assert.match(html, /<span>Onaylandı<\/span><b id="approvedCount">/);
    assert.doesNotMatch(html, /Riskte bekleyen|Onaylanan/);
    assert.doesNotMatch(html, /Yanıt beklenenler|Bölge müdürlüğünde|Sonuçlanan başvurular/);
    assert.match(css, /\.risk-overview \.filter\.active\s*\{[^}]*background:\s*var\(--filter-soft\)/);
    assert.match(css, /body\.dark \.risk-overview \.risk-filter-discount/);
});

test('teklif tarihi koyu temada açık zeminle parlamaz', () => {
    const css = fs.readFileSync(path.join(root, 'crm-integration.css'), 'utf8');
    assert.match(css, /body\.dark #customerOfferDate\.offer-date\s*\{[^}]*background:\s*#24343c/);
});

test('kartta firma, renkli aşama ve teklif numarası vardır; kopyalama detayı açmaz', async () => {
    const elements = new Map();
    function element(id) {
        if (!elements.has(id)) elements.set(id, {
            value: '', innerHTML: '', textContent: '', dataset: {}, open: false,
            classList: { add() {}, remove() {}, toggle() {} },
            listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
            getBoundingClientRect() { return { left: 10, right: 100, top: 10, bottom: 100 }; },
            showModal() { this.open = true; }, close() { this.open = false; }
        });
        return elements.get(id);
    }
    const copied = [];
    const saved = [];
    const context = {
        document: {
            querySelector: selector => element(selector),
            querySelectorAll: () => []
        },
        localStorage: { getItem: () => JSON.stringify([{
            id: 'r1', customerId: 'c1', name: 'Ayşe Yılmaz', company: 'Örnek Sigorta',
            status: 'Risk değerlendirmede', submittedAt: '2026-09-19',
            offerNumber: 'TK-123', notes: []
        }]), setItem: (key, value) => saved.push([key, value]) },
        navigator: { clipboard: { writeText: value => { copied.push(value); return Promise.resolve(); } } },
        setTimeout: () => 1, clearTimeout() {}, console,
        window: { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } }
    };
    context.window.parent = { postMessage() {} };
    vm.createContext(context);
    vm.runInContext(source, context);
    vm.runInContext(appSource, context);
    const formDialog = element('#customerDialog');
    formDialog.open = true;
    formDialog.listeners.click({ target: {}, clientX: 200, clientY: 200 });
    assert.equal(formDialog.open, true);
    formDialog.listeners.click({ target: formDialog, clientX: 50, clientY: 50 });
    assert.equal(formDialog.open, true);
    formDialog.listeners.click({ target: formDialog, clientX: 200, clientY: 200 });
    assert.equal(formDialog.open, false);
    const markup = element('#customerList').innerHTML;
    assert.match(markup, /risk-card-company">Örnek Sigorta/);
    assert.match(markup, /risk-list-status risk-status-review">Risk değerlendirmede/);
    assert.match(markup, /TK-123/);
    assert.match(markup, /data-copy-id="r1"/);
    const click = element('#customerList').onclick;
    click({ target: { closest: selector => selector === '[data-copy-id]'
        ? { dataset: { copyId: 'r1' } } : null } });
    await Promise.resolve();
    assert.deepEqual(copied, ['TK-123']);
    assert.equal(element('#detailDialog').open, false);
    click({ target: { closest: selector => selector === '[data-id]'
        ? { dataset: { id: 'r1' } } : null } });
    assert.equal(element('#detailDialog').open, true);
    context.window.listeners.message({ source: context.window.parent,
        data: { type: 'sorbi:crm-customers', customers: [
            { id: 'c1', name: 'Ayşe Güncel', tcLast4: '8901' }
        ] } });
    assert.match(element('#customerList').innerHTML, /Ayşe Güncel/);
    assert.equal(JSON.parse(saved.at(-1)[1])[0].name, 'Ayşe Güncel');
});
