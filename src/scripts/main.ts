declare function gtag(...args: unknown[]): void;

const SHEET_ID = '1i-lXjDxKOfwmOCfM9oBKUS4X7zYl65JFcIwJ2RydLA0';
const SHEET_NAME = 'Specials';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
    });
  }

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (mainNav && mainNav.classList.contains('active')) {
        mainNav.classList.remove('active');
      }
    });
  });

  initReviewsCarousel();

  if (document.querySelector('.menu-tab')) {
    initMenuTabs();
    loadDailySpecials();

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

      if (targetPanel === 'specials') {
        const specialsContent = document.getElementById('specialsContent');
        if (specialsContent?.querySelector('.loading')) {
          loadDailySpecials();
        }
      }

      if (mainNav?.classList.contains('active')) {
        mainNav.classList.remove('active');
      }
    });
  });
}

async function loadDailySpecials() {
  const specialsContent = document.getElementById('specialsContent');
  if (!specialsContent) return;

  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows;

    const hasSpecials = rows.some((row: { c: Array<{ v?: unknown } | null> }) => {
      const specialName = row.c[2]?.v;
      return typeof specialName === 'string' && specialName.trim() !== '';
    });

    if (!hasSpecials) {
      specialsContent.innerHTML = `
        <div class="no-specials">
          <h4>No Specials Today</h4>
          <p>Daily specials updated each morning.<br>Call us at <a href="tel:+14135948332">(413) 594-8332</a> for today's offerings!</p>
        </div>
      `;
      return;
    }

    let specialsHTML = '';
    rows.forEach((row: { c: Array<{ v?: unknown } | null> }) => {
      const specialName = row.c[2]?.v;
      const price = row.c[3]?.v;
      let description = row.c[4]?.v;

      if (description) {
        description = String(description).replace(/\$/g, '').trim();
      }

      if (typeof specialName === 'string' && specialName.trim() !== '') {
        const cleanName = escapeHtml(specialName);
        const cleanPrice = price ? escapeHtml(String(price)) : '';
        const cleanDesc = description ? escapeHtml(String(description)) : '';

        specialsHTML += `
          <div class="special-item">
            <h4>
              <span>${cleanName}</span>
              ${cleanPrice ? `<span class="special-price">$${cleanPrice}</span>` : ''}
            </h4>
            ${cleanDesc ? `<p>${cleanDesc}</p>` : ''}
          </div>
        `;
      }
    });

    specialsContent.innerHTML = specialsHTML;
  } catch (error) {
    console.error('Error loading specials:', error);
    specialsContent.innerHTML = `
      <div class="no-specials">
        <h4>Unable to Load Specials</h4>
        <p>Please call us at <a href="tel:+14135948332">(413) 594-8332</a> for today's specials!</p>
      </div>
    `;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

setInterval(() => {
  const specialsPanel = document.getElementById('specials');
  if (specialsPanel && specialsPanel.classList.contains('active')) {
    loadDailySpecials();
  }
}, 300000);

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
