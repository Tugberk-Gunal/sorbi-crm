const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname,
    '../assets/js/core/storage.js'), 'utf8');

function storageContext(getItem, setItem) {
    const context = {
        customers: [{ id: 'c1', name: 'Ayşe' }], renewals: [],
        localStorage: { getItem, setItem },
        console: { error() {} }
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return context;
}

test('bozuk müşteri JSON verisinin üzerine demo veri yazılmaz', () => {
    const writes = [];
    const context = storageContext(() => '{bozuk', (...args) => writes.push(args));
    assert.equal(context.loadLocalData(), false);
    assert.equal(context.saveLocalData(), false);
    assert.equal(writes.length, 0);
});

test('depolama dolduğunda kaydetme başarı gibi bildirilmez', () => {
    const context = storageContext(() => null, () => { throw new Error('QuotaExceededError'); });
    assert.equal(context.saveLocalData(), false);
});
