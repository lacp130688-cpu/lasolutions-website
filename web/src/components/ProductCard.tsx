'use client';

import type { Product } from '@/lib/catalog-data';
import { formatPrice, getBadgeClass, resolveImageUrl } from '@/lib/catalog-data';
import { addToCart, openProductModal } from '@/lib/ui';

export default function ProductCard({ product }: { product: Product }) {
  const hasPromo = product.originalPrice > product.price;
  const discount = hasPromo
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events */
    <div className="product-card" onClick={() => openProductModal(product.id)}>
      <div className="product-card-image">
        <img
          src={resolveImageUrl(product.image)}
          alt={product.name}
          loading="lazy"
        />
      </div>
      <div className="product-card-body">
        <span className={`product-badge ${getBadgeClass(product.category)}`}>{product.category}</span>
        {hasPromo && <span className="product-badge badge-sale">-{discount}%</span>}
        <h3>{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-price-row">
          <div>
            {hasPromo && <span className="product-price-original">{formatPrice(product.originalPrice)}</span>}
            <span className="product-price">{formatPrice(product.price)}</span>
          </div>
          <button
            className="btn btn-accent btn-sm"
            onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}