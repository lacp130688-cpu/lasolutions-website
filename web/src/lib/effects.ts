/* ============================================
   laSolutions - Effects Engine
   Card tilt + hero parallax + particles
   Port of effects.js for React (call from useEffect).
   ============================================ */

export function initCardTilt(): void {
  if (typeof window === 'undefined') return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const cards = document.querySelectorAll<HTMLElement>('.product-card, .promo-card');
  if (!cards.length) return;

  cards.forEach(card => {
    // Avoid double-binding
    if ((card as any).__tiltBound) return;
    (card as any).__tiltBound = true;

    card.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * 10;
      const ry = (px - 0.5) * 12;
      card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

export function initHero3D(): void {
  if (typeof window === 'undefined') return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  // Prevent double-init
  if ((hero as any).__hero3dInit) return;
  (hero as any).__hero3dInit = true;

  const visual = hero.querySelector<HTMLElement>('.hero-visual');
  const rect = hero.getBoundingClientRect();

  const orbSpecs = [
    { size: 160, color: 'rgba(108,99,255,0.55)', left: 12, top: 60, phase: 0 },
    { size: 230, color: 'rgba(0,212,255,0.40)', left: 42, top: 38, phase: 2.1 },
    { size: 120, color: 'rgba(255,45,149,0.28)', left: 78, top: 66, phase: 4.2 },
  ];

  const orbs = orbSpecs.map(spec => {
    const orb = document.createElement('div');
    orb.className = 'orb';
    orb.style.width = spec.size + 'px';
    orb.style.height = spec.size + 'px';
    orb.style.background = spec.color;
    orb.style.left = spec.left + '%';
    orb.style.top = spec.top + '%';
    hero.appendChild(orb);
    return {
      el: orb,
      baseX: (spec.left / 100) * rect.width,
      baseY: (spec.top / 100) * rect.height,
      phase: spec.phase,
    };
  });

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  hero.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let particles: Array<{ x: number; y: number; r: number; vx: number; vy: number; a: number }> = [];

  function resize() {
    const box = hero!.getBoundingClientRect();
    W = canvas.width = box.width;
    H = canvas.height = box.height;
    orbs.forEach(o => {
      o.baseX = (parseFloat(o.el.style.left) / 100) * W;
      o.baseY = (parseFloat(o.el.style.top) / 100) * H;
    });
    const count = Math.min(70, Math.max(20, Math.floor((W * H) / 18000)));
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.45 + 0.1),
        a: Math.random() * 0.5 + 0.15,
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  hero.addEventListener('mousemove', (e: MouseEvent) => {
    const box = hero.getBoundingClientRect();
    target.x = (e.clientX - box.left) / box.width - 0.5;
    target.y = (e.clientY - box.top) / box.height - 0.5;
  }, { passive: true });

  let startTime: number | null = null;
  function tick(time: number) {
    if (startTime === null) startTime = time;
    const t = (time - startTime) / 1000;
    current.x += (target.x - current.x) * 0.06;
    current.y += (target.y - current.y) * 0.06;

    orbs.forEach((o, i) => {
      const depth = 1 + i * 0.7;
      const floatY = Math.sin(t * 0.9 + o.phase) * 20;
      o.el.style.transform =
        'translate3d(' + (-current.x * 34 * depth).toFixed(1) + 'px,' +
        (floatY - current.y * 34 * depth).toFixed(1) + 'px,0)';
    });

    if (visual) {
      visual.style.transform =
        'rotateY(' + (current.x * 7).toFixed(2) + 'deg) rotateX(' + (-current.y * 7).toFixed(2) + 'deg)';
    }

    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
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
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
