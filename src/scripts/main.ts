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
// only steps through the sections, keeps the menu selects honest, totals the
// estimate, and serializes the picks into the hidden fields that make the lead
// email readable.
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
  const submitError = form.querySelector<HTMLElement>('#quoteSubmitError');
  const preview = form.querySelector<HTMLElement>('#menuPreview');
  const previewList = form.querySelector<HTMLElement>('#menuPreviewList');
  const previewTodo = form.querySelector<HTMLElement>('#menuPreviewTodo');
  const bar = form.querySelector<HTMLElement>('#quoteBar');
  const barLabel = form.querySelector<HTMLElement>('#quoteBarLabel');
  const barTotal = form.querySelector<HTMLElement>('#quoteBarTotal');
  const selectionField = form.querySelector<HTMLTextAreaElement>('#quoteSelection');
  const perPersonField = form.querySelector<HTMLInputElement>('#quotePerPerson');
  const totalField = form.querySelector<HTMLInputElement>('#quoteTotal');

  const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const selectedPackage = () => form.querySelector<HTMLInputElement>('input[name="package"]:checked');

  const activePanel = () => {
    const pkg = selectedPackage();
    if (!pkg) return null;
    return form.querySelector<HTMLElement>(`.pkg-panel[data-panel="${pkg.dataset.pkg}"]`);
  };

  const activeSelects = () =>
    Array.from(activePanel()?.querySelectorAll<HTMLSelectElement>('.choice-select') ?? []);

  const fieldName = (select: HTMLSelectElement) =>
    (form.querySelector(`label[for="${select.id}"]`)?.textContent ?? 'a menu choice')
      .replace('*', '')
      .trim();

  const value = (selector: string) =>
    form.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value.trim() ?? '';

  function showError(el: HTMLElement | null, message: string) {
    if (!el) return;
    el.textContent = message;
    el.hidden = message === '';
  }

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

  // A dish taken in one slot can't be taken again in a sibling slot.
  function syncDuplicates() {
    activePanel()
      ?.querySelectorAll<HTMLElement>('.choice-group')
      .forEach((group) => {
        const selects = Array.from(group.querySelectorAll<HTMLSelectElement>('.choice-select'));
        if (selects.length < 2) return;
        const taken = new Set(selects.map((s) => s.value).filter(Boolean));
        selects.forEach((select) => {
          Array.from(select.options).forEach((option) => {
            if (!option.value) return;
            option.disabled = option.value !== select.value && taken.has(option.value);
          });
        });
      });
  }

  // Only the chosen package's selects stay enabled, so a buffet the guest looked
  // at and moved on from can never ride along in the submission (and a disabled
  // required select doesn't block the form's own validation).
  function syncPanels() {
    const current = selectedPackage()?.dataset.pkg;
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === current;
      panel.hidden = !isActive;
      panel
        .querySelectorAll<HTMLSelectElement>('.choice-select')
        .forEach((select) => (select.disabled = !isActive));
    });
    syncDuplicates();
  }

  function menuIsValid(report: boolean): boolean {
    const pkg = selectedPackage();
    if (!pkg) {
      if (report) {
        showError(menuError, 'Pick a buffet first, then choose what goes on it.');
        form.querySelector('.pkg-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    const missing = activeSelects().filter((select) => !select.value);
    if (missing.length > 0) {
      if (report) {
        // Name exactly what is missing, mark the fields, and let the browser's
        // own bubble point at the first one.
        showError(
          menuError,
          `Your menu isn't finished. Still to choose: ${missing.map(fieldName).join(', ')}.`
        );
        missing.forEach((select) => select.closest('.choice-field')?.classList.add('missing'));
        missing[0].reportValidity();
        missing[0].closest('.choice-field')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    showError(menuError, '');
    return true;
  }

  function stepIsValid(n: number, report: boolean): boolean {
    if (n === 3) return menuIsValid(report);
    const step = form.querySelector<HTMLElement>(`.quote-step[data-step="${n}"]`);
    if (!step) return true;
    const required = step.querySelectorAll<HTMLInputElement>('input[required], select[required]');
    for (const field of required) {
      if (!field.checkValidity()) {
        if (report) field.reportValidity();
        return false;
      }
    }
    return true;
  }

  interface Line {
    label: string;
    value: string;
  }

  function collect(): { lines: Line[]; perPerson: number; guests: number; total: number } {
    const pkg = selectedPackage();
    const base = pkg ? Number(pkg.dataset.price ?? 0) : 0;
    const lines: Line[] = [];
    let upcharges = 0;

    activePanel()
      ?.querySelectorAll<HTMLElement>('.choice-group')
      .forEach((group) => {
        const selects = Array.from(group.querySelectorAll<HTMLSelectElement>('.choice-select'));
        const picks = selects
          .filter((select) => select.value)
          .map((select) => {
            const option = select.selectedOptions[0];
            const up = Number(option?.dataset.upcharge ?? 0);
            upcharges += up;
            // The Hot Item Buffet's chicken dishes are named by preparation
            // ("Marsala", "Lemon"), so carry the optgroup through or the lead
            // email reads "Entrees: Marsala, Shrimp Scampi".
            const parent = option?.parentElement;
            const section = parent instanceof HTMLOptGroupElement ? ` (${parent.label})` : '';
            const premium = up > 0 ? ` (+${money(up)}/person)` : '';
            return `${select.value}${section}${premium}`;
          });
        if (picks.length > 0) {
          lines.push({
            label: selects[0]?.dataset.groupLabel ?? 'Choices',
            value: picks.join(', '),
          });
        }
      });

    const perPerson = base + upcharges;
    const guests = Number(guestsInput?.value ?? 0) || 0;
    return { lines, perPerson, guests, total: perPerson * guests };
  }

  function row(list: HTMLElement, label: string, text: string) {
    const li = document.createElement('li');
    const key = document.createElement('span');
    key.textContent = label;
    const val = document.createElement('strong');
    val.textContent = text;
    li.append(key, val);
    list.appendChild(li);
  }

  function renderPreview() {
    if (!preview || !previewList || !previewTodo) return;
    const pkg = selectedPackage();
    preview.hidden = !pkg;
    if (!pkg) return;

    const { lines, perPerson } = collect();
    previewList.textContent = '';
    row(previewList, pkg.value, `${money(Number(pkg.dataset.price ?? 0))} per person`);
    lines.forEach((line) => row(previewList, line.label, line.value));

    const missing = activeSelects().filter((select) => !select.value);
    previewTodo.textContent =
      missing.length > 0
        ? `Still to choose: ${missing.map(fieldName).join(', ')}.`
        : `Menu complete. ${money(perPerson)} per person.`;
    previewTodo.classList.toggle('complete', missing.length === 0);
  }

  function renderReview() {
    const fill = (el: HTMLElement | null, rows: [string, string][]) => {
      if (!el) return;
      el.textContent = '';
      rows.forEach(([label, text]) => {
        const wrap = document.createElement('div');
        const dt = document.createElement('dt');
        dt.textContent = label;
        const dd = document.createElement('dd');
        dd.textContent = text || 'Not given';
        if (!text) dd.classList.add('empty');
        wrap.append(dt, dd);
        el.appendChild(wrap);
      });
    };

    const raw = value('#q-date');
    const date = raw
      ? new Date(`${raw}T00:00:00`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    fill(form.querySelector('#reviewContact'), [
      ['Name', value('#q-name')],
      ['Phone', value('#q-phone')],
      ['Email', value('#q-email')],
    ]);
    fill(form.querySelector('#reviewEvent'), [
      ['Date', date],
      ['Guests', value('#q-guests')],
      ['Town', value('#q-town')],
      ['Event type', value('#q-type')],
      ['Service', value('#q-service')],
    ]);
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
      lines.forEach((line) => row(linesEl, line.label, line.value));

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
    if (totalEl) totalEl.textContent = money(guests > 0 ? total : 0);

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

    renderPreview();
    renderReview();
  }

  form.querySelectorAll<HTMLElement>('.quote-next').forEach((button) => {
    button.addEventListener('click', () => {
      const from = Number(button.closest<HTMLElement>('.quote-step')?.dataset.step ?? 1);
      if (!stepIsValid(from, true)) return;
      showStep(Number(button.dataset.next ?? from + 1));
    });
  });

  form.querySelectorAll<HTMLElement>('.quote-back').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.back ?? 1)));
  });

  // "Edit" on the review step jumps back to the section it summarises.
  form.querySelectorAll<HTMLElement>('.review-edit').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.goto ?? 1)));
  });

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('input[name="package"]')) {
      syncPanels();
      showError(menuError, '');
    } else if (target.matches('.choice-select')) {
      syncDuplicates();
      target.closest('.choice-field')?.classList.remove('missing');
      if (activeSelects().every((select) => select.value)) showError(menuError, '');
    }
    render();
  });

  form.addEventListener('input', render);

  form.addEventListener('submit', (event) => {
    const firstBad = [1, 2, 3].find((n) => !stepIsValid(n, false));
    if (firstBad) {
      event.preventDefault();
      showError(
        submitError,
        'Some details are still missing, so we sent you back to finish them.'
      );
      showStep(firstBad);
      // Report only once the step is visible: the browser cannot show a
      // validation bubble on a field inside a display:none section.
      window.setTimeout(() => stepIsValid(firstBad, true), 0);
      return;
    }
    showError(submitError, '');
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
