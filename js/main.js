/* ==========================================================================
   Vienna Konditorei: main.js
   Small, dependency free scripts for every page.
   ========================================================================== */

/* --------------------------------------------------------------------------
   OPENING HOURS: the starting hours. Once the hours are saved in the admin
   portal (Hours tab), the portal hours are used instead.
   They are shown in the footer of every page, on the home page and on the
   contact page, and copied into the Google data (JSON-LD) on the home page.
   Use 24 hour times. Set opens to null for a day you are closed.
   PLACEHOLDER: these hours are an example. Please confirm the real hours.
   -------------------------------------------------------------------------- */
var HOURS = [
  {
    days: { en: 'Monday to Friday', nl: 'Maandag t/m vrijdag' },
    schemaDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '08:30',
    closes: '19:00'
  },
  {
    days: { en: 'Saturday', nl: 'Zaterdag' },
    schemaDays: ['Saturday'],
    opens: '09:00',
    closes: '19:00'
  },
  {
    days: { en: 'Sunday', nl: 'Zondag' },
    schemaDays: ['Sunday'],
    opens: '10:00',
    closes: '18:00'
  }
];

(function () {
  'use strict';

  var doc = document.documentElement;
  var lang = (doc.getAttribute('lang') || 'en').slice(0, 2) === 'nl' ? 'nl' : 'en';
  var STORAGE_KEY = 'vk-lang';
  var BAR_KEY = 'vk-nl-bar-dismissed';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function store(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
  }
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ------------------------------------------------------------------------
     Opening hours
     ------------------------------------------------------------------------ */
  var DAY_NAMES = {
    en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    nl: ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
  };
  var hoursRows = HOURS;   // the weekly hours (replaced by the admin portal settings when present)
  var specialDays = [];    // holidays and other special days from the admin portal

  function hoursText(row) {
    if (!row.opens) return lang === 'nl' ? 'Gesloten' : 'Closed';
    return row.opens + ' – ' + row.closes;
  }

  // Turns seven days into short rows, for example "Monday to Friday".
  function rowsFromWeek(week) {
    var rows = [];
    var start = 0;
    for (var i = 1; i <= 7; i++) {
      var same = i < 7 && week[i].closed === week[start].closed && week[i].opens === week[start].opens && week[i].closes === week[start].closes;
      if (same) continue;
      var end = i - 1;
      var names = {};
      ['en', 'nl'].forEach(function (l) {
        var d = DAY_NAMES[l];
        if (end === start) names[l] = d[start];
        else if (end === start + 1) names[l] = d[start] + (l === 'nl' ? ' en ' : ' and ') + d[end].toLowerCase().replace(/^./, function (c) { return l === 'nl' ? c : c.toUpperCase(); });
        else names[l] = d[start] + (l === 'nl' ? ' t/m ' + d[end].toLowerCase() : ' to ' + d[end]);
      });
      rows.push({
        days: names,
        schemaDays: DAY_NAMES.en.slice(start, end + 1),
        opens: week[start].closed ? null : week[start].opens,
        closes: week[start].closed ? null : week[start].closes
      });
      start = i;
    }
    return rows;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // Special days from today up to about two months ahead.
  function upcomingSpecial() {
    var today = todayIso();
    var limit = new Date(Date.now() + 62 * 86400000).toISOString().slice(0, 10);
    return specialDays.filter(function (d) { return d.date >= today && d.date <= limit; }).slice(0, 6);
  }

  function renderHours() {
    var html = hoursRows.map(function (row) {
      return '<dt>' + escapeHtml(row.days[lang]) + '</dt><dd>' + hoursText(row) + '</dd>';
    }).join('');
    html += upcomingSpecial().map(function (d) {
      var parts = d.date.split('-');
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      var label = date.toLocaleDateString(lang === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
      if (d.label && d.label[lang]) label += ', ' + d.label[lang];
      return '<dt class="hours-special">' + escapeHtml(label) + '</dt><dd class="hours-special">' + hoursText(d.closed ? {} : d) + '</dd>';
    }).join('');
    $all('[data-hours]').forEach(function (el) { el.innerHTML = html; });

    // Keep the structured data for search engines in sync.
    var ld = document.getElementById('ld-business');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        data.openingHoursSpecification = hoursRows.filter(function (r) { return r.opens; }).map(function (r) {
          return { '@type': 'OpeningHoursSpecification', dayOfWeek: r.schemaDays, opens: r.opens, closes: r.closes };
        });
        var special = upcomingSpecial();
        if (special.length) {
          data.specialOpeningHoursSpecification = special.map(function (d) {
            return { '@type': 'OpeningHoursSpecification', validFrom: d.date, validThrough: d.date, opens: d.closed ? '00:00' : d.opens, closes: d.closed ? '00:00' : d.closes };
          });
        } else {
          delete data.specialOpeningHoursSpecification;
        }
        ld.textContent = JSON.stringify(data, null, 2);
      } catch (e) { /* leave the static data in place */ }
    }
  }

  /* ------------------------------------------------------------------------
     Header: smaller with a thin line once you scroll
     ------------------------------------------------------------------------ */
  function initHeader() {
    var header = $('[data-header]');
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     Mobile menu: full screen overlay, keyboard friendly
     ------------------------------------------------------------------------ */
  function initMobileMenu() {
    var toggle = $('[data-nav-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    var label = toggle.querySelector('.visually-hidden');
    var labels = lang === 'nl' ? ['Menu openen', 'Menu sluiten'] : ['Open menu', 'Close menu'];

    function focusables() {
      return [toggle].concat($all('a[href], button:not([disabled])', menu));
    }

    function open() {
      // start the list just below the header, wherever it is (the Dutch bar can push it down)
      var header = $('[data-header]');
      if (header) menu.style.paddingTop = Math.round(header.getBoundingClientRect().bottom + 32) + 'px';
      menu.hidden = false;
      // allow the browser to paint before fading in
      window.requestAnimationFrame(function () { menu.classList.add('is-open'); });
      toggle.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = labels[1];
      doc.classList.add('menu-open');
      var first = $('a', menu);
      if (first) first.focus();
    }

    function close(returnFocus) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = labels[0];
      doc.classList.remove('menu-open');
      window.setTimeout(function () { menu.hidden = true; }, reduceMotion ? 0 : 250);
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') close(false); else open();
    });

    document.addEventListener('keydown', function (e) {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { close(true); return; }
      if (e.key === 'Tab') {
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    $all('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { close(false); });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 960 && toggle.getAttribute('aria-expanded') === 'true') close(false);
    });
  }

  /* ------------------------------------------------------------------------
     Language: remember the choice, and politely suggest Dutch once
     ------------------------------------------------------------------------ */
  function initLanguage() {
    $all('[data-set-lang]').forEach(function (a) {
      a.addEventListener('click', function () { store(STORAGE_KEY, a.getAttribute('data-set-lang')); });
    });

    var bar = $('[data-nl-bar]');
    if (!bar) return;
    var chosen = read(STORAGE_KEY);
    var dismissed = read(BAR_KEY);
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']);
    var prefersDutch = String(langs[0] || '').toLowerCase().indexOf('nl') === 0;

    // Never redirect. Only show the bar to Dutch browsers that did not pick English themselves.
    if (prefersDutch && chosen !== 'en' && !dismissed) {
      bar.hidden = false;
    }
    var closeBtn = $('[data-nl-bar-close]', bar);
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        bar.hidden = true;
        store(BAR_KEY, '1');
      });
    }
  }

  /* ------------------------------------------------------------------------
     Soft fade up on scroll
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = $all('.reveal');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Menu: rendered from js/menu-data.js (the HTML also holds a copy for SEO)
     ------------------------------------------------------------------------ */
  function formatPrice(value) {
    if (value === null || value === undefined) return '';
    var n = Number(value).toFixed(2);
    return lang === 'nl' ? '€ ' + n.replace('.', ',') : '€' + n;
  }

  function itemHtml(item, labels) {
    var cls = 'menu-item' + (item.highlight ? ' menu-item--highlight' : '');
    var out = '<li class="' + cls + '">';
    if (item.highlight) out += '<span class="eyebrow">' + escapeHtml(labels.special) + '</span>';
    out += '<div class="menu-item-line"><span class="menu-item-name">' + escapeHtml(item.name) + '</span>';
    if (item.price !== null && item.price !== undefined) {
      out += '<span class="menu-item-leader" aria-hidden="true"></span><span class="menu-item-price">' + formatPrice(item.price) + '</span>';
    }
    out += '</div>';
    if (item.desc) out += '<p class="menu-item-desc">' + escapeHtml(item.desc[lang]) + '</p>';
    return out + '</li>';
  }

  function renderMenu() {
    var data = window.MENU_DATA;
    if (!data) return;
    var labels = data.labels[lang];

    var root = document.getElementById('menu-root');
    if (root) {
      root.innerHTML = data.categories.map(function (cat) {
        var out = '<section class="menu-category" id="' + cat.id + '" aria-labelledby="' + cat.id + '-title">';
        out += '<div class="menu-category-head"><h2 id="' + cat.id + '-title">' + escapeHtml(cat.title[lang]) + '</h2>';
        if (cat.note) out += '<p class="menu-category-note">' + escapeHtml(cat.note[lang]) + '</p>';
        out += '</div>';
        cat.groups.forEach(function (group) {
          out += '<div class="menu-group">';
          if (group.title) {
            out += '<h3 class="menu-group-title">' + escapeHtml(group.title[lang]);
            if (group.note) out += ' <small>' + escapeHtml(group.note[lang]) + '</small>';
            out += '</h3>';
          }
          out += '<ul class="menu-list">' + group.items.map(function (i) { return itemHtml(i, labels); }).join('') + '</ul></div>';
        });
        return out + '</section>';
      }).join('');
    }

    $all('[data-menu-teaser]').forEach(function (list) {
      var wanted = list.getAttribute('data-menu-teaser').split('|');
      var all = [];
      data.categories.forEach(function (c) { c.groups.forEach(function (g) { all = all.concat(g.items); }); });
      var html = wanted.map(function (name) {
        var found = all.filter(function (i) { return i.name === name; })[0];
        return found ? itemHtml(found, labels) : '';
      }).join('');
      if (html) list.innerHTML = html;
    });
  }

  var menuNavObserver = null;

  // The category bar follows the menu data, so new categories appear by themselves.
  function renderMenuNav() {
    var nav = $('[data-menu-nav]');
    var data = window.MENU_DATA;
    if (!nav || !data) return;
    $('ul', nav).innerHTML = data.categories.map(function (cat) {
      return '<li><a href="#' + cat.id + '">' + escapeHtml((cat.nav || cat.title)[lang]) + '</a></li>';
    }).join('');
  }

  function initMenuNav() {
    var nav = $('[data-menu-nav]');
    if (!nav) return;
    if (menuNavObserver) menuNavObserver.disconnect();
    var links = $all('a', nav);
    var list = $('ul', nav);
    var sections = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });

    function setActive(id) {
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) {
          a.setAttribute('aria-current', 'true');
          // keep the active category visible in the horizontal bar
          var left = a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2;
          list.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
        } else {
          a.removeAttribute('aria-current');
        }
      });
    }

    if (!('IntersectionObserver' in window)) return;
    var visible = {};
    menuNavObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      for (var i = 0; i < sections.length; i++) {
        if (sections[i] && visible[sections[i].id]) { setActive(sections[i].id); break; }
      }
    }, { rootMargin: '-140px 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { if (s) menuNavObserver.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Live content from the admin portal: menu changes and uploaded photos.
     The page first shows what is in the HTML, then quietly updates.
     The last answer is remembered in the browser so returning visitors
     see the newest menu and photos straight away.
     ------------------------------------------------------------------------ */
  var SITE_KEY = 'vk-site';

  function applyImages(images) {
    if (!images) return;
    var slots = images.slots || {};
    $all('img[src^="/images/"]').forEach(function (img) {
      var file = img.getAttribute('src').split('/').pop();
      if (slots[file]) img.src = '/api/img/' + slots[file];
    });
    var gallery = $('[data-gallery]');
    if (gallery && Array.isArray(images.gallery)) {
      gallery.innerHTML = images.gallery.map(function (g) {
        var file = g.src.split('/').pop();
        var src = slots[file] && g.src.indexOf('/images/') === 0 ? '/api/img/' + slots[file] : g.src;
        var alt = (g.alt && g.alt[lang]) || '';
        return '<li class="reveal is-visible"><div class="media"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt).replace(/"/g, '&quot;') +
          '" width="1200" height="1200" loading="lazy" decoding="async"></div></li>';
      }).join('');
    }
  }

  // Announcement bar at the very top of every page.
  function applyAnnouncement(a) {
    var old = $('[data-announce]');
    if (old) old.parentNode.removeChild(old);
    if (!a || !a.enabled || !a.text || !a.text[lang]) return;
    if (a.until && a.until < todayIso()) return;
    var bar = document.createElement('div');
    bar.className = 'announce';
    bar.setAttribute('data-announce', '');
    bar.setAttribute('role', 'status');
    bar.innerHTML = '<div class="container"><p>' + escapeHtml(a.text[lang]) + '</p></div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Page texts edited in the admin portal. Elements are marked with data-text="key".
  function applyTexts(texts) {
    if (!texts) return;
    $all('[data-text]').forEach(function (el) {
      var value = texts[el.getAttribute('data-text')];
      var text = value && value[lang];
      if (!text) return;
      if (el.hasAttribute('data-text-multi')) {
        el.innerHTML = text.split(/\n\s*\n/).map(function (p) { return '<p>' + escapeHtml(p.trim()).replace(/\n/g, '<br>') + '</p>'; }).join('');
      } else {
        el.textContent = text;
      }
    });
    // Once the owner story is written, the block is no longer a placeholder.
    var story = texts['about.story.text'];
    if (story && story[lang]) {
      $all('[data-story]').forEach(function (el) { el.classList.remove('placeholder-block'); });
      $all('[data-story-tag]').forEach(function (el) { el.hidden = true; });
    }
  }

  // Vacancies: the job cards and the role list in the form.
  function applyJobs(jobs) {
    var list = $('[data-jobs]');
    if (!list || !Array.isArray(jobs)) return;
    var open = jobs.filter(function (j) { return j.open !== false; });
    var apply = lang === 'nl' ? 'Solliciteer' : 'Apply';
    var as = lang === 'nl' ? 'als' : 'as';
    if (open.length) {
      list.innerHTML = open.map(function (j) {
        var title = escapeHtml(j.title[lang]);
        return '<li class="reveal is-visible"><article class="job-card"><h3>' + title + '</h3>' +
          (j.hours && j.hours[lang] ? '<p class="job-meta">' + escapeHtml(j.hours[lang]) + '</p>' : '') +
          (j.desc && j.desc[lang] ? '<p>' + escapeHtml(j.desc[lang]) + '</p>' : '') +
          '<a class="btn btn--outline" href="#apply" data-apply-role="' + j.id + '">' + apply +
          '<span class="visually-hidden"> ' + as + ' ' + title + '</span></a></article></li>';
      }).join('');
    } else {
      list.innerHTML = '<li class="jobs-empty"><p>' + (lang === 'nl'
        ? 'Op dit moment hebben we geen open vacatures. Je kunt altijd een open sollicitatie sturen met het formulier hieronder.'
        : 'We have no open positions right now. You are always welcome to send an open application with the form below.') + '</p></li>';
    }
    var select = document.getElementById('role');
    if (select) {
      var current = select.value;
      select.innerHTML = '<option value="">' + (lang === 'nl' ? 'Kies een functie' : 'Choose a role') + '</option>' +
        open.map(function (j) { return '<option value="' + j.id + '">' + escapeHtml(j.title[lang]) + '</option>'; }).join('') +
        '<option value="open">' + (lang === 'nl' ? 'Open sollicitatie' : 'Open application') + '</option>';
      select.value = current;
      if (!open.length) select.value = 'open';
    }
  }

  function applySettings(settings) {
    if (!settings) return;
    if (settings.hours && settings.hours.week && settings.hours.week.length === 7) {
      hoursRows = rowsFromWeek(settings.hours.week);
      specialDays = settings.hours.special || [];
      renderHours();
    }
    applyAnnouncement(settings.announcement);
    applyTexts(settings.texts);
    applyJobs(settings.jobs);
  }

  function applySite(site) {
    if (!site) return;
    if (site.menu && site.menu.categories) {
      window.MENU_DATA = site.menu;
      renderMenu();
      renderMenuNav();
      initMenuNav();
    }
    applyImages(site.images);
    applySettings(site.settings);
  }

  function initLiveContent() {
    if (!window.fetch) return;
    var cached = read(SITE_KEY);
    if (cached) {
      try { applySite(JSON.parse(cached)); } catch (e) { cached = null; }
    }
    fetch('/api/site', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok && /json/.test(res.headers.get('content-type') || '') ? res.text() : null; })
      .then(function (text) {
        if (!text || text === cached) return;
        var site = JSON.parse(text);
        store(SITE_KEY, text);
        if (cached || site.menu || site.images || site.settings) applySite(site);
      })
      .catch(function () { /* the site works fine without it */ });
  }

  /* ------------------------------------------------------------------------
     Vacancies: "Apply" preselects the role in the form
     ------------------------------------------------------------------------ */
  function initApply() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-apply-role]') : null;
      if (!btn) return;
      var select = document.getElementById('role');
      if (select) select.value = btn.getAttribute('data-apply-role');
      // move focus to the form after the scroll, for keyboard and screen reader users
      window.setTimeout(function () {
        var first = document.getElementById('first-name');
        if (first) first.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 600);
    });
  }

  /* ------------------------------------------------------------------------
     Forms: friendly check on CV size (Netlify accepts up to 8 MB per form)
     ------------------------------------------------------------------------ */
  function initForms() {
    var input = document.getElementById('cv');
    if (!input) return;
    var error = document.getElementById('cv-error');
    var MAX = 8 * 1024 * 1024;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      var tooBig = file && file.size > MAX;
      var notPdf = file && !/\.pdf$/i.test(file.name);
      var msg = '';
      if (notPdf) msg = lang === 'nl' ? 'Upload je cv als PDF.' : 'Please upload your CV as a PDF.';
      else if (tooBig) msg = lang === 'nl' ? 'Dit bestand is te groot. Kies een PDF kleiner dan 8 MB.' : 'This file is too large. Please choose a PDF under 8 MB.';
      input.setCustomValidity(msg);
      if (error) { error.textContent = msg; error.hidden = !msg; }
    });
  }

  renderHours();
  renderMenu();
  initHeader();
  initMobileMenu();
  initLanguage();
  initReveal();
  initMenuNav();
  initLiveContent();
  initApply();
  initForms();
})();
