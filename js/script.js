/* Dahon Tea Atelier | Project 002 interactions (vanilla JS, no dependencies)
   Modules: header, navigation, anchors + scroll-spy, reveals, hero parallax,
            animated menu filter, product detail modal. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var tabletUp = window.matchMedia('(min-width: 768px)');
  var desktopHover = window.matchMedia('(min-width: 1024px) and (hover: hover)');

  function qs(sel, scope) { return (scope || document).querySelector(sel); }
  function qsa(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------- header */
  var header = qs('[data-header]');
  var toggle = qs('.nav-toggle');
  var toggleLabel = qs('.nav-toggle__label');
  var lastY = window.scrollY;

  function showHeader() { header.classList.remove('is-hidden'); }

  function setMenu(open) {
    header.classList.toggle('is-menu-open', open);
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggleLabel.textContent = open ? 'Close' : 'Menu';
    if (open) { showHeader(); }
  }

  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  tabletUp.addEventListener('change', function (event) { if (event.matches) { setMenu(false); } });
  header.addEventListener('focusin', showHeader);

  function updateHeader() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    if (toggle.getAttribute('aria-expanded') === 'true') { lastY = y; return; }
    // Hide while reading downward, return the moment the person scrolls up
    if (y > lastY + 6 && y > 220) { header.classList.add('is-hidden'); }
    else if (y < lastY - 6 || y <= 220) { showHeader(); }
    lastY = y;
  }

  /* --------------------------------------------- scroll-linked rAF handler */
  var heroArt = qs('.hero-art');
  var ticking = false;

  function updateParallax() {
    if (!heroArt) { return; }
    if (!desktopHover.matches || reduced.matches) { heroArt.style.removeProperty('--p'); return; }
    var p = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.9), 0), 1);
    heroArt.style.setProperty('--p', p.toFixed(3));
  }

  window.addEventListener('scroll', function () {
    if (ticking) { return; }
    ticking = true;
    window.requestAnimationFrame(function () {
      updateHeader();
      updateParallax();
      ticking = false;
    });
  }, { passive: true });
  updateHeader();

  /* ------------------------------------------------ anchors + scroll spy */
  qsa('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = link.getAttribute('href');
      if (id.length < 2) { return; }
      var target = qs(id);
      if (!target) { return; }
      event.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      if (window.history && window.history.pushState) { window.history.pushState(null, '', id); }
      if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); }
      target.focus({ preventScroll: true });
    });
  });

  var navLinks = qsa('.site-nav__link');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        navLinks.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) { link.setAttribute('aria-current', 'true'); }
          else { link.removeAttribute('aria-current'); }
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    navLinks.forEach(function (link) {
      var section = qs(link.getAttribute('href'));
      if (section) { spy.observe(section); }
    });
  }

  /* ---------------------------------------------------------- scroll reveals */
  if ('IntersectionObserver' in window && !reduced.matches) {
    root.classList.add('js');
    if (tabletUp.matches) {
      qsa('.product-card--feature').forEach(function (card, i) {
        card.setAttribute('data-reveal', '');
        card.style.setProperty('--d', (i * 90) + 'ms');
      });
    }
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    qsa('[data-reveal]').forEach(function (el) { revealer.observe(el); });
  }

  /* ------------------------------------------------------------ menu filter */
  var grid = qs('#product-grid');
  var scroller = qs('[data-filter-scroll]');
  var indicator = qs('.filter-bar__indicator');
  var chips = qsa('.chip');
  var cards = qsa('.product-card', grid);
  var status = qs('#menu-status');
  var pendingCommit = null;
  var commitTimer = 0;

  function placeIndicator() {
    var active = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })[0];
    if (!active || !indicator || !active.offsetWidth) { return; }
    indicator.style.width = active.offsetWidth + 'px';
    indicator.style.height = active.offsetHeight + 'px';
    indicator.style.transform = 'translate(' + active.offsetLeft + 'px,' + active.offsetTop + 'px)';
    if (!scroller.classList.contains('has-indicator')) {
      scroller.classList.add('has-indicator');
      // enable the slide transition only after the first placement
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { scroller.classList.add('is-ready'); });
      });
    }
  }

  function pageRect(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left + window.scrollX, top: r.top + window.scrollY };
  }

  function applyFilter(category, label) {
    // Finish any in-flight transition before starting the next one
    if (pendingCommit) { window.clearTimeout(commitTimer); pendingCommit(); }
    cards.forEach(function (c) {
      c.getAnimations().forEach(function (a) { a.cancel(); });
      c.classList.remove('is-leaving');
    });

    function matches(c) { return category === 'all' || c.getAttribute('data-category') === category; }
    var visible = cards.filter(function (c) { return !c.hidden; });
    var staying = visible.filter(matches);
    var leaving = visible.filter(function (c) { return !matches(c); });
    var entering = cards.filter(function (c) { return c.hidden && matches(c); });
    var total = staying.length + entering.length;

    chips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('data-filter') === category));
    });
    placeIndicator();
    status.textContent = 'Showing ' + total + (total === 1 ? ' drink' : ' drinks') + (category === 'all' ? '' : ' in ' + label);

    if (reduced.matches || !grid.animate) {
      leaving.forEach(function (c) { c.hidden = true; });
      entering.forEach(function (c) { c.hidden = false; });
      return;
    }

    var first = new Map();
    staying.forEach(function (c) { first.set(c, pageRect(c)); });
    leaving.forEach(function (c) { c.classList.add('is-leaving'); });

    function commit() {
      pendingCommit = null;
      leaving.forEach(function (c) { c.hidden = true; c.classList.remove('is-leaving'); });
      entering.forEach(function (c) { c.hidden = false; });
      // FLIP: cards that stay glide from their old slot to the new one
      staying.forEach(function (c) {
        var from = first.get(c);
        var to = pageRect(c);
        var dx = from.left - to.left;
        var dy = from.top - to.top;
        if (dx || dy) {
          c.animate(
            [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
            { duration: 420, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' }
          );
        }
      });
      entering.forEach(function (c, i) {
        c.animate(
          [{ opacity: 0, transform: 'translateY(14px) scale(0.98)' }, { opacity: 1, transform: 'none' }],
          { duration: 420, delay: Math.min(i, 8) * 35, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
        );
      });
    }

    if (leaving.length) {
      pendingCommit = commit;
      commitTimer = window.setTimeout(commit, 170);
    } else {
      commit();
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      if (chip.getAttribute('aria-pressed') === 'true') { return; }
      applyFilter(chip.getAttribute('data-filter'), chip.textContent.trim());
      // keep the chosen chip comfortably in view on touch screens
      var left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
      scroller.scrollTo({ left: left, behavior: reduced.matches ? 'auto' : 'smooth' });
    });
  });

  placeIndicator();
  if ('ResizeObserver' in window) { new ResizeObserver(placeIndicator).observe(scroller); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(placeIndicator); }
  window.addEventListener('load', placeIndicator);

  /* ------------------------------------------------------ product detail modal */
  var modal = qs('#product-modal');
  var mEl = {
    media: qs('[data-modal-media]', modal),
    img: qs('[data-modal-img]', modal),
    cat: qs('[data-modal-cat]', modal),
    title: qs('[data-modal-title]', modal),
    badge: qs('[data-modal-badge]', modal),
    desc: qs('[data-modal-desc]', modal),
    notes: qs('[data-modal-notes]', modal),
    price: qs('[data-modal-price]', modal)
  };
  var lastFocus = null;
  var downOnBackdrop = false;

  function fillModal(card) {
    var cardImg = qs('.product-card__img', card);
    var badge = card.getAttribute('data-badge');
    var amount = (qs('.product-card__price', card).textContent.match(/\d[\d,]*/) || [''])[0];
    var peso = document.createElement('span');
    peso.className = 'peso';
    peso.textContent = '₱';

    mEl.media.setAttribute('data-tone', card.getAttribute('data-tone') || '');
    mEl.img.src = cardImg.getAttribute('src');
    mEl.img.alt = cardImg.getAttribute('alt');
    mEl.img.setAttribute('width', cardImg.getAttribute('width'));
    mEl.img.setAttribute('height', cardImg.getAttribute('height'));
    mEl.cat.textContent = qs('.product-card__cat', card).textContent;
    mEl.title.textContent = qs('.product-card__trigger', card).textContent.trim();
    mEl.desc.textContent = qs('.product-card__desc', card).textContent;
    mEl.notes.textContent = (card.getAttribute('data-notes') || '').replace(/ · /g, ', ');
    mEl.price.textContent = '';
    mEl.price.appendChild(peso);
    mEl.price.appendChild(document.createTextNode(amount));
    mEl.badge.hidden = !badge;
    mEl.badge.textContent = badge === 'season' ? 'Seasonal pour' : 'Bestseller';
    modal.scrollTop = 0;
    qs('.product-modal__sheet', modal).scrollTop = 0;
  }

  function openModal(card, opener) {
    lastFocus = opener || document.activeElement;
    fillModal(card);
    modal.classList.remove('is-closing');
    if (typeof modal.showModal === 'function') { modal.showModal(); }
    else { modal.setAttribute('open', ''); }
    root.classList.add('has-modal');
  }

  function closeModal() {
    modal.classList.remove('is-closing');
    if (modal.open) { modal.close(); }
  }

  function requestClose() {
    if (!modal.open || modal.classList.contains('is-closing')) { return; }
    if (reduced.matches) { closeModal(); return; }
    modal.classList.add('is-closing');
    var finished = false;
    function finish() {
      if (finished) { return; }
      finished = true;
      modal.removeEventListener('animationend', onEnd);
      closeModal();
    }
    function onEnd(event) { if (event.target === modal) { finish(); } }
    modal.addEventListener('animationend', onEnd);
    window.setTimeout(finish, 420);
  }

  modal.addEventListener('close', function () {
    root.classList.remove('has-modal');
    if (lastFocus && typeof lastFocus.focus === 'function') { lastFocus.focus({ preventScroll: true }); }
  });
  modal.addEventListener('cancel', function (event) { event.preventDefault(); requestClose(); });
  modal.addEventListener('pointerdown', function (event) { downOnBackdrop = event.target === modal; });
  modal.addEventListener('click', function (event) {
    if (event.target === modal && downOnBackdrop) { requestClose(); }
    downOnBackdrop = false;
  });
  qsa('[data-modal-close]', modal).forEach(function (btn) { btn.addEventListener('click', requestClose); });

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-product-trigger]');
    if (trigger) {
      openModal(trigger.closest('.product-card'), trigger);
      return;
    }
    var opener = event.target.closest('[data-product-open]');
    if (opener) {
      var card = qs('.product-card[data-slug="' + opener.getAttribute('data-product-open') + '"]', grid);
      if (card) { openModal(card, opener); }
    }
  });
})();
