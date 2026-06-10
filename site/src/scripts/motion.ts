import Lenis from 'lenis';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Smooth-scroll (Lenis) — only when motion is welcome
if (!prefersReducedMotion) {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  // Honour in-page anchor links without fighting Lenis
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -40 });
    });
  });
}

// Intersection-based reveals
const revealNodes = document.querySelectorAll<HTMLElement>('.reveal');
if ('IntersectionObserver' in window && revealNodes.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
  );
  revealNodes.forEach((node) => io.observe(node));
} else {
  revealNodes.forEach((node) => node.classList.add('is-visible'));
}

// Hero parallax — light-touch, no GSAP needed
const hero = document.querySelector<HTMLElement>('[data-hero-parallax]');
if (hero && !prefersReducedMotion) {
  const inner = hero.querySelector<HTMLElement>('.hero-bg');
  const onScroll = () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const offset = window.scrollY;
    if (inner) {
      const translate = Math.min(offset * 0.28, 220);
      const scale = 1 + Math.min(offset / 4000, 0.06);
      inner.style.transform = `translate3d(0, ${translate}px, 0) scale(${scale})`;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Hero ambient video — lazy attach the source only when:
//  · the user hasn't requested reduced motion
//  · they're on a fast enough connection (Save-Data off, downlink > 1.5 Mbps if known)
//  · the hero is still in view
type NetInfo = { saveData?: boolean; downlink?: number; effectiveType?: string };
const ambient = document.getElementById('hero-ambient') as HTMLVideoElement | null;
if (ambient) {
  const src = ambient.dataset.ambientSrc;
  const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
  const onSlow = conn?.saveData === true ||
    (typeof conn?.downlink === 'number' && conn.downlink < 1.5) ||
    conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';

  if (src && !prefersReducedMotion && !onSlow) {
    const start = () => {
      if (ambient.dataset.loaded === 'true') return;
      ambient.dataset.loaded = 'true';
      const source = document.createElement('source');
      source.src = src;
      source.type = 'video/mp4';
      ambient.appendChild(source);
      ambient.load();
      ambient.addEventListener(
        'canplay',
        () => {
          ambient.classList.add('is-playing');
          ambient.play().catch(() => {
            // Autoplay blocked — leave the photograph in place silently.
            ambient.classList.remove('is-playing');
          });
        },
        { once: true },
      );
    };

    // Defer until the hero is visible (it almost always is, but covers the back-button case)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              start();
              io.disconnect();
              return;
            }
          }
        },
        { threshold: 0.15 },
      );
      io.observe(ambient);
    } else {
      start();
    }

    // Pause when the hero scrolls out — saves battery and bandwidth
    if ('IntersectionObserver' in window) {
      const playObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) ambient.play().catch(() => {});
            else ambient.pause();
          }
        },
        { threshold: 0.05 },
      );
      playObserver.observe(ambient);
    }
  }
}

// Click-to-play reels lightbox — minimal, accessible
const playButtons = document.querySelectorAll<HTMLButtonElement>('.video-tile__play');
if (playButtons.length) {
  let dialog: HTMLDivElement | null = null;
  let video: HTMLVideoElement | null = null;
  let previouslyFocused: HTMLElement | null = null;

  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.className = 'video-lightbox';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Video player');
    dialog.innerHTML = `
      <button type="button" class="video-lightbox__close" aria-label="Close video">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <div class="video-lightbox__frame">
        <video class="video-lightbox__video" controls playsinline></video>
      </div>
    `;
    document.body.appendChild(dialog);
    video = dialog.querySelector<HTMLVideoElement>('.video-lightbox__video');

    const close = () => {
      if (!dialog) return;
      dialog.classList.remove('is-open');
      document.body.style.overflow = '';
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      previouslyFocused?.focus();
    };

    dialog.querySelector('.video-lightbox__close')?.addEventListener('click', close);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog?.classList.contains('is-open')) close();
    });

    return dialog;
  };

  playButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.videoSrc;
      const poster = btn.dataset.videoPoster;
      if (!src) return;
      const d = ensureDialog();
      if (!video) return;
      video.src = src;
      if (poster) video.poster = poster;
      previouslyFocused = document.activeElement as HTMLElement;
      d.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      // Focus the close button for keyboard users
      d.querySelector<HTMLButtonElement>('.video-lightbox__close')?.focus();
      video.play().catch(() => {});
    });
  });
}

// Image lightbox — gallery tiles open their full-resolution image
const galleryImages = document.querySelectorAll<HTMLImageElement>('img[data-zoom-src]');
if (galleryImages.length) {
  let imgDialog: HTMLDivElement | null = null;
  let lightboxImg: HTMLImageElement | null = null;
  let previouslyFocusedImg: HTMLElement | null = null;

  const ensureImgDialog = () => {
    if (imgDialog) return imgDialog;
    imgDialog = document.createElement('div');
    imgDialog.className = 'image-lightbox';
    imgDialog.setAttribute('role', 'dialog');
    imgDialog.setAttribute('aria-modal', 'true');
    imgDialog.setAttribute('aria-label', 'Image viewer');
    imgDialog.innerHTML = `
      <button type="button" class="image-lightbox__close" aria-label="Close image">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <figure class="image-lightbox__frame">
        <img class="image-lightbox__img" alt="" />
        <figcaption class="image-lightbox__caption"></figcaption>
      </figure>
    `;
    document.body.appendChild(imgDialog);
    lightboxImg = imgDialog.querySelector<HTMLImageElement>('.image-lightbox__img');
    const caption = imgDialog.querySelector<HTMLElement>('.image-lightbox__caption');

    const close = () => {
      if (!imgDialog) return;
      imgDialog.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lightboxImg) {
        lightboxImg.removeAttribute('src');
        lightboxImg.alt = '';
      }
      if (caption) caption.textContent = '';
      previouslyFocusedImg?.focus();
    };

    imgDialog.querySelector('.image-lightbox__close')?.addEventListener('click', close);
    imgDialog.addEventListener('click', (e) => {
      if (e.target === imgDialog) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && imgDialog?.classList.contains('is-open')) close();
    });

    return imgDialog;
  };

  galleryImages.forEach((img) => {
    const tile = img.closest('.gallery-tile') as HTMLElement | null;
    const trigger = tile ?? img;
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', `View larger: ${img.dataset.zoomAlt ?? ''}`);

    const open = () => {
      const src = img.dataset.zoomSrc;
      const alt = img.dataset.zoomAlt ?? '';
      if (!src || !lightboxImg) {
        ensureImgDialog();
        if (!lightboxImg) return;
      }
      const d = ensureImgDialog();
      if (!lightboxImg) return;
      lightboxImg.src = src!;
      lightboxImg.alt = alt;
      const cap = d.querySelector<HTMLElement>('.image-lightbox__caption');
      if (cap) cap.textContent = alt;
      previouslyFocusedImg = document.activeElement as HTMLElement;
      d.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      d.querySelector<HTMLButtonElement>('.image-lightbox__close')?.focus();
    };

    trigger.addEventListener('click', open);
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}
