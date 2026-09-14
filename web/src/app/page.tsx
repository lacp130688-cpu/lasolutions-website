'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Effects from '@/components/Effects';
import ProductCard from '@/components/ProductCard';
import {
  loadSiteData, loadFallbackData, getFeaturedProducts, getThirdPartyBrands,
  getDealOfTheDay, scrollCarousel, PRODUCTS, PROMOTIONS,
} from '@/lib/catalog-data';

export default function HomePage() {
  const [loaded, setLoaded] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function init() {
      try {
        await loadSiteData();
      } catch (err) {
        console.error('Error inicializando datos, usando respaldo:', err);
        loadFallbackData();
      }
      setLoaded(true);
    }
    init();
  }, []);

  const scroll = useCallback((direction: number) => {
    scrollCarousel(direction, carouselRef.current);
  }, []);

  // Carousel: arrow opacity + autoplay
  useEffect(() => {
    if (!loaded) return;
    const track = carouselRef.current;
    if (!track?.classList.contains('featured-carousel')) return;

    const onScroll = () => {
      if (prevRef.current) prevRef.current.style.opacity = track.scrollLeft > 10 ? '1' : '0.35';
      if (nextRef.current) nextRef.current.style.opacity = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10 ? '0.35' : '1';
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cleanupListeners: Array<() => void> = [];

    if (!reducedMotion) {
      const AUTO_MS = 4000;
      const step = () => {
        if (document.hidden) return;
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
        if (atEnd) { track.scrollTo({ left: 0, behavior: 'smooth' }); return; }
        const card = track.querySelector('.product-card');
        const stepPx = card ? card.getBoundingClientRect().width + 32 : 360;
        track.scrollBy({ left: stepPx, behavior: 'smooth' });
      };
      const startAuto = () => { stopAuto(); timer = setInterval(step, AUTO_MS); };
      const stopAuto = () => { if (timer) { clearInterval(timer); timer = null; } };

      track.addEventListener('scroll', startAuto, { passive: true });
      track.addEventListener('mouseenter', stopAuto);
      track.addEventListener('mouseleave', startAuto);
      track.addEventListener('touchstart', stopAuto, { passive: true });
      track.addEventListener('touchend', startAuto, { passive: true });
      cleanupListeners = [
        () => track.removeEventListener('scroll', startAuto),
        () => track.removeEventListener('mouseenter', stopAuto),
        () => track.removeEventListener('mouseleave', startAuto),
        () => track.removeEventListener('touchstart', stopAuto),
        () => track.removeEventListener('touchend', startAuto),
      ];
      startAuto();
    }

    return () => {
      track.removeEventListener('scroll', onScroll);
      if (timer) clearInterval(timer);
      cleanupListeners.forEach(remove => remove());
    };
  }, [loaded]);

  const featured = getFeaturedProducts();
  const brands = getThirdPartyBrands();
  const deal = getDealOfTheDay();
  const dealProduct = deal ? PRODUCTS.find(p => p.id === deal.productId) : null;
  const maxDiscount = PROMOTIONS.length ? Math.max(...PROMOTIONS.map(p => p.discount)) : 0;

  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Tecnologia que <span className="highlight">impulsa</span> tu rendimiento</h1>
            <p>En laSolutions construimos computadoras de alto rendimiento para profesionales, gamers y creativos. Calidad, potencia y soporte que puedes confiar.</p>
            <div className="hero-buttons">
              <Link href="/catalog" className="btn btn-accent btn-lg">Ver catalogo</Link>
              <Link href="/about" className="btn btn-outline btn-lg">Conocenos</Link>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/assets/placeholder.svg" alt="Computadora laSolutions" />
          </div>
        </div>
      </section>

      {/* Featured Products (carousel) */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Productos destacados</h2>
          <div className="carousel-wrap">
            <button className="carousel-btn carousel-prev" onClick={() => scroll(-1)} ref={prevRef} aria-label="Productos anteriores">&#10094;</button>
            <div className="featured-carousel" id="featured-grid" ref={carouselRef}>
              {loaded && featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <button className="carousel-btn carousel-next" onClick={() => scroll(1)} ref={nextRef} aria-label="Productos siguientes">&#10095;</button>
          </div>
        </div>
      </section>

      {/* Brands We Sell */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title">Marcas que vendemos</h2>
          <div className="brands-marquee">
            <div className="brands-track" id="brands-strip">
              {loaded && brands.map(b => (
                <div className="brand-chip" title={b} key={b}>{b}</div>
              ))}
              {loaded && brands.map(b => (
                <div className="brand-chip" title={b} key={b + '-dup'}>{b}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Promotions Banner */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {loaded && deal && dealProduct && (
            <div className="promo-banner" id="promo-banner">
              <div className="promo-banner-text">
                <h2>Ofertas Especiales</h2>
                <p>Hasta {maxDiscount}% de descuento en productos seleccionados. No te las pierdas.</p>
                <Link href="/promotions" className="btn btn-accent">Ver todas las ofertas</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer fullWidth />

      <Effects cardCount={featured.length} includeHero />
    </>
  );
}