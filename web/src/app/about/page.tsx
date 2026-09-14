import Footer from '@/components/Footer';

export const metadata = {
  title: 'Sobre Nosotros - laSolutions',
  description: 'Conoce laSolutions. Mas de 10 anios construyendo computadoras de alto rendimiento.',
};

export default function AboutPage() {
  return (
    <>
      {/* About Hero */}
      <section className="about-hero">
        <div className="container">
          <h1>Sobre <span style={{ color: 'var(--accent)' }}>laSolutions</span></h1>
          <p>Mas de 10 anios brindando soluciones tecnologicas de alto rendimiento para quienes exigen lo mejor de su equipo.</p>
        </div>
      </section>

      {/* Mission / Story */}
      <section className="about-content">
        <div className="container">
          <div className="about-grid">
            <div className="about-text">
              <h2>Nuestra historia</h2>
              <p>laSolutions nacio con una mision clara: construir computadoras que realmente cumplan con lo que prometen. En un mercado lleno de opciones genericas, decidimos hacer las cosas diferente.</p>
              <p>Cada equipo que ensamblamos pasa por pruebas rigurosas de calidad y rendimiento. No vendemos cajas con especificaciones impresas: vendemos experiencias confiables que nuestros clientes pueden usar todos los dias sin sorpresas.</p>
              <p>Desde nuestro primer escritorio de oficina hasta las PC gaming mas potentes, nuestra filosofia se mantiene: components de calidad, ensamblaje experto y soporte que realmente responde.</p>
            </div>
            <div className="about-image">
              <img src="/assets/placeholder.svg" alt="Equipo laSolutions" style={{ maxWidth: 350 }} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Por que elegir laSolutions</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#9881;</div>
              <h3>Componentes premium</h3>
              <p>Seleccionamos cuidadosamente cada componente para garantizar maximo rendimiento y durabilidad en cada equipo.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128736;</div>
              <h3>Ensamblaje experto</h3>
              <p>Nuestro equipo tecnico tiene mas de 10 anos de experiencia ensamblando y configurando equipos de alto rendimiento.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128737;</div>
              <h3>Garantia real</h3>
              <p>Cada producto incluye garantia completa. Si algo falla, lo resolvemos. Sin letra chica ni excusas.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128640;</div>
              <h3>Envio a todo el pais</h3>
              <p>Despachamos a toda Argentina con embalaje profesional para que tu equipo llegue en perfecto estado.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128172;</div>
              <h3>Soporte dedicado</h3>
              <p>No desaparecemos despues de la venta. Nuestro equipo de soporte tecnico esta disponible para ayudarte.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128176;</div>
              <h3>Precios justos</h3>
              <p>Relacion precio-calidad real. Sin sobreprecios innecesarios ni components de baja calidad disfrazados.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-title">Nuestro equipo</h2>
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">&#128104;&#8205;&#128187;</div>
              <h3>Carlos Perez</h3>
              <p className="team-role">Director Tecnico</p>
              <p>Mas de 15 anos de experiencia en hardware y arquitectura de sistemas.</p>
            </div>
            <div className="team-card">
              <div className="team-avatar">&#128105;&#8205;&#128187;</div>
              <h3>Maria Garcia</h3>
              <p className="team-role">Ingeniera de Calidad</p>
              <p>Garantiza que cada equipo cumpla con nuestros estandares exigentes.</p>
            </div>
            <div className="team-card">
              <div className="team-avatar">&#128104;&#8205;&#128187;</div>
              <h3>Lucas Rodriguez</h3>
              <p className="team-role">Especialista Gaming</p>
              <p>Conoce cada componente del mercado para armar la PC perfecta para ti.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer fullWidth />
    </>
  );
}