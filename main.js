/**
 * BNDS 运动圈 — 首页交互
 */

const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 24);
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
);

document.querySelectorAll('.feature-item, .feed-item').forEach((el, i) => {
  el.style.transitionDelay = `${i * 0.07}s`;
  observer.observe(el);
});

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.querySelectorAll('[data-coming-soon]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const feature = btn.dataset.comingSoon || '该功能';
    showToast(`${feature} · 暑假开发中`);
  });
});
