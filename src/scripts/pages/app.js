import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import { transitionHelper, setupSkipToContent } from '../utils';
import ApiService from '../data/api';
import PushService from '../utils/push-service';
import IDBService from '../utils/idb-service';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #skipLinkButton = null;
  #currentPage = null;
  #deferredPrompt = null;

  constructor({ navigationDrawer, drawerButton, content, skipLinkButton }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#skipLinkButton = skipLinkButton;

    this._init();
    this._setupAuthListeners();
    this._updateNavigationAuth();
    this._initPWA();
    this._setupStoryUpdateListener();
    this._setupNotificationToggle();
  }

  async _initPWA() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log('Unregistered old service worker');
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        if (registration.installing) {
          console.log('Service worker installing');
        } else if (registration.waiting) {
          console.log('Service worker installed');
        } else if (registration.active) {
          console.log('Service worker active');
        }
        
        await PushService.init();
        await IDBService.init();
        
        this._setupInstallPrompt();
        this._setupOnlineOfflineEvents();
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  _setupCacheRefresh() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed, reloading page');
        window.location.reload();
      });
    }
  }

  _setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.#deferredPrompt = e;
      
      console.log('Before install prompt triggered');
      this._showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed successfully');
      this.#deferredPrompt = null;
      this._hideInstallButton();
      this._showSuccessNotification('Aplikasi berhasil diinstall!');
    });
  }

  _showInstallButton() {
    this._hideInstallButton();

    const installButton = document.createElement('button');
    installButton.className = 'btn btn-outline install-btn';
    installButton.innerHTML = '<i class="fas fa-download"></i> Install App';
    installButton.style.marginTop = '1rem';
    installButton.style.width = '100%';
    installButton.style.justifyContent = 'center';
    
    installButton.addEventListener('click', async () => {
      if (!this.#deferredPrompt) {
        console.log('No install prompt available');
        return;
      }

      try {
        this.#deferredPrompt.prompt();
        const { outcome } = await this.#deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
          this._showSuccessNotification('Menginstall aplikasi...');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        this.#deferredPrompt = null;
        this._hideInstallButton();
      } catch (error) {
        console.error('Error triggering install prompt:', error);
      }
    });

    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.appendChild(installButton);
    }
  }

  _hideInstallButton() {
    const installButton = document.querySelector('.install-btn');
    if (installButton) {
      installButton.remove();
    }
  }

  _setupOnlineOfflineEvents() {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      document.body.classList.toggle('offline', !isOnline);
      
      this._showOfflineIndicator(!isOnline);
      
      if (isOnline) {
        console.log('Connection restored, syncing offline data...');
        this._syncOfflineData();
        
        this._tryAutoSubscribePushNotifications();
      } else {
        console.log('Connection lost, entering offline mode');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    updateOnlineStatus();
  }

  _showOfflineIndicator(show) {
    let offlineIndicator = document.getElementById('offline-indicator');
    
    if (show && !offlineIndicator) {
      offlineIndicator = document.createElement('div');
      offlineIndicator.id = 'offline-indicator';
      offlineIndicator.className = 'offline-indicator';
      offlineIndicator.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>Anda sedang offline - Beberapa fitur mungkin terbatas</span>
      `;
      document.body.appendChild(offlineIndicator);
      
      this._addPWAStyles();
    } else if (!show && offlineIndicator) {
      offlineIndicator.remove();
    }
  }

  _addPWAStyles() {
    if (document.getElementById('pwa-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-styles';
    style.textContent = `
      .offline-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #f59e0b;
        color: white;
        padding: 0.75rem 1rem;
        text-align: center;
        font-size: 0.875rem;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      .offline-indicator i {
        font-size: 1rem;
      }
      
      .sync-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
      }
      
      .sync-notification.show {
        transform: translateX(0);
      }
      
      body.offline {
        opacity: 0.95;
      }
      
      .install-btn {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  async _syncOfflineData() {
    try {
      console.log('Starting offline data sync...');
      const results = await IDBService.syncOfflineStories();
      
      if (results.length > 0) {
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          this._showSyncNotification(successCount, failedCount);
        }
        
        if (failedCount > 0) {
          console.warn(`${failedCount} stories failed to sync`);
        }
      } else {
        console.log('No offline data to sync');
      }
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      this._showErrorNotification('Gagal menyinkronisasi data offline');
    }
  }

  _showSyncNotification(successCount, failedCount = 0) {
    const existingNotification = document.querySelector('.sync-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'sync-notification success-notification show';
    
    let message = `${successCount} cerita offline berhasil disinkronisasi`;
    if (failedCount > 0) {
      message += `, ${failedCount} gagal`;
    }
    
    notification.innerHTML = `
      <i class="fas fa-sync"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  async _tryAutoSubscribePushNotifications() {
    if (!navigator.onLine) {
      console.log('Skipping push notification subscription - offline');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription && ApiService.isUserLoggedIn()) {
        console.log('Attempting to auto-subscribe to push notifications...');
        
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          const convertedVapidKey = this._urlBase64ToUint8Array('BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk');
          
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });

          await this._sendSubscriptionToServer(newSubscription);
          console.log('Auto-subscribed to push notifications successfully');
        } else {
          console.log('Push notification permission not granted:', permission);
        }
      } else if (subscription) {
        console.log('Already subscribed to push notifications');
      }
    } catch (error) {
      console.error('Failed to auto-subscribe to push notifications:', error);
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async _sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }

    return await response.json();
  }

  _showSuccessNotification(message) {
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

  _showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.background = '#ef4444';
    notification.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
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

  _init() {
    setupSkipToContent(this.#skipLinkButton, this.#content);
    this._setupDrawer();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isExpanded = this.#drawerButton.getAttribute('aria-expanded') === 'true';
      this.#drawerButton.setAttribute('aria-expanded', !isExpanded);
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    this.#navigationDrawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
        this.#drawerButton.focus();
      }
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const PageClass = routes[url];

    if (!PageClass) {
      this.#content.innerHTML = `
        <section class="error-page">
          <div class="container">
            <div class="error-content">
              <h1>404 - Halaman Tidak Ditemukan</h1>
              <p>Halaman yang Anda cari tidak ditemukan.</p>
              <a href="#/" class="btn btn-primary">Kembali ke Beranda</a>
            </div>
          </div>
        </section>
      `;
      return;
    }

    if ((url === '/stories' || url === '/add-story') && !ApiService.isUserLoggedIn()) {
      sessionStorage.setItem('redirectAfterLogin', url);
      location.hash = '#/login';
      return;
    }

    if (this.#currentPage && typeof this.#currentPage.destroy === 'function') {
      await this.#currentPage.destroy();
    }

    const page = new PageClass();
    this.#currentPage = page;

    const transition = transitionHelper({
      updateDOM: async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
        this._updateNavigation(url);
        this._updateNavigationAuth();
        
        if (this.#deferredPrompt) {
          this._showInstallButton();
        }
      },
    });

    transition.ready.catch(async (error) => {
      console.error('View transition error:', error);
      this.#content.innerHTML = await page.render();
      page.afterRender().then(() => {
        this._updateNavigation(url);
        this._updateNavigationAuth();
      });
    });

    transition.updateCallbackDone.then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  _updateNavigation(currentUrl) {
    const navLinks = this.#navigationDrawer.querySelectorAll('a');
    navLinks.forEach(link => {
      const linkUrl = link.getAttribute('href').replace('#', '');
      if (linkUrl === currentUrl || (currentUrl === '/' && linkUrl === '')) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  _updateNavigationAuth() {
    const authSection = document.getElementById('auth-section');
    const loginLink = document.getElementById('login-link');
    const logoutBtn = document.getElementById('logout-btn');
    const notificationSection = document.getElementById('notification-section');

    if (authSection && loginLink && logoutBtn && notificationSection) {
      const isLoggedIn = ApiService.isUserLoggedIn();

      if (isLoggedIn) {
        loginLink.style.display = 'none';
        logoutBtn.style.display = 'block';

        if ('serviceWorker' in navigator && 'PushManager' in window) {
          notificationSection.style.display = 'block';
          this._updateNotificationButton();
        }
        
        setTimeout(() => this._tryAutoSubscribePushNotifications(), 1000);
      } else {
        loginLink.style.display = 'block';
        logoutBtn.style.display = 'none';
        notificationSection.style.display = 'none';
      }
    }
  }

  _setupAuthListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            await subscription.unsubscribe();
            console.log('Unsubscribed from push notifications');
          }
        } catch (error) {
          console.error('Error unsubscribing from push notifications:', error);
        } finally {
          ApiService.removeAuthToken();
          this._updateNavigationAuth();
          location.hash = '#/';
        }
      });
    }
  }

  _setupStoryUpdateListener() {
    window.addEventListener('storyAdded', async () => {
      console.log('Story added event received, refreshing stories page...');
      
      if (this.#currentPage && this.#currentPage instanceof StoriesPage) {
        await this.#currentPage.refreshStories();
      }
    });
  }

  _setupNotificationToggle() {
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationSection = document.getElementById('notification-section');
    
    if (notificationToggle && notificationSection) {
      this._updateNotificationButton();
      
      notificationToggle.addEventListener('click', async () => {
        await this._handleNotificationToggle();
      });
      
      if (ApiService.isUserLoggedIn() && 'serviceWorker' in navigator && 'PushManager' in window) {
        notificationSection.style.display = 'block';
      } else {
        notificationSection.style.display = 'none';
      }
    }
  }

  async _updateNotificationButton() {
    const notificationToggle = document.getElementById('notification-toggle');
    if (!notificationToggle) return;

    try {
      const subscriptionInfo = await PushService.getSubscriptionInfo();
      
      if (subscriptionInfo.subscribed) {
        notificationToggle.innerHTML = '<i class="fas fa-bell-slash"></i> Unsubscribe Notifikasi';
        notificationToggle.classList.add('btn-primary');
        notificationToggle.classList.remove('btn-outline');
      } else {
        notificationToggle.innerHTML = '<i class="fas fa-bell"></i> Subscribe Notifikasi';
        notificationToggle.classList.remove('btn-primary');
        notificationToggle.classList.add('btn-outline');
      }
    } catch (error) {
      console.error('Error updating notification button:', error);
    }
  }

  async _handleNotificationToggle() {
    const notificationToggle = document.getElementById('notification-toggle');
    if (!notificationToggle) return;

    try {
      const subscriptionInfo = await PushService.getSubscriptionInfo();
      
      if (subscriptionInfo.subscribed) {
        await PushService.unsubscribe();
        this._showSuccessNotification('Berhasil unsubscribe dari notifikasi');
      } else {
        try {
          await PushService.subscribeWithPermission();
          this._showSuccessNotification('Berhasil subscribe notifikasi! Anda akan menerima notifikasi untuk cerita baru.');
        } catch (error) {
          console.error('Push subscription error:', error);
          
          if (error.message.includes('denied') || error.message.includes('permission')) {
            this._showErrorNotification('Izin notifikasi ditolak. Silakan aktifkan notifikasi di pengaturan browser Anda.');
          } else if (error.message.includes('unsupported')) {
            this._showErrorNotification('Browser Anda tidak mendukung push notification.');
          } else {
            this._showErrorNotification('Gagal mengaktifkan notifikasi: ' + error.message);
          }
          return;
        }
      }
      
      await this._updateNotificationButton();
    } catch (error) {
      console.error('Error toggling notification:', error);
      this._showErrorNotification('Gagal mengubah pengaturan notifikasi: ' + error.message);
    }
  }

  getPWADetails() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      indexedDB: 'indexedDB' in window,
      installPrompt: !!this.#deferredPrompt,
      online: navigator.onLine
    };
  }

  _setupServiceWorkerUpdate() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed, reloading page');
        window.location.reload();
      });

      navigator.serviceWorker.ready.then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('New service worker found:', newWorker?.state);
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, ready to activate');
              this._showUpdateNotification();
            }
          });
        });
      });
    }
  }

  _showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div style="background: #2563eb; color: white; padding: 1rem; border-radius: 8px; margin: 1rem; text-align: center;">
        <p>Update tersedia!</p>
        <button onclick="window.location.reload()" style="background: white; color: #2563eb; border: none; padding: 0.5rem 1rem; border-radius: 4px; margin-top: 0.5rem; cursor: pointer;">
          Muat Ulang Aplikasi
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }
}

export default App;