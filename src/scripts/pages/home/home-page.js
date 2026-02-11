import ApiService from '../../data/api';
import { showFormattedDate } from '../../utils';
import MapService from '../../utils/map-service';

export default class HomePage {
  constructor() {
    this.stories = [];
    this.mapService = null;
  }

  async render() {
    return `
      <section class="home-page">
        <section class="hero">
          <div class="hero-content container">
            <div class="hero-text">
              <h1 class="hero-title">Jelajahi Dunia, Bagikan Cerita</h1>
              <p class="hero-description">
                Catat setiap momen berharga dalam perjalananmu dan bagikan pengalaman 
                dengan komunitas traveler lainnya di TravelLog.
              </p>
              <div class="hero-actions">
                <a href="#/stories" class="btn btn-primary">Lihat Cerita</a>
                <a href="#/add-story" class="btn btn-secondary">Tambah Cerita</a>
              </div>
            </div>
            <div class="hero-image">
              <i class="fas fa-globe-americas"></i>
            </div>
          </div>
        </section>

        <section class="featured-stories container">
          <h2 class="section-title">Cerita Populer</h2>
          <div id="stories-container" class="stories-grid">
            <div class="loading-spinner">
              <i class="fas fa-compass fa-spin"></i>
              <p>Memuat cerita perjalanan...</p>
            </div>
          </div>
        </section>

        <section class="map-preview container">
          <h2 class="section-title">Peta Perjalanan</h2>
          <div id="home-map" class="map-container"></div>
        </section>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStories();
    await this.initMap();
    this.setupEventListeners();
  }

  async loadStories() {
    try {
      console.log('Loading stories from API...');

      if (!ApiService.isUserLoggedIn()) {
        console.log('User not logged in, showing empty state');
        this.displayNoStories();
        return;
      }

      this.stories = await ApiService.getAllStories();
      console.log('Stories loaded:', this.stories);
      
      if (this.stories && this.stories.length > 0) {
        this.displayStories();
        this.updateMapWithStories();
      } else {
        this.displayNoStories();
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      if (error.includes('Authentication') || error.includes('401')) {
        this.displayNoStories();
      } else {
        this.showError('Gagal memuat cerita: ' + error);
      }
    }
  }

  displayStories() {
    const container = document.getElementById('stories-container');
    if (!container) return;

    const featuredStories = this.stories.slice(0, 3);

    container.innerHTML = featuredStories.map(story => `
      <article class="story-card" data-story-id="${story.id}" tabindex="0">
        <div class="story-image">
          <img src="${story.photoUrl}" alt="${story.description}" loading="lazy" 
               onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Tidak+Tersedia'" />
          <div class="story-date">${showFormattedDate(story.createdAt)}</div>
        </div>
        <div class="story-content">
          <h3 class="story-title">${story.name}</h3>
          <p class="story-description">${story.description}</p>
          <div class="story-location">
            <i class="fas fa-map-marker-alt"></i>
            ${story.lat && story.lon ? 'Lokasi tersedia' : 'Lokasi tidak tersedia'}
          </div>
        </div>
      </article>
    `).join('');
  }

  displayNoStories() {
    const container = document.getElementById('stories-container');
    if (!container) return;

    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-map-signs"></i>
        <p>Belum ada cerita perjalanan</p>
        <p style="font-size: 0.9rem; margin-top: 8px; color: #6b7280;">
          ${ApiService.isUserLoggedIn() ? 
            'Jadilah yang pertama berbagi cerita!' : 
            'Silakan login untuk melihat cerita dari traveler lain.'}
        </p>
        <div style="margin-top: 16px;">
          ${ApiService.isUserLoggedIn() ? 
            '<a href="#/add-story" class="btn btn-primary">Tambah Cerita Pertama</a>' : 
            '<a href="#/login" class="btn btn-primary">Login Dulu</a>'}
        </div>
      </div>
    `;
  }

  async initMap() {
    try {
      this.mapService = new MapService('home-map');
      const map = this.mapService.initMap([-2.5489, 118.0149], 5);
      
      if (map) {
        this.mapService.addTileLayer('streets', 'Jalan');
        
        setTimeout(() => {
          this.mapService.invalidateSize();
        }, 300);
      } else {
        console.warn('Map initialization returned null');
      }
    } catch (error) {
      console.error('Error initializing map in home page:', error);
    }
  }

  updateMapWithStories() {
    if (!this.mapService || !this.mapService.isInitialized()) {
      console.warn('Map not ready for updating markers');
      return;
    }

    const storiesWithLocation = this.stories.filter(story => 
      story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
    );

    console.log('Stories with location:', storiesWithLocation);

    if (storiesWithLocation.length === 0) {
      console.log('No stories with valid location data');
      return;
    }

    this.mapService.clearMarkers();
    
    storiesWithLocation.forEach(story => {
      try {
        this.mapService.addMarker(
          [parseFloat(story.lat), parseFloat(story.lon)],
          `
            <div class="popup-content">
              <img src="${story.photoUrl}" alt="${story.description}" 
                   style="width: 100px; height: 80px; object-fit: cover; border-radius: 4px;"
                   onerror="this.src='https://via.placeholder.com/100x80?text=Gambar+Tidak+Tersedia'" />
              <h4>${story.name}</h4>
              <p>${story.description.substring(0, 100)}...</p>
              <small>${showFormattedDate(story.createdAt)}</small>
            </div>
          `
        );
      } catch (error) {
        console.error('Error adding marker for story:', story.id, error);
      }
    });

    if (storiesWithLocation.length > 0) {
      const bounds = storiesWithLocation.map(story => 
        [parseFloat(story.lat), parseFloat(story.lon)]
      );
      this.mapService.fitBounds(bounds);
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const storyCard = e.target.closest('.story-card');
      if (storyCard) {
        location.hash = '#/stories';
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const storyCard = e.target.closest('.story-card');
        if (storyCard) {
          e.preventDefault();
          location.hash = '#/stories';
        }
      }
    });
  }

  showError(message) {
    const container = document.getElementById('stories-container');
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>
      </div>
    `;
  }

  destroy() {
    if (this.mapService) {
      this.mapService.destroy();
      this.mapService = null;
    }
  }
}