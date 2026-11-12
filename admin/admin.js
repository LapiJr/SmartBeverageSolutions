/* Vienna Konditorei admin portal */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Small DOM builder. Text is always inserted as text, never as HTML.
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'open') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'X-Requested-With': 'vk-admin' }, options.headers || {});
    var body = options.body;
    if (body && !(body instanceof Blob) && typeof body !== 'string') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, { method: options.method || 'GET', headers: headers, body: body, credentials: 'same-origin' })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401 && path.indexOf('/api/admin/') === 0) { showLogin(); }
          if (!res.ok) { var e = new Error(data.error || 'Something went wrong. Please try again.'); e.status = res.status; throw e; }
          return data;
        });
      });
  }

  var state = { user: null, menu: null, savedMenu: '', images: { slots: {}, gallery: null }, settings: null, defaults: { texts: {}, jobs: [] }, loaded: {} };

  /* ------------------------------------------------------------------------
     Sign in and out
     ------------------------------------------------------------------------ */
  function showLogin() {
    $('#app-view').hidden = true;
    $('#login-view').hidden = false;
  }

  function showApp(me) {
    state.user = me;
    $('#user-name').textContent = me.name;
    $('#login-view').hidden = true;
    $('#app-view').hidden = false;
    loadSubmissions();
  }

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var error = $('#login-error');
    error.hidden = true;
    var btn = $('button[type="submit"]', e.target);
    btn.disabled = true;
    api('/api/login', { method: 'POST', body: { user: $('#login-user').value, password: $('#login-password').value } })
      .then(function (me) { $('#login-password').value = ''; showApp(me); })
      .catch(function (err) { error.textContent = err.message; error.hidden = false; })
      .then(function () { btn.disabled = false; });
  });

  $('#logout').addEventListener('click', function () {
    if (menuDirty() && !window.confirm('You have menu changes that are not saved. Sign out anyway?')) return;
    api('/api/logout', { method: 'POST' }).then(function () { window.location.reload(); });
  });

  /* ------------------------------------------------------------------------
     Tabs
     ------------------------------------------------------------------------ */
  var tabs = $all('.tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    var name = tab.id.replace('tab-', '');
    if (name !== 'applications' && name !== 'messages' && name !== 'account' && !state.loaded.site) loadSite();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });

  /* ------------------------------------------------------------------------
     Applications and messages
     ------------------------------------------------------------------------ */
  var BASE_ROLES = { barista: 'Barista', service: 'Service staff / host', kitchen: 'Kitchen assistant', open: 'Open application' };
  var ROLES = new Proxy({}, {
    get: function (_, id) {
      var jobs = (state.settings && state.settings.jobs) || [];
      var job = jobs.filter(function (j) { return j.id === id; })[0];
      return job ? job.title.en : BASE_ROLES[id];
    }
  });
  var DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function fileLink(value) {
    if (!value) return null;
    var url = typeof value === 'string' ? value : value.url;
    if (!url || !/^https:\/\//.test(url)) return null;
    return { url: url, name: (typeof value === 'object' && value.filename) || 'CV' };
  }

  function row(label, value) {
    if (value === null || value === undefined || value === '') return [];
    return [h('dt', { text: label }), h('dd', {}, [value])];
  }

  function deleteButton(entry, what) {
    return h('button', {
      class: 'btn btn--danger btn--small', type: 'button', text: 'Delete',
      onclick: function () {
        if (!window.confirm('Delete this ' + what + ' for good? This cannot be undone.')) return;
        api('/api/admin/submissions/' + entry.id, { method: 'DELETE' })
          .then(loadSubmissions)
          .catch(function (err) { window.alert(err.message); });
      }
    });
  }

  function applicationCard(entry) {
    var d = entry.data;
    var name = [d['first-name'], d['last-name']].filter(Boolean).join(' ') || 'No name';
    var days = DAYS.filter(function (day) { return d['available-' + day]; })
      .map(function (day) { return day.charAt(0).toUpperCase() + day.slice(1); }).join(', ');
    var cv = fileLink(d.cv);
    var rows = [].concat(
      row('Email', d.email ? h('a', { class: 'text-link', href: 'mailto:' + d.email, text: d.email }) : ''),
      row('Phone', d.phone ? h('a', { class: 'text-link', href: 'tel:' + String(d.phone).replace(/[^\d+]/g, ''), text: d.phone }) : ''),
      row('Role', ROLES[d.role] || d.role),
      row('Available days', days),
      row('Hours', d['availability-hours']),
      row('Languages', d.languages),
      row('Motivation', d.motivation),
      row('CV', cv ? h('a', { class: 'text-link', href: cv.url, target: '_blank', rel: 'noopener', text: cv.name }) : 'No CV added')
    );
    return h('details', { class: 'card' }, [
      h('summary', {}, [
        h('span', { class: 'card-name', text: name }),
        h('span', { class: 'tag', text: ROLES[d.role] || d.role || 'Application' }),
        h('span', { class: 'tag tag--plain', text: entry.lang === 'nl' ? 'Dutch form' : 'English form' }),
        h('span', { class: 'card-meta', text: formatDate(entry.created_at) })
      ]),
      h('div', { class: 'card-body' }, [
        h('dl', {}, rows),
        h('div', { class: 'card-actions' }, [
          d.email ? h('a', { class: 'btn btn--small', href: 'mailto:' + d.email + '?subject=' + encodeURIComponent('Your application at Vienna Konditorei'), text: 'Reply by email' }) : null,
          cv ? h('a', { class: 'btn btn--outline btn--small', href: cv.url, target: '_blank', rel: 'noopener', text: 'Open CV' }) : null,
          deleteButton(entry, 'application')
        ])
      ])
    ]);
  }

  function messageCard(entry) {
    var d = entry.data;
    return h('details', { class: 'card' }, [
      h('summary', {}, [
        h('span', { class: 'card-name', text: d.name || 'No name' }),
        h('span', { class: 'tag tag--plain', text: entry.lang === 'nl' ? 'Dutch form' : 'English form' }),
        h('span', { class: 'card-meta', text: formatDate(entry.created_at) })
      ]),
      h('div', { class: 'card-body' }, [
        h('dl', {}, [].concat(
          row('Email', d.email ? h('a', { class: 'text-link', href: 'mailto:' + d.email, text: d.email }) : ''),
          row('Message', d.message)
        )),
        h('div', { class: 'card-actions' }, [
          d.email ? h('a', { class: 'btn btn--small', href: 'mailto:' + d.email + '?subject=' + encodeURIComponent('Your message to Vienna Konditorei'), text: 'Reply by email' }) : null,
          deleteButton(entry, 'message')
        ])
      ])
    ]);
  }

  function fill(list, nodes) {
    list.textContent = '';
    nodes.forEach(function (n) { list.appendChild(n); });
  }

  function loadSubmissions() {
    var apps = $('#applications-list');
    var msgs = $('#messages-list');
    fill(apps, [h('p', { class: 'empty', text: 'Loading…' })]);
    fill(msgs, [h('p', { class: 'empty', text: 'Loading…' })]);
    api('/api/admin/submissions').then(function (data) {
      if (!data.configured) {
        var note = function () {
          return h('p', { class: 'notice' }, ['Form access is not set up yet. Add the ', h('strong', { text: 'NETLIFY_API_TOKEN' }),
            ' setting in Netlify (see the README, "Admin portal") and reload this page.']);
        };
        fill(apps, [note()]); fill(msgs, [note()]);
        return;
      }
      $('#count-applications').textContent = data.applications.length || '';
      $('#count-messages').textContent = data.messages.length || '';
      fill(apps, data.applications.length ? data.applications.map(applicationCard) : [h('p', { class: 'empty', text: 'No applications yet.' })]);
      fill(msgs, data.messages.length ? data.messages.map(messageCard) : [h('p', { class: 'empty', text: 'No messages yet.' })]);
    }).catch(function (err) {
      if (err.status === 401) return;
      var msg = function () { return h('p', { class: 'notice', text: 'The submissions could not be loaded. Check the NETLIFY_API_TOKEN setting in Netlify, then try again.' }); };
      fill(apps, [msg()]); fill(msgs, [msg()]);
    });
  }
  $all('[data-refresh]').forEach(function (b) { b.addEventListener('click', loadSubmissions); });

  /* ------------------------------------------------------------------------
     Menu editor
     ------------------------------------------------------------------------ */
  var openCats = new WeakSet();

  function menuDirty() { return !!state.menu && JSON.stringify(state.menu) !== state.savedMenu; }

  function markMenu(message, cls) {
    var status = $('#menu-status');
    var dirty = menuDirty();
    status.textContent = message || (dirty ? 'You have changes that are not saved yet' : 'No changes');
    status.className = 'save-status' + (cls ? ' ' + cls : dirty ? ' is-dirty' : '');
    $('#menu-save').disabled = !dirty;
    $('#menu-reset').disabled = !dirty;
  }

  var uid = 0;
  function field(label, value, oninput, opts) {
    opts = opts || {};
    var id = 'f' + (++uid);
    return h('div', { class: 'mini' + (opts.wide ? ' wide' : '') }, [
      h('label', { for: id, text: label }),
      h('input', {
        class: 'input input--s', id: id, type: 'text', value: value || '', placeholder: opts.placeholder || null,
        inputmode: opts.inputmode || null, maxlength: opts.max || 200,
        oninput: function (e) { oninput(e.target.value); markMenu(); }
      })
    ]);
  }

  function pairSet(obj, key, lang, value) {
    var cur = obj[key] || { en: '', nl: '' };
    cur[lang] = value;
    obj[key] = (cur.en || cur.nl) ? cur : null;
  }
  var get = function (obj, key, lang) { return obj[key] ? obj[key][lang] || '' : ''; };

  function move(list, index, delta) {
    var to = index + delta;
    if (to < 0 || to >= list.length) return;
    list.splice(to, 0, list.splice(index, 1)[0]);
    renderMenu(); markMenu();
  }

  function iconBtn(label, symbol, onclick, extra) {
    return h('button', { class: 'icon-btn' + (extra && extra.danger ? ' icon-btn--danger' : ''), type: 'button', title: label, 'aria-label': label, text: symbol, disabled: extra && extra.disabled, onclick: onclick });
  }

  function itemRow(group, item, index) {
    var priceText = item.price === null || item.price === undefined ? '' : Number(item.price).toFixed(2);
    return h('div', { class: 'item' }, [
      field('Name', item.name, function (v) { item.name = v; }, { max: 80 }),
      field('Price €', priceText, function (v) {
        var n = parseFloat(String(v).replace(',', '.'));
        item.price = v.trim() === '' || isNaN(n) ? null : Math.round(n * 100) / 100;
      }, { inputmode: 'decimal', placeholder: 'empty = ask staff', max: 8 }),
      field('Description (English)', get(item, 'desc', 'en'), function (v) { pairSet(item, 'desc', 'en', v); }, { wide: true }),
      field('Description (Dutch)', get(item, 'desc', 'nl'), function (v) { pairSet(item, 'desc', 'nl', v); }, { wide: true }),
      h('div', { class: 'item-tools' }, [
        h('label', { class: 'star', title: 'Show this item in a red box' }, [
          h('input', { type: 'checkbox', checked: !!item.highlight, onchange: function (e) { if (e.target.checked) item.highlight = true; else delete item.highlight; markMenu(); } }),
          'Box'
        ]),
        iconBtn('Move up', '↑', function () { move(group.items, index, -1); }, { disabled: index === 0 }),
        iconBtn('Move down', '↓', function () { move(group.items, index, 1); }, { disabled: index === group.items.length - 1 }),
        iconBtn('Delete ' + (item.name || 'item'), '✕', function () {
          if (item.name && !window.confirm('Delete "' + item.name + '" from the menu?')) return;
          group.items.splice(index, 1); renderMenu(); markMenu();
        }, { danger: true })
      ])
    ]);
  }

  function groupBlock(cat, group, gi) {
    var many = cat.groups.length > 1;
    return h('div', { class: 'group' }, [
      h('div', { class: 'group-head' }, [
        h('div', { class: 'mini-grid' }, [
          field('Sub heading (English), optional', get(group, 'title', 'en'), function (v) { pairSet(group, 'title', 'en', v); }, { max: 60 }),
          field('Sub heading (Dutch), optional', get(group, 'title', 'nl'), function (v) { pairSet(group, 'title', 'nl', v); }, { max: 60 })
        ]),
        many ? h('button', {
          class: 'btn btn--danger btn--small', type: 'button', text: 'Delete group',
          onclick: function () {
            if (group.items.length && !window.confirm('Delete this group and its ' + group.items.length + ' items?')) return;
            cat.groups.splice(gi, 1); renderMenu(); markMenu();
          }
        }) : null
      ]),
      h('div', {}, group.items.map(function (item, i) { return itemRow(group, item, i); })),
      h('div', { class: 'row-actions' }, [
        h('button', {
          class: 'btn btn--small', type: 'button', text: '+ Add an item',
          onclick: function () {
            group.items.push({ name: '', price: null, desc: null });
            renderMenu(); markMenu();
            var names = $all('.item .mini:first-child input', $('#menu-editor'));
            var all = [];
            state.menu.categories.forEach(function (c) { c.groups.forEach(function (g) { g.items.forEach(function (it) { all.push(it); }); }); });
            var idx = all.indexOf(group.items[group.items.length - 1]);
            if (names[idx]) names[idx].focus();
          }
        })
      ])
    ]);
  }

  function categoryBlock(cat, ci) {
    var cats = state.menu.categories;
    var count = cat.groups.reduce(function (n, g) { return n + g.items.length; }, 0);
    var details = h('details', { class: 'cat', open: openCats.has(cat) }, [
      h('summary', {}, [
        h('span', { class: 'cat-title', text: get(cat, 'title', 'en') || 'New category' }),
        h('span', { class: 'cat-count', text: count + (count === 1 ? ' item' : ' items') })
      ]),
      h('div', { class: 'cat-body' }, [
        h('div', { class: 'mini-grid' }, [
          field('Category (English)', get(cat, 'title', 'en'), function (v) { pairSet(cat, 'title', 'en', v); cat.nav = cat.title; $('.cat-title', details).textContent = v || 'New category'; }, { max: 60 }),
          field('Category (Dutch)', get(cat, 'title', 'nl'), function (v) { pairSet(cat, 'title', 'nl', v); cat.nav = cat.title; }, { max: 60 }),
          field('Small note (English), optional', get(cat, 'note', 'en'), function (v) { pairSet(cat, 'note', 'en', v); }, { max: 80, placeholder: 'e.g. Served with sourdough' }),
          field('Small note (Dutch), optional', get(cat, 'note', 'nl'), function (v) { pairSet(cat, 'note', 'nl', v); }, { max: 80 })
        ]),
        h('div', {}, cat.groups.map(function (g, gi) { return groupBlock(cat, g, gi); })),
        h('div', { class: 'row-actions' }, [
          h('button', { class: 'btn btn--outline btn--small', type: 'button', text: '+ Add a group', onclick: function () { cat.groups.push({ title: null, note: null, items: [] }); renderMenu(); markMenu(); } }),
          iconBtn('Move category up', '↑', function () { move(cats, ci, -1); }, { disabled: ci === 0 }),
          iconBtn('Move category down', '↓', function () { move(cats, ci, 1); }, { disabled: ci === cats.length - 1 }),
          h('button', {
            class: 'btn btn--danger btn--small', type: 'button', text: 'Delete category',
            onclick: function () {
              if (!window.confirm('Delete the whole category "' + (get(cat, 'title', 'en') || 'New category') + '" with ' + count + ' items?')) return;
              cats.splice(ci, 1); renderMenu(); markMenu();
            }
          })
        ])
      ])
    ]);
    details.addEventListener('toggle', function () { if (details.open) openCats.add(cat); else openCats.delete(cat); });
    return details;
  }

  function renderMenu() {
    fill($('#menu-editor'), state.menu.categories.map(categoryBlock));
  }

  function setMenu(menu) {
    state.menu = JSON.parse(JSON.stringify(menu));
    state.savedMenu = JSON.stringify(state.menu);
    renderMenu();
    markMenu();
  }

  $('#menu-add-category').addEventListener('click', function () {
    var cat = { id: '', nav: null, title: null, note: null, groups: [{ title: null, note: null, items: [] }] };
    state.menu.categories.push(cat);
    openCats.add(cat);
    renderMenu(); markMenu();
    var last = $all('.cat', $('#menu-editor')).pop();
    if (last) { last.scrollIntoView({ block: 'center' }); $('input', last).focus(); }
  });

  $('#menu-reset').addEventListener('click', function () {
    if (!window.confirm('Throw away the changes you have not saved?')) return;
    setMenu(JSON.parse(state.savedMenu));
  });

  $('#menu-save').addEventListener('click', function () {
    var missing = [];
    state.menu.categories.forEach(function (c) {
      if (!get(c, 'title', 'en') && !get(c, 'title', 'nl')) missing.push('a category without a name');
    });
    if (missing.length) { markMenu('Please give every category a name before saving.', 'is-dirty'); return; }
    $('#menu-save').disabled = true;
    markMenu('Saving…');
    api('/api/admin/menu', { method: 'PUT', body: state.menu })
      .then(function (res) { setMenu(res.menu); markMenu('Saved. The website and the PDF update within about a minute.', 'is-ok'); })
      .catch(function (err) { markMenu(err.message, 'is-dirty'); $('#menu-save').disabled = false; });
  });

  window.addEventListener('beforeunload', function (e) {
    if (menuDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ------------------------------------------------------------------------
     Photos
     ------------------------------------------------------------------------ */
  var SLOTS = [
    ['hero-cafe.jpg', 'Home: large photo at the top', '2400 x 1500, wide'],
    ['home-intro.jpg', 'Home: welcome', '1200 x 1600, tall'],
    ['highlight-pastries.jpg', 'Home: fresh pastries and cakes', '900 x 1125, tall'],
    ['highlight-coffee.jpg', 'Home: specialty coffee', '900 x 1125, tall'],
    ['highlight-lunch.jpg', 'Home: breakfast and lunch', '900 x 1125, tall'],
    ['insta-1.jpg', 'Home: Instagram strip 1', '800 x 800, square'],
    ['insta-2.jpg', 'Home: Instagram strip 2', '800 x 800, square'],
    ['insta-3.jpg', 'Home: Instagram strip 3', '800 x 800, square'],
    ['insta-4.jpg', 'Home: Instagram strip 4', '800 x 800, square'],
    ['insta-5.jpg', 'Home: Instagram strip 5', '800 x 800, square'],
    ['insta-6.jpg', 'Home: Instagram strip 6', '800 x 800, square'],
    ['about-hero.jpg', 'About: wide photo at the top', '2400 x 1030, very wide'],
    ['about-cakes.jpg', 'About: cakes and pastries', '1200 x 1500, tall'],
    ['about-coffee.jpg', 'About: coffee and food', '1200 x 1500, tall'],
    ['about-terrace.jpg', 'About: the place / terrace', '1200 x 1500, tall'],
    ['about-team.jpg', 'About: our story', '1200 x 1500, tall'],
    ['vacancies-team.jpg', 'Vacancies', '1200 x 1500, tall'],
    ['contact-cafe.jpg', 'Contact', '1200 x 1500, tall']
  ];
  var DEFAULT_GALLERY = [
    { src: '/images/gallery-1.jpg', alt: { en: 'The cafe interior with wooden tables', nl: 'Het interieur van het café met houten tafels' } },
    { src: '/images/gallery-2.jpg', alt: { en: 'A slice of cake on a small plate', nl: 'Een punt taart op een schoteltje' } },
    { src: '/images/gallery-3.jpg', alt: { en: 'Espresso being poured', nl: 'Espresso die wordt gezet' } },
    { src: '/images/gallery-4.jpg', alt: { en: 'The sunny terrace with a view over the Hofvijver', nl: 'Het zonnige terras met uitzicht op de Hofvijver' } },
    { src: '/images/gallery-5.jpg', alt: { en: 'A sandwich on sourdough bread', nl: 'Een broodje op zuurdesembrood' } },
    { src: '/images/gallery-6.jpg', alt: { en: 'The pastry counter', nl: 'De vitrine met gebak' } }
  ];

  function photoStatus(text, cls) {
    var el = $('#photo-status');
    el.textContent = text || '';
    el.className = 'save-status' + (cls ? ' ' + cls : '');
  }

  // Make the photo smaller in the browser before uploading (max 2000 px, JPEG).
  function shrink(file) {
    return createImageBitmap(file).then(function (bitmap) {
      var max = 2000;
      var scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('This photo could not be read.')); }, 'image/jpeg', 0.82);
      });
    }, function () { throw new Error('This file is not a photo we can read. Please use JPG, PNG or WebP.'); });
  }

  function upload(file) {
    return shrink(file).then(function (blob) {
      return api('/api/admin/images', { method: 'POST', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
    });
  }

  function saveImages(message) {
    photoStatus('Saving…');
    return api('/api/admin/images', { method: 'PUT', body: state.images })
      .then(function (res) { state.images = res.images; renderPhotos(); photoStatus(message || 'Saved', 'is-ok'); })
      .catch(function (err) { photoStatus(err.message, 'is-dirty'); });
  }

  function fileButton(label, onfile, cls) {
    var input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'visually-hidden' });
    input.addEventListener('change', function () { if (input.files[0]) onfile(input.files[0]); input.value = ''; });
    return h('label', { class: 'btn btn--small file-btn ' + (cls || 'btn--outline') }, [label, input]);
  }

  function slotCard(slot) {
    var file = slot[0];
    var key = state.images.slots[file];
    var card = h('div', { class: 'photo' }, [
      h('div', { class: 'media' }, [h('img', { src: key ? '/api/img/' + key : '/images/' + file, alt: '', loading: 'lazy' })]),
      h('p', { class: 'photo-label', text: slot[1] }),
      h('p', { class: 'photo-size', text: 'Best size: ' + slot[2] }),
      h('div', { class: 'row-actions' }, [
        fileButton('Replace', function (f) {
          card.classList.add('is-busy'); photoStatus('Uploading…');
          upload(f).then(function (res) { state.images.slots[file] = res.key; return saveImages('Photo replaced'); })
            .catch(function (err) { photoStatus(err.message, 'is-dirty'); card.classList.remove('is-busy'); });
        }),
        key ? h('button', {
          class: 'btn btn--danger btn--small', type: 'button', text: 'Remove',
          title: 'Remove this photo and go back to the original',
          onclick: function () {
            if (!window.confirm('Remove this photo and show the original again?')) return;
            delete state.images.slots[file]; saveImages('Photo removed');
          }
        }) : null
      ])
    ]);
    return card;
  }

  function galleryCard(list, item, index) {
    var file = item.src.split('/').pop();
    var src = item.src.indexOf('/images/') === 0 && state.images.slots[file] ? '/api/img/' + state.images.slots[file] : item.src;
    var saveSoon;
    function altField(lang, label) {
      var id = 'g' + (++uid);
      return h('div', { class: 'mini' }, [
        h('label', { for: id, text: label }),
        h('input', {
          class: 'input input--s', id: id, type: 'text', maxlength: 140, value: item.alt ? item.alt[lang] || '' : '',
          oninput: function (e) {
            item.alt = item.alt || { en: '', nl: '' };
            item.alt[lang] = e.target.value;
            state.images.gallery = list;
            clearTimeout(saveSoon);
            saveSoon = setTimeout(function () { api('/api/admin/images', { method: 'PUT', body: state.images }).then(function () { photoStatus('Saved', 'is-ok'); }); }, 900);
          }
        })
      ]);
    }
    function reorder(delta) {
      var to = index + delta;
      if (to < 0 || to >= list.length) return;
      list.splice(to, 0, list.splice(index, 1)[0]);
      state.images.gallery = list; saveImages('Order changed');
    }
    return h('div', { class: 'photo' }, [
      h('div', { class: 'media' }, [h('img', { src: src, alt: '', loading: 'lazy' })]),
      altField('en', 'What is in the photo (English)'),
      altField('nl', 'What is in the photo (Dutch)'),
      h('div', { class: 'row-actions' }, [
        iconBtn('Move earlier', '←', function () { reorder(-1); }, { disabled: index === 0 }),
        iconBtn('Move later', '→', function () { reorder(1); }, { disabled: index === list.length - 1 }),
        h('button', {
          class: 'btn btn--danger btn--small', type: 'button', text: 'Remove',
          onclick: function () {
            if (!window.confirm('Remove this photo from the gallery?')) return;
            list.splice(index, 1); state.images.gallery = list; saveImages('Photo removed');
          }
        })
      ])
    ]);
  }

  function galleryList() {
    return Array.isArray(state.images.gallery) ? state.images.gallery : JSON.parse(JSON.stringify(DEFAULT_GALLERY));
  }

  function renderPhotos() {
    var list = galleryList();
    fill($('#gallery-editor'), list.length ? list.map(function (item, i) { return galleryCard(list, item, i); }) : [h('p', { class: 'empty', text: 'The gallery is empty.' })]);
    fill($('#slot-editor'), SLOTS.map(slotCard));
  }

  $('#gallery-add').addEventListener('change', function (e) {
    var file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    photoStatus('Uploading…');
    upload(file).then(function (res) {
      var list = galleryList();
      list.push({ src: res.src, alt: { en: 'Photo of Vienna Konditorei', nl: 'Foto van Vienna Konditorei' } });
      state.images.gallery = list;
      return saveImages('Photo added');
    }).catch(function (err) { photoStatus(err.message, 'is-dirty'); });
  });

  function loadSite() {
    state.loaded.site = true;
    api('/api/admin/site').then(function (site) {
      state.images = site.images || { slots: {}, gallery: null };
      state.images.slots = state.images.slots || {};
      state.settings = site.settings || { hours: null, jobs: null, announcement: null, texts: {} };
      setMenu(site.menu);
      renderPhotos();
      return loadDefaults().then(renderSettings);
    }).catch(function (err) {
      state.loaded.site = false;
      if (err.status !== 401) markMenu(err.message, 'is-dirty');
    });
  }

  /* ------------------------------------------------------------------------
     Settings: hours, vacancies, announcement and page texts
     ------------------------------------------------------------------------ */
  var DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var DEFAULT_WEEK = [
    { closed: false, opens: '08:30', closes: '19:00' }, { closed: false, opens: '08:30', closes: '19:00' },
    { closed: false, opens: '08:30', closes: '19:00' }, { closed: false, opens: '08:30', closes: '19:00' },
    { closed: false, opens: '08:30', closes: '19:00' }, { closed: false, opens: '09:00', closes: '19:00' },
    { closed: false, opens: '10:00', closes: '18:00' }
  ];
  // The texts that can be edited: [key, label, long text?]
  var TEXT_GROUPS = [
    ['Home page', [
      ['home.hero.title', 'Large heading at the top'],
      ['home.hero.sub', 'Line under the heading'],
      ['home.intro.title', 'Welcome: heading'],
      ['home.intro.lede', 'Welcome: first text', true],
      ['home.intro.text', 'Welcome: second text', true]
    ]],
    ['About page', [
      ['about.title', 'Large heading at the top'],
      ['about.lede', 'Text under the heading', true],
      ['about.cakes.title', 'Cakes and pastries: heading'],
      ['about.cakes.text', 'Cakes and pastries: text', true],
      ['about.coffee.title', 'Coffee and food: heading'],
      ['about.coffee.text', 'Coffee and food: text', true],
      ['about.place.title', 'The place: heading'],
      ['about.place.text', 'The place: text', true]
    ]],
    ['About page: owner story', [
      ['about.story.title', 'Heading'],
      ['about.story.text', 'The story. Leave an empty line between paragraphs. Once you save your own text here, the "placeholder" label disappears from the website.', true]
    ]]
  ];

  // Read the original texts and jobs from the website pages themselves.
  function loadDefaults() {
    if (state.loaded.defaults) return Promise.resolve();
    function page(url) {
      return fetch(url).then(function (r) { return r.text(); }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
    }
    function textOf(el) {
      if (el.hasAttribute('data-text-multi')) return $all('p', el).map(function (p) { return p.textContent.trim(); }).join('\n\n');
      return el.textContent.trim();
    }
    return Promise.all([page('/'), page('/nl/'), page('/about.html'), page('/nl/over-ons.html'), page('/vacancies.html'), page('/nl/vacatures.html')])
      .then(function (docs) {
        docs.slice(0, 4).forEach(function (doc, i) {
          var lang = i % 2 ? 'nl' : 'en';
          $all('[data-text]', doc).forEach(function (el) {
            var key = el.getAttribute('data-text');
            state.defaults.texts[key] = state.defaults.texts[key] || { en: '', nl: '' };
            state.defaults.texts[key][lang] = textOf(el);
          });
        });
        var jobs = {};
        [docs[4], docs[5]].forEach(function (doc, i) {
          var lang = i ? 'nl' : 'en';
          $all('.job-card', doc).forEach(function (card, n) {
            var id = $('[data-apply-role]', card).getAttribute('data-apply-role');
            var job = jobs[id] = jobs[id] || { id: id, order: n, title: {}, hours: {}, desc: {}, open: true };
            job.title[lang] = $('h3', card).textContent.trim();
            job.hours[lang] = ($('.job-meta', card) || {}).textContent || '';
            job.desc[lang] = ($('p:not(.job-meta)', card) || {}).textContent || '';
          });
        });
        state.defaults.jobs = Object.keys(jobs).map(function (k) { return jobs[k]; }).sort(function (a, b) { return a.order - b.order; })
          .map(function (j) { delete j.order; return j; });
        state.loaded.defaults = true;
      });
  }

  function setStatus(id, text, cls) {
    var el = document.getElementById(id);
    el.textContent = text || '';
    el.className = 'save-status' + (cls ? ' ' + cls : '');
  }
  function touched(id) { return function () { setStatus(id, 'You have changes that are not saved yet', 'is-dirty'); }; }

  function saveSettings(statusId) {
    setStatus(statusId, 'Saving…');
    return api('/api/admin/settings', { method: 'PUT', body: state.settings })
      .then(function (res) {
        state.settings = res.settings;
        renderSettings();
        setStatus(statusId, 'Saved. The website updates within about a minute.', 'is-ok');
      })
      .catch(function (err) { setStatus(statusId, err.message, 'is-dirty'); });
  }

  function input(label, value, oninput, opts) {
    opts = opts || {};
    var id = 's' + (++uid);
    var control = opts.long
      ? h('textarea', { class: 'textarea textarea--s', id: id, maxlength: opts.max || 3000, oninput: function (e) { oninput(e.target.value); } })
      : h('input', { class: 'input input--s', id: id, type: opts.type || 'text', maxlength: opts.max || 200, value: value || '', disabled: opts.disabled, oninput: function (e) { oninput(e.target.value); } });
    if (opts.long) control.value = value || '';
    return h('div', { class: 'mini' }, [h('label', { for: id, text: label }), control]);
  }
  function check(label, checked, onchange) {
    return h('label', { class: 'star' }, [h('input', { type: 'checkbox', checked: checked, onchange: function (e) { onchange(e.target.checked); } }), label]);
  }

  // ---- hours ----
  function hoursState() {
    if (!state.settings.hours) state.settings.hours = { week: JSON.parse(JSON.stringify(DEFAULT_WEEK)), special: [] };
    return state.settings.hours;
  }

  function renderHours() {
    var hours = hoursState();
    var dirty = touched('hours-status');
    fill($('#week-editor'), hours.week.map(function (day, i) {
      return h('div', { class: 'hrow' }, [
        h('p', { class: 'day', text: DAY_LABELS[i] }),
        input('Opens', day.opens || '', function (v) { day.opens = v; dirty(); }, { type: 'time', disabled: day.closed }),
        input('Closes', day.closes || '', function (v) { day.closes = v; dirty(); }, { type: 'time', disabled: day.closed }),
        check('Closed', day.closed, function (on) { day.closed = on; if (!on) { day.opens = day.opens || '09:00'; day.closes = day.closes || '18:00'; } renderHours(); dirty(); })
      ]);
    }));
    fill($('#special-editor'), hours.special.length ? hours.special.map(function (day, i) {
      day.label = day.label || { en: '', nl: '' };
      return h('div', { class: 'hrow hrow--special' }, [
        input('Date', day.date, function (v) { day.date = v; dirty(); }, { type: 'date' }),
        input('Name (English)', day.label.en, function (v) { day.label.en = v; dirty(); }, { max: 60 }),
        input('Name (Dutch)', day.label.nl, function (v) { day.label.nl = v; dirty(); }, { max: 60 }),
        input('Opens', day.opens || '', function (v) { day.opens = v; dirty(); }, { type: 'time', disabled: day.closed }),
        input('Closes', day.closes || '', function (v) { day.closes = v; dirty(); }, { type: 'time', disabled: day.closed }),
        check('Closed', day.closed, function (on) { day.closed = on; if (!on) { day.opens = day.opens || '10:00'; day.closes = day.closes || '17:00'; } renderHours(); dirty(); }),
        iconBtn('Delete this day', '✕', function () { hours.special.splice(i, 1); renderHours(); dirty(); }, { danger: true })
      ]);
    }) : [h('p', { class: 'empty', text: 'No special days yet.' })]);
  }

  $('#special-add').addEventListener('click', function () {
    hoursState().special.push({ date: '', label: { en: '', nl: '' }, closed: true, opens: null, closes: null });
    renderHours(); touched('hours-status')();
    var rows = $all('#special-editor .hrow'); $('input', rows[rows.length - 1]).focus();
  });
  $('#hours-save').addEventListener('click', function () {
    var hours = hoursState();
    var bad = hours.week.some(function (d) { return !d.closed && (!d.opens || !d.closes); }) ||
      hours.special.some(function (d) { return !d.date || (!d.closed && (!d.opens || !d.closes)); });
    if (bad) { setStatus('hours-status', 'Please fill in a date and both times for every open day.', 'is-dirty'); return; }
    saveSettings('hours-status');
  });

  // ---- vacancies ----
  function jobsState() {
    if (!Array.isArray(state.settings.jobs)) state.settings.jobs = JSON.parse(JSON.stringify(state.defaults.jobs));
    return state.settings.jobs;
  }

  function renderJobs() {
    var jobs = jobsState();
    var dirty = touched('jobs-status');
    fill($('#jobs-editor'), jobs.length ? jobs.map(function (job, i) {
      ['title', 'hours', 'desc'].forEach(function (k) { job[k] = job[k] || { en: '', nl: '' }; });
      function f(label, key, lang, opts) { return input(label, job[key][lang], function (v) { job[key][lang] = v; dirty(); }, opts); }
      return h('div', { class: 'job' + (job.open === false ? ' is-closed' : '') }, [
        h('div', { class: 'mini-grid' }, [f('Job title (English)', 'title', 'en', { max: 60 }), f('Job title (Dutch)', 'title', 'nl', { max: 60 })]),
        h('div', { class: 'mini-grid' }, [f('Hours (English)', 'hours', 'en', { max: 100 }), f('Hours (Dutch)', 'hours', 'nl', { max: 100 })]),
        h('div', { class: 'mini-grid' }, [f('Description (English)', 'desc', 'en', { long: true, max: 500 }), f('Description (Dutch)', 'desc', 'nl', { long: true, max: 500 })]),
        h('div', { class: 'row-actions' }, [
          check('Open (shown on the website)', job.open !== false, function (on) { job.open = on; renderJobs(); dirty(); }),
          iconBtn('Move up', '↑', function () { jobs.splice(i - 1, 0, jobs.splice(i, 1)[0]); renderJobs(); dirty(); }, { disabled: i === 0 }),
          iconBtn('Move down', '↓', function () { jobs.splice(i + 1, 0, jobs.splice(i, 1)[0]); renderJobs(); dirty(); }, { disabled: i === jobs.length - 1 }),
          h('button', { class: 'btn btn--danger btn--small', type: 'button', text: 'Delete', onclick: function () {
            if (!window.confirm('Delete the job "' + (job.title.en || 'New job') + '"? To only hide it, untick "Open" instead.')) return;
            jobs.splice(i, 1); renderJobs(); dirty();
          } })
        ])
      ]);
    }) : [h('p', { class: 'empty', text: 'No job openings. Visitors can still send an open application.' })]);
  }
  $('#jobs-add').addEventListener('click', function () {
    jobsState().push({ id: '', title: { en: '', nl: '' }, hours: { en: '', nl: '' }, desc: { en: '', nl: '' }, open: true });
    renderJobs(); touched('jobs-status')();
    var cards = $all('#jobs-editor .job'); $('input', cards[cards.length - 1]).focus();
  });
  $('#jobs-save').addEventListener('click', function () {
    if (jobsState().some(function (j) { return !j.title.en && !j.title.nl; })) { setStatus('jobs-status', 'Please give every job a title.', 'is-dirty'); return; }
    saveSettings('jobs-status');
  });

  // ---- announcement and texts ----
  var textDraft = {};

  function renderWebsite() {
    var dirty = touched('website-status');
    var a = state.settings.announcement = state.settings.announcement || { enabled: false, text: { en: '', nl: '' }, until: '' };
    a.text = a.text || { en: '', nl: '' };
    fill($('#announce-editor'), [h('div', { class: 'text-group' }, [
      h('div', { class: 'mini-grid' }, [
        input('Message (English)', a.text.en, function (v) { a.text.en = v; dirty(); }, { max: 200 }),
        input('Message (Dutch)', a.text.nl, function (v) { a.text.nl = v; dirty(); }, { max: 200 })
      ]),
      h('div', { class: 'row-actions' }, [
        check('Show the bar on the website', a.enabled, function (on) { a.enabled = on; dirty(); }),
        input('Hide automatically after (optional)', a.until, function (v) { a.until = v; dirty(); }, { type: 'date' })
      ])
    ])]);

    textDraft = {};
    fill($('#texts-editor'), TEXT_GROUPS.map(function (group) {
      return h('div', {}, [
        h('h2', { class: 'panel-sub', text: group[0] }),
        h('div', { class: 'text-group' }, group[1].map(function (def) {
          var key = def[0];
          var saved = state.settings.texts[key] || {};
          var orig = state.defaults.texts[key] || { en: '', nl: '' };
          textDraft[key] = { en: saved.en || orig.en, nl: saved.nl || orig.nl };
          return h('div', {}, [
            h('h3', { class: 'text-label', text: def[1] }),
            h('div', { class: 'mini-grid' }, [
              input('English', textDraft[key].en, function (v) { textDraft[key].en = v; dirty(); }, { long: def[2], max: 3000 }),
              input('Dutch', textDraft[key].nl, function (v) { textDraft[key].nl = v; dirty(); }, { long: def[2], max: 3000 })
            ])
          ]);
        }))
      ]);
    }).concat([h('p', { class: 'note-small', text: 'Tip: empty a field and save to get the original text back.' })]));
  }

  $('#website-save').addEventListener('click', function () {
    var a = state.settings.announcement;
    if (a.enabled && !a.text.en && !a.text.nl) { setStatus('website-status', 'Write a message for the bar, or untick "Show the bar".', 'is-dirty'); return; }
    var texts = {};
    Object.keys(textDraft).forEach(function (key) {
      var orig = state.defaults.texts[key] || { en: '', nl: '' };
      var en = textDraft[key].en.trim();
      var nl = textDraft[key].nl.trim();
      var changedEn = en && en !== orig.en;
      var changedNl = nl && nl !== orig.nl;
      if (changedEn || changedNl) texts[key] = { en: changedEn ? en : '', nl: changedNl ? nl : '' };
    });
    state.settings.texts = texts;
    saveSettings('website-status');
  });

  function renderSettings() {
    renderHours();
    renderJobs();
    renderWebsite();
  }

  /* ------------------------------------------------------------------------
     Account
     ------------------------------------------------------------------------ */
  $('#password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var error = $('#pw-error');
    var ok = $('#pw-ok');
    error.hidden = true; ok.hidden = true;
    var next = $('#pw-next').value;
    var problem = '';
    if (next.length < 10) problem = 'Choose a new password of at least 10 characters.';
    else if (next !== $('#pw-repeat').value) problem = 'The two new passwords are not the same.';
    if (problem) { error.textContent = problem; error.hidden = false; return; }
    api('/api/admin/password', { method: 'POST', body: { current: $('#pw-current').value, next: next } })
      .then(function () { e.target.reset(); ok.hidden = false; })
      .catch(function (err) { error.textContent = err.message; error.hidden = false; });
  });

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  fetch('/api/admin/me', { credentials: 'same-origin' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (me) { if (me && me.user) showApp(me); else showLogin(); })
    .catch(showLogin);
})();
