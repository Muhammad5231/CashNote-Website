(() => {
  'use strict';
  const contentUrl = '/cms/content.json';

  function safeAssetPath(path, video = false) {
    if (typeof path !== 'string' || !path.startsWith('/assets/') || path.startsWith('//') || /[\\?#%\u0000-\u001f]/.test(path) || path.includes('..')) return '';
    const extension = path.split('.').pop()?.toLowerCase();
    const allowed = video ? ['mp4', 'webm'] : ['jpg', 'jpeg', 'png', 'webp', 'avif'];
    if (video && !path.startsWith('/assets/videos/')) return '';
    return allowed.includes(extension) ? path : '';
  }

  function setImage(selector, path) {
    const image = document.querySelector(selector);
    const safePath = safeAssetPath(path);
    if (!image || !safePath) return;
    image.src = safePath;
  }

  fetch(contentUrl, { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : null)
    .then((content) => {
      if (!content) return;
      const hero = document.querySelector('.hero-text h1');
      if (hero && content.heroTitle) {
        const accent = hero.querySelector('.accent');
        if (hero.firstChild && hero.firstChild.nodeType === Node.TEXT_NODE) hero.firstChild.textContent = `${content.heroTitle}\n`;
        else if (accent) hero.insertBefore(document.createTextNode(`${content.heroTitle}\n`), accent);
        if (accent && content.heroAccent) accent.textContent = content.heroAccent;
      }
      const heroCopy = document.querySelector('.hero-copy');
      if (heroCopy && content.heroCopy) heroCopy.textContent = content.heroCopy;
      if (content.featuresTitle && location.pathname.startsWith('/features')) {
        const heading = document.querySelector('.page-hero h1');
        if (heading) heading.textContent = content.featuresTitle;
      }
      if (content.aboutTitle && location.pathname.startsWith('/about')) {
        const heading = document.querySelector('.page-hero h1');
        if (heading) heading.textContent = content.aboutTitle;
      }
      const caption = document.querySelector('.tour-caption b');
      if (caption && content.tourCaption) caption.textContent = content.tourCaption;

      const media = content.media || {};
      setImage('.gallery-shot-large img', media.galleryTransactions);
      setImage('.screenshot-gallery .gallery-shot:nth-child(2) img', media.galleryProfiles);
      setImage('.screenshot-gallery .gallery-shot:nth-child(3) img', media.galleryPreferences);

      const posterPath = media.heroImage;
      const ambient = document.querySelector('.tour-ambient');
      const video = document.querySelector('[data-tour-video]');
      if (posterPath && ambient) {
        const safePath = safeAssetPath(posterPath);
        if (safePath) {
          ambient.style.backgroundImage = `linear-gradient(90deg,rgba(13,12,16,.35),rgba(13,12,16,.7)),url("${safePath}")`;
          ambient.style.backgroundSize = 'cover';
          ambient.style.backgroundPosition = 'center';
          if (video && safePath) video.poster = safePath;
        }
      }
    })
    .catch(() => { /* The bundled website content and product-tour motion preview are the fallbacks. */ });
})();
