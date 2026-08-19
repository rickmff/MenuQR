/*
 * store.js — Estado da aplicação: cardápio, carrinho e dados do cliente.
 * Tudo é persistido no localStorage do navegador do cliente.
 */
(function (global) {
  'use strict';

  var KEYS = {
    restaurant: 'menuqr.restaurant',
    menu: 'menuqr.menu',
    cart: 'menuqr.cart',
    customer: 'menuqr.customer'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function read(key, fallback) {
    try {
      var raw = global.localStorage.getItem(key);
      if (!raw) return clone(fallback);
      var parsed = JSON.parse(raw);
      return parsed == null ? clone(fallback) : parsed;
    } catch (err) {
      return clone(fallback);
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(key) {
    try {
      global.localStorage.removeItem(key);
    } catch (err) {
      /* ignora */
    }
  }

  var listeners = [];

  var state = {
    restaurant: read(KEYS.restaurant, global.MenuQRData.restaurant),
    menu: read(KEYS.menu, global.MenuQRData.menu),
    cart: read(KEYS.cart, []),
    customer: read(KEYS.customer, {
      name: '',
      phone: '',
      mode: 'delivery',
      zoneId: '',
      street: '',
      number: '',
      complement: '',
      reference: '',
      payment: '',
      changeFor: '',
      notes: ''
    })
  };

  function emit() {
    for (var i = 0; i < listeners.length; i++) listeners[i](state);
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  /* ---------------------------------------------------------------- cardápio */

  function findItem(itemId) {
    for (var c = 0; c < state.menu.length; c++) {
      var items = state.menu[c].items || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          return { item: items[i], category: state.menu[c] };
        }
      }
    }
    return null;
  }

  function saveMenu(menu) {
    state.menu = menu;
    write(KEYS.menu, menu);
    emit();
  }

  function saveRestaurant(restaurant) {
    state.restaurant = restaurant;
    write(KEYS.restaurant, restaurant);
    emit();
  }

  function resetToDefaults() {
    remove(KEYS.restaurant);
    remove(KEYS.menu);
    state.restaurant = clone(global.MenuQRData.restaurant);
    state.menu = clone(global.MenuQRData.menu);
    emit();
  }

  /* ---------------------------------------------------------------- carrinho */

  // Assinatura usada para juntar linhas idênticas do carrinho.
  function signature(itemId, selections, notes) {
    var parts = Object.keys(selections || {}).sort().map(function (groupId) {
      var chosen = selections[groupId];
      var ids = Array.isArray(chosen) ? chosen.slice().sort() : [chosen];
      return groupId + ':' + ids.join('+');
    });
    return itemId + '|' + parts.join('|') + '|' + (notes || '').trim().toLowerCase();
  }

  // Preço unitário = preço do item + preço dos complementos escolhidos.
  function unitPrice(item, selections) {
    var total = Number(item.price) || 0;
    (item.options || []).forEach(function (group) {
      var chosen = selections ? selections[group.id] : null;
      if (chosen == null) return;
      var ids = Array.isArray(chosen) ? chosen : [chosen];
      ids.forEach(function (choiceId) {
        var choice = (group.choices || []).filter(function (c) { return c.id === choiceId; })[0];
        if (choice) total += Number(choice.price) || 0;
      });
    });
    return total;
  }

  // Rótulos legíveis dos complementos, para exibir no carrinho e no WhatsApp.
  function describeSelections(item, selections) {
    var out = [];
    (item.options || []).forEach(function (group) {
      var chosen = selections ? selections[group.id] : null;
      if (chosen == null) return;
      var ids = Array.isArray(chosen) ? chosen : [chosen];
      var names = ids.map(function (choiceId) {
        var choice = (group.choices || []).filter(function (c) { return c.id === choiceId; })[0];
        return choice ? choice.name : null;
      }).filter(Boolean);
      if (names.length) out.push({ group: group.name, values: names });
    });
    return out;
  }

  function persistCart() {
    write(KEYS.cart, state.cart);
    emit();
  }

  function addToCart(itemId, qty, selections, notes) {
    var found = findItem(itemId);
    if (!found) return;
    var amount = Math.max(1, parseInt(qty, 10) || 1);
    var sig = signature(itemId, selections, notes);
    var existing = state.cart.filter(function (line) { return line.sig === sig; })[0];
    if (existing) {
      existing.qty += amount;
    } else {
      state.cart.push({
        uid: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        sig: sig,
        itemId: itemId,
        name: found.item.name,
        qty: amount,
        selections: selections || {},
        notes: (notes || '').trim(),
        unitPrice: unitPrice(found.item, selections)
      });
    }
    persistCart();
  }

  function setQty(uid, qty) {
    var next = parseInt(qty, 10) || 0;
    if (next <= 0) return removeLine(uid);
    state.cart.forEach(function (line) {
      if (line.uid === uid) line.qty = next;
    });
    persistCart();
  }

  function removeLine(uid) {
    state.cart = state.cart.filter(function (line) { return line.uid !== uid; });
    persistCart();
  }

  function clearCart() {
    state.cart = [];
    persistCart();
  }

  function cartCount() {
    return state.cart.reduce(function (sum, line) { return sum + line.qty; }, 0);
  }

  function subtotal() {
    return state.cart.reduce(function (sum, line) { return sum + line.unitPrice * line.qty; }, 0);
  }

  function zoneById(zoneId) {
    var zones = (state.restaurant.delivery && state.restaurant.delivery.zones) || [];
    return zones.filter(function (z) { return z.id === zoneId; })[0] || null;
  }

  // Frete: 0 na retirada, 0 acima do valor de frete grátis, senão a taxa do bairro.
  function deliveryFee(customer) {
    var c = customer || state.customer;
    if (c.mode !== 'delivery') return 0;
    var delivery = state.restaurant.delivery || {};
    var freeAbove = Number(delivery.freeAbove) || 0;
    if (freeAbove > 0 && subtotal() >= freeAbove) return 0;
    var zone = zoneById(c.zoneId);
    return zone ? Number(zone.fee) || 0 : 0;
  }

  function total(customer) {
    return subtotal() + deliveryFee(customer);
  }

  /* ---------------------------------------------------------------- cliente */

  function saveCustomer(patch) {
    Object.keys(patch || {}).forEach(function (key) {
      state.customer[key] = patch[key];
    });
    // O troco não é lembrado entre pedidos; o resto sim.
    var toStore = JSON.parse(JSON.stringify(state.customer));
    toStore.changeFor = '';
    toStore.notes = '';
    write(KEYS.customer, toStore);
    emit();
  }

  global.MenuQRStore = {
    state: state,
    subscribe: subscribe,
    clone: clone,
    findItem: findItem,
    saveMenu: saveMenu,
    saveRestaurant: saveRestaurant,
    resetToDefaults: resetToDefaults,
    unitPrice: unitPrice,
    describeSelections: describeSelections,
    addToCart: addToCart,
    setQty: setQty,
    removeLine: removeLine,
    clearCart: clearCart,
    cartCount: cartCount,
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    zoneById: zoneById,
    total: total,
    saveCustomer: saveCustomer
  };
})(window);
