'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import './admin.css';
import {
  initAdmin,
  adminLogin,
  adminLogout,
  showTab,
  newProductForm,
  editProduct,
  deleteProduct,
  saveProduct,
  cancelProductForm,
  onProductImageUrlChange,
  newPromoForm,
  editPromotion,
  deletePromotion,
  savePromotion,
  cancelPromoForm,
} from '@/lib/admin';

export default function AdminPage() {
  useEffect(() => {
    // Delegacion de eventos para los botones de las tablas (que se renderizan via innerHTML).
    // Mas robusto que onclick inline: funciona igual aunque el navegador bloquee handlers inline.
    function onTableAction(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-action]') as HTMLElement | null;
      if (!btn) return;
      const id = Number(btn.getAttribute('data-id'));
      switch (btn.getAttribute('data-action')) {
        case 'edit-product': editProduct(id); break;
        case 'delete-product': deleteProduct(id); break;
        case 'edit-promotion': editPromotion(id); break;
        case 'delete-promotion': deletePromotion(id); break;
      }
    }

    document.addEventListener('click', onTableAction);

    initAdmin();
    return () => document.removeEventListener('click', onTableAction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Header propio del panel */}
      <header className="admin-header">
        <div className="container admin-header-inner">
          <Link href="/" className="nav-logo">la<span>Solutions</span></Link>
          <h1 className="admin-header-title">Panel Admin</h1>
          <button type="button" className="btn btn-danger btn-sm" id="btn-logout" style={{ display: 'none' }} onClick={() => { adminLogout(); }}>Salir</button>
        </div>
      </header>

      {/* Vista de login */}
      <section id="login-view">
        <div className="login-card">
          <h2 className="section-title">Acceso al panel</h2>
          <label htmlFor="login-email">Email</label>
          <input type="email" id="login-email" className="admin-input" placeholder="admin@lasolutions.com" />
          <label htmlFor="login-password">Password</label>
          <input type="password" id="login-password" className="admin-input" />
          <p className="login-error" id="login-error"></p>
          <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => { adminLogin(); }}>Entrar</button>
          <p className="login-hint">Solo usuarios administradores pueden ingresar.</p>
        </div>
      </section>

      {/* Vista del panel (oculta hasta login + verificacion admin) */}
      <main id="panel-view" style={{ display: 'none' }}>
        <p className="admin-panel-error" id="panel-error"></p>
        <p className="load-stats" id="load-stats" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.75rem', opacity: 0.85 }}></p>

        <nav className="admin-tabs">
          <button type="button" className="admin-tab active" data-tab="products" onClick={() => showTab('products')}>Productos</button>
          <button type="button" className="admin-tab" data-tab="promos" onClick={() => showTab('promos')}>Promociones</button>
          <button type="button" className="admin-tab" data-tab="messages" onClick={() => showTab('messages')}>Mensajes</button>
        </nav>

        {/* Tab Productos */}
        <section id="tab-products" className="admin-tab-panel">
          <div className="admin-tab-head">
            <h2 className="section-title admin-panel-title">Productos</h2>
            <button type="button" className="btn btn-accent" onClick={() => newProductForm()}>Nuevo producto</button>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Destacado</th>
                  <th>Activo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="products-tbody">
                <tr><td colSpan={8} className="table-empty">Cargando productos...</td></tr>
              </tbody>
            </table>
          </div>

          <div className="admin-form" id="product-form" style={{ display: 'none' }}>
            <h3 id="product-form-title">Nuevo producto</h3>
            <input type="hidden" id="product-id" value="" />
            <div className="admin-form-grid">
              <div>
                <label htmlFor="product-name">Nombre *</label>
                <input type="text" id="product-name" className="admin-input" />
              </div>
              <div>
                <label htmlFor="product-category">Categoria</label>
                <select id="product-category" className="admin-input">
                  <option value="Escritorio">Escritorio</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Laptop">Laptop</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-brand">Marca</label>
                <input type="text" id="product-brand" className="admin-input" placeholder="laSolutions" />
              </div>
              <div>
                <label htmlFor="product-price">Precio *</label>
                <input type="number" id="product-price" className="admin-input" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label htmlFor="product-original-price">Precio original (antes)</label>
                <input type="number" id="product-original-price" className="admin-input" min={0} step="0.01" placeholder="Opcional" />
              </div>
              <div className="full">
                <label htmlFor="product-description">Descripcion</label>
                <textarea id="product-description" className="admin-input" rows={3}></textarea>
              </div>
              <div className="full">
                <label htmlFor="product-specs">Specs (lista JSON opcional)</label>
                <textarea id="product-specs" className="admin-input" rows={2} placeholder={JSON.stringify(['16GB RAM', '1TB SSD'])}></textarea>
              </div>
              <div>
                <label htmlFor="product-image-url">URL de imagen</label>
                <input type="text" id="product-image-url" className="admin-input" placeholder="https://... o assets/placeholder.svg" onChange={() => onProductImageUrlChange()} />
              </div>
              <div>
                <label htmlFor="product-image-file">O subir imagen (max 2MB)</label>
                <input type="file" id="product-image-file" className="admin-input" accept="image/jpeg,image/png,image/webp,image/gif" />
              </div>
            </div>
            <img id="product-image-preview" alt="Preview de imagen" style={{ display: 'none' }} />
            <div className="admin-check">
              <input type="checkbox" id="product-featured" />
              <label htmlFor="product-featured">Destacado</label>
            </div>
            <div className="admin-check">
              <input type="checkbox" id="product-active" defaultChecked />
              <label htmlFor="product-active">Activo</label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => { saveProduct(); }}>Guardar</button>
              <button type="button" className="btn btn-outline" onClick={() => cancelProductForm()}>Cancelar</button>
            </div>
          </div>
        </section>

        {/* Tab Promociones */}
        <section id="tab-promos" className="admin-tab-panel" style={{ display: 'none' }}>
          <div className="admin-tab-head">
            <h2 className="section-title admin-panel-title">Promociones</h2>
            <button type="button" className="btn btn-accent" onClick={() => newPromoForm()}>Nueva promocion</button>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Descuento</th>
                  <th>Precio oferta</th>
                  <th>Label</th>
                  <th>Activa</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="promos-tbody">
                <tr><td colSpan={6} className="table-empty">Cargando promociones...</td></tr>
              </tbody>
            </table>
          </div>

          <div className="admin-form" id="promo-form" style={{ display: 'none' }}>
            <h3 id="promo-form-title">Nueva promocion</h3>
            <input type="hidden" id="promo-id" value="" />
            <div className="admin-form-grid">
              <div>
                <label htmlFor="promo-product-id">Producto</label>
                <select id="promo-product-id" className="admin-input"></select>
              </div>
              <div>
                <label htmlFor="promo-discount">Descuento %</label>
                <input type="number" id="promo-discount" className="admin-input" min={1} max={99} placeholder="15" />
              </div>
              <div>
                <label htmlFor="promo-sale-price">Precio de oferta</label>
                <input type="number" id="promo-sale-price" className="admin-input" min={0} step="0.01" placeholder="0.00" />
              </div>
              <div>
                <label htmlFor="promo-label">Label</label>
                <input type="text" id="promo-label" className="admin-input" placeholder="Oferta" />
              </div>
            </div>
            <div className="admin-check">
              <input type="checkbox" id="promo-active" defaultChecked />
              <label htmlFor="promo-active">Activa</label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => { savePromotion(); }}>Guardar</button>
              <button type="button" className="btn btn-outline" onClick={() => cancelPromoForm()}>Cancelar</button>
            </div>
          </div>
        </section>

        {/* Tab Mensajes */}
        <section id="tab-messages" className="admin-tab-panel" style={{ display: 'none' }}>
          <div className="admin-tab-head">
            <h2 className="section-title admin-panel-title">Mensajes</h2>
          </div>

          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Asunto</th>
                  <th>Mensaje</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody id="messages-tbody">
                <tr><td colSpan={5} className="table-empty">Cargando mensajes...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}