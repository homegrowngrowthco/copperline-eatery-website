declare function gtag(...args: unknown[]): void;

function initVideoFacade() {
  const facade = document.querySelector<HTMLButtonElement>('.video-facade');
  if (!facade) return;
  facade.addEventListener('click', () => {
    const id = facade.dataset.videoId;
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.width = '560';
    iframe.height = '315';
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = 'YouTube video player';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    facade.replaceWith(iframe);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener('click', () => {
      const open = mainNav.classList.toggle('active');
      mobileMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
        mobileMenuToggle?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  initReviewsCarousel();
  initVideoFacade();
  initQuoteBuilder();

  // GA4 conversion event for the catering inquiry form (fires on submit,
  // before the POST navigates to /catering-thanks).
  const cateringForm = document.querySelector<HTMLFormElement>('form[name="catering-inquiry"]');
  cateringForm?.addEventListener('submit', () => {
    if (typeof gtag === 'function') {
      gtag('event', 'catering_inquiry_submit');
    }
  });

  if (document.querySelector('.menu-tab')) {
    initMenuTabs();

    document.querySelectorAll<HTMLElement>('.link-as-button[data-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = document.querySelector<HTMLElement>(`.menu-tab[data-tab="${el.dataset.tab}"]`);
        target?.click();
      });
    });

    // Activate the tab named by the URL hash on initial load (e.g. /menu#catering
    // from the Catering page or /menu#lunch from the homepage lunch section).
    const initialHash = window.location.hash.substring(1);
    if (initialHash) {
      const hashTab = document.querySelector<HTMLElement>(`.menu-tab[data-tab="${initialHash}"]`);
      hashTab?.click();
    }

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const targetTab = document.querySelector<HTMLElement>(`.menu-tab[data-tab="${hash}"]`);
        if (targetTab) {
          targetTab.click();
          if (mainNav && mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
          }
        }
      }
    });
  }
});

// The /catering/quote builder. Every input already exists in the static HTML
// (Netlify parses the deployed page to register the form's fields), so this
// only steps through the sections, enforces each group's choose-N limit,
// totals the estimate, and serializes the picks into the hidden fields that
// make the lead email readable.
function initQuoteBuilder() {
  const found = document.querySelector<HTMLFormElement>('#quoteForm');
  if (!found) return;
  // Typed non-null up front: the helpers below are hoisted function
  // declarations, and TS won't carry the null-guard's narrowing into them.
  const form: HTMLFormElement = found;

  // Steps, the progress rail, and the estimate card are inert without JS, so
  // they only start hiding/showing once we're here.
  form.classList.add('js-on');

  const steps = form.querySelectorAll<HTMLElement>('.quote-step');
  const progressItems = form.querySelectorAll<HTMLElement>('.quote-progress li');
  const panels = form.querySelectorAll<HTMLElement>('.pkg-panel');
  const guestsInput = form.querySelector<HTMLInputElement>('#q-guests');
  const menuError = form.querySelector<HTMLElement>('#quoteMenuError');
  const bar = form.querySelector<HTMLElement>('#quoteBar');
  const barLabel = form.querySelector<HTMLElement>('#quoteBarLabel');
  const barTotal = form.querySelector<HTMLElement>('#quoteBarTotal');
  const selectionField = form.querySelector<HTMLTextAreaElement>('#quoteSelection');
  const perPersonField = form.querySelector<HTMLInputElement>('#quotePerPerson');
  const totalField = form.querySelector<HTMLInputElement>('#quoteTotal');

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const selectedPackage = () =>
    form.querySelector<HTMLInputElement>('input[name="package"]:checked');

  const activePanel = () => {
    const pkg = selectedPackage();
    if (!pkg) return null;
    return form.querySelector<HTMLElement>(`.pkg-panel[data-panel="${pkg.dataset.pkg}"]`);
  };

  function showStep(n: number) {
    steps.forEach((step) => step.classList.toggle('active', step.dataset.step === String(n)));
    progressItems.forEach((item) => {
      const at = Number(item.dataset.step);
      item.classList.toggle('active', at === n);
      item.classList.toggle('done', at < n);
    });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const heading = form.querySelector<HTMLElement>(`.quote-step[data-step="${n}"] .quote-legend`);
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }

  // Native validation for the required fields on the step we're leaving.
  function stepIsValid(n: number): boolean {
    const step = form.querySelector<HTMLElement>(`.quote-step[data-step="${n}"]`);
    if (!step) return true;
    const required = step.querySelectorAll<HTMLInputElement>('input[required], select[required]');
    for (const field of required) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    if (n === 3) return menuIsValid();
    return true;
  }

  // Every group in the chosen package has to have its full complement picked.
  function menuIsValid(): boolean {
    const pkg = selectedPackage();
    if (!pkg) {
      showMenuError('Pick a buffet to build your estimate.');
      return false;
    }
    const panel = activePanel();
    const groups = panel?.querySelectorAll<HTMLElement>('.choice-group') ?? [];
    for (const group of groups) {
      const min = Number(group.dataset.min ?? 0);
      const checked = group.querySelectorAll('.choice-input:checked').length;
      if (checked < min) {
        const label = group.querySelector('.choice-legend')?.firstChild?.textContent?.trim() ?? 'an option';
        showMenuError(`Choose ${min} ${label.toLowerCase()} to finish this buffet.`);
        group.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }
    showMenuError('');
    return true;
  }

  function showMenuError(message: string) {
    if (!menuError) return;
    menuError.textContent = message;
    menuError.hidden = message === '';
  }

  // Only the chosen package's inputs stay enabled, so a buffet the guest looked
  // at and moved on from can never ride along in the submission.
  function syncPanels() {
    const current = selectedPackage()?.dataset.pkg;
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === current;
      panel.hidden = !isActive;
      panel.querySelectorAll<HTMLInputElement>('.choice-input').forEach((input) => {
        input.disabled = !isActive;
      });
    });
    const panel = activePanel();
    panel?.querySelectorAll<HTMLElement>('.choice-group').forEach(enforceGroupLimit);
  }

  function enforceGroupLimit(group: HTMLElement) {
    const max = Number(group.dataset.max ?? 1);
    const multi = group.dataset.multi === 'true';
    const inputs = group.querySelectorAll<HTMLInputElement>('.choice-input');
    const checked = group.querySelectorAll<HTMLInputElement>('.choice-input:checked').length;

    if (multi) {
      // At the limit, the unchosen options grey out rather than silently
      // letting someone pick a third entree we won't honor.
      inputs.forEach((input) => {
        input.disabled = !input.checked && checked >= max;
        input.closest('.choice-option')?.classList.toggle('disabled', input.disabled);
      });
    }

    const status = group.querySelector<HTMLElement>('[data-status]');
    if (status) {
      status.textContent = `${checked} of ${max} selected`;
      status.classList.toggle('complete', checked >= Number(group.dataset.min ?? 1));
    }
  }

  interface Line {
    label: string;
    value: string;
    upcharge: number;
  }

  function collect(): { lines: Line[]; perPerson: number; guests: number; total: number } {
    const pkg = selectedPackage();
    const base = pkg ? Number(pkg.dataset.price ?? 0) : 0;
    const lines: Line[] = [];
    let upcharges = 0;

    const panel = activePanel();
    panel?.querySelectorAll<HTMLElement>('.choice-group').forEach((group) => {
      const picked = Array.from(
        group.querySelectorAll<HTMLInputElement>('.choice-input:checked')
      );
      if (picked.length === 0) return;
      const groupLabel = picked[0].dataset.groupLabel ?? 'Choices';
      const values = picked.map((input) => {
        const up = Number(input.dataset.upcharge ?? 0);
        upcharges += up;
        return up > 0 ? `${input.dataset.label} (+${money(up)}/person)` : `${input.dataset.label}`;
      });
      lines.push({
        label: groupLabel,
        value: values.join(', '),
        upcharge: picked.reduce((sum, i) => sum + Number(i.dataset.upcharge ?? 0), 0),
      });
    });

    const perPerson = base + upcharges;
    const guests = Number(guestsInput?.value ?? 0) || 0;
    return { lines, perPerson, guests, total: perPerson * guests };
  }

  function render() {
    const pkg = selectedPackage();
    const { lines, perPerson, guests, total } = collect();

    const titleEl = form.querySelector<HTMLElement>('#estimatePackage');
    const linesEl = form.querySelector<HTMLElement>('#estimateLines');
    const perPersonEl = form.querySelector<HTMLElement>('#estimatePerPerson');
    const guestsEl = form.querySelector<HTMLElement>('#estimateGuests');
    const totalEl = form.querySelector<HTMLElement>('#estimateTotal');

    if (titleEl) {
      titleEl.textContent = pkg
        ? `${pkg.value} at ${money(Number(pkg.dataset.price ?? 0))} per person`
        : 'No buffet picked yet';
    }

    if (linesEl) {
      linesEl.textContent = '';
      lines.forEach((line) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = line.label;
        const value = document.createElement('strong');
        value.textContent = line.value;
        li.append(label, value);
        linesEl.appendChild(li);
      });

      // The minimum is a real kitchen constraint, so say it plainly rather than
      // blocking the send: an under-count guest can still be quoted by phone.
      const minGuests = Number(pkg?.dataset.minGuests ?? 1);
      if (pkg && guests > 0 && guests < minGuests) {
        const li = document.createElement('li');
        li.className = 'estimate-warning';
        li.textContent = `${pkg.value} normally needs at least ${minGuests} guests. Send this anyway and we'll work it out with you, or pick another buffet.`;
        linesEl.appendChild(li);
      }
    }

    if (perPersonEl) perPersonEl.textContent = money(perPerson);
    if (guestsEl) guestsEl.textContent = guests > 0 ? String(guests) : 'Add a guest count';
    if (totalEl) totalEl.textContent = guests > 0 ? money(total) : money(0);

    if (bar && barLabel && barTotal) {
      bar.hidden = !pkg;
      document.body.classList.toggle('quote-bar-on', Boolean(pkg));
      if (pkg) {
        barLabel.textContent =
          guests > 0
            ? `${money(perPerson)} per person x ${guests} guests`
            : `${money(perPerson)} per person`;
        barTotal.textContent = guests > 0 ? money(total) : 'Add a guest count';
      }
    }

    if (selectionField) {
      const parts: string[] = [];
      if (pkg) {
        parts.push(`${pkg.value} at ${money(Number(pkg.dataset.price ?? 0))} per person`);
        lines.forEach((line) => parts.push(`${line.label}: ${line.value}`));
        const includes = activePanel()?.querySelector('.pkg-panel-includes')?.textContent?.trim();
        if (includes) parts.push(includes);
        const minGuests = Number(pkg.dataset.minGuests ?? 1);
        if (guests > 0 && guests < minGuests) {
          parts.push(`NOTE: below the usual ${minGuests}-guest minimum for this buffet.`);
        }
        parts.push('');
        parts.push(`Per person: ${money(perPerson)}`);
        parts.push(`Guests: ${guests > 0 ? guests : 'not given'}`);
        parts.push(`Estimated food total: ${guests > 0 ? money(total) : 'not calculated'}`);
      }
      selectionField.value = parts.join('\n');
    }
    if (perPersonField) perPersonField.value = perPerson > 0 ? money(perPerson) : '';
    if (totalField) totalField.value = guests > 0 && total > 0 ? money(total) : '';
  }

  form.querySelectorAll<HTMLElement>('.quote-next').forEach((button) => {
    button.addEventListener('click', () => {
      const from = Number(button.closest<HTMLElement>('.quote-step')?.dataset.step ?? 1);
      if (!stepIsValid(from)) return;
      showStep(Number(button.dataset.next ?? from + 1));
    });
  });

  form.querySelectorAll<HTMLElement>('.quote-back').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.back ?? 1)));
  });

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('input[name="package"]')) {
      syncPanels();
      showMenuError('');
    } else if (target.matches('.choice-input')) {
      const group = target.closest<HTMLElement>('.choice-group');
      if (group) enforceGroupLimit(group);
      showMenuError('');
    }
    render();
  });

  guestsInput?.addEventListener('input', render);

  form.addEventListener('submit', (event) => {
    if (!menuIsValid()) {
      event.preventDefault();
      showStep(3);
      return;
    }
    render();
    if (typeof gtag === 'function') {
      gtag('event', 'catering_quote_submit');
    }
  });

  syncPanels();
  render();
}

