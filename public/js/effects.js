/* ============================================
   laSolutions - 3D Effects Engine
   Card tilt + hero parallax + particles (vanilla)
   ============================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------
  // 1. Card tilt: rotateX/rotateY + glare position from cursor
  // ---------------------------------------------------------
  function initCardTilt() {
    var cards = document.querySelectorAll('.product-card, .promo-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rx = (0.5 - py) * 10;   // degrees
        var ry = (px - 0.5) * 12;   // degrees
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });

      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }, { passive: true });
  }

  // ---------------------------------------------------------
  // 2. Hero: orbs + parallax + particles (single rAF loop)
  // ---------------------------------------------------------
  function initHero3D() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var visual = document.querySelector('.hero-visual');
    var rect = hero.getBoundingClientRect();

    // --- Orbs ---
    var orbSpecs = [
      { size: 160, color: 'rgba(108,99,255,0.55)', left: 12,  top: 60, phase: 0 },
      { size: 230, color: 'rgba(0,212,255,0.40)',  left: 42,  top: 38, phase: 2.1 },
      { size: 120, color: 'rgba(255,45,149,0.28)', left: 78,  top: 66, phase: 4.2 }
    ];
    var orbs = orbSpecs.map(function (spec) {
      var orb = document.createElement('div');
      orb.className = 'orb';
      orb.style.width = spec.size + 'px';
      orb.style.height = spec.size + 'px';
      orb.style.background = spec.color;
      orb.style.left = spec.left + '%';
      orb.style.top = spec.top + '%';
      hero.appendChild(orb);
      return { el: orb, baseX: (spec.left / 100) * rect.width, baseY: (spec.top / 100) * rect.height, phase: spec.phase };
    });

    // --- Particle canvas ---
    var canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    hero.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var particles = [];

    function resize() {
      var box = hero.getBoundingClientRect();
      W = canvas.width = box.width;
      H = canvas.height = box.height;
      orbs.forEach(function (o) {
        o.baseX = (parseFloat(o.el.style.left) / 100) * W;
        o.baseY = (parseFloat(o.el.style.top) / 100) * H;
      });
      var count = Math.min(70, Math.max(20, Math.floor((W * H) / 18000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.8 + 0.4,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.45 + 0.1),
          a: Math.random() * 0.5 + 0.15
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Mouse parallax target ---
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    hero.addEventListener('mousemove', function (e) {
      var box = hero.getBoundingClientRect();
      target.x = (e.clientX - box.left) / box.width - 0.5;
      target.y = (e.clientY - box.top) / box.height - 0.5;
    }, { passive: true });

    // --- Single rAF loop: orbs float + parallax, particles, hero tilt ---
    var startTime = null;

    function tick(time) {
      if (startTime === null) startTime = time;
      var t = (time - startTime) / 1000;

      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;

      // Orbs: float via sin + parallax by depth
      orbs.forEach(function (o, i) {
        var depth = 1 + i * 0.7;
        var floatY = Math.sin(t * 0.9 + o.phase) * 20;
        o.el.style.transform =
          'translate3d(' + (-current.x * 34 * depth).toFixed(1) + 'px,' +
          (floatY - current.y * 34 * depth).toFixed(1) + 'px,0)';
      });

      // Hero visual: subtle 3D rotation toward cursor
      if (visual) {
        visual.style.transform =
          'rotateY(' + (current.x * 7).toFixed(2) + 'deg) rotateX(' + (-current.y * 7).toFixed(2) + 'deg)';
      }

      // Particles drift upward
      ctx.clearRect(0, 0, W, H);
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
        if (p.x < -6) p.x = W + 6;
        if (p.x > W + 6) p.x = -6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255,' + p.a + ')';
        ctx.fill();
      });

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    if (reducedMotion) return;
    initCardTilt();
    initHero3D();
  });
})();