(() => {
  document.documentElement.classList.add('js');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
    mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      }
    });
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  // CashNote Windows download gate + official GitHub Release download totals.
  // The API rejects mobile/non-Windows User-Agents again on the server.
  const apiMeta = document.querySelector('meta[name="cashnote-download-api"]');
  const apiBase = (apiMeta?.content || 'https://cashnote-download-api.onrender.com').replace(/\/+$/, '');
  const installerLinks = Array.from(document.querySelectorAll('[data-installer]'));
  const installerStatuses = Array.from(document.querySelectorAll('[data-installer-status]'));
  const countNodes = Array.from(document.querySelectorAll('[data-download-count]'));
  const detailNodes = Array.from(document.querySelectorAll('[data-download-detail]'));
  const proofCards = Array.from(document.querySelectorAll('[data-download-proof]'));
  const countNotes = Array.from(document.querySelectorAll('[data-download-count-note]'));
  const releaseLinks = Array.from(document.querySelectorAll('[data-release-link]'));
  const latestVersionNodes = Array.from(document.querySelectorAll('[data-latest-version]'));
  const latestDateNodes = Array.from(document.querySelectorAll('[data-latest-release-date]'));
  const userAgent = navigator.userAgent || '';
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const isIPadDesktopMode = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile|Tablet|Windows Phone|Kindle|Silk/i.test(userAgent) || /Android|iOS/i.test(platform) || isIPadDesktopMode;
  const isWindowsDesktop = /Windows NT/i.test(userAgent) && !isMobileDevice;

  function setInstallerStatus(message, waiting = true) {
    installerStatuses.forEach((node) => {
      node.textContent = message;
      node.classList.toggle('is-waiting', waiting);
    });
  }

  function setInstallerLinks({ enabled, label, href = null }) {
    installerLinks.forEach((link) => {
      const labelNode = link.querySelector('[data-installer-label]');
      if (labelNode && label) labelNode.textContent = label;
      if (enabled && href) {
        link.href = href;
        link.classList.remove('button-disabled');
        link.removeAttribute('aria-disabled');
        link.removeAttribute('tabindex');
        link.title = 'Download CashNote for Windows';
      } else {
        link.classList.add('button-disabled');
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
        link.removeAttribute('download');
      }
    });
  }

  installerLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.getAttribute('aria-disabled') === 'true' || isMobileDevice || !isWindowsDesktop) {
        event.preventDefault();
      }
    });
  });

  if (isMobileDevice) {
    setInstallerLinks({ enabled: false, label: 'Windows desktop only' });
    setInstallerStatus('CashNote is a Windows desktop application. The installer is not available on phones or tablets. Open this page on a Windows PC to download CashNote.');
    document.querySelectorAll('[data-device-notice]').forEach((node) => {
      node.hidden = false;
      node.textContent = 'You are browsing on a mobile device. CashNote is made for Windows desktop computers, so the installer download is disabled here.';
    });
  } else if (!isWindowsDesktop) {
    setInstallerLinks({ enabled: false, label: 'Windows version only' });
    setInstallerStatus('CashNote is currently available for Windows 10 and Windows 11 desktop computers.');
    document.querySelectorAll('[data-device-notice]').forEach((node) => {
      node.hidden = false;
      node.textContent = 'CashNote is currently available for Windows desktop computers only.';
    });
  } else {
    setInstallerLinks({ enabled: false, label: 'Checking Windows installer…' });
    setInstallerStatus('Checking the latest CashNote Windows release…');
  }

  async function loadDownloadStats(attempt = 0) {
    if (!countNodes.length && !installerLinks.length) return;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 14000);
    try {
      const response = await fetch(`${apiBase}/api/download-stats`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Download stats returned ${response.status}`);
      const data = await response.json();

      if (data.available && Number.isFinite(Number(data.downloads))) {
        const count = Number(data.downloads);
        countNodes.forEach((node) => { node.textContent = new Intl.NumberFormat('en-IN').format(count); node.classList.add('count-ready'); });
        detailNodes.forEach((node) => {
          const version = data.latest?.version ? ` · Latest v${data.latest.version}` : '';
          node.textContent = `GitHub asset downloads across up to 100 recent releases${version}. Repeat downloads are included.`;
        });
        latestVersionNodes.forEach((node) => { node.textContent = data.latest?.version ? `v${data.latest.version}` : 'Latest release'; });
        latestDateNodes.forEach((node) => {
          const date = data.latest?.publishedAt ? new Date(data.latest.publishedAt) : null;
          node.textContent = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        });
        releaseLinks.forEach((link) => {
          if (data.latest?.releaseUrl) {
            link.href = data.latest.releaseUrl;
            link.hidden = false;
          }
        });
        proofCards.forEach((node) => { node.hidden = false; });
        countNotes.forEach((node) => {
          node.textContent = 'Counted by GitHub when a release installer is downloaded. This is not a unique-user or installation count.';
        });

        if (isWindowsDesktop) {
          setInstallerLinks({ enabled: true, label: 'Download for Windows', href: `${apiBase}/download` });
          const version = data.latest?.version ? ` · Version ${data.latest.version}` : '';
          setInstallerStatus(`Windows installer available${version}. Download totals are supplied by GitHub Releases.`, false);
        }
      } else if (data.available === false && data.configured) {
        if (isWindowsDesktop) setInstallerLinks({ enabled: false, label: 'Installer coming soon' });
        if (Number.isFinite(Number(data.downloads)) && data.downloads > 0) {
          countNodes.forEach((node) => { node.textContent = new Intl.NumberFormat('en-IN').format(Number(data.downloads)); });
          proofCards.forEach((node) => { node.hidden = false; });
        }
        if (isWindowsDesktop) setInstallerStatus('The first public CashNote Windows installer has not been published yet. Please check back soon.');
      } else {
        throw new Error(data.error || 'Download information is not ready');
      }
    } catch (error) {
      if (isWindowsDesktop) {
        setInstallerLinks({ enabled: false, label: 'Download temporarily unavailable' });
        setInstallerStatus('The download service is waking up or temporarily unavailable. Please try again shortly.');
      }
      detailNodes.forEach((node) => { node.textContent = 'Live download totals are temporarily unavailable.'; });
      latestVersionNodes.forEach((node) => { node.textContent = 'Release status unavailable'; });
      // Render Free web services can spin down after inactivity. Retry gently while the service wakes.
      if (attempt < 5) window.setTimeout(() => loadDownloadStats(attempt + 1), 10000);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  loadDownloadStats();

  // Motion system: GSAP + ScrollTrigger when available, native reveal fallback otherwise.
  const revealTargets = Array.from(document.querySelectorAll('.reveal'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const siteHeader = document.querySelector('.site-header');
  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const progress = document.createElement('div');
    progress.className = 'motion-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.prepend(progress);
    gsap.to(progress, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.25 } });

    const cardSelector = '.feature-grid .feature-card, .closer-grid .closer-card, .principle-grid .principle-card, .release-trust-grid .release-trust-card';
    revealTargets.filter(el => !el.matches(cardSelector)).forEach((el, index) => {
      const isHero = el.classList.contains('hero-text') || el.hasAttribute('data-hero-visual');
      gsap.fromTo(el,
        { autoAlpha: 0, y: isHero ? 24 : 30, ...(el.hasAttribute('data-hero-visual') ? { x: 28, rotate: 1.5 } : {}) },
        { autoAlpha: 1, y: 0, x: 0, rotate: 0, duration: isHero ? 1 : 0.78, delay: isHero ? index * 0.12 : 0, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onComplete: () => el.classList.add('is-visible') }
      );
    });

    const cards = gsap.utils.toArray('.feature-grid .feature-card, .closer-grid .closer-card, .principle-grid .principle-card, .release-trust-grid .release-trust-card');
    cards.forEach((card, index) => {
      gsap.fromTo(card, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.72, delay: (index % 3) * 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: card, start: 'top 91%', once: true }, onComplete: () => card.classList.add('is-visible') });
    });

    const visual = document.querySelector('[data-hero-visual]');
    if (visual) gsap.to(visual, { y: -26, ease: 'none', scrollTrigger: { trigger: visual, start: 'top bottom', end: 'bottom top', scrub: 0.7 } });
    const portrait = document.querySelector('[data-creator-art]');
    if (portrait) gsap.to(portrait, { y: -18, ease: 'none', scrollTrigger: { trigger: portrait, start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
    if (siteHeader) ScrollTrigger.create({ start: 24, onUpdate: self => siteHeader.classList.toggle('is-scrolled', self.scroll() > 24) });
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  } else if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-visible'));
  }

  // Accessible screenshot lightbox for larger product previews.
  const lightboxImages = document.querySelectorAll('img[data-lightbox]');
  if (lightboxImages.length) {
    const dialog = document.createElement('div');
    dialog.className = 'image-lightbox';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Screenshot preview');
    dialog.innerHTML = '<button type="button" aria-label="Close preview">×</button><img alt=""><div class="lightbox-caption"></div>';
    document.body.appendChild(dialog);
    const preview = dialog.querySelector('img');
    const caption = dialog.querySelector('.lightbox-caption');
    const closeButton = dialog.querySelector('button');
    let previousFocus = null;
    const close = () => {
      dialog.classList.remove('is-open');
      document.body.style.overflow = '';
      preview.removeAttribute('src');
      if (previousFocus) previousFocus.focus();
    };
    lightboxImages.forEach((img) => {
      img.addEventListener('click', () => {
        previousFocus = img;
        preview.src = img.currentSrc || img.src;
        preview.alt = img.alt || 'CashNote application screenshot';
        caption.textContent = img.alt || 'CashNote application screenshot';
        dialog.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        closeButton.focus();
      });
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Open larger screenshot: ' + (img.alt || 'CashNote preview'));
      img.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); img.click(); }
      });
    });
    closeButton.addEventListener('click', close);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    document.addEventListener('keydown', (event) => {
      if (!dialog.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') { event.preventDefault(); closeButton.focus(); }
    });
  }

})();


  // Product video path comes from the public, GitHub-backed CMS JSON.
  // No custom API or Render disk is required to display website media.
  (async () => {
    const frame = document.querySelector('[data-tour-frame]');
    const video = document.querySelector('[data-tour-video]');
    if (!frame || !video) return;
    try {
      const response = await fetch('/cms/content.json', { cache: 'no-store' });
      if (!response.ok) return;
      const content = await response.json();
      const videoPath = content.media?.tourVideo;
      if (typeof videoPath === 'string' && videoPath.startsWith('/assets/videos/') && !/[\\?#%\u0000-\u001f]/.test(videoPath) && !videoPath.includes('..') && /\.(mp4|webm)$/i.test(videoPath)) {
        video.src = videoPath;
        if (content.media?.heroImage) video.poster = content.media.heroImage;
        video.hidden = false;
        frame.querySelector('.tour-ambient')?.setAttribute('hidden', '');
        frame.querySelector('.tour-caption')?.setAttribute('hidden', '');
      }
    } catch (_) { /* Motion preview is the intentional offline fallback. */ }
  })();