function initReviewsCarousel() {
  const carousel = document.getElementById('reviewsCarousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll<HTMLElement>('.review-slide');
  const prevBtn = document.getElementById('prevReview');
  const nextBtn = document.getElementById('nextReview');
  const dotsContainer = document.getElementById('carouselDots');
  if (!dotsContainer || slides.length === 0) return;

  let currentSlide = 0;
  const totalSlides = slides.length;

  for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }

  const dots = dotsContainer.querySelectorAll<HTMLElement>('.carousel-dot');

  function updateSlide() {
    slides.forEach((slide) => slide.classList.remove('active'));
    dots.forEach((dot) => dot.classList.remove('active'));
    slides[currentSlide]?.classList.add('active');
    dots[currentSlide]?.classList.add('active');
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlide();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
  }

  function goToSlide(index: number) {
    currentSlide = index;
    updateSlide();
  }

  prevBtn?.addEventListener('click', prevSlide);
  nextBtn?.addEventListener('click', nextSlide);

  let autoRotate: ReturnType<typeof setInterval> | null = setInterval(nextSlide, 6000);
  const pause = () => {
    if (autoRotate) clearInterval(autoRotate);
    autoRotate = null;
  };
  const resume = () => {
    if (!autoRotate) autoRotate = setInterval(nextSlide, 6000);
  };
  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', resume);
  carousel.addEventListener('focusin', pause);
  carousel.addEventListener('focusout', resume);
}

function initMenuTabs() {
  const tabs = document.querySelectorAll<HTMLElement>('.menu-tab');
  const panels = document.querySelectorAll<HTMLElement>('.menu-panel-page');
  const pageHeader = document.querySelector<HTMLElement>('.page-header h1');
  const pageSubheader = document.querySelector<HTMLElement>('.page-header p');
  const mainNav = document.getElementById('mainNav');

  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPanel = tab.getAttribute('data-tab');

      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      const panel = targetPanel ? document.getElementById(targetPanel) : null;
      panel?.classList.add('active');

      if (pageHeader && pageSubheader) {
        if (targetPanel === 'specials') {
          pageHeader.textContent = "Today's Specials";
          pageSubheader.textContent = "Subject to change. Please call us to confirm today's specials.";
        } else {
          pageHeader.textContent = 'Our Menu';
          pageSubheader.textContent = 'Homemade breakfast & lunch made fresh daily';
        }
      }

      if (history.pushState) {
        history.pushState(null, '', '#' + targetPanel);
      }

      if (mainNav?.classList.contains('active')) {
        mainNav.classList.remove('active');
      }
    });

    // ARIA tabs keyboard pattern: arrow/Home/End move + activate the roving tab.
    tab.addEventListener('keydown', (e) => {
      const arr = Array.from(tabs);
      const i = arr.indexOf(tab);
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % arr.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + arr.length) % arr.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = arr.length - 1;
      if (n === -1) return;
      e.preventDefault();
      arr[n].focus();
      arr[n].click();
    });
  });
}

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement | null;
  const link = target?.closest('a[href]') as HTMLAnchorElement | null;
  if (!link || typeof gtag !== 'function') return;
  const href = link.getAttribute('href') || '';
  if (href.startsWith('tel:')) {
    gtag('event', 'click_phone', { link_url: href });
  } else if (href.startsWith('mailto:')) {
    gtag('event', 'click_email', { link_url: href });
  } else if (href.includes('doordash.com')) {
    gtag('event', 'click_doordash', { link_url: href });
  } else if (href.includes('google.com/maps')) {
    gtag('event', 'click_directions', { link_url: href });
  } else if (href.toLowerCase().endsWith('.pdf')) {
    gtag('event', 'download_pdf', { file_name: href.split('/').pop() });
  }
});
