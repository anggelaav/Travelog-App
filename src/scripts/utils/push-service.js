import ApiService from '../data/api';

class PushService {
  constructor() {
    this.vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      this.subscription = await registration.pushManager.getSubscription();
      
      if (!this.subscription && ApiService.isUserLoggedIn()) {
        await this.autoSubscribe();
      }
      
      console.log('Push service initialized:', { 
        supported: true, 
        subscribed: !!this.subscription,
        userLoggedIn: ApiService.isUserLoggedIn() 
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push service:', error);
      return false;
    }
  }

  async autoSubscribe() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      console.log('Attempting auto-subscribe to push notifications...');
      
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      
      if (permission === 'granted') {
        const convertedVapidKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        await this.sendSubscriptionToServer(this.subscription);

        localStorage.setItem('pushSubscription', JSON.stringify({
          endpoint: this.subscription.endpoint,
          subscribed: true,
          autoSubscribed: true,
          timestamp: new Date().toISOString()
        }));

        console.log('Auto-subscribed to push notifications successfully');
        return this.subscription;
      } else {
        console.warn('Notification permission not granted:', permission);
      }
    } catch (error) {
      console.warn('Auto-subscribe failed:', error);
    }
    return null;
  }

  async sendSubscriptionToServer(subscription) {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('User not authenticated');
    }

    console.log('Sending subscription to server...');

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
      const errorText = await response.text();
      console.error('Server response error:', errorText);
      throw new Error(`Failed to save subscription to server: ${response.status}`);
    }

    const result = await response.json();
    console.log('Subscription saved to server:', result);
    return result;
  }

  async onUserLogin() {
    if (!this.isSupported) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        console.log('User logged in, attempting push notification subscription...');
        await this.autoSubscribe();
      } else {
        console.log('User already subscribed to push notifications');
      }
    } catch (error) {
      console.error('Error handling user login for push notifications:', error);
    }
  }

  async onUserLogout() {
    if (!this.isSupported || !this.subscription) return;
    
    try {
      console.log('User logged out, keeping push subscription for future use');
      
      localStorage.removeItem('pushSubscription');
      
    } catch (error) {
      console.error('Error handling user logout for push notifications:', error);
    }
  }

  async unsubscribe() {
    if (!this.isSupported || !this.subscription) {
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      localStorage.removeItem('pushSubscription');
      
      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  urlBase64ToUint8Array(base64String) {
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

  async getSubscriptionInfo() {
    if (!this.isSupported) {
      return { supported: false, subscribed: false };
    }

    if (!this.subscription) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.subscription = await registration.pushManager.getSubscription();
      } catch (error) {
        console.error('Error getting subscription:', error);
      }
    }

    return {
      supported: true,
      subscribed: !!this.subscription,
      endpoint: this.subscription ? this.subscription.endpoint : null,
      userLoggedIn: ApiService.isUserLoggedIn()
    };
  }

  async testNotification() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    
    registration.showNotification('TravelLog Test Notification', {
      body: 'Ini adalah test notifikasi dari TravelLog. Push notification berfungsi dengan baik!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      actions: [
        {
          action: 'view-stories',
          title: 'Lihat Cerita'
        },
        {
          action: 'dismiss',
          title: 'Tutup'
        }
      ],
      data: {
        url: '#/stories',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Test notification sent');
  }

  async requestNotificationPermission() {
    try {
      console.log('Requesting notification permission...');
      
      const currentPermission = Notification.permission;
      console.log('Current notification permission:', currentPermission);
      
      if (currentPermission === 'granted') {
        return 'granted';
      }
      
      if (currentPermission === 'denied') {
        throw new Error('Notification permission was previously denied. Please enable it in browser settings.');
      }
      
      const permission = await Notification.requestPermission();
      console.log('Notification permission result:', permission);
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }

  async subscribeWithPermission() {
    try {
      const permission = await this.requestNotificationPermission();
      
      if (permission !== 'granted') {
        throw new Error(`Notification permission not granted: ${permission}`);
      }
      
      return await this.subscribeManually();
    } catch (error) {
      console.error('Subscribe with permission failed:', error);
      throw error;
    }
  }

  async subscribeManually() {
    try {
      if (!this.isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      const registration = await navigator.serviceWorker.ready;
      
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        this.subscription = existingSubscription;
        return existingSubscription;
      }

      console.log('Creating new push subscription...');
      
      const convertedVapidKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      console.log('Push subscription created:', this.subscription);

      await this.sendSubscriptionToServer(this.subscription);

      localStorage.setItem('pushSubscription', JSON.stringify({
        endpoint: this.subscription.endpoint,
        subscribed: true,
        timestamp: new Date().toISOString()
      }));

      console.log('Subscribed to push notifications successfully');
      return this.subscription;
    } catch (error) {
      console.error('Manual subscribe failed:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Notification permission was denied. Please enable notifications in your browser settings.');
      } else if (error.name === 'AbortError') {
        throw new Error('Subscription process was aborted. Please try again.');
      } else {
        throw new Error(`Failed to subscribe to push notifications: ${error.message}`);
      }
    }
  }
}

export default new PushService();