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

  if (document.querySelector('.menu-tab')) {
    initMenuTabs();

    document.querySelectorAll<HTMLElement>('.link-as-button[data-tab]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = document.querySelector<HTMLElement>(`.menu-tab[data-tab="${el.dataset.tab}"]`);
        target?.click();
      });
    });

    if (window.location.hash === '#specials') {
      const specialsTab = document.querySelector<HTMLElement>('.menu-tab[data-tab="specials"]');
      specialsTab?.click();
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
