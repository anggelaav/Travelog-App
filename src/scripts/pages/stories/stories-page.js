import ApiService from '../../data/api';
import { showFormattedDate } from '../../utils';
import MapService from '../../utils/map-service';
import IDBService from '../../utils/idb-service';

export default class StoriesPage {
  constructor() {
    this.stories = [];
    this.mapService = null;
    this.filteredStories = [];
    this.currentFilter = 'all';
    this.bookmarkedStories = new Set();
  }

  async render() {
    return `
      <section class="stories-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Cerita Perjalanan</h1>
            <p class="page-subtitle">Jelajahi pengalaman traveler dari berbagai penjuru dunia</p>
          </div>
        </header>

        <div class="container">
          <div class="stories-layout">
            <aside class="stories-sidebar">
              <div class="filter-section">
                <h3>Filter</h3>
                <div class="filter-options">
                  <button class="filter-btn active" data-filter="all">Semua</button>
                  <button class="filter-btn" data-filter="with-location">Dengan Lokasi</button>
                  <button class="filter-btn" data-filter="bookmarked">Disimpan</button>
                  <button class="filter-btn" data-filter="recent">Terbaru</button>
                </div>
              </div>
              
              <div class="offline-status" id="offline-status" style="display: none;">
                <i class="fas fa-wifi-slash"></i>
                <span>Mode Offline - Data dari cache</span>
              </div>
              
              <div class="stories-list" id="stories-list">
                <div class="loading-spinner">
                  <i class="fas fa-compass fa-spin"></i>
                  <p>Memuat cerita...</p>
                </div>
              </div>

              <div class="saved-stories-section">
                <h3><i class="fas fa-bookmark"></i> Cerita Tersimpan</h3>
                <div id="bookmarked-stories-list" class="bookmarked-stories-list">
                  <div class="loading-spinner">
                    <i class="fas fa-compass fa-spin"></i>
                    <p>Memuat cerita tersimpan...</p>
                  </div>
                </div>
              </div>

              <div class="offline-stories-section" style="margin-top: 2rem;">
                <h3><i class="fas fa-cloud"></i> Draft Offline</h3>
                <div id="saved-stories-list" class="saved-stories-list">
                  <div class="loading-spinner">
                    <i class="fas fa-compass fa-spin"></i>
                    <p>Memuat draft...</p>
                  </div>
                </div>
              </div>
            </aside>

            <main class="map-section">
              <div class="map-controls">
                <button id="layer-toggle" class="btn btn-outline">
                  <i class="fas fa-layer-group"></i> Ganti Tampilan Peta
                </button>
                <button id="sync-stories-btn" class="btn btn-outline" style="display: none;">
                  <i class="fas fa-sync"></i> Sync Draft
                </button>
              </div>
              <div id="stories-map" class="map-container-large"></div>
            </main>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStories();
    await this.loadBookmarkedStories();
    await this.loadSavedStories();
    this.setupEventListeners();
    this.setupOfflineSupport();
  }

  async loadBookmarkedStories() {
    try {
      const bookmarkedStories = await IDBService.getBookmarkedStories();
      this.bookmarkedStories = new Set(bookmarkedStories.map(story => story.id));
      this.displayBookmarkedStories(bookmarkedStories);
    } catch (error) {
      console.error('Error loading bookmarked stories:', error);
    }
  }

  displayBookmarkedStories(bookmarkedStories) {
    const container = document.getElementById('bookmarked-stories-list');
    if (!container) return;

    if (bookmarkedStories.length === 0) {
      container.innerHTML = `
        <div class="no-stories-message">
          <i class="fas fa-bookmark"></i>
          <p>Belum ada cerita yang disimpan</p>
          <p style="font-size: 0.8rem; color: #6b7280; margin-top: 8px;">
            Klik ikon bookmark pada cerita untuk menyimpannya
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = bookmarkedStories.map(story => `
      <article class="story-list-item bookmarked" data-story-id="${story.id}" 
               data-lat="${story.lat || ''}" data-lon="${story.lon || ''}" tabindex="0">
        <div class="story-header">
          <button class="btn-bookmark active" data-story-id="${story.id}" title="Hapus dari disimpan">
            <i class="fas fa-bookmark"></i>
          </button>
        </div>
        <img src="${story.photoUrl}" alt="${story.description}" class="story-thumbnail" loading="lazy"
             onerror="this.src='https://via.placeholder.com/80x80?text=Gambar+Tidak+Tersedia'" />
        <div class="story-info">
          <h4 class="story-name">${story.name}</h4>
          <p class="story-preview">${story.description.substring(0, 100)}...</p>
          <div class="story-meta">
            <span class="story-date">${showFormattedDate(story.createdAt)}</span>
            <span class="bookmarked-date">Disimpan: ${new Date(story.bookmarkedAt).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </article>
    `).join('');
  }

