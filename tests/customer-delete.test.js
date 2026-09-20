const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

test("müşteri yalnızca özel onay penceresinde sil komutu verilince silinir", () => {
    const elements = {};
    const makeElement = () => {
        const classes = new Set();
        return {
            textContent: "",
            isConnected: true,
            handlers: {},
            classList: {
                add: value => classes.add(value),
                remove: value => classes.delete(value),
                contains: value => classes.has(value)
            },
            addEventListener(name, handler) { this.handlers[name] = handler; },
            focus() { this.focused = true; }
        };
    };
    for (const id of ["customerDeleteName", "cancelCustomerDelete", "confirmCustomerDelete", "addCustomerButton"]) {
        elements[id] = makeElement();
    }
    const originalFocus = makeElement();
    let saves = 0;
    let renders = 0;
    const context = {
        customers: [{ id: "one", name: "Ayşe" }, { id: "two", name: "Can" }],
        selectedCustomerId: null,
        detailOverlay: makeElement(),
        document: {
            activeElement: originalFocus,
            createElement() { return makeElement(); },
            body: { appendChild(element) { elements[element.id] = element; } }
        },
        $: id => elements[id] || null,
        requestAnimationFrame: callback => callback(),
        closeAvatarColorPicker() {},
        saveLocalData() { saves++; },
        renderAll() { renders++; },
        confirm() { throw new Error("Tarayıcı onayı kullanılmamalı"); }
    };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(
        path.join(__dirname, "../assets/js/features/customers/crud.js"), "utf8"
    ), context);

    context.deleteCustomer("one");
    assert.equal(context.customers.length, 2);
    assert.equal(elements.customerDeleteName.textContent, "Ayşe");
    assert.equal(elements.customerDeleteModal.classList.contains("show"), true);
    elements.cancelCustomerDelete.handlers.click();
    assert.equal(context.customers.length, 2);
    assert.equal(saves, 0);
    assert.equal(originalFocus.focused, true);

    context.deleteCustomer("one");
    elements.confirmCustomerDelete.handlers.click();
    assert.deepEqual(context.customers.map(customer => customer.id), ["two"]);
    assert.equal(saves, 1);
    assert.equal(renders, 1);
    assert.equal(elements.customerDeleteModal.classList.contains("show"), false);
});
