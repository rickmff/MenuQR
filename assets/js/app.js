/*
 * app.js — Cardápio, carrinho e checkout que termina no WhatsApp do restaurante.
 */
(function (global) {
  'use strict';

  var Store = global.MenuQRStore;
  var U = global.MenuQRUtils;
  var $ = function (id) { return document.getElementById(id); };

  var ui = {
    search: '',
    activeCategory: null,
    modalItem: null,
    modalQty: 1,
    modalSelections: {},
    step: 'cart',
    lastMessage: '',
    lastLink: ''
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isImageUrl(value) {
    return /^(https?:\/\/|data:image\/|\.?\/)/.test(String(value || ''));
  }

  function thumbHtml(image, className) {
    var cls = className || 'item-thumb';
    if (isImageUrl(image)) {
      return '<div class="' + cls + '"><img src="' + esc(image) + '" alt="" loading="lazy"></div>';
    }
    return '<div class="' + cls + '" aria-hidden="true">' + esc(image || '🍽️') + '</div>';
  }

  var toastTimer;
  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ------------------------------------------------------- cabeçalho e rodapé */

  function renderHeader() {
    var r = Store.state.restaurant;
    document.title = r.name + ' — Cardápio e delivery';
    $('brandName').textContent = r.name;
    $('brandTagline').textContent = r.tagline || '';
    $('brandLogo').innerHTML = isImageUrl(r.logo)
      ? '<img src="' + esc(r.logo) + '" alt="">'
      : esc(r.logo || '🍽️');

    var status = U.openingStatus(r);
    var badge = $('statusBadge');
    badge.hidden = false;
    badge.className = 'status-badge ' + (status.open ? 'open' : 'closed');
    badge.textContent = status.open
      ? 'Aberto até ' + status.closesAt
      : U.nextOpeningLabel(status);

    $('metaAddress').textContent = r.address ? '📍 ' + r.address : '';
    var delivery = r.delivery || {};
    var fees = (delivery.zones || []).map(function (z) { return Number(z.fee) || 0; });
    var cheapest = fees.length ? Math.min.apply(null, fees) : 0;
    $('metaDelivery').textContent = delivery.enabled
      ? '🛵 Entrega a partir de ' + U.money(cheapest)
      : '🏠 Somente retirada';
    $('metaMin').textContent = delivery.enabled && Number(delivery.minOrder) > 0
      ? '🧾 Pedido mínimo ' + U.money(delivery.minOrder)
      : '';
  }

  function renderFooter() {
    var r = Store.state.restaurant;
    var today = new Date().getDay();
    var hours = r.hours || {};
    $('hoursList').innerHTML = U.DAY_NAMES.map(function (dayName, index) {
      var ranges = hours[index] || hours[String(index)] || [];
      var label = ranges.length
        ? ranges.map(function (x) { return x.open + ' às ' + x.close; }).join(' · ')
        : 'Fechado';
      return '<li class="' + (index === today ? 'today' : '') + '"><span>' + dayName +
        '</span><span>' + esc(label) + '</span></li>';
    }).join('');

    $('footerAddress').textContent = r.address || '';
    $('footerPhone').innerHTML = r.whatsapp
      ? '<a href="' + esc(U.whatsappLink(r.whatsapp, 'Olá! Vim pelo cardápio online.')) +
        '" target="_blank" rel="noopener">WhatsApp: ' + esc(U.maskPhone(r.whatsapp.slice(-11))) + '</a>'
      : '';
    $('footerInstagram').textContent = r.instagram || '';

    var delivery = r.delivery || {};
    $('zonesList').innerHTML = delivery.enabled
      ? (delivery.zones || []).map(function (zone) {
          return '<li><span>' + esc(zone.name) + '</span><span>' + U.money(zone.fee) +
            (zone.eta ? ' · ' + esc(zone.eta) : '') + '</span></li>';
        }).join('') +
        (Number(delivery.freeAbove) > 0
          ? '<li><span>Frete grátis acima de</span><span>' + U.money(delivery.freeAbove) + '</span></li>'
          : '')
      : '<li><span>Apenas retirada no balcão</span></li>';
  }

  /* --------------------------------------------------------------- cardápio */

  function normalize(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function visibleCategories() {
    var term = normalize(ui.search).trim();
    return Store.state.menu.map(function (category) {
      var items = (category.items || []).filter(function (item) {
        if (!term) return true;
        return normalize(item.name).indexOf(term) >= 0 ||
          normalize(item.description).indexOf(term) >= 0 ||
          normalize(category.name).indexOf(term) >= 0;
      });
      return { category: category, items: items };
    }).filter(function (group) { return group.items.length > 0; });
  }

  function renderMenu() {
    var groups = visibleCategories();
    $('emptySearch').hidden = groups.length > 0;

    $('menuRoot').innerHTML = groups.map(function (group) {
      var category = group.category;
      var items = group.items.map(function (item) {
        var disabled = item.available === false;
        var tags = (item.tags || []).map(function (tag) {
          return '<span class="tag">' + esc(tag) + '</span>';
        }).join('');
        if (disabled) tags += '<span class="tag off">Indisponível</span>';
        return '' +
          '<li><button class="item-card" type="button" data-item="' + esc(item.id) + '"' +
          (disabled ? ' disabled' : '') + '>' +
            '<div class="item-info">' +
              '<div class="item-name">' + esc(item.name) + tags + '</div>' +
              '<p class="item-desc">' + esc(item.description || '') + '</p>' +
              '<span class="item-price">' + U.money(item.price) +
              ((item.options || []).length ? ' <small style="color:var(--muted);font-weight:600">+ opções</small>' : '') +
              '</span>' +
            '</div>' +
            thumbHtml(item.image) +
          '</button></li>';
      }).join('');

      return '' +
        '<section class="menu-category" id="cat-' + esc(category.id) + '">' +
          '<h2>' + esc(category.icon || '') + ' ' + esc(category.name) +
            ' <small>' + group.items.length + ' ' + (group.items.length === 1 ? 'item' : 'itens') + '</small></h2>' +
          '<ul class="items">' + items + '</ul>' +
        '</section>';
    }).join('');

    $('categoryNav').innerHTML = groups.map(function (group, index) {
      return '<button type="button" data-cat="' + esc(group.category.id) + '"' +
        (index === 0 ? ' class="active"' : '') + '>' +
        esc(group.category.icon || '') + ' ' + esc(group.category.name) + '</button>';
    }).join('');
  }

  /* ------------------------------------------------------------ modal item */

  function openItem(itemId) {
    var found = Store.findItem(itemId);
    if (!found || found.item.available === false) return;
    ui.modalItem = found.item;
    ui.modalQty = 1;
    ui.modalSelections = {};

    // Pré-seleciona a primeira opção dos grupos obrigatórios.
    (found.item.options || []).forEach(function (group) {
      if (group.type === 'single' && group.required && (group.choices || []).length) {
        ui.modalSelections[group.id] = group.choices[0].id;
      }
      if (group.type === 'multi') ui.modalSelections[group.id] = [];
    });

    renderItemModal();
    $('itemOverlay').hidden = false;
    document.body.classList.add('no-scroll');
    $('itemClose').focus();
  }

  function closeItem() {
    $('itemOverlay').hidden = true;
    ui.modalItem = null;
    if ($('cartOverlay').hidden) document.body.classList.remove('no-scroll');
  }

  function renderItemModal() {
    var item = ui.modalItem;
    if (!item) return;

    var groups = (item.options || []).map(function (group) {
      var isMulti = group.type === 'multi';
      var selected = ui.modalSelections[group.id];
      var reached = isMulti && group.max && (selected || []).length >= group.max;

      var choices = (group.choices || []).map(function (choice) {
        var checked = isMulti
          ? (selected || []).indexOf(choice.id) >= 0
          : selected === choice.id;
        return '' +
          '<label class="choice">' +
            '<input type="' + (isMulti ? 'checkbox' : 'radio') + '" name="opt-' + esc(group.id) + '"' +
              ' data-group="' + esc(group.id) + '" value="' + esc(choice.id) + '"' +
              (checked ? ' checked' : '') + (reached && !checked ? ' disabled' : '') + '>' +
            '<span class="choice-name">' + esc(choice.name) + '</span>' +
            (Number(choice.price) > 0 ? '<span class="choice-price">+ ' + U.money(choice.price) + '</span>' : '') +
          '</label>';
      }).join('');

      return '' +
        '<div class="option-group">' +
          '<div class="option-head"><h3>' + esc(group.name) + '</h3>' +
            (group.required ? '<span class="req">Obrigatório</span>'
              : '<span class="opt">Opcional' + (group.max ? ' · até ' + group.max : '') + '</span>') +
          '</div>' + choices +
        '</div>';
    }).join('');

    $('itemBody').innerHTML = '' +
      '<div class="item-hero">' + thumbHtml(item.image) +
        '<div><h2 id="itemTitle">' + esc(item.name) + '</h2>' +
        '<div class="price">' + U.money(item.price) + '</div></div>' +
      '</div>' +
      (item.description ? '<p class="desc">' + esc(item.description) + '</p>' : '') +
      groups +
      '<div class="option-group">' +
        '<div class="option-head"><h3>Alguma observação?</h3></div>' +
        '<textarea id="itemNotes" class="code-box" style="min-height:70px;font-family:inherit;font-size:.92rem"' +
        ' placeholder="Ex.: sem cebola, ponto da carne bem passado"></textarea>' +
      '</div>';

    $('qtyValue').textContent = ui.modalQty;
    updateModalPrice();
  }

  function updateModalPrice() {
    if (!ui.modalItem) return;
    var unit = Store.unitPrice(ui.modalItem, ui.modalSelections);
    $('addToCartPrice').textContent = U.money(unit * ui.modalQty);
  }

  function onChoiceChange(event) {
    var input = event.target;
    if (!input || !input.dataset || !input.dataset.group) return;
    var groupId = input.dataset.group;
    var group = (ui.modalItem.options || []).filter(function (g) { return g.id === groupId; })[0];
    if (!group) return;

    if (group.type === 'multi') {
      var current = ui.modalSelections[groupId] || [];
      if (input.checked) {
        if (group.max && current.length >= group.max) { input.checked = false; return; }
        current = current.concat([input.value]);
      } else {
        current = current.filter(function (id) { return id !== input.value; });
      }
      ui.modalSelections[groupId] = current;
      renderItemModal(); // reavalia limites (desabilita o que passou do máximo)
    } else {
      ui.modalSelections[groupId] = input.value;
      updateModalPrice();
    }
  }

  function addCurrentItem() {
    var item = ui.modalItem;
    if (!item) return;
    var missing = (item.options || []).filter(function (group) {
      if (!group.required) return false;
      var chosen = ui.modalSelections[group.id];
      return group.type === 'multi' ? !(chosen || []).length : !chosen;
    });
    if (missing.length) {
      toast('Escolha: ' + missing[0].name);
      return;
    }
    var notesEl = $('itemNotes');
    Store.addToCart(item.id, ui.modalQty, ui.modalSelections, notesEl ? notesEl.value : '');
    closeItem();
    toast(ui.modalQty + 'x ' + item.name + ' no carrinho');
  }

  /* --------------------------------------------------------- gaveta/carrinho */

  function openCart(step) {
    ui.step = step || (Store.cartCount() ? 'cart' : 'cart');
    renderDrawer();
    $('cartOverlay').hidden = false;
    document.body.classList.add('no-scroll');
  }

  function closeCart() {
    $('cartOverlay').hidden = true;
    if ($('itemOverlay').hidden) document.body.classList.remove('no-scroll');
  }

  function renderDrawer() {
    $('stepCart').hidden = ui.step !== 'cart';
    $('stepCheckout').hidden = ui.step !== 'checkout';
    $('stepDone').hidden = ui.step !== 'done';
    $('drawerBack').hidden = ui.step !== 'checkout';
    $('drawerTitle').textContent = ui.step === 'checkout'
      ? 'Dados para entrega'
      : ui.step === 'done' ? 'Pedido enviado' : 'Seu pedido';
    if (ui.step === 'cart') renderCartLines();
    if (ui.step === 'checkout') renderCheckout();
  }

  function renderCartLines() {
    var cart = Store.state.cart;
    var empty = cart.length === 0;
    $('cartEmpty').hidden = !empty;
    $('cartFoot').style.display = empty ? 'none' : '';

    $('cartLines').innerHTML = cart.map(function (line) {
      var found = Store.findItem(line.itemId);
      var opts = found
        ? Store.describeSelections(found.item, line.selections).map(function (group) {
            return '<li>' + esc(group.group) + ': ' + esc(group.values.join(', ')) + '</li>';
          }).join('')
        : '';
      if (line.notes) opts += '<li>Obs.: ' + esc(line.notes) + '</li>';
      return '' +
        '<li class="cart-line">' +
          '<div class="cart-line-top">' +
            '<div><div class="cart-line-name">' + esc(line.name) + '</div>' +
              (opts ? '<ul class="cart-line-opts">' + opts + '</ul>' : '') + '</div>' +
            '<div class="cart-line-price">' + U.money(line.unitPrice * line.qty) + '</div>' +
          '</div>' +
          '<div class="cart-line-actions">' +
            '<div class="qty-stepper">' +
              '<button type="button" data-dec="' + esc(line.uid) + '" aria-label="Diminuir">−</button>' +
              '<span>' + line.qty + '</span>' +
              '<button type="button" data-inc="' + esc(line.uid) + '" aria-label="Aumentar">+</button>' +
            '</div>' +
            '<button type="button" class="link-danger" data-del="' + esc(line.uid) + '">Remover</button>' +
          '</div>' +
        '</li>';
    }).join('');

    var subtotal = Store.subtotal();
    $('sumSubtotal').textContent = U.money(subtotal);
    $('sumTotal').textContent = U.money(subtotal);

    var delivery = Store.state.restaurant.delivery || {};
    var min = Number(delivery.minOrder) || 0;
    var below = delivery.enabled && min > 0 && subtotal < min && Store.state.customer.mode === 'delivery';
    var warning = $('minWarning');
    warning.hidden = !below;
    if (below) {
      warning.textContent = 'Pedido mínimo para entrega: ' + U.money(min) +
        '. Faltam ' + U.money(min - subtotal) + ' (ou escolha retirada no local).';
    }
    $('goCheckout').disabled = empty;
  }

  /* ------------------------------------------------------------- checkout */

  function fillSelects() {
    var r = Store.state.restaurant;
    var customer = Store.state.customer;
    var zones = (r.delivery && r.delivery.zones) || [];
    $('fZone').innerHTML = '<option value="">Selecione o bairro</option>' +
      zones.map(function (zone) {
        return '<option value="' + esc(zone.id) + '"' + (customer.zoneId === zone.id ? ' selected' : '') + '>' +
          esc(zone.name) + ' — ' + U.money(zone.fee) + (zone.eta ? ' · ' + esc(zone.eta) : '') + '</option>';
      }).join('');

    $('fPayment').innerHTML = '<option value="">Selecione</option>' +
      (r.payments || []).map(function (payment) {
        return '<option value="' + esc(payment) + '"' + (customer.payment === payment ? ' selected' : '') + '>' +
          esc(payment) + '</option>';
      }).join('');
  }

  function renderCheckout() {
    var r = Store.state.restaurant;
    var customer = Store.state.customer;
    var deliveryOn = !!(r.delivery && r.delivery.enabled);
    var pickupOn = !!(r.pickup && r.pickup.enabled);

    if (!deliveryOn && pickupOn) customer.mode = 'pickup';
    if (!pickupOn && deliveryOn) customer.mode = 'delivery';

    Array.prototype.forEach.call($('modeSwitch').children, function (button) {
      var mode = button.dataset.mode;
      button.hidden = mode === 'delivery' ? !deliveryOn : !pickupOn;
      button.classList.toggle('active', customer.mode === mode);
    });

    fillSelects();
    $('fName').value = customer.name || '';
    $('fPhone').value = customer.phone ? U.maskPhone(customer.phone) : '';
    $('fStreet').value = customer.street || '';
    $('fNumber').value = customer.number || '';
    $('fComplement').value = customer.complement || '';
    $('fReference').value = customer.reference || '';
    $('fChange').value = customer.changeFor || '';
    $('fNotes').value = customer.notes || '';

    var isDelivery = customer.mode === 'delivery';
    $('deliveryFields').hidden = !isDelivery;
    $('pickupInfo').hidden = isDelivery;
    $('pickupInfo').innerHTML = '<strong>Retirada no local</strong><br>' + esc(r.address || '') +
      ((r.pickup && r.pickup.eta) ? '<br>Fica pronto em ' + esc(r.pickup.eta) : '');
    $('changeField').hidden = customer.payment !== 'Dinheiro';

    updateCheckoutTotals();
  }

  function updateCheckoutTotals() {
    var customer = Store.state.customer;
    var subtotal = Store.subtotal();
    var fee = Store.deliveryFee(customer);
    $('ckSubtotal').textContent = U.money(subtotal);
    $('ckFeeRow').hidden = customer.mode !== 'delivery';
    $('ckFee').innerHTML = customer.mode === 'delivery' && fee === 0 && Store.zoneById(customer.zoneId)
      ? '<span class="free-tag">Grátis</span>'
      : U.money(fee);
    $('ckTotal').textContent = U.money(subtotal + fee);
  }

  function setFieldError(name, message) {
    var input = document.querySelector('[name="' + name + '"]');
    if (!input) return;
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('invalid', !!message);
    var slot = field.querySelector('[data-error="' + name + '"]');
    if (slot) slot.textContent = message || '';
  }

  function validateCheckout() {
    var customer = Store.state.customer;
    var r = Store.state.restaurant;
    var errors = [];
    ['name', 'phone', 'zoneId', 'street', 'number', 'payment'].forEach(function (name) {
      setFieldError(name, '');
    });

    if (!String(customer.name || '').trim()) errors.push(['name', 'Informe seu nome.']);
    if (!U.isValidPhone(customer.phone)) errors.push(['phone', 'Informe um WhatsApp válido com DDD.']);

    if (customer.mode === 'delivery') {
      if (!Store.zoneById(customer.zoneId)) errors.push(['zoneId', 'Escolha o bairro da entrega.']);
      if (!String(customer.street || '').trim()) errors.push(['street', 'Informe a rua.']);
      if (!String(customer.number || '').trim()) errors.push(['number', 'Informe o número.']);
      var min = Number(r.delivery && r.delivery.minOrder) || 0;
      if (min > 0 && Store.subtotal() < min) {
        toast('Pedido mínimo para entrega: ' + U.money(min));
        return false;
      }
    }
    if (!String(customer.payment || '').trim()) errors.push(['payment', 'Escolha a forma de pagamento.']);

    errors.forEach(function (pair) { setFieldError(pair[0], pair[1]); });
    if (errors.length) {
      var first = document.querySelector('[name="' + errors[0][0] + '"]');
      if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      return false;
    }
    return true;
  }

  function sendOrder() {
    if (!Store.state.cart.length) { toast('Seu carrinho está vazio.'); return; }
    if (!validateCheckout()) return;

    var r = Store.state.restaurant;
    if (!U.onlyDigits(r.whatsapp)) {
      toast('O restaurante ainda não cadastrou o WhatsApp.');
      return;
    }

    var status = U.openingStatus(r);
    if (!status.open && !r.acceptOrdersWhenClosed) {
      toast(status.nextTime
        ? 'Estamos fechados agora. ' + U.nextOpeningLabel(status) + '.'
        : 'Estamos fechados no momento.');
      return;
    }

    var customer = Store.state.customer;
    var totals = {
      subtotal: Store.subtotal(),
      deliveryFee: Store.deliveryFee(customer),
      total: Store.total(customer)
    };

    var message = U.buildOrderMessage({
      restaurant: r,
      cart: Store.state.cart,
      customer: customer,
      totals: totals,
      scheduled: !status.open
    });

    ui.lastMessage = message;
    ui.lastLink = U.whatsappLink(r.whatsapp, message);

    $('doneSummary').innerHTML = '' +
      '<div><strong>' + esc(r.name) + '</strong></div>' +
      '<div>' + Store.cartCount() + ' ' + (Store.cartCount() === 1 ? 'item' : 'itens') +
        ' · Total <strong>' + U.money(totals.total) + '</strong></div>' +
      '<div>' + (customer.mode === 'delivery'
        ? 'Entrega em ' + esc(customer.street) + ', ' + esc(customer.number)
        : 'Retirada no local') + '</div>' +
      '<div>Pagamento: ' + esc(customer.payment) + '</div>';

    global.open(ui.lastLink, '_blank', 'noopener');
    Store.saveCustomer({});
    Store.clearCart();
    ui.step = 'done';
    renderDrawer();
  }

  /* ---------------------------------------------------------------- eventos */

  function bindEvents() {
    $('search').addEventListener('input', function (event) {
      ui.search = event.target.value;
      renderMenu();
    });

    $('categoryNav').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-cat]');
      if (!button) return;
      var section = $('cat-' + button.dataset.cat);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('menuRoot').addEventListener('click', function (event) {
      var card = event.target.closest('.item-card');
      if (card && !card.disabled) openItem(card.dataset.item);
    });

    // modal do item
    $('itemClose').addEventListener('click', closeItem);
    $('itemOverlay').addEventListener('click', function (event) {
      if (event.target === $('itemOverlay')) closeItem();
    });
    $('itemBody').addEventListener('change', onChoiceChange);
    $('qtyMinus').addEventListener('click', function () {
      ui.modalQty = Math.max(1, ui.modalQty - 1);
      $('qtyValue').textContent = ui.modalQty;
      updateModalPrice();
    });
    $('qtyPlus').addEventListener('click', function () {
      ui.modalQty = Math.min(99, ui.modalQty + 1);
      $('qtyValue').textContent = ui.modalQty;
      updateModalPrice();
    });
    $('addToCart').addEventListener('click', addCurrentItem);

    // carrinho
    $('cartButton').addEventListener('click', function () { openCart('cart'); });
    $('cartFab').addEventListener('click', function () { openCart('cart'); });
    $('cartClose').addEventListener('click', closeCart);
    $('cartOverlay').addEventListener('click', function (event) {
      if (event.target === $('cartOverlay')) closeCart();
    });
    $('drawerBack').addEventListener('click', function () {
      ui.step = 'cart';
      renderDrawer();
    });
    $('cartLines').addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      var data = button.dataset;
      var line = Store.state.cart.filter(function (l) {
        return l.uid === (data.inc || data.dec || data.del);
      })[0];
      if (!line) return;
      if (data.inc) Store.setQty(line.uid, line.qty + 1);
      else if (data.dec) Store.setQty(line.uid, line.qty - 1);
      else if (data.del) Store.removeLine(line.uid);
    });
    $('clearCart').addEventListener('click', function () {
      if (!Store.state.cart.length) return;
      if (global.confirm('Deseja esvaziar o carrinho?')) Store.clearCart();
    });
    $('goCheckout').addEventListener('click', function () {
      if (!Store.state.cart.length) return;
      ui.step = 'checkout';
      renderDrawer();
      setTimeout(function () { $('fName').focus(); }, 60);
    });

    // formulário
    $('modeSwitch').addEventListener('click', function (event) {
      var button = event.target.closest('button[data-mode]');
      if (!button) return;
      Store.saveCustomer({ mode: button.dataset.mode });
      renderCheckout();
    });
    $('checkoutForm').addEventListener('input', function (event) {
      var input = event.target;
      if (!input.name) return;
      var value = input.value;
      if (input.name === 'phone') {
        value = U.maskPhone(value);
        input.value = value;
        value = U.onlyDigits(value);
      }
      var patch = {};
      patch[input.name] = value;
      Store.saveCustomer(patch);
      if (input.name === 'zoneId') updateCheckoutTotals();
    });
    $('checkoutForm').addEventListener('change', function (event) {
      if (event.target.name === 'payment') {
        $('changeField').hidden = event.target.value !== 'Dinheiro';
      }
      updateCheckoutTotals();
    });
    $('checkoutForm').addEventListener('submit', function (event) { event.preventDefault(); });
    $('sendOrder').addEventListener('click', sendOrder);

    // confirmação
    $('resendOrder').addEventListener('click', function () {
      if (ui.lastLink) global.open(ui.lastLink, '_blank', 'noopener');
    });
    $('newOrder').addEventListener('click', function () {
      ui.step = 'cart';
      renderDrawer();
      closeCart();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (!$('itemOverlay').hidden) closeItem();
      else if (!$('cartOverlay').hidden) closeCart();
    });

    // destaca a categoria visível enquanto o cliente rola a página
    global.addEventListener('scroll', function () {
      var sections = document.querySelectorAll('.menu-category');
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top - 140 <= 0) current = sections[i].id.slice(4);
      }
      if (!current && sections.length) current = sections[0].id.slice(4);
      if (current === ui.activeCategory) return;
      ui.activeCategory = current;
      Array.prototype.forEach.call($('categoryNav').children, function (button) {
        button.classList.toggle('active', button.dataset.cat === current);
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------- badges */

  function renderCartBadges() {
    var count = Store.cartCount();
    var badge = $('cartCount');
    badge.hidden = count === 0;
    badge.textContent = count;

    var fab = $('cartFab');
    fab.hidden = count === 0 || !$('cartOverlay').hidden;
    $('fabCount').textContent = count;
    $('fabTotal').textContent = U.money(Store.subtotal());
  }

  function init() {
    renderHeader();
    renderFooter();
    renderMenu();
    renderCartBadges();
    bindEvents();

    Store.subscribe(function () {
      renderCartBadges();
      if (!$('cartOverlay').hidden) {
        if (ui.step === 'cart') renderCartLines();
        if (ui.step === 'checkout') updateCheckoutTotals();
      }
    });

    // Reavalia o "aberto/fechado" de tempos em tempos.
    setInterval(renderHeader, 60000);
  }

  document.addEventListener('DOMContentLoaded', init);
})(window);
