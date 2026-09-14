'use client';

import Link from 'next/link';

interface FooterProps {
  fullWidth?: boolean;
}

export default function Footer({ fullWidth = false }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container">
        {fullWidth && (
          <div className="footer-grid">
            <div className="footer-brand">
              <h3>la<span>Solutions</span></h3>
              <p>Computadoras de alto rendimiento para profesionales, gamers y creativos. Mas de 10 anios brindando soluciones tecnologicas.</p>
            </div>
            <div className="footer-col">
              <h4>Productos</h4>
              <Link href="/catalog">Escritorios</Link>
              <Link href="/catalog">Gaming PCs</Link>
              <Link href="/catalog">Laptops</Link>
              <Link href="/promotions">Ofertas</Link>
            </div>
            <div className="footer-col">
              <h4>Empresa</h4>
              <Link href="/about">Sobre nosotros</Link>
              <Link href="/contact">Contacto</Link>
              <Link href="#">Soporte</Link>
              <Link href="#">Garantia</Link>
            </div>
            <div className="footer-col">
              <h4>Contacto</h4>
              <a href="mailto:lacp130688@gmail.com">lacp130688@gmail.com</a>
              <Link href="#">Buenos Aires, Argentina</Link>
              <Link href="#">Lun - Vie: 9:00 - 18:00</Link>
            </div>
          </div>
        )}
        <div className="footer-bottom">
          <p>&copy; 2026 laSolutions. Todos los derechos reservados.</p>
          <Link href="/admin">Admin</Link>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">FB</a>
            <a href="#" aria-label="Instagram">IG</a>
            <a href="#" aria-label="Twitter">TW</a>
            <a href="#" aria-label="YouTube">YT</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
