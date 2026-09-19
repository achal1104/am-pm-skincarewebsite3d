/**
 * AM-PM Skincare & Nutritions — Luxury Full-Page Scrollytelling Engine
 * Persistent high-fidelity canvas background visible throughout the entire website.
 */

// Configuration
const TOTAL_FRAMES = 300;
// After you convert frames to WebP (see instructions), switch to:
// const FRAME_PATH = (index) => `/frames-lite/ezgif-frame-${String(index).padStart(3, '0')}.webp`;
const FRAME_PATH = (index) => `/frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;

// Fast-loading config
const CRITICAL_COUNT = 10;   // preloader hides once this many frames are ready
const CONCURRENCY = 6;       // parallel downloads (prevents mobile networks choking)
const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
const FRAME_STEP = IS_MOBILE ? 2 : 1; // mobile loads every 2nd frame (150 instead of 300)

// State
const images = [];
let loadedCount = 0;
let currentFrame = 1;
let targetFrame = 1;
let isLoaded = false;
let lastDrawnFrame = -1;

// DOM Elements
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // disable alpha for faster & sharper rendering
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderText = document.getElementById('preloader-text');
const navbar = document.getElementById('navbar');

// HUD Elements
const frameCounter = document.getElementById('frame-counter');
const phaseTag = document.getElementById('phase-tag');
const progressThumb = document.getElementById('progress-thumb');

// Hero Story Cards
const storyAm = document.getElementById('story-am');
const storyTransition = document.getElementById('story-transition');
const storyPm = document.getElementById('story-pm');
const storySystem = document.getElementById('story-system');
const heroSection = document.getElementById('hero');

// Cart Elements
const openCartBtn = document.getElementById('open-cart-btn');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartBackdrop = document.getElementById('cart-backdrop');
const cartCounter = document.getElementById('cart-counter');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotal = document.getElementById('cart-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutModal = document.getElementById('checkout-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const continueShoppingBtn = document.getElementById('continue-shopping');
const toast = document.getElementById('toast');

// Pricing Toggle Elements
const subscriptionToggle = document.getElementById('subscription-toggle');
const toggleLabelOneTime = document.getElementById('toggle-label-onetime');
const toggleLabelSub = document.getElementById('toggle-label-sub');

// Shopping Cart State
let cart = [];

/**
 * Smart preload:
 * 1) Load a spread of key frames first (covers the whole scroll range)
 * 2) Hide the preloader as soon as the first few are ready
 * 3) Keep loading the remaining frames silently in the background
 */
function buildLoadOrder() {
  const all = [];
  for (let i = 1; i <= TOTAL_FRAMES; i += FRAME_STEP) all.push(i);
  if (all[all.length - 1] !== TOTAL_FRAMES) all.push(TOTAL_FRAMES);

  const coarse = all.filter((_, idx) => idx % 8 === 0); // evenly spread key frames
  const coarseSet = new Set(coarse);
  const rest = all.filter((f) => !coarseSet.has(f));
  return [...coarse, ...rest];
}

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      images[i] = img;
      // if the user is parked on a frame that was showing a fallback, redraw it
      if (isLoaded && Math.round(currentFrame) === i) renderFrame(i);
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = FRAME_PATH(i);
  });
}

function preloadFrames() {
  return new Promise((resolve) => {
    const order = buildLoadOrder();
    const criticalTotal = Math.min(CRITICAL_COUNT, order.length);
    let criticalDone = 0;
    let next = 0;
    let dismissed = false;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      isLoaded = true;
      if (preloader) preloader.classList.add('hidden');
      resolve();
    };

    const onDone = (idx) => {
      loadedCount++;
      if (idx < criticalTotal) {
        criticalDone++;
        const percent = Math.round((criticalDone / criticalTotal) * 100);
        if (preloaderBar) preloaderBar.style.width = `${percent}%`;
        if (preloaderText) preloaderText.innerText = `${percent}% Loaded`;
        if (criticalDone >= criticalTotal) setTimeout(dismiss, 150);
      }
    };

    async function worker() {
      while (next < order.length) {
        const idx = next++;
        await loadFrame(order[idx]);
        onDone(idx);
      }
    }

    for (let w = 0; w < CONCURRENCY; w++) worker();

    // safety net: never keep the user waiting more than 5s on a slow network
    setTimeout(dismiss, 5000);
  });
}

/**
 * Resize canvas to match display size with high-DPI scaling (Retina/4K crispness)
 */
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 for performance & sharpness
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  lastDrawnFrame = -1; // force redraw
  renderFrame(Math.round(currentFrame));
}

/**
 * Draw frame to canvas with high quality cover scaling
 */
function renderFrame(frameIndex) {
  let img = images[frameIndex];
  if (!img || !img.complete || img.naturalWidth === 0) {
    for (let offset = 1; offset < 30; offset++) {
      const prev = images[frameIndex - offset];
      if (prev && prev.complete && prev.naturalWidth > 0) {
        img = prev;
        break;
      }
      const next = images[frameIndex + offset];
      if (next && next.complete && next.naturalWidth > 0) {
        img = next;
        break;
      }
    }
  }

  if (!img || !img.complete || img.naturalWidth === 0) return;

  const cWidth = canvas.width;
  const cHeight = canvas.height;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const imgAspect = img.naturalWidth / img.naturalHeight; // 1920 / 1080 = 1.777
  const canvasAspect = cWidth / cHeight;

  let renderWidth, renderHeight, offsetX, offsetY;

  // Detect mobile / vertical portrait screens
  const isPortraitMobile = canvasAspect < 0.88;

  if (isPortraitMobile) {
    // SMART RESPONSIVE MOBILE FRAMING:
    // In Frame 300, both products span from 20% to 65% (45% of image width).
    // We scale the image so this 45% spans ~85% of mobile screen width,
    // ensuring BOTH the AM box and PM bottle fit inside the screen with breathing room!
    // For single bottles (frames 1-220), the bottle is prominent, crisp, and centered.
    renderWidth = Math.min(cWidth * 1.85, cHeight * 0.95 * imgAspect);
    renderHeight = renderWidth / imgAspect;

    // Focal center:
    // Frames 1-220: single bottle is centered at x = 50%
    // Frames 221-300: dual products midpoint is at x = 42.5%
    const focalX = frameIndex >= 220 ? 0.425 : 0.50;
    offsetX = (cWidth / 2) - (renderWidth * focalX);

    // Position vertically in upper 40% of mobile screen so story cards at bottom don't obstruct the bottle
    offsetY = (cHeight * 0.42) - (renderHeight * 0.50);
  } else if (canvasAspect > imgAspect) {
    // Ultra-wide or wide landscape
    renderWidth = cWidth;
    renderHeight = cWidth / imgAspect;
    offsetX = 0;
    offsetY = (cHeight - renderHeight) / 2;
  } else {
    // Standard desktop / laptop — shift slightly left so product is more visible
    // on the left half when the content card is docked to the right
    renderHeight = cHeight;
    renderWidth = cHeight * imgAspect;
    // Shift image left by ~8% of canvas width so subject stays on left half
    offsetX = (cWidth - renderWidth) / 2 - (cWidth * 0.06);
    offsetY = 0;
  }

  ctx.fillStyle = '#050507';
  ctx.fillRect(0, 0, cWidth, cHeight);
  ctx.drawImage(img, Math.round(offsetX), Math.round(offsetY), Math.round(renderWidth), Math.round(renderHeight));
  lastDrawnFrame = frameIndex;
}

/**
 * Update scroll progress across the ENTIRE website from top to bottom!
 */
function updateScrollProgress() {
  const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
  const currentScroll = window.scrollY || window.pageYOffset || 0;

  // Global progress across whole page: 0.0 at top, 1.0 at very bottom of footer
  const progress = totalScrollable > 0 ? Math.max(0, Math.min(1, currentScroll / totalScrollable)) : 0;

  // Map to 300 frames throughout the entire website
  targetFrame = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(progress * (TOTAL_FRAMES - 1)) + 1));

  // Update HUD Indicator
  if (progressThumb) {
    progressThumb.style.width = `${Math.round(progress * 100)}%`;
  }
  if (frameCounter) {
    frameCounter.innerText = `FRAME ${String(targetFrame).padStart(3, '0')} / ${TOTAL_FRAMES}`;
  }

  // Update Phase tag based on frame position
  if (phaseTag) {
    if (targetFrame <= 85) {
      phaseTag.innerText = 'AM PHASE • DAY NUTRITION';
      phaseTag.style.color = 'var(--gold-primary)';
    } else if (targetFrame > 85 && targetFrame <= 165) {
      phaseTag.innerText = 'CIRCADIAN TRANSITION';
      phaseTag.style.color = 'var(--purple)';
    } else if (targetFrame > 165 && targetFrame <= 240) {
      phaseTag.innerText = 'PM PHASE • NIGHT NUTRITION';
      phaseTag.style.color = 'var(--blue-glow)';
    } else {
      phaseTag.innerText = 'THE FULL SYSTEM • 24H SYNERGY';
      phaseTag.style.color = 'var(--yellow-accent)';
    }
  }

  // Update Hero Story cards if inside hero section
  updateHeroStoryCards(currentScroll);
}

/**
 * Handle Hero section narrative card cross-fades
 */
function updateHeroStoryCards(scrollY) {
  if (!heroSection) return;

  const heroRect = heroSection.getBoundingClientRect();

  const heroTop = -heroRect.top;
  const heroHeight = heroSection.offsetHeight - window.innerHeight;

  // Cleanly deactivate hero cards as soon as user transitions to The Problem section
  if (heroRect.bottom <= 60 || heroTop > heroHeight) {
    storyAm?.classList.remove('active');
    storyTransition?.classList.remove('active');
    storyPm?.classList.remove('active');
    storySystem?.classList.remove('active');
    return;
  }

  const heroProgress = Math.max(0, Math.min(1, heroTop / Math.max(1, heroHeight)));

  storyAm?.classList.remove('active');
  storyTransition?.classList.remove('active');
  storyPm?.classList.remove('active');
  storySystem?.classList.remove('active');

  if (heroProgress <= 0.25) {
    storyAm?.classList.add('active');
  } else if (heroProgress > 0.25 && heroProgress <= 0.52) {
    storyTransition?.classList.add('active');
  } else if (heroProgress > 0.52 && heroProgress <= 0.78) {
    storyPm?.classList.add('active');
  } else {
    storySystem?.classList.add('active');
  }
}

/**
 * Smooth Animation Loop (High FPS spring interpolation)
 */
function animationLoop() {
  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.05) {
    currentFrame += diff * 0.18; // smooth spring lerp
    renderFrame(Math.round(currentFrame));
  }

  // Sticky header background + force visibility (fixes mobile scroll-down disappear bug)
  if (navbar) {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    // Force repaint every frame — prevents mobile browsers from dropping
    // the fixed navbar's compositing layer during downward momentum scroll
    navbar.style.opacity = '0.999';
    requestAnimationFrame(() => {
      navbar.style.opacity = '1';
    });
  }

  requestAnimationFrame(animationLoop);
}

/**
 * Toast Notification Utility
 */
function showToast(message) {
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/**
 * Shopping Cart Management
 */
function initCart() {
  openCartBtn?.addEventListener('click', () => {
    cartDrawer?.classList.add('open');
    cartBackdrop?.classList.add('open');
    cartDrawer?.setAttribute('aria-hidden', 'false');
  });

  const closeCart = () => {
    cartDrawer?.classList.remove('open');
    cartBackdrop?.classList.remove('open');
    cartDrawer?.setAttribute('aria-hidden', 'true');
  };

  closeCartBtn?.addEventListener('click', closeCart);
  cartBackdrop?.addEventListener('click', closeCart);
  continueShoppingBtn?.addEventListener('click', closeCart);

  // Quick add buttons inside story overlay
  document.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prodType = e.currentTarget.getAttribute('data-product');
      if (prodType === 'am') {
        addToCart({ id: 'am', name: 'AM Day Nutrition', price: 849, img: '/frames/ezgif-frame-001.jpg' });
      } else if (prodType === 'pm') {
        addToCart({ id: 'pm', name: 'PM Night Nutrition', price: 849, img: '/frames/ezgif-frame-150.jpg' });
      } else {
        addToCart({ id: 'combo', name: 'The Full AM-PM System', price: 1529, img: '/frames/ezgif-frame-300.jpg' });
      }
      cartDrawer?.classList.add('open');
      cartBackdrop?.classList.add('open');
    });
  });

  // Product cards Add to Cart buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget;
      const id = button.getAttribute('data-id');
      const name = button.getAttribute('data-name');
      const price = parseInt(button.getAttribute('data-price'), 10);
      const img = button.getAttribute('data-img');

      addToCart({ id, name, price, img });
      cartDrawer?.classList.add('open');
      cartBackdrop?.classList.add('open');
    });
  });

  // Checkout modal
  checkoutBtn?.addEventListener('click', () => {
    if (cart.length === 0) {
      showToast('Your cart is empty. Add a ritual to checkout.');
      return;
    }
    closeCart();
    checkoutModal?.classList.add('open');
  });

  closeModalBtn?.addEventListener('click', () => {
    checkoutModal?.classList.remove('open');
    cart = [];
    renderCart();
    showToast('Thank you! Order confirmed in demo mode.');
  });
}

function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  renderCart();
  showToast(`Added ${product.name} to your ritual.`);
}

function updateQuantity(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  renderCart();
}

function renderCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCounter) cartCounter.innerText = totalItems;

  const emptyCartState = document.getElementById('empty-cart');
  const cartFooter = document.getElementById('cart-footer');

  if (cart.length === 0) {
    if (emptyCartState) emptyCartState.style.display = 'flex';
    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = '';
      if (emptyCartState) cartItemsContainer.appendChild(emptyCartState);
    }
    if (cartFooter) cartFooter.style.display = 'none';
    if (cartSubtotal) cartSubtotal.innerText = '₹0';
    return;
  }

  if (emptyCartState) emptyCartState.style.display = 'none';
  if (cartFooter) cartFooter.style.display = 'block';

  let subtotal = 0;
  let html = '';

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    html += `
      <div class="cart-item-card">
        <img src="${item.img}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="window.updateCartQty('${item.id}', -1)">-</button>
              <span class="qty-val">${item.quantity}</span>
              <button class="qty-btn" onclick="window.updateCartQty('${item.id}', 1)">+</button>
            </div>
            <button class="remove-item-btn" onclick="window.removeCartItem('${item.id}')">Remove</button>
          </div>
        </div>
      </div>
    `;
  });

  if (cartItemsContainer) cartItemsContainer.innerHTML = html;
  if (cartSubtotal) cartSubtotal.innerText = `₹${subtotal.toLocaleString()}`;
}

// Global cart hooks
window.updateCartQty = (id, delta) => updateQuantity(id, delta);
window.removeCartItem = (id) => {
  cart = cart.filter(i => i.id !== id);
  renderCart();
};

/**
 * Pricing Subscription Toggle
 */
function initPricingToggle() {
  if (!subscriptionToggle) return;

  subscriptionToggle.addEventListener('change', (e) => {
    const isSubscribed = e.target.checked;

    if (isSubscribed) {
      toggleLabelSub?.classList.add('active');
      toggleLabelOneTime?.classList.remove('active');
    } else {
      toggleLabelOneTime?.classList.add('active');
      toggleLabelSub?.classList.remove('active');
    }

    // Update prices on product cards
    document.querySelectorAll('.price-current').forEach(priceEl => {
      const base = priceEl.getAttribute('data-base');
      const sub = priceEl.getAttribute('data-sub');
      const price = isSubscribed ? sub : base;
      priceEl.innerText = `₹${parseInt(price).toLocaleString()}`;
    });

    // Update data-price attribute on Add to Cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      const prodCard = btn.closest('.product-card');
      if (prodCard) {
        const priceEl = prodCard.querySelector('.price-current');
        if (priceEl) {
          const base = priceEl.getAttribute('data-base');
          const sub = priceEl.getAttribute('data-sub');
          btn.setAttribute('data-price', isSubscribed ? sub : base);
        }
      }
    });
  });

  subscriptionToggle.checked = true;
}

/**
 * FAQ Accordion
 */
function initFaq() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      accordionHeaders.forEach(other => {
        other.setAttribute('aria-expanded', 'false');
      });

      header.setAttribute('aria-expanded', !isExpanded);
    });
  });
}

/**
 * Newsletter Form
 */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  const emailInput = document.getElementById('newsletter-email');
  const status = document.getElementById('newsletter-status');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput?.value.trim();
      if (email) {
        if (status) {
          status.innerText = "You're on the priority list. Welcome to the rhythm.";
          status.style.color = "var(--gold-primary)";
        }
        if (emailInput) emailInput.value = '';
        showToast("Welcome to the AM-PM community!");
      }
    });
  }
}

/**
 * Mobile Navigation — Hamburger Menu
 */
function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const navLinks = document.getElementById('nav-links');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (!hamburgerBtn || !navLinks || !backdrop) return;

  function openMenu() {
    navLinks.classList.add('mobile-open');
    backdrop.classList.add('visible');
    hamburgerBtn.classList.add('open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // prevent bg scroll
  }

  function closeMenu() {
    navLinks.classList.remove('mobile-open');
    backdrop.classList.remove('visible');
    hamburgerBtn.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navLinks.classList.contains('mobile-open');
    isOpen ? closeMenu() : openMenu();
  });

  // Close on backdrop click
  backdrop.addEventListener('click', closeMenu);

  // Close when any nav link is clicked
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/**
 * Initialize Everything
 */
async function init() {
  // Dark-only site. Kept as an attribute so any remaining
  // html[data-theme="dark"] CSS rules keep matching.
  document.documentElement.setAttribute('data-theme', 'dark');

  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollProgress();
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      resizeCanvas();
      updateScrollProgress();
    }, 150);
  });
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  initCart();
  initPricingToggle();
  initFaq();
  initNewsletter();
  initMobileNav();

  // Preload key frames, hide the preloader fast, and start render loop
  // (remaining frames continue loading in the background)
  await preloadFrames();
  resizeCanvas();
  updateScrollProgress();
  animationLoop();
}

// Start
document.addEventListener('DOMContentLoaded', init);
/**
 * Scroll Drop-In Animations (cards fall in + golden beans fall behind)
 * PASTE this function into main.js (anywhere above init()), then call
 * initScrollAnimations(); inside init() after initMobileNav();
 */
function initScrollAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const REPLAY = false; // true = animation repeats every time you scroll back to it
  const isMobile = window.innerWidth <= 768;

  const textSel = '.section-badge, .section-title, .section-subtitle, .pricing-toggle-wrapper';
  const cardSel = [
    '.problem-card', '.timeline-card', '.product-card', '.founder-card',
    '.review-card', '.accordion-item', '.trust-item', '.pillars-row',
    '.newsletter-box', '.comparison-table-wrapper'
  ].join(', ');

  // Tag elements + set stagger delay based on position among siblings
  function tag(root, sel, cls, step) {
    root.querySelectorAll(sel).forEach((el) => {
      el.classList.add(cls);
      const sibs = Array.from(el.parentElement.children).filter((c) => c.matches(sel));
      el.style.setProperty('--d', `${sibs.indexOf(el) * step}s`);
    });
  }

  const sections = document.querySelectorAll('.page-content .section');
  sections.forEach((section) => {
    tag(section, textSel, 'reveal-text', 0.1);
    tag(section, cardSel, 'reveal', 0.14);
  });

  // Reveal observer
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add('in');
        if (!REPLAY) revealObserver.unobserve(el);
      } else if (REPLAY) {
        el.classList.remove('in');
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.reveal, .reveal-text').forEach((el) => revealObserver.observe(el));

  // Falling beans when a section enters the screen
  function dropBeans(section) {
    const layer = document.createElement('div');
    layer.className = 'bean-layer';
    section.prepend(layer);

    const h = section.offsetHeight;
    const count = isMobile ? 8 : 16;

    for (let i = 0; i < count; i++) {
      const bean = document.createElement('span');
      bean.className = 'bean';
      bean.style.cssText = [
        `left:${Math.random() * 100}%`,
        `--s:${8 + Math.random() * 10}px`,
        `--x:${(Math.random() - 0.5) * 160}px`,
        `--h:${h * (0.5 + Math.random() * 0.45)}px`,
        `--r:${Math.random() * 720 - 360}deg`,
        `--t:${2.2 + Math.random() * 1.8}s`,
        `--d:${Math.random() * 0.9}s`
      ].join(';');
      layer.appendChild(bean);
    }
    setTimeout(() => layer.remove(), 6500);
  }

  const beanObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        dropBeans(entry.target);
        if (!REPLAY) beanObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  sections.forEach((s) => beanObserver.observe(s));
}