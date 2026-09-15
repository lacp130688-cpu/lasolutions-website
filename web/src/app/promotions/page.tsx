'use client';

import { useState, useEffect, useCallback } from 'react';
import Footer from '@/components/Footer';
import Effects from '@/components/Effects';
import {
  loadSiteData, getDealOfTheDay, PRODUCTS, PROMOTIONS,
  formatPrice, formatCountdown, resolveImageUrl,
} from '@/lib/catalog-data';
import { addToCart } from '@/lib/ui';

function Countdown({ endTime, containerId }: { endTime: number | null; containerId: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    return () => { /* one-shot render handled by parent interval re-render */ };
  }, []);

  const time = formatCountdown(endTime);

  if (time.expired) {
    return (
      <span style={{ color: 'var(--error)', fontWeight: 600 }}>Oferta expirada</span>
    );
  }

  return (
    <div className="countdown" id={containerId}>
      <div className="countdown-unit">
        <span className="countdown-value">{String(time.days).padStart(2, '0')}</span>
        <span className="countdown-label">Dias</span>
      </div>
      <div className="countdown-unit">
        <span className="countdown-value">{String(time.hours).padStart(2, '0')}</span>
        <span className="countdown-label">Horas</span>
      </div>
      <div className="countdown-unit">
        <span className="countdown-value">{String(time.minutes).padStart(2, '0')}</span>
        <span className="countdown-label">Min</span>
      </div>
      <div className="countdown-unit">
        <span className="countdown-value">{String(time.seconds).padStart(2, '0')}</span>
        <span className="countdown-label">Seg</span>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0);

  // Load data
  useEffect(() => {
    async function init() {
      try {
        await loadSiteData();
      } catch (err) {
        console.error('Error inicializando datos, usando respaldo:', err);
        }
      setLoaded(true);
    }
    init();
  }, []);

  // 1s countdown ticker
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const deal = getDealOfTheDay();
  const dealProduct = deal ? PRODUCTS.find(p => p.id === deal.productId) : null;
  const otherPromos = deal ? PROMOTIONS.filter(p => p.productId !== deal.productId) : [];

  return (
    <>
      <main className="container section" style={{ paddingTop: 'calc(var(--nav-height) + 3rem)' }}>
        <h1 className="section-title">Promociones especiales</h1>
        <p style={{ textAlign: 'center', maxWidth: 600, margin: '-2rem auto 3rem' }}>
          Aprovecha nuestros descuentos exclusivos por tiempo limitado. ¡No dejes pasar estas ofertas!
        </p>

        {/* Deal of the Day */}
        {loaded && deal && dealProduct && (
          <div className="deal-of-day" id="deal-of-day">
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <span className="promo-discount">-{deal.discount}% OFF</span>
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>{dealProduct.name}</h2>
              <p style={{ marginBottom: '1rem' }}>{dealProduct.description}</p>
              <div className="promo-prices">
                <span className="promo-price-old">{formatPrice(dealProduct.originalPrice)}</span>
                <span className="promo-price-new">{formatPrice(dealProduct.price)}</span>
              </div>
              <Countdown endTime={deal.endDate} containerId="deal-countdown" />
              <div style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-accent" onClick={() => addToCart(dealProduct.id)}>Comprar ahora</button>
              </div>
            </div>
            <div className="promo-card-image" style={{ borderRadius: 'var(--radius-card)' }}>
              <img src={resolveImageUrl(dealProduct.image)} alt={dealProduct.name} />
            </div>
          </div>
        )}

        {loaded && !deal && (
          <div id="deal-of-day">
            <p style={{ textAlign: 'center' }}>No hay promociones disponibles en este momento.</p>
          </div>
        )}

        {/* Other Promotions */}
        <h2 className="section-title" style={{ marginTop: '4rem' }}>Otras ofertas</h2>
        <div className="promo-grid" id="promo-grid">
          {loaded && otherPromos.map((promo, index) => {
            const product = PRODUCTS.find(p => p.id === promo.productId);
            if (!product) return null;
            return (
              <div className="promo-card" key={promo.productId}>
                <div className="promo-card-image">
                  <img src={resolveImageUrl(product.image)} alt={product.name} loading="lazy" />
                </div>
                <div className="promo-card-body">
                  <span className="promo-discount">-{promo.discount}% OFF</span>
                  <h3>{product.name}</h3>
                  <div className="promo-prices">
                    <span className="promo-price-old">{formatPrice(product.originalPrice)}</span>
                    <span className="promo-price-new">{formatPrice(product.price)}</span>
                  </div>
                  <Countdown endTime={promo.endDate} containerId={`promo-countdown-${index}`} />
                  <div style={{ marginTop: '1rem' }}>
                    <button className="btn btn-accent btn-sm" onClick={() => addToCart(product.id)}>
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />

      <Effects cardCount={PRODUCTS.length} />
    </>
  );
}