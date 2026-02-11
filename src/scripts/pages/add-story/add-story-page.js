import ApiService from '../../data/api';
import MapService from '../../utils/map-service';
import CameraService from '../../utils/camera-service';
import IDBService from '../../utils/idb-service';

export default class AddStoryPage {
  constructor() {
    this.mapService = null;
    this.cameraService = null;
    this.selectedLocation = null;
    this.photoFiles = [];
    this.isCameraOpen = false;
    this.maxPhotos = 5;
  }

  async render() {
    if (!ApiService.isUserLoggedIn()) {
      return this.renderLoginRequired();
    }

    return `
      <section class="add-story-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Bagikan Cerita Perjalanan</h1>
            <p class="page-subtitle">Bagikan momen berharga perjalananmu dengan traveler lainnya</p>
          </div>
        </header>

        <div class="container">
          <form id="add-story-form" class="story-form">
            <div class="form-grid">
              <div class="form-section">
                <h3>Informasi Cerita</h3>

                <div class="form-group">
                  <label for="story-description" class="form-label">Cerita Perjalanan *</label>
                  <textarea 
                    id="story-description" 
                    name="description" 
                    required 
                    aria-required="true"
                    placeholder="Ceritakan pengalaman perjalanan Anda..."
                    rows="5"
                    class="form-textarea"
                  ></textarea>
                  <span class="error-message" id="description-error"></span>
                </div>

                <div class="form-group">
                  <label class="form-label">Foto Perjalanan *</label>
                  <div class="photo-info">
                    <span class="photo-counter">Maksimal ${this.maxPhotos} foto</span>
                    <span class="photo-status" id="photo-status">Belum ada foto dipilih</span>
                  </div>
                  <div class="photo-options">
                    <button type="button" id="camera-btn" class="btn btn-outline">
                      <i class="fas fa-camera"></i> Ambil Foto
                    </button>
                    <button type="button" id="upload-btn" class="btn btn-outline">
                      <i class="fas fa-upload"></i> Unggah Foto
                    </button>
                  </div>
                  <input 
                    type="file" 
                    id="photo-input" 
                    accept="image/*" 
                    multiple
                    hidden
                    aria-label="Unggah foto"
                  >
                  <div id="photo-preview" class="photo-previews-container"></div>
                  <span class="error-message" id="photo-error"></span>
                </div>
              </div>

              <div class="form-section">
                <h3>Lokasi Perjalanan</h3>
                
                <div class="form-group">
                  <label class="form-label">Pilih Lokasi di Peta *</label>
                  <p class="form-help">Klik pada peta untuk memilih lokasi perjalanan Anda</p>
                  <div id="selected-location" class="selected-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Belum memilih lokasi</span>
                  </div>
                  <span class="error-message" id="location-error"></span>
                </div>

                <div id="add-story-map" class="map-container-form"></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary btn-large">
                <i class="fas fa-paper-plane"></i> Publikasikan Cerita
              </button>
              <button type="button" class="btn btn-outline" id="cancel-btn">
                Batal
              </button>
            </div>
          </form>

          <div id="camera-modal" class="modal" style="display: none;">
            <div class="modal-content camera-modal-content">
              <div class="modal-header">
                <h3>Ambil Foto</h3>
                <button type="button" id="close-camera" class="btn-close" aria-label="Tutup kamera">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div class="modal-body camera-modal-body">
                <div class="camera-preview-container">
                  <video id="camera-preview" autoplay playsinline></video>
                  <canvas id="photo-canvas" style="display: none;"></canvas>
                </div>
                <div class="camera-controls">
                  <button type="button" id="capture-btn" class="btn btn-primary btn-capture">
                    <i class="fas fa-camera"></i>
                  </button>
                  <button type="button" id="switch-camera" class="btn btn-outline btn-switch">
                    <i class="fas fa-sync-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderLoginRequired() {
    return `
      <section class="login-required-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Login Diperlukan</h1>
            <p class="page-subtitle">Anda harus login untuk menambahkan cerita perjalanan</p>
          </div>
        </header>

        <div class="container">
          <div class="login-required-content">
            <div class="login-message">
              <i class="fas fa-exclamation-circle"></i>
              <h2>Anda belum login</h2>
              <p>Untuk berbagi cerita perjalanan, silakan login terlebih dahulu.</p>
              <div class="login-actions">
                <button id="go-to-login" class="btn btn-primary">Pergi ke Halaman Login</button>
                <button id="go-to-home" class="btn btn-outline">Kembali ke Beranda</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (!ApiService.isUserLoggedIn()) {
      this.setupLoginRequiredListeners();
      return;
    }

    await this.initMap();
    this.initCamera();
    this.setupEventListeners();
    this.updatePhotoStatus();
    this.setupCameraDebugging();
    this.addCameraStyles();
  }

  addCameraStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .camera-modal-content {
        max-width: 400px;
        width: 90vw;
        margin: 20px auto;
      }

      .camera-modal-body {
        padding: 0;
        position: relative;
      }

      .camera-preview-container {
        width: 100%;
        height: 400px;
        background: #000;
        position: relative;
        overflow: hidden;
        border-radius: 8px 8px 0 0;
      }

      #camera-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .camera-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 0 0 8px 8px;
      }

      .btn-capture {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        border: 4px solid white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .btn-switch {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .photo-previews-container {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 12px;
      }
      
      .preview-item {
        width: 100px;
        height: 100px;
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 2px solid #e5e7eb;
      }
      
      .preview-container {
        width: 100%;
        height: 100%;
        position: relative;
      }
      
      .preview-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .preview-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .preview-item:hover .preview-overlay {
        opacity: 1;
      }
      
      .preview-number {
        background: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
      }
      
      .btn-remove-photo {
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border: none;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 10px;
        transition: background-color 0.2s ease;
      }
      
      .btn-remove-photo:hover {
        background: rgba(220, 38, 38, 0.9);
      }
      
      .photo-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.875rem;
        color: #6b7280;
      }
      
      .photo-options {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .photo-status.empty {
        color: #ef4444;
      }
      
      .photo-status.has-photos {
        color: #10b981;
      }

      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: modalAppear 0.3s ease;
      }

      @keyframes modalAppear {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  setupLoginRequiredListeners() {
    const goToLoginBtn = document.getElementById('go-to-login');
    const goToHomeBtn = document.getElementById('go-to-home');

    if (goToLoginBtn) {
      goToLoginBtn.addEventListener('click', () => {
        location.hash = '#/login';
      });
    }

    if (goToHomeBtn) {
      goToHomeBtn.addEventListener('click', () => {
        location.hash = '#/';
      });
    }
  }

  async initMap() {
    try {
      this.mapService = new MapService('add-story-map');
      const map = this.mapService.initMap([-6.2088, 106.8456], 5);
      
      if (map) {
        map.on('click', (e) => {
          this.selectLocation(e.latlng);
        });

        setTimeout(() => {
          this.mapService.invalidateSize();
        }, 300);
      } else {
        this.showError('location-error', 'Gagal memuat peta. Pastikan koneksi internet tersedia.');
      }
    } catch (error) {
      console.error('Error initializing map in add-story page:', error);
      this.showError('location-error', 'Gagal memuat peta: ' + error.message);
    }
  }

  selectLocation(latlng) {
    this.selectedLocation = latlng;
    this.mapService.clearMarkers();
    this.mapService.addMarker(latlng, 'Lokasi yang dipilih');
    
    const locationDisplay = document.getElementById('selected-location');
    if (locationDisplay) {
      locationDisplay.innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        <span>Lat: ${latlng.lat.toFixed(4)}, Lng: ${latlng.lng.toFixed(4)}</span>
      `;
    }
    
    this.clearError('location-error');
  }

  initCamera() {
    try {
      this.cameraService = new CameraService('camera-preview', 'photo-canvas');
    } catch (error) {
      console.error('Error initializing camera service:', error);
      this.showError('photo-error', 'Kamera tidak tersedia: ' + error.message);
    }
  }

  setupEventListeners() {
    const form = document.getElementById('add-story-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const cameraBtn = document.getElementById('camera-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const photoInput = document.getElementById('photo-input');
    
    if (cameraBtn) cameraBtn.addEventListener('click', () => this.openCamera());
    if (uploadBtn) uploadBtn.addEventListener('click', () => this.openFileInput());
    if (photoInput) photoInput.addEventListener('change', (e) => this.handleFileSelect(e));

    const closeCamera = document.getElementById('close-camera');
    const captureBtn = document.getElementById('capture-btn');
    const switchCamera = document.getElementById('switch-camera');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (closeCamera) closeCamera.addEventListener('click', () => this.closeCamera());
    if (captureBtn) captureBtn.addEventListener('click', () => this.capturePhoto());
    if (switchCamera) switchCamera.addEventListener('click', () => this.switchCamera());
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      location.hash = '#/stories';
    });

    const modal = document.getElementById('camera-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeCamera();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isCameraOpen) {
        this.closeCamera();
      }
    });
  }

  async openCamera() {
    try {
      const isSupported = await this.cameraService.checkCameraSupport();
      if (!isSupported) {
        this.showError('photo-error', 'Kamera tidak didukung di browser ini');
        return;
      }

      const modal = document.getElementById('camera-modal');
      if (modal) {
        modal.style.display = 'flex';
        this.isCameraOpen = true;
      }
      
      await this.cameraService.startCamera();
      
    } catch (error) {
      console.error('Error opening camera:', error);
      this.showError('photo-error', 'Tidak dapat mengakses kamera: ' + error.message);
      this.closeCamera();
    }
  }

  closeCamera() {
    const modal = document.getElementById('camera-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    
    this.cameraService.stopCamera();
    this.isCameraOpen = false;
  }

  async capturePhoto() {
    try {
      const photoBlob = await this.cameraService.capturePhoto();
      this.handlePhotoCapture(photoBlob);
      this.closeCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      this.showError('photo-error', 'Gagal mengambil foto: ' + error.message);
    
      try {
        console.log('Trying fallback capture method...');
        const fallbackBlob = await this.cameraService.capturePhotoToContainerSize();
        this.handlePhotoCapture(fallbackBlob);
        this.closeCamera();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  async switchCamera() {
    try {
      await this.cameraService.switchCamera();
    } catch (error) {
      console.error('Error switching camera:', error);
      this.showError('photo-error', 'Gagal mengganti kamera: ' + error.message);
    }
  }

  handlePhotoCapture(blob) {
    if (this.photoFiles.length >= this.maxPhotos) {
      this.showError('photo-error', `Maksimal ${this.maxPhotos} foto yang diizinkan`);
      return;
    }

    const photoFile = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.photoFiles.push(photoFile);
    this.displayPhotoPreview(URL.createObjectURL(blob), this.photoFiles.length - 1);
    this.updatePhotoStatus();
    this.clearError('photo-error');
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    const remainingSlots = this.maxPhotos - this.photoFiles.length;
    if (files.length > remainingSlots) {
      this.showError('photo-error', `Maksimal ${this.maxPhotos} foto. Anda dapat menambahkan ${remainingSlots} foto lagi.`);
      return;
    }

    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        this.photoFiles.push(file);
        this.displayPhotoPreview(URL.createObjectURL(file), this.photoFiles.length - 1);
      } else {
        this.showError('photo-error', 'File harus berupa gambar (JPEG, PNG, dll)');
      }
    });

    this.updatePhotoStatus();
    this.clearError('photo-error');
    
    event.target.value = '';
  }

  openFileInput() {
    const photoInput = document.getElementById('photo-input');
    if (photoInput) {
      photoInput.click();
    }
  }

   displayPhotoPreview(url, index) {
    const previewContainer = document.getElementById('photo-preview');
    if (!previewContainer) return;

    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.innerHTML = `
      <div class="preview-container">
        <img src="${url}" alt="Preview foto perjalanan ${index + 1}" />
        <div class="preview-overlay">
          <span class="preview-number">${index + 1}</span>
          <button type="button" class="btn-remove-photo" data-index="${index}" aria-label="Hapus foto">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;

    previewContainer.appendChild(previewItem);

    const removeBtn = previewItem.querySelector('.btn-remove-photo');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePhoto(index);
      });
    }
  }

  removePhoto(index) {
    this.photoFiles.splice(index, 1);
    
    this.updatePhotoPreviews();
    this.updatePhotoStatus();
  }

  updatePhotoPreviews() {
    const previewContainer = document.getElementById('photo-preview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    this.photoFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      this.displayPhotoPreview(url, index);
    });
  }

  updatePhotoStatus() {
    const statusElement = document.getElementById('photo-status');
    if (statusElement) {
      if (this.photoFiles.length === 0) {
        statusElement.textContent = 'Belum ada foto dipilih';
        statusElement.className = 'photo-status empty';
      } else {
        statusElement.textContent = `${this.photoFiles.length} foto dipilih (Maksimal: ${this.maxPhotos})`;
        statusElement.className = 'photo-status has-photos';
      }
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    console.log('=== START FORM SUBMISSION ===');
    
    if (!this.validateForm()) {
      console.log('Form validation failed');
      return;
    }

    if (!ApiService.isUserLoggedIn()) {
      this.showError('form-error', 'Session telah berakhir. Silakan login kembali.');
      return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    const originalText = submitBtn.innerHTML;
    
    try {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memublikasikan...';
      submitBtn.disabled = true;

      const formData = new FormData();
      
      const descInput = document.getElementById('story-description');
      const description = descInput ? descInput.value.trim() : '';
      
      console.log('Form values:', { description });
      
      formData.append('description', description); 
      
      if (this.photoFiles.length > 0) {
        console.log('Adding photo file:', this.photoFiles[0]);
        formData.append('photo', this.photoFiles[0]);
      } else {
        console.error('No photo files available');
        throw new Error('Minimal satu foto diperlukan');
      }
      
      if (this.selectedLocation) {
        formData.append('lat', this.selectedLocation.lat.toString());
        formData.append('lon', this.selectedLocation.lng.toString());
        console.log('Adding location:', this.selectedLocation);
      }

      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        console.log('Device is offline, saving to IndexedDB');
        await this.saveStoryOffline(description, this.photoFiles[0], this.selectedLocation);
        this.showSuccess('Cerita disimpan secara offline dan akan disinkronisasi ketika online');
        this.resetForm();
        return;
      }

      console.log('=== FORM DATA CONTENTS ===');
      for (let [key, value] of formData.entries()) {
        if (key === 'photo') {
          console.log(`- ${key}:`, value.name, value.type, value.size + ' bytes');
        } else {
          console.log(`- ${key}:`, value);
        }
      }
      console.log('=== END FORM DATA ===');

      console.log('Sending request to API...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: Request took too long')), 15000);
      });

      const submitPromise = ApiService.addStory(formData);
      
      const result = await Promise.race([submitPromise, timeoutPromise]);
      
      console.log('✅ Story submission SUCCESS:', result);
      
      this.showSuccess(`Berhasil mempublikasikan cerita!`);
      
      this.resetForm();

      window.dispatchEvent(new CustomEvent('storyAdded'));
      
      setTimeout(() => {
        location.hash = '#/stories';
      }, 2000);

    } catch (error) {
      console.error('❌ Error submitting story:', error);
      
      let errorMessage = 'Gagal mempublikasikan cerita: ';
      let shouldSaveOffline = false;
      
      if (typeof error === 'string') {
        errorMessage += error;
        if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
          shouldSaveOffline = true;
        }
      } else if (error && error.message) {
        errorMessage += error.message;
        const errorStr = error.message.toLowerCase();
        if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('failed to fetch')) {
          shouldSaveOffline = true;
        }
      } else {
        errorMessage += 'Terjadi kesalahan tidak diketahui';
      }
      
      if (shouldSaveOffline && navigator.onLine) {
        try {
          const descInput = document.getElementById('story-description');
          const description = descInput ? descInput.value.trim() : '';
          
          await this.saveStoryOffline(description, this.photoFiles[0], this.selectedLocation);
          this.showSuccess('Cerita disimpan secara offline karena koneksi bermasalah');
          this.resetForm();
          return;
        } catch (offlineError) {
          console.error('Failed to save offline:', offlineError);
          errorMessage += ' - Juga gagal menyimpan offline';
        }
      }
      
      this.showError('form-error', errorMessage);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      console.log('=== END FORM SUBMISSION ===');
    }
  }

  async saveStoryOffline(description, photoFile, location) {
    try {
      const offlineStory = {
        description,
        photo: photoFile,
        lat: location?.lat,
        lon: location?.lng,
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      };

      const savedStory = await IDBService.saveOfflineStory(offlineStory);
      
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-stories');
          console.log('Background sync registered for offline story');
        } catch (syncError) {
          console.warn('Background sync not supported:', syncError);
        }
      }
      
      return savedStory;
    } catch (error) {
      console.error('Error saving offline story:', error);
      throw new Error('Gagal menyimpan cerita offline: ' + error.message);
    }
  }

  validateForm() {
    let isValid = true;

    const descInput = document.getElementById('story-description');
  
    if (descInput) {
      const description = descInput.value.trim();
      if (!description) {
        this.showError('description-error', 'Cerita perjalanan harus diisi');
        isValid = false;
      } else if (description.length < 10) {
        this.showError('description-error', 'Cerita terlalu pendek (minimal 10 karakter)');
        isValid = false;
      } else {
        this.clearError('description-error');
      }
    }

    if (this.photoFiles.length === 0) {
      this.showError('photo-error', 'Minimal 1 foto perjalanan harus disertakan');
      isValid = false;
    } else {
      this.clearError('photo-error');
    }

    if (!this.selectedLocation) {
      this.showError('location-error', 'Lokasi perjalanan harus dipilih');
      isValid = false;
    } else {
      this.clearError('location-error');
    }

    console.log('Form validation result:', isValid);
    return isValid;
  }

  resetForm() {
    const descInput = document.getElementById('story-description');
    
    if (descInput) descInput.value = '';
    
    this.photoFiles = [];
    this.updatePhotoPreviews();
    this.updatePhotoStatus();
    
    this.selectedLocation = null;
    const locationDisplay = document.getElementById('selected-location');
    if (locationDisplay) {
      locationDisplay.innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        <span>Belum memilih lokasi</span>
      `;
    }
    
    if (this.mapService) {
      this.mapService.clearMarkers();
    }
    
    this.clearAllErrors();
  }

  clearAllErrors() {
    this.clearError('name-error');
    this.clearError('description-error');
    this.clearError('photo-error');
    this.clearError('location-error');
    this.clearError('form-error');
  }

  showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  clearError(fieldId) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }
  }

  showSuccess(message) {
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
    
    if (this.cameraService) {
      this.cameraService.destroy();
      this.cameraService = null;
    }
  }

  setupCameraDebugging() {
  const videoElement = document.getElementById('camera-preview');
  if (videoElement) {
    videoElement.addEventListener('loadedmetadata', () => {
      console.log('Video dimensions:', {
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        clientWidth: videoElement.clientWidth,
        clientHeight: videoElement.clientHeight,
        aspectRatio: videoElement.videoWidth / videoElement.videoHeight
      });
    });
  }
}
}