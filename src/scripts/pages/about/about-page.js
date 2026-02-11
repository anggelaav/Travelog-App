export default class AboutPage {
  async render() {
    return `
      <section class="about-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Tentang TravelLog</h1>
            <p class="page-subtitle">Menceritakan setiap perjalanan, menginspirasi petualangan berikutnya</p>
          </div>
        </header>

        <div class="container">
          <div class="about-content">
            <div class="about-section">
              <h2>Apa itu TravelLog?</h2>
              <p>
                TravelLog adalah platform bagi para traveler untuk berbagi cerita perjalanan mereka. 
                Dengan fitur peta interaktif, Anda dapat melihat lokasi-lokasi menarik yang telah 
                dikunjungi oleh traveler lainnya.
              </p>
            </div>

            <div class="about-section">
              <h2>Fitur Utama</h2>
              <div class="features-grid">
                <div class="feature-card">
                  <i class="fas fa-map-marked-alt"></i>
                  <h3>Peta Interaktif</h3>
                  <p>Lihat cerita perjalanan di peta dengan berbagai tampilan</p>
                </div>
                <div class="feature-card">
                  <i class="fas fa-camera"></i>
                  <h3>Foto & Cerita</h3>
                  <p>Bagikan momen berharga dengan foto dan deskripsi</p>
                </div>
                <div class="feature-card">
                  <i class="fas fa-mobile-alt"></i>
                  <h3>Responsif</h3>
                  <p>Akses dari berbagai perangkat dengan tampilan optimal</p>
                </div>
                <div class="feature-card">
                  <i class="fas fa-universal-access"></i>
                  <h3>Aksesibel</h3>
                  <p>Didesain untuk semua pengguna termasuk penyandang disabilitas</p>
                </div>
              </div>
            </div>

            <div class="about-section">
              <h2>Teknologi</h2>
              <p>
                TravelLog dibangun dengan teknologi modern termasuk JavaScript ES6+, Leaflet untuk peta interaktif, 
                dan Web APIs untuk akses kamera. Aplikasi ini mengikuti standar aksesibilitas WCAG untuk 
                memastikan pengalaman terbaik bagi semua pengguna.
              </p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    const style = document.createElement('style');
    style.textContent = `
      .about-content {
        max-width: 800px;
        margin: 0 auto;
      }
      
      .about-section {
        margin-bottom: 48px;
      }
      
      .about-section h2 {
        color: var(--primary-color);
        margin-bottom: 16px;
        font-size: 1.5rem;
      }
      
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin-top: 24px;
      }
      
      .feature-card {
        background: var(--surface-color);
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        box-shadow: var(--shadow);
      }
      
      .feature-card i {
        font-size: 2.5rem;
        color: var(--primary-color);
        margin-bottom: 16px;
      }
      
      .feature-card h3 {
        margin-bottom: 8px;
        color: var(--text-primary);
      }
      
      .feature-card p {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);
  }
}