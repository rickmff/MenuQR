/*
 * utils.js — Formatação de moeda/telefone, horário de funcionamento
 * e montagem da mensagem de pedido enviada ao WhatsApp do restaurante.
 */
(function (global) {
  'use strict';

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function money(value) {
    return brl.format(Number(value) || 0);
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  // Máscara progressiva: (11) 98765-4321
  function maskPhone(value) {
    var d = onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  function isValidPhone(value) {
    var d = onlyDigits(value);
    return d.length === 10 || d.length === 11;
  }

  function parseMoneyInput(value) {
    var raw = String(value == null ? '' : value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  function toMinutes(hhmm) {
    var parts = String(hhmm || '').split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }

  /*
   * Verifica se a loja está aberta agora, considerando faixas que atravessam
   * a meia-noite (ex.: 18:00 → 00:30 conta como aberto às 00:10 do dia seguinte).
   */
  function openingStatus(restaurant, now) {
    var date = now || new Date();
    var hours = (restaurant && restaurant.hours) || {};
    var day = date.getDay();
    var minutes = date.getHours() * 60 + date.getMinutes();

    function check(dayIndex, offset) {
      var ranges = hours[dayIndex] || hours[String(dayIndex)] || [];
      for (var i = 0; i < ranges.length; i++) {
        var open = toMinutes(ranges[i].open);
        var close = toMinutes(ranges[i].close);
        if (close <= open) close += 24 * 60; // vira a madrugada
        var reference = minutes + offset;
        if (reference >= open && reference < close) {
          return { open: true, closesAt: ranges[i].close };
        }
      }
      return null;
    }

    var today = check(day, 0);
    if (today) return today;
    var yesterday = check((day + 6) % 7, 24 * 60); // faixa aberta ontem que ainda corre
    if (yesterday) return yesterday;

    // Próxima abertura, olhando até 7 dias à frente.
    for (var ahead = 0; ahead < 8; ahead++) {
      var index = (day + ahead) % 7;
      var ranges = hours[index] || hours[String(index)] || [];
      for (var r = 0; r < ranges.length; r++) {
        if (ahead > 0 || toMinutes(ranges[r].open) > minutes) {
          return { open: false, nextDay: index, nextTime: ranges[r].open, daysAhead: ahead };
        }
      }
    }
    return { open: false };
  }

  var DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  function nextOpeningLabel(status) {
    if (!status || status.open || status.nextTime == null) return 'Fechado no momento';
    if (status.daysAhead === 0) return 'Abre hoje às ' + status.nextTime;
    if (status.daysAhead === 1) return 'Abre amanhã às ' + status.nextTime;
    return 'Abre ' + DAY_NAMES[status.nextDay] + ' às ' + status.nextTime;
  }

  function orderCode(date) {
    var d = date || new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return '' + pad(d.getDate()) + pad(d.getMonth() + 1) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  /*
   * Monta o texto do pedido. É o que o cliente envia para o WhatsApp do
   * restaurante — precisa ser legível direto na conversa, sem depender do site.
   */
  function buildOrderMessage(context) {
    var restaurant = context.restaurant;
    var cart = context.cart;
    var customer = context.customer;
    var totals = context.totals;
    var store = global.MenuQRStore;
    var now = context.now || new Date();
    var lines = [];

    lines.push('*NOVO PEDIDO — ' + restaurant.name + '*');
    lines.push('Pedido #' + orderCode(now) + ' · ' + now.toLocaleDateString('pt-BR') + ' às ' +
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    lines.push('');
    lines.push('*🧾 Itens*');

    cart.forEach(function (line) {
      var found = store.findItem(line.itemId);
      lines.push(line.qty + 'x ' + line.name + ' — ' + money(line.unitPrice * line.qty));
      if (found) {
        store.describeSelections(found.item, line.selections).forEach(function (group) {
          lines.push('   • ' + group.group + ': ' + group.values.join(', '));
        });
      }
      if (line.notes) lines.push('   • Obs.: ' + line.notes);
    });

    lines.push('');
    lines.push('*💰 Valores*');
    lines.push('Subtotal: ' + money(totals.subtotal));
    if (customer.mode === 'delivery') {
      lines.push('Entrega: ' + (totals.deliveryFee > 0 ? money(totals.deliveryFee) : 'Grátis'));
    }
    lines.push('*Total: ' + money(totals.total) + '*');

    lines.push('');
    lines.push('*👤 Cliente*');
    lines.push('Nome: ' + customer.name);
    lines.push('WhatsApp: ' + maskPhone(customer.phone));

    lines.push('');
    if (customer.mode === 'delivery') {
      var zone = store.zoneById(customer.zoneId);
      lines.push('*🛵 Entrega*');
      lines.push('Endereço: ' + customer.street + ', ' + customer.number +
        (customer.complement ? ' — ' + customer.complement : ''));
      lines.push('Bairro: ' + (zone ? zone.name : '-'));
      if (customer.reference) lines.push('Referência: ' + customer.reference);
      if (zone && zone.eta) lines.push('Previsão: ' + zone.eta);
    } else {
      lines.push('*🏠 Retirada no local*');
      lines.push(restaurant.address || '');
      if (restaurant.pickup && restaurant.pickup.eta) lines.push('Previsão: ' + restaurant.pickup.eta);
    }

    lines.push('');
    lines.push('*💳 Pagamento*');
    lines.push(customer.payment || 'A combinar');
    if (customer.payment === 'Dinheiro') {
      var change = parseMoneyInput(customer.changeFor);
      lines.push(change > totals.total
        ? 'Troco para ' + money(change) + ' (levar ' + money(change - totals.total) + ')'
        : 'Não precisa de troco');
    }
    if (customer.payment === 'Pix' && restaurant.pixKey) {
      lines.push('Chave Pix: ' + restaurant.pixKey);
    }

    if (customer.notes) {
      lines.push('');
      lines.push('*📝 Observações*');
      lines.push(customer.notes);
    }

    if (context.scheduled) {
      lines.push('');
      lines.push('_Pedido enviado com a loja fechada — favor confirmar o horário._');
    }

    return lines.join('\n');
  }

  function whatsappLink(phone, message) {
    return 'https://wa.me/' + onlyDigits(phone) + '?text=' + encodeURIComponent(message);
  }

  global.MenuQRUtils = {
    money: money,
    onlyDigits: onlyDigits,
    maskPhone: maskPhone,
    isValidPhone: isValidPhone,
    parseMoneyInput: parseMoneyInput,
    openingStatus: openingStatus,
    nextOpeningLabel: nextOpeningLabel,
    orderCode: orderCode,
    buildOrderMessage: buildOrderMessage,
    whatsappLink: whatsappLink,
    DAY_NAMES: DAY_NAMES
  };
})(window);