  async refreshStories() {
    await this.loadStories();
  }

  async loadStories(forceRefresh = false) {
    try {
      this.showLoadingState(true);
      
      console.log('Loading stories for stories page...', { forceRefresh });
      
      if (forceRefresh) {
        this.stories = [];
        if (this.mapService) {
          this.mapService.clearMarkers();
        }
      }
      
      if (!ApiService.isUserLoggedIn()) {
        this.showErrorMessage('Silakan login terlebih dahulu untuk melihat cerita.');
        this.displayNoStories();
        await this.initMap();
        return;
      }
      
      let stories = [];
      let isOffline = false;

      if (navigator.onLine) {
        try {
          this.stories = await ApiService.getAllStories();
          console.log('Stories loaded from API:', this.stories);
          
          for (const story of this.stories) {
            await IDBService.saveStory(story);
          }
        } catch (apiError) {
          console.warn('API failed, loading from IndexedDB:', apiError);
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      if (isOffline || this.stories.length === 0) {
        console.log('Loading stories from IndexedDB...');
        this.stories = await IDBService.getStories();
        
        const offlineStories = await IDBService.getOfflineStories();
        const formattedOfflineStories = offlineStories.map(story => ({
          ...story,
          id: story.id,
          name: 'Cerita Offline',
          photoUrl: URL.createObjectURL(story.photo),
          description: story.description,
          createdAt: story.createdAt,
          lat: story.lat,
          lon: story.lon,
          offline: true
        }));
        
        this.stories = [...formattedOfflineStories, ...this.stories];
        
        this.updateOfflineStatus(true);
      }

      if (this.stories && this.stories.length > 0) {
        this.filteredStories = [...this.stories];
        this.displayStoriesList();
        
        await this.initMap();
        this.updateMapWithStories();
        
        this.toggleSyncButton();
      } else {
        this.displayNoStories();
        await this.initMap();
      }
    } catch (error) {
      console.error('Error loading stories:', error);
      
      let errorMessage = 'Gagal memuat cerita: ';
      
      if (typeof error === 'string') {
        errorMessage += error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Terjadi kesalahan tidak diketahui';
      }
      
      const errorString = error.message || error.toString();
      
      if (errorString.includes('Authentication') || errorString.includes('login') || errorString.includes('401')) {
        errorMessage = 'Silakan login terlebih dahulu untuk melihat cerita.';
        setTimeout(() => {
          location.hash = '#/login';
        }, 3000);
      } else if (errorString.includes('network') || errorString.includes('fetch')) {
        errorMessage = 'Koneksi internet bermasalah. Menampilkan data dari cache.';
        this.updateOfflineStatus(true);
      }
      
      this.showErrorMessage(errorMessage);
      this.displayNoStories();
      await this.initMap();
    } finally {
      this.showLoadingState(false);
    }
  }

  showLoadingState(show) {
    const container = document.getElementById('stories-list');
    if (!container) return;

    if (show) {
      container.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-compass fa-spin"></i>
          <p>Memuat cerita...</p>
        </div>
      `;
    }
  }

  showErrorMessage(message) {
    const container = document.getElementById('stories-list');
    if (!container) return;

    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Coba Lagi</button>
      </div>
    `;
  }

  updateOfflineStatus(isOffline) {
    const offlineStatus = document.getElementById('offline-status');
    if (offlineStatus) {
      offlineStatus.style.display = isOffline ? 'flex' : 'none';
    }
  }

  toggleSyncButton() {
    const syncBtn = document.getElementById('sync-stories-btn');
    if (syncBtn) {
      IDBService.getOfflineStories().then(offlineStories => {
        syncBtn.style.display = offlineStories.length > 0 ? 'inline-flex' : 'none';
      });
    }
  }

  displayNoStories() {
    const container = document.getElementById('stories-list');
    if (!container) return;
  
    container.innerHTML = `
      <div class="no-stories-message">
        <i class="fas fa-map-signs"></i>
        <p>Tidak ada cerita yang ditemukan</p>
        <p style="font-size: 0.9rem; margin-top: 8px; color: #6b7280;">
          ${ApiService.isUserLoggedIn() ? 
            'Belum ada cerita yang dipublikasikan.' : 
            'Silakan login untuk melihat cerita dari traveler lain.'}
        </p>
        <div style="margin-top: 16px;">
          ${ApiService.isUserLoggedIn() ? 
            '<a href="#/add-story" class="btn btn-primary">Tambah Cerita Pertama</a>' : 
            '<a href="#/login" class="btn btn-primary">Login</a>'}
        </div>
      </div>
    `;
  }

  displayStoriesList() {
    const container = document.getElementById('stories-list');
    if (!container) return;
    
    container.innerHTML = this.filteredStories.map(story => {
      const isBookmarked = this.bookmarkedStories.has(story.id);
      
      return `
        <article class="story-list-item" data-story-id="${story.id}" 
                 data-lat="${story.lat || ''}" data-lon="${story.lon || ''}" tabindex="0">
          ${story.offline ? `
            <div class="offline-indicator">
              <i class="fas fa-cloud"></i>
              <span>Menunggu Sync</span>
            </div>
          ` : ''}
          <div class="story-header">
            <button class="btn-bookmark ${isBookmarked ? 'active' : ''}" 
                    data-story-id="${story.id}" 
                    title="${isBookmarked ? 'Hapus dari disimpan' : 'Simpan cerita'}">
              <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
            </button>
          </div>
          <img src="${story.photoUrl}" alt="${story.description}" class="story-thumbnail" loading="lazy"
               onerror="this.src='https://via.placeholder.com/80x80?text=Gambar+Tidak+Tersedia'" />
          <div class="story-info">
            <h4 class="story-name">${story.name}</h4>
            <p class="story-preview">${story.description.substring(0, 100)}...</p>
            <div class="story-meta">
              <span class="story-date">${showFormattedDate(story.createdAt)}</span>
              ${story.lat && story.lon ? 
                '<span class="location-badge"><i class="fas fa-map-marker-alt"></i> Ada lokasi</span>' : 
                '<span class="location-badge no-location"><i class="fas fa-map-marker-alt"></i> Tanpa lokasi</span>'
              }
            </div>
          </div>
        </article>
      `;
    }).join('');

    this.addStoriesStyles();
  }

  addStoriesStyles() {
    if (document.getElementById('stories-styles')) return;

    const style = document.createElement('style');
    style.id = 'stories-styles';
    style.textContent = `
      .offline-status {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 0.75rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #92400e;
        font-size: 0.875rem;
      }
      
      .offline-indicator {
        background: #f59e0b;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
      }
      
      .map-controls {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }
      
      .story-list-item {
        position: relative;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .story-list-item:hover {
        border-color: #2563eb;
        transform: translateY(-2px);
      }
      
      .story-list-item.active {
        border-color: #2563eb;
        background-color: #f0f9ff;
      }
      
      .no-stories-message {
        text-align: center;
        padding: 2rem;
        color: #6b7280;
      }
      
      .no-stories-message i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #d1d5db;
      }
    `;
    document.head.appendChild(style);
  }

  async initMap() {
    try {
      const mapContainer = document.getElementById('stories-map');
      if (!mapContainer) {
        console.warn('Map container not found');
        return;
      }
      
      if (this.mapService && this.mapService.isInitialized()) {
        console.log('Map already initialized, updating...');
        this.mapService.invalidateSize();
        return;
      }
      
      if (this.mapService) {
        this.mapService.destroy();
      }
      
      this.mapService = new MapService('stories-map');
      const map = this.mapService.initMap([-2.5489, 118.0149], 5);
      
      if (map) {
        this.mapService.addTileLayer('streets', 'Jalan');
        this.mapService.addTileLayer('satellite', 'Satelit');
        this.mapService.addTileLayer('outdoor', 'Outdoor');
        
        setTimeout(() => {
          this.mapService.invalidateSize();
        }, 300);
      }
    } catch (error) {
      console.error('Error initializing map in stories page:', error);
    }
  }

  updateMapWithStories() {
    if (!this.mapService || !this.mapService.isInitialized()) {
      console.warn('Map not ready for updating markers');
      return;
    }

    this.mapService.clearMarkers();
    
    const storiesWithLocation = this.filteredStories.filter(story => 
      story.lat && story.lon && !isNaN(story.lat) && !isNaN(story.lon)
    );

    console.log('Updating map with stories:', storiesWithLocation);

    storiesWithLocation.forEach(story => {
      try {
        const marker = this.mapService.addMarker(
          [parseFloat(story.lat), parseFloat(story.lon)],
          `
            <div class="popup-content">
              <img src="${story.photoUrl}" alt="${story.description}" 
                   style="width: 120px; height: 90px; object-fit: cover; border-radius: 4px;"
                   onerror="this.src='https://via.placeholder.com/120x90?text=Gambar+Tidak+Tersedia'" />
              <h4>${story.name}</h4>
              <p>${story.description.substring(0, 100)}...</p>
              <small>${showFormattedDate(story.createdAt)}</small>
              ${story.offline ? '<div style="color: #f59e0b;"><i class="fas fa-cloud"></i> Cerita Offline</div>' : ''}
            </div>
          `
        );

        if (marker) {
          marker.on('click', () => {
            this.highlightStory(story.id);
          });
        }
      } catch (error) {
        console.error('Error adding marker for story:', story.id, error);
      }
    });

    if (storiesWithLocation.length > 0) {
      const bounds = storiesWithLocation.map(story => 
        [parseFloat(story.lat), parseFloat(story.lon)]
      );
      
      if (bounds.length > 0) {
        try {
          this.mapService.fitBounds(bounds);
        } catch (boundsError) {
          console.error('Error fitting bounds:', boundsError);
          this.mapService.setView(bounds[0], 10);
        }
      }
    } else if (this.filteredStories.length > 0) {
      this.mapService.setView([-2.5489, 118.0149], 5);
    }
  }

  highlightStory(storyId) {
    document.querySelectorAll('.story-list-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`[data-story-id="${storyId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        this.currentFilter = e.target.dataset.filter;
        this.applyFilter();
      });
    });

    document.addEventListener('click', (e) => {
      const storyItem = e.target.closest('.story-list-item');
      if (storyItem) {
        const storyId = storyItem.dataset.storyId;
        const lat = storyItem.dataset.lat;
        const lon = storyItem.dataset.lon;
        
        if (lat && lon && this.mapService) {
          this.mapService.flyTo([parseFloat(lat), parseFloat(lon)], 13);
          this.highlightStory(storyId);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const storyItem = e.target.closest('.story-list-item');
        if (storyItem) {
          e.preventDefault();
          const lat = storyItem.dataset.lat;
          const lon = storyItem.dataset.lon;
          
          if (lat && lon && this.mapService) {
            this.mapService.flyTo([parseFloat(lat), parseFloat(lon)], 13);
            this.highlightStory(storyItem.dataset.storyId);
          }
        }
      }
    });

    document.addEventListener('click', async (e) => {
      const bookmarkBtn = e.target.closest('.btn-bookmark');
      if (bookmarkBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const storyId = bookmarkBtn.dataset.storyId;
        const story = this.stories.find(s => s.id === storyId);
        
        if (!story) return;
        
        const isCurrentlyBookmarked = this.bookmarkedStories.has(storyId);
        
        try {
          if (isCurrentlyBookmarked) {
            await IDBService.removeBookmark(storyId);
            this.bookmarkedStories.delete(storyId);
            bookmarkBtn.classList.remove('active');
            bookmarkBtn.innerHTML = '<i class="far fa-bookmark"></i>';
            bookmarkBtn.title = 'Simpan cerita';
          } else {
            await IDBService.bookmarkStory(story);
            this.bookmarkedStories.add(storyId);
            bookmarkBtn.classList.add('active');
            bookmarkBtn.innerHTML = '<i class="fas fa-bookmark"></i>';
            bookmarkBtn.title = 'Hapus dari disimpan';
          }
          
          await this.loadBookmarkedStories();
          
          if (this.currentFilter === 'bookmarked') {
            this.applyFilter();
          }
          
        } catch (error) {
          console.error('Error toggling bookmark:', error);
          this.showErrorMessage('Gagal menyimpan cerita');
        }
      }
    });

    const layerToggle = document.getElementById('layer-toggle');
    if (layerToggle) {
      layerToggle.addEventListener('click', () => {
        if (this.mapService) {
          this.mapService.toggleNextLayer();
        }
      });
    }

    const syncBtn = document.getElementById('sync-stories-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        if (!navigator.onLine) {
          this.showErrorMessage('Tidak dapat sync saat offline');
          return;
        }

        try {
          syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyinkronisasi...';
          syncBtn.disabled = true;

          const results = await IDBService.syncOfflineStories();
          const successCount = results.filter(r => r.success).length;

          if (successCount > 0) {
            this.showSuccessNotification(`${successCount} cerita offline berhasil disinkronisasi!`);
            await this.loadStories();
          } else {
            this.showSuccessNotification('Tidak ada cerita offline yang perlu disinkronisasi.');
          }
        } catch (error) {
          console.error('Sync error:', error);
          this.showErrorMessage('Gagal menyinkronisasi cerita offline');
        } finally {
          syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sync Cerita Offline';
          syncBtn.disabled = false;
          this.toggleSyncButton();
        }
      });
    }
  }

  setupOfflineSupport() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      this.updateOfflineStatus(!isOnline);
      
      if (isOnline) {
        this.autoSyncOfflineStories();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); 
  }

  async autoSyncOfflineStories() {
    try {
      const offlineStories = await IDBService.getOfflineStories();
      if (offlineStories.length > 0) {
        console.log('Auto-syncing offline stories...');
        const results = await IDBService.syncOfflineStories();
        const successCount = results.filter(r => r.success).length;
        
        if (successCount > 0) {
          console.log(`Auto-synced ${successCount} stories`);
          this.showSuccessNotification(`${successCount} cerita berhasil disinkronisasi otomatis`);
          await this.loadStories(); 
        }
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  }

  applyFilter() {
    switch (this.currentFilter) {
      case 'with-location':
        this.filteredStories = this.stories.filter(story => story.lat && story.lon);
        break;
      case 'bookmarked':
        this.filteredStories = this.stories.filter(story => this.bookmarkedStories.has(story.id));
        break;
      case 'recent':
        this.filteredStories = [...this.stories].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 10);
        break;
      default:
        this.filteredStories = [...this.stories];
    }
    
    this.displayStoriesList();
    this.updateMapWithStories();
  }

  async loadSavedStories() {
    try {
      const savedStoriesContainer = document.getElementById('saved-stories-list');
      if (!savedStoriesContainer) return;

      const offlineStories = await IDBService.getOfflineStories();
      
      if (offlineStories.length === 0) {
        savedStoriesContainer.innerHTML = `
          <div class="no-stories-message">
            <i class="fas fa-cloud"></i>
            <p>Tidak ada cerita tersimpan offline</p>
          </div>
        `;
        return;
      }

      savedStoriesContainer.innerHTML = offlineStories.map(story => `
        <div class="saved-story-item">
          <div class="saved-story-content">
            <h4>${story.description.substring(0, 50)}...</h4>
            <p class="saved-story-meta">
              <small>Disimpan: ${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
              ${story.lat && story.lon ? 
                '<span class="location-badge"><i class="fas fa-map-marker-alt"></i> Ada lokasi</span>' : 
                '<span class="location-badge no-location"><i class="fas fa-map-marker-alt"></i> Tanpa lokasi</span>'
              }
            </p>
          </div>
          <div class="saved-story-actions">
            <button class="btn btn-outline btn-small sync-single-story" data-story-id="${story.id}">
              <i class="fas fa-sync"></i> Sync
            </button>
            <button class="btn btn-outline btn-small delete-saved-story" data-story-id="${story.id}">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </div>
        </div>
      `).join('');

      this.setupSavedStoriesListeners();

    } catch (error) {
      console.error('Error loading saved stories:', error);
    }
  }

  setupSavedStoriesListeners() {
    document.querySelectorAll('.sync-single-story').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const storyId = e.target.closest('button').dataset.storyId;
        await this.syncSingleStory(storyId);
      });
    });

    document.querySelectorAll('.delete-saved-story').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const storyId = e.target.closest('button').dataset.storyId;
        await this.deleteSavedStory(storyId);
      });
    });
  }

  async syncSingleStory(storyId) {
    try {
      const offlineStories = await IDBService.getOfflineStories();
      const story = offlineStories.find(s => s.id === storyId);
      
      if (!story) {
        this.showErrorMessage('Cerita tidak ditemukan');
        return;
      }

      const formData = new FormData();
      formData.append('description', story.description);
      
      if (story.photo) {
        formData.append('photo', story.photo);
      }
      
      if (story.lat && story.lon) {
        formData.append('lat', story.lat);
        formData.append('lon', story.lon);
      }

      const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: formData
      });

      if (response.ok) {
        await IDBService.deleteOfflineStory(storyId);
        this.showSuccessNotification('Cerita berhasil disinkronisasi!');
        await this.loadSavedStories();
        await this.loadStories(true); 
      } else {
        throw new Error('Gagal menyinkronisasi cerita');
      }
    } catch (error) {
      console.error('Error syncing single story:', error);
      this.showErrorMessage('Gagal menyinkronisasi cerita: ' + error.message);
    }
  }

  async deleteSavedStory(storyId) {
    if (!confirm('Apakah Anda yakin ingin menghapus cerita ini?')) {
      return;
    }

    try {
      await IDBService.deleteOfflineStory(storyId);
      this.showSuccessNotification('Cerita berhasil dihapus!');
      await this.loadSavedStories();
    } catch (error) {
      console.error('Error deleting saved story:', error);
      this.showErrorMessage('Gagal menghapus cerita');
    }
  }

  showSuccessNotification(message) {
    const existingNotifications = document.querySelectorAll('.success-notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  destroy() {
    if (this.mapService) {
      this.mapService.destroy();
      this.mapService = null;
    }
  }
}