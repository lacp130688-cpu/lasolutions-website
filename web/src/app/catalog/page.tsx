'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import Effects from '@/components/Effects';
import {
  loadSiteData, loadFallbackData, getFilteredProducts, getAllBrands,
  catalogState, PRICE_RANGES, PRODUCTS,
} from '@/lib/catalog-data';

export default function CatalogPage() {
  const [loaded, setLoaded] = useState(false);
  const [rebuildKey, setRebuildKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilterToggle, setShowFilterToggle] = useState(false);

  // Load data
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

  // Show filter toggle on smaller screens
  useEffect(() => {
    if (window.innerWidth <= 1024) setShowFilterToggle(true);
    const onResize = () => setShowFilterToggle(window.innerWidth <= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-render when filters/search/sort change
  const refresh = () => setRebuildKey(k => k + 1);

  const filtered = getFilteredProducts();
  const brands = getAllBrands();
  const countText =
    filtered.length + ' producto' + (filtered.length !== 1 ? 's' : '') +
    ' encontrado' + (filtered.length !== 1 ? 's' : '');

  return (
    <>
      <main className="container">
        <div className="catalog-layout">
          {/* Sidebar Filters */}
          <aside className={`catalog-sidebar ${sidebarOpen ? 'mobile-open' : ''}`} id="catalog-sidebar">
            <h3>Filtros</h3>

            <div className="filter-group">
              <h4>Categoria</h4>
              {['Escritorio', 'Gaming', 'Laptop'].map(cat => (
                <label key={cat}>
                  <input
                    type="checkbox"
                    data-filter-type="category"
                    value={cat}
                    onChange={(e) => {
                      if (e.target.checked) catalogState.selectedCategories.push(cat);
                      else catalogState.selectedCategories = catalogState.selectedCategories.filter(c => c !== cat);
                      refresh();
                    }}
                  /> {cat}
                </label>
              ))}
            </div>

            <div className="filter-group">
              <h4>Rango de precio</h4>
              {PRICE_RANGES.map((range, i) => (
                <label key={i}>
                  <input
                    type="checkbox"
                    data-filter-type="price"
                    data-range-index={i}
                    onChange={(e) => {
                      if (e.target.checked) catalogState.selectedPriceRanges.push(PRICE_RANGES[i]);
                      else catalogState.selectedPriceRanges = catalogState.selectedPriceRanges.filter((_, idx) => idx !== i);
                      refresh();
                    }}
                  /> {range.label}
                </label>
              ))}
            </div>

            <div className="filter-group">
              <h4>Marca</h4>
              <div id="brand-list">
                {loaded && brands.map(b => (
                  <label key={b}>
                    <input
                      type="checkbox"
                      data-filter-type="brand"
                      value={b}
                      onChange={(e) => {
                        if (e.target.checked) catalogState.selectedBrands.push(b);
                        else catalogState.selectedBrands = catalogState.selectedBrands.filter(x => x !== b);
                        refresh();
                      }}
                    /> {b}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Products Area */}
          <div className="catalog-main">
            <div className="catalog-top">
              {showFilterToggle && (
                <button
                  className="btn btn-outline btn-sm"
                  id="filter-toggle"
                  style={{ display: 'inline-flex' }}
                  onClick={() => setSidebarOpen(o => !o)}
                >
                  Filtros
                </button>
              )}
              <div className="search-box">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  id="catalog-search"
                  placeholder="Buscar productos..."
                  onChange={(e) => { catalogState.searchQuery = e.target.value; refresh(); }}
                />
              </div>
              <select
                className="sort-select"
                id="catalog-sort"
                value={catalogState.sortBy}
                onChange={(e) => { catalogState.sortBy = e.target.value as typeof catalogState.sortBy; refresh(); }}
              >
                <option value="default">Ordenar por</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>

            <p className="product-count" id="product-count">{loaded ? countText : ''}</p>
            <div className="catalog-grid" id="catalog-grid" key={rebuildKey}>
              {loaded && filtered.length === 0 && (
                <div className="no-results" style={{ gridColumn: '1/-1' }}>
                  <h3>Sin resultados</h3>
                  <p>No se encontraron productos con los filtros seleccionados.</p>
                </div>
              )}
              {loaded && filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Effects cardCount={PRODUCTS.length} />
    </>
  );
}