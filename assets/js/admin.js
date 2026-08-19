/*
 * admin.js — Painel do dono do restaurante.
 * Edita loja, horários, entrega e cardápio; salva no navegador e exporta JSON.
 */
(function (global) {
  'use strict';

  var Store = global.MenuQRStore;
  var U = global.MenuQRUtils;
  var $ = function (id) { return document.getElementById(id); };

  var editing = { categoryId: null, itemId: null };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var toastTimer;
  function toast(message) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function slug(text, fallback) {
    var base = String(text || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return base || (fallback || 'id') + '-' + Math.random().toString(36).slice(2, 6);
  }

  function uniqueId(base, taken) {
    var id = base;
    var n = 2;
    while (taken.indexOf(id) >= 0) { id = base + '-' + n; n++; }
    return id;
  }

  /* ------------------------------------------------------------ dados loja */

  function renderRestaurantForm() {
    var r = Store.state.restaurant;
    $('rName').value = r.name || '';
    $('rTagline').value = r.tagline || '';
    $('rWhatsapp').value = r.whatsapp || '';
    $('rLogo').value = r.logo || '';
    $('rAddress').value = r.address || '';
    $('rInstagram').value = r.instagram || '';
    $('rPix').value = r.pixKey || '';
    $('rPayments').value = (r.payments || []).join(', ');
    $('rAcceptClosed').checked = !!r.acceptOrdersWhenClosed;

    var delivery = r.delivery || {};
    $('dEnabled').checked = !!delivery.enabled;
    $('dMin').value = delivery.minOrder || 0;
    $('dFree').value = delivery.freeAbove || 0;
    $('pEnabled').checked = !!(r.pickup && r.pickup.enabled);
    $('pEta').value = (r.pickup && r.pickup.eta) || '';
  }

  function collectRestaurant() {
    var r = Store.clone(Store.state.restaurant);
    r.name = $('rName').value.trim() || 'Meu restaurante';
    r.tagline = $('rTagline').value.trim();
    r.whatsapp = U.onlyDigits($('rWhatsapp').value);
    r.logo = $('rLogo').value.trim();
    r.address = $('rAddress').value.trim();
    r.instagram = $('rInstagram').value.trim();
    r.pixKey = $('rPix').value.trim();
    r.payments = $('rPayments').value.split(',').map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length; });
    r.acceptOrdersWhenClosed = $('rAcceptClosed').checked;
    r.delivery = r.delivery || {};
    r.delivery.enabled = $('dEnabled').checked;
    r.delivery.minOrder = parseFloat($('dMin').value) || 0;
    r.delivery.freeAbove = parseFloat($('dFree').value) || 0;
    r.pickup = r.pickup || {};
    r.pickup.enabled = $('pEnabled').checked;
    r.pickup.eta = $('pEta').value.trim();

    var digits = r.whatsapp;
    $('whatsappError').textContent = digits && digits.length >= 12
      ? '' : 'Informe o número com código do país e DDD (ex.: 5511987654321).';
    $('whatsappError').style.display = digits && digits.length >= 12 ? 'none' : 'block';
    return r;
  }

  function saveRestaurantFromForm() {
    Store.saveRestaurant(collectRestaurant());
    renderPreview();
  }

  /* -------------------------------------------------------------- horários */

  function renderHours() {
    var hours = Store.state.restaurant.hours || {};
    $('hoursEditor').innerHTML = U.DAY_NAMES.map(function (dayName, index) {
      var ranges = hours[index] || hours[String(index)] || [];
      var range = ranges[0] || { open: '', close: '' };
      return '' +
        '<li class="admin-row">' +
          '<span class="grow name">' + dayName + '</span>' +
          '<input type="time" data-day="' + index + '" data-part="open" value="' + esc(range.open) + '" style="width:118px">' +
          '<span class="meta">às</span>' +
          '<input type="time" data-day="' + index + '" data-part="close" value="' + esc(range.close) + '" style="width:118px">' +
        '</li>';
    }).join('');
  }

  function saveHours() {
    var r = Store.clone(Store.state.restaurant);
    var hours = {};
    for (var day = 0; day < 7; day++) {
      var open = document.querySelector('[data-day="' + day + '"][data-part="open"]').value;
      var close = document.querySelector('[data-day="' + day + '"][data-part="close"]').value;
      hours[day] = open && close ? [{ open: open, close: close }] : [];
    }
    r.hours = hours;
    Store.saveRestaurant(r);
  }

  /* --------------------------------------------------------------- bairros */

  function renderZones() {
    var zones = (Store.state.restaurant.delivery && Store.state.restaurant.delivery.zones) || [];
    $('zonesEditor').innerHTML = zones.length ? zones.map(function (zone, index) {
      return '' +
        '<li class="admin-row">' +
          '<input class="grow" type="text" data-zone="' + index + '" data-field="name" value="' + esc(zone.name) + '" placeholder="Bairro">' +
          '<input type="number" min="0" step="0.5" data-zone="' + index + '" data-field="fee" value="' + esc(zone.fee) + '" style="width:96px" placeholder="Taxa">' +
          '<input type="text" data-zone="' + index + '" data-field="eta" value="' + esc(zone.eta || '') + '" style="width:120px" placeholder="30-45 min">' +
          '<button class="link-danger" type="button" data-remove-zone="' + index + '">Remover</button>' +
        '</li>';
    }).join('') : '<li class="admin-row"><span class="meta">Nenhum bairro cadastrado.</span></li>';
  }

  function saveZones() {
    var r = Store.clone(Store.state.restaurant);
    var zones = (r.delivery && r.delivery.zones) || [];
    zones.forEach(function (zone, index) {
      var name = document.querySelector('[data-zone="' + index + '"][data-field="name"]');
      var fee = document.querySelector('[data-zone="' + index + '"][data-field="fee"]');
      var eta = document.querySelector('[data-zone="' + index + '"][data-field="eta"]');
      if (!name) return;
      zone.name = name.value.trim();
      zone.fee = parseFloat(fee.value) || 0;
      zone.eta = eta.value.trim();
      if (!zone.id) zone.id = slug(zone.name, 'zona');
    });
    Store.saveRestaurant(r);
  }

  /* -------------------------------------------------------------- cardápio */

  function renderMenuEditor() {
    var menu = Store.state.menu;
    $('menuEditor').innerHTML = menu.map(function (category, catIndex) {
      var items = (category.items || []).map(function (item) {
        return '' +
          '<li class="admin-row">' +
            '<span class="grow">' +
              '<span class="name">' + esc(item.image || '') + ' ' + esc(item.name) +
                (item.available === false ? ' <span class="tag off">Indisponível</span>' : '') + '</span>' +
              '<span class="meta">' + U.money(item.price) +
                ((item.options || []).length ? ' · ' + item.options.length + ' grupo(s) de complementos' : '') +
              '</span>' +
            '</span>' +
            '<button class="btn btn-outline btn-sm" type="button" data-edit-item="' + esc(item.id) + '" data-cat="' + esc(category.id) + '">Editar</button>' +
            '<button class="link-danger" type="button" data-del-item="' + esc(item.id) + '" data-cat="' + esc(category.id) + '">Excluir</button>' +
          '</li>';
      }).join('');

      return '' +
        '<div class="admin-cat">' +
          '<header>' +
            '<h3>' + esc(category.icon || '') + ' ' + esc(category.name) + '</h3>' +
            '<span>' +
              '<button class="btn btn-outline btn-sm" type="button" data-add-item="' + esc(category.id) + '">+ Item</button> ' +
              '<button class="btn btn-outline btn-sm" type="button" data-rename-cat="' + esc(category.id) + '">Renomear</button> ' +
              (catIndex > 0 ? '<button class="btn btn-outline btn-sm" type="button" data-up-cat="' + esc(category.id) + '">↑</button> ' : '') +
              (catIndex < menu.length - 1 ? '<button class="btn btn-outline btn-sm" type="button" data-down-cat="' + esc(category.id) + '">↓</button> ' : '') +
              '<button class="link-danger" type="button" data-del-cat="' + esc(category.id) + '">Excluir</button>' +
            '</span>' +
          '</header>' +
          '<ul class="admin-list">' + (items || '<li class="admin-row"><span class="meta">Sem itens nesta categoria.</span></li>') + '</ul>' +
        '</div>';
    }).join('');
  }

  function categoryById(id) {
    return Store.state.menu.filter(function (c) { return c.id === id; })[0] || null;
  }

  function openItemEditor(categoryId, itemId) {
    var category = categoryById(categoryId);
    if (!category) return;
    var item = itemId
      ? (category.items || []).filter(function (i) { return i.id === itemId; })[0]
      : null;

    editing = { categoryId: categoryId, itemId: itemId };
    $('editorTitle').textContent = item ? 'Editar item' : 'Novo item em ' + category.name;
    $('iName').value = item ? item.name : '';
    $('iDesc').value = item ? item.description || '' : '';
    $('iPrice').value = item ? item.price : '';
    $('iImage').value = item ? item.image || '' : '🍽️';
    $('iTags').value = item ? (item.tags || []).join(', ') : '';
    $('iAvailable').checked = item ? item.available !== false : true;
    $('iOptions').value = item && (item.options || []).length
      ? JSON.stringify(item.options, null, 2)
      : '[]';
    $('optionsError').textContent = '';
    $('itemEditorOverlay').hidden = false;
    document.body.classList.add('no-scroll');
    $('iName').focus();
  }

  function closeItemEditor() {
    $('itemEditorOverlay').hidden = true;
    document.body.classList.remove('no-scroll');
  }

  function saveItemFromEditor() {
    var menu = Store.clone(Store.state.menu);
    var category = menu.filter(function (c) { return c.id === editing.categoryId; })[0];
    if (!category) return;

    var options;
    try {
      options = JSON.parse($('iOptions').value || '[]');
      if (!Array.isArray(options)) throw new Error('não é uma lista');
    } catch (err) {
      $('optionsError').textContent = 'JSON inválido nos complementos: ' + err.message;
      $('optionsError').style.display = 'block';
      return;
    }

    var name = $('iName').value.trim();
    if (!name) { toast('Informe o nome do item.'); return; }

    var payload = {
      name: name,
      description: $('iDesc').value.trim(),
      price: parseFloat($('iPrice').value) || 0,
      image: $('iImage').value.trim() || '🍽️',
      tags: $('iTags').value.split(',').map(function (t) { return t.trim(); })
        .filter(function (t) { return t.length; }),
      available: $('iAvailable').checked,
      options: options
    };

    category.items = category.items || [];
    var existing = editing.itemId
      ? category.items.filter(function (i) { return i.id === editing.itemId; })[0]
      : null;

    if (existing) {
      Object.keys(payload).forEach(function (key) { existing[key] = payload[key]; });
    } else {
      var taken = [];
      menu.forEach(function (c) {
        (c.items || []).forEach(function (i) { taken.push(i.id); });
      });
      payload.id = uniqueId(slug(name, 'item'), taken);
      category.items.push(payload);
    }

    Store.saveMenu(menu);
    closeItemEditor();
    renderMenuEditor();
    renderPreview();
    toast('Item salvo.');
  }

  function handleMenuClick(event) {
    var button = event.target.closest('button');
    if (!button) return;
    var data = button.dataset;
    var menu;

    if (data.editItem) return openItemEditor(data.cat, data.editItem);
    if (data.addItem) return openItemEditor(data.addItem, null);

    if (data.delItem) {
      if (!global.confirm('Excluir este item do cardápio?')) return;
      menu = Store.clone(Store.state.menu);
      menu.forEach(function (category) {
        if (category.id !== data.cat) return;
        category.items = (category.items || []).filter(function (i) { return i.id !== data.delItem; });
      });
      Store.saveMenu(menu);
    } else if (data.renameCat) {
      var current = categoryById(data.renameCat);
      var name = global.prompt('Nome da categoria:', current ? current.name : '');
      if (name == null) return;
      var icon = global.prompt('Emoji da categoria:', current ? current.icon || '' : '');
      menu = Store.clone(Store.state.menu);
      menu.forEach(function (category) {
        if (category.id !== data.renameCat) return;
        category.name = name.trim() || category.name;
        if (icon != null) category.icon = icon.trim();
      });
      Store.saveMenu(menu);
    } else if (data.delCat) {
      if (!global.confirm('Excluir a categoria e todos os seus itens?')) return;
      menu = Store.clone(Store.state.menu).filter(function (c) { return c.id !== data.delCat; });
      Store.saveMenu(menu);
    } else if (data.upCat || data.downCat) {
      var id = data.upCat || data.downCat;
      var offset = data.upCat ? -1 : 1;
      menu = Store.clone(Store.state.menu);
      var index = menu.map(function (c) { return c.id; }).indexOf(id);
      var target = index + offset;
      if (index < 0 || target < 0 || target >= menu.length) return;
      var moved = menu.splice(index, 1)[0];
      menu.splice(target, 0, moved);
      Store.saveMenu(menu);
    } else {
      return;
    }

    renderMenuEditor();
    renderPreview();
  }

  function addCategory() {
    var name = global.prompt('Nome da nova categoria:', '');
    if (!name || !name.trim()) return;
    var icon = global.prompt('Emoji da categoria:', '🍽️') || '';
    var menu = Store.clone(Store.state.menu);
    var taken = menu.map(function (c) { return c.id; });
    menu.push({
      id: uniqueId(slug(name, 'categoria'), taken),
      name: name.trim(),
      icon: icon.trim(),
      items: []
    });
    Store.saveMenu(menu);
    renderMenuEditor();
  }

  /* -------------------------------------------------------- export/import */

  function currentPayload() {
    return { restaurant: Store.state.restaurant, menu: Store.state.menu };
  }

  function exportData() {
    $('dataBox').value = JSON.stringify(currentPayload(), null, 2);
    toast('Cardápio exportado no campo abaixo.');
  }

  function importData() {
    var raw = $('dataBox').value.trim();
    if (!raw) { toast('Cole o JSON no campo antes de importar.'); return; }
    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      toast('JSON inválido: ' + err.message);
      return;
    }
    if (parsed.restaurant) Store.saveRestaurant(parsed.restaurant);
    if (Array.isArray(parsed.menu)) Store.saveMenu(parsed.menu);
    renderAll();
    toast('Dados importados.');
  }

  function downloadData() {
    var blob = new Blob([JSON.stringify(currentPayload(), null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'cardapio.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function resetData() {
    if (!global.confirm('Restaurar o cardápio de exemplo? Suas alterações neste navegador serão perdidas.')) return;
    Store.resetToDefaults();
    renderAll();
    toast('Cardápio de exemplo restaurado.');
  }

  /* ------------------------------------------------------------- divulgação */

  function renderShare() {
    var url = global.location.href.replace(/admin\.html.*$/, 'index.html');
    $('publicLink').value = url;
    $('qrLink').href = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=' + encodeURIComponent(url);
  }

  /* -------------------------------------------------------------- preview */

  function renderPreview() {
    var r = Store.state.restaurant;
    var first = null;
    Store.state.menu.some(function (category) {
      return (category.items || []).some(function (item) {
        if (item.available !== false) { first = item; return true; }
        return false;
      });
    });
    if (!first) {
      $('previewBox').textContent = 'Cadastre ao menos um item disponível para ver a pré-visualização.';
      return;
    }

    var zone = ((r.delivery && r.delivery.zones) || [])[0];
    var fee = zone ? Number(zone.fee) || 0 : 0;
    var sample = [{
      itemId: first.id,
      name: first.name,
      qty: 1,
      selections: {},
      notes: '',
      unitPrice: Number(first.price) || 0
    }];

    $('previewBox').textContent = U.buildOrderMessage({
      restaurant: r,
      cart: sample,
      customer: {
        name: 'Maria Souza',
        phone: '11987654321',
        mode: (r.delivery && r.delivery.enabled) ? 'delivery' : 'pickup',
        zoneId: zone ? zone.id : '',
        street: 'Rua das Acácias',
        number: '250',
        complement: 'Apto 12',
        reference: 'Prédio azul',
        payment: (r.payments || ['Pix'])[0],
        changeFor: '',
        notes: 'Sem cebola, por favor.'
      },
      totals: {
        subtotal: sample[0].unitPrice,
        deliveryFee: fee,
        total: sample[0].unitPrice + fee
      }
    });
  }

  /* ---------------------------------------------------------------- init */

  function renderAll() {
    renderRestaurantForm();
    renderHours();
    renderZones();
    renderMenuEditor();
    renderShare();
    renderPreview();
  }

  function bind() {
    ['rName', 'rTagline', 'rWhatsapp', 'rLogo', 'rAddress', 'rInstagram', 'rPix', 'rPayments',
      'dMin', 'dFree', 'pEta'].forEach(function (id) {
      $(id).addEventListener('input', saveRestaurantFromForm);
    });
    ['rAcceptClosed', 'dEnabled', 'pEnabled'].forEach(function (id) {
      $(id).addEventListener('change', saveRestaurantFromForm);
    });

    $('hoursEditor').addEventListener('change', saveHours);

    $('zonesEditor').addEventListener('input', function (event) {
      if (event.target.dataset.zone != null) saveZones();
    });
    $('zonesEditor').addEventListener('click', function (event) {
      var button = event.target.closest('[data-remove-zone]');
      if (!button) return;
      var r = Store.clone(Store.state.restaurant);
      r.delivery.zones.splice(parseInt(button.dataset.removeZone, 10), 1);
      Store.saveRestaurant(r);
      renderZones();
      renderPreview();
    });
    $('addZone').addEventListener('click', function () {
      var r = Store.clone(Store.state.restaurant);
      r.delivery = r.delivery || {};
      r.delivery.zones = r.delivery.zones || [];
      var taken = r.delivery.zones.map(function (z) { return z.id; });
      r.delivery.zones.push({
        id: uniqueId('bairro', taken),
        name: 'Novo bairro',
        fee: 0,
        eta: '30-45 min'
      });
      Store.saveRestaurant(r);
      renderZones();
    });

    $('menuEditor').addEventListener('click', handleMenuClick);
    $('addCategory').addEventListener('click', addCategory);

    $('editorClose').addEventListener('click', closeItemEditor);
    $('itemEditorOverlay').addEventListener('click', function (event) {
      if (event.target === $('itemEditorOverlay')) closeItemEditor();
    });
    $('saveItem').addEventListener('click', saveItemFromEditor);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !$('itemEditorOverlay').hidden) closeItemEditor();
    });

    $('exportData').addEventListener('click', exportData);
    $('importData').addEventListener('click', importData);
    $('downloadData').addEventListener('click', downloadData);
    $('resetData').addEventListener('click', resetData);
    $('copyLink').addEventListener('click', function () {
      var input = $('publicLink');
      input.select();
      if (global.navigator.clipboard) {
        global.navigator.clipboard.writeText(input.value).then(function () {
          toast('Link copiado!');
        }, function () { toast('Copie o link manualmente.'); });
      } else {
        document.execCommand('copy');
        toast('Link copiado!');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();
    bind();
  });
})(window);
