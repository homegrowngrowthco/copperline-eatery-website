// Google Sheets Configuration
const SHEET_ID = '1i-lXjDxKOfwmOCfM9oBKUS4X7zYl65JFcIwJ2RydLA0';
const SHEET_NAME = 'Specials';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            if (mainNav && mainNav.classList.contains('active')) {
                mainNav.classList.remove('active');
            }
        });
    });

    // Initialize reviews carousel
    initReviewsCarousel();

    // Initialize menu tabs (only on menu page)
    if (document.querySelector('.menu-tab')) {
        initMenuTabs();
        loadDailySpecials();
        
        // Handle URL hash for direct linking to specials
        if (window.location.hash === '#specials') {
            const specialsTab = document.querySelector('[data-tab="specials"]');
            if (specialsTab) {
                specialsTab.click();
            }
        }
        
        // Listen for hash changes (when clicking nav links while on menu page)
        window.addEventListener('hashchange', function() {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const targetTab = document.querySelector(`[data-tab="${hash}"]`);
                if (targetTab) {
                    targetTab.click();
                    // Close mobile menu after navigation
                    if (mainNav && mainNav.classList.contains('active')) {
                        mainNav.classList.remove('active');
                    }
                }
            }
        });
    }
});

// Reviews Carousel
function initReviewsCarousel() {
    const carousel = document.getElementById('reviewsCarousel');
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.review-slide');
    const prevBtn = document.getElementById('prevReview');
    const nextBtn = document.getElementById('nextReview');
    const dotsContainer = document.getElementById('carouselDots');
    
    let currentSlide = 0;
    const totalSlides = slides.length;

    // Create dots
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        dotsContainer.appendChild(dot);
    }

    const dots = dotsContainer.querySelectorAll('.carousel-dot');

    function updateSlide() {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlide();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateSlide();
    }

    function goToSlide(index) {
        currentSlide = index;
        updateSlide();
    }

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Auto-rotate every 6 seconds
    setInterval(nextSlide, 6000);
}

// Menu Tabs
function initMenuTabs() {
    const tabs = document.querySelectorAll('.menu-tab');
    const panels = document.querySelectorAll('.menu-panel-page');
    const pageHeader = document.querySelector('.page-header h1');
    const pageSubheader = document.querySelector('.page-header p');

    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const targetPanel = this.getAttribute('data-tab');

            // Remove active class
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class
            this.classList.add('active');
            const panel = document.getElementById(targetPanel);
            if (panel) {
                panel.classList.add('active');
            }

            // Update page header based on tab
            if (pageHeader && pageSubheader) {
                if (targetPanel === 'specials') {
                    pageHeader.textContent = "Today's Specials";
                    pageSubheader.textContent = "Subject to change. Please call us to confirm today's specials.";
                } else {
                    pageHeader.textContent = "Our Menu";
                    pageSubheader.textContent = "Homemade breakfast & lunch made fresh daily";
                }
            }

            // Update URL hash without scrolling using pushState
            if (history.pushState) {
                history.pushState(null, null, '#' + targetPanel);
            }

            // Load specials if needed
            if (targetPanel === 'specials') {
                const specialsContent = document.getElementById('specialsContent');
                if (specialsContent && specialsContent.querySelector('.loading')) {
                    loadDailySpecials();
                }
            }
        });
    });
}

// Load Daily Specials from Google Sheets
async function loadDailySpecials() {
    const specialsContent = document.getElementById('specialsContent');
    if (!specialsContent) return;
    
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;
        
        const hasSpecials = rows.some(row => {
            const specialName = row.c[2]?.v;
            return specialName && specialName.trim() !== '';
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
        rows.forEach(row => {
            const specialName = row.c[2]?.v;
            const price = row.c[3]?.v;        // Price is column 3
            let description = row.c[4]?.v;     // Description is column 4

            // Clean description - remove $ symbols
            if (description) {
                description = String(description)
                    .replace(/\$/g, '')
                    .trim();
            }

            if (specialName && specialName.trim() !== '') {
                const cleanName = escapeHtml(specialName);
                const cleanPrice = price ? escapeHtml(String(price)) : '';
                const cleanDesc = description ? escapeHtml(description) : '';
                
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Refresh specials every 5 minutes
setInterval(function() {
    const specialsPanel = document.getElementById('specials');
    if (specialsPanel && specialsPanel.classList.contains('active')) {
        loadDailySpecials();
    }
}, 300000);
