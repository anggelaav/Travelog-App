class IDBService {
  constructor() {
    this.dbName = 'TravelLogDB';
    this.version = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1 || !db.objectStoreNames.contains('bookmarkedStories')) {
          if (db.objectStoreNames.contains('stories')) {
            db.deleteObjectStore('stories');
          }
        }

        if (!db.objectStoreNames.contains('bookmarkedStories')) {
          const bookmarkedStore = db.createObjectStore('bookmarkedStories', { keyPath: 'id' });
          bookmarkedStore.createIndex('createdAt', 'createdAt', { unique: false });
          bookmarkedStore.createIndex('bookmarkedAt', 'bookmarkedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineStories')) {
          const offlineStore = db.createObjectStore('offlineStories', { keyPath: 'id' });
          offlineStore.createIndex('createdAt', 'createdAt', { unique: false });
          offlineStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          const preferencesStore = db.createObjectStore('userPreferences', { keyPath: 'id' });
        }
      };
    });
  }

  async bookmarkStory(story) {
    if (!this.db) await this.init();
    
    const bookmarkedStory = {
      ...story,
      bookmarkedAt: new Date().toISOString(),
      isBookmarked: true
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarkedStories'], 'readwrite');
      const store = transaction.objectStore('bookmarkedStories');
      const request = store.put(bookmarkedStory);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Story bookmarked:', story.id);
        resolve(bookmarkedStory);
      };
    });
  }

  async removeBookmark(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarkedStories'], 'readwrite');
      const store = transaction.objectStore('bookmarkedStories');
      const request = store.delete(storyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Bookmark removed:', storyId);
        resolve();
      };
    });
  }

  async getBookmarkedStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarkedStories'], 'readonly');
      const store = transaction.objectStore('bookmarkedStories');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async isStoryBookmarked(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['bookmarkedStories'], 'readonly');
      const store = transaction.objectStore('bookmarkedStories');
      const request = store.get(storyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(!!request.result);
    });
  }

  async saveUserPreference(key, value) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readwrite');
      const store = transaction.objectStore('userPreferences');
      const request = store.put({ id: key, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUserPreference(key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userPreferences'], 'readonly');
      const store = transaction.objectStore('userPreferences');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value);
    });
  }

  async saveOfflineStory(story) {
    if (!this.db) await this.init();

    const offlineStory = {
      ...story,
      id: `offline-${Date.now()}`,
      offline: true,
      synced: false,
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readwrite');
      const store = transaction.objectStore('offlineStories');
      const request = store.put(offlineStory);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(offlineStory);
    });
  }

  async getOfflineStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readonly');
      const store = transaction.objectStore('offlineStories');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteOfflineStory(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readwrite');
      const store = transaction.objectStore('offlineStories');
      const request = store.delete(storyId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async syncOfflineStories() {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    const offlineStories = await this.getOfflineStories();
    const results = [];

    for (const story of offlineStories) {
      try {
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
          await this.deleteOfflineStory(story.id);
          results.push({ success: true, storyId: story.id });
        } else {
          results.push({ success: false, storyId: story.id, error: 'API Error' });
        }
      } catch (error) {
        results.push({ success: false, storyId: story.id, error: error.message });
      }
    }

    return results;
  }
}

export default new IDBService();