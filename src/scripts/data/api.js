import CONFIG from '../config';

const ENDPOINTS = {
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_WITH_LOCATION: `${CONFIG.BASE_URL}/stories?location=1`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
};

class ApiService {
  static getAuthToken() {
    return localStorage.getItem(CONFIG.USER_TOKEN_KEY);
  }

  static setAuthToken(token) {
    localStorage.setItem(CONFIG.USER_TOKEN_KEY, token);
  }

  static removeAuthToken() {
    localStorage.removeItem(CONFIG.USER_TOKEN_KEY);
  }

  static async login(email, password) {
    try {
      console.log('Attempting login with:', { email });
      
      const response = await fetch(ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const responseJson = await response.json();
      console.log('Login response:', responseJson);
      
      if (responseJson.error === false) {
        const token = responseJson.loginResult?.token;
        if (token) {
          this.setAuthToken(token);
          return Promise.resolve(responseJson);
        } else {
          return Promise.reject('Token tidak ditemukan dalam response');
        }
      } else {
        return Promise.reject(responseJson.message || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      return Promise.reject(error.message || 'Terjadi kesalahan saat login');
    }
  }

  static async register(name, email, password) {
    try {
      console.log('Attempting registration with:', { name, email });
      
      const response = await fetch(ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const responseJson = await response.json();
      console.log('Register response:', responseJson);
      
      if (responseJson.error === false) {
        return Promise.resolve(responseJson);
      } else {
        return Promise.reject(responseJson.message || 'Registrasi gagal');
      }
    } catch (error) {
      console.error('Registration error:', error);
      return Promise.reject(error.message || 'Terjadi kesalahan saat registrasi');
    }
  }

  static async addStory(formData) {
    try {
      const token = this.getAuthToken();
      
      if (!token) {
        return Promise.reject('Anda harus login terlebih dahulu');
      }

      console.log('Adding story with token:', token.substring(0, 20) + '...');

      for (let [key, value] of formData.entries()) {
        if (key === 'photo') {
          console.log(`- ${key}:`, value.name, value.type, value.size + ' bytes');
        } else {
          console.log(`- ${key}:`, value);
        }
      }

      const response = await fetch(ENDPOINTS.STORIES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        return Promise.reject('Response tidak valid dari server');
      }
      
      console.log('Add story response:', responseJson);
      
      if (responseJson.error === false) {
        return Promise.resolve(responseJson);
      } else {
        if (responseJson.message && (responseJson.message.includes('token') || response.status === 401)) {
          this.removeAuthToken();
          return Promise.reject('Session expired. Silakan login kembali.');
        }
        return Promise.reject(responseJson.message || 'Gagal menambahkan cerita');
      }
    } catch (error) {
      console.error('Add story error:', error);
      return Promise.reject(error.message || 'Terjadi kesalahan saat menambahkan cerita');
    }
  }

  static async getAllStories() {
    try {
      console.log('Fetching all stories...');
    
      const token = this.getAuthToken();
    
      if (!token) {
       return Promise.reject('Authentication required. Please login first.');
      }

      console.log('Using token:', token.substring(0, 20) + '...');
    
      const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    
      if (!response.ok) {
        if (response.status === 401) {
          this.removeAuthToken();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      const responseText = await response.text();
      console.log('Raw stories response:', responseText);
    
      let responseJson;
      try {
        responseJson = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Response tidak valid dari server');
      }
    
      console.log('Stories response:', responseJson);
    
      if (responseJson.error === false) {
        return Promise.resolve(responseJson.listStory || []);
      } else {
        return Promise.reject(responseJson.message || 'Gagal memuat cerita');
      }
    } catch (error) {
      console.error('Get stories error:', error);
      return Promise.reject(error.message || 'Terjadi kesalahan saat memuat cerita');
    }
  }

  static async getStoryById(storyId) {
    try {
      const response = await fetch(`${ENDPOINTS.STORIES}/${storyId}`);
      const responseJson = await response.json();
      
      if (responseJson.error === false) {
        return Promise.resolve(responseJson.story);
      } else {
        return Promise.reject(responseJson.message || 'Gagal memuat cerita');
      }
    } catch (error) {
      return Promise.reject(error.message || 'Terjadi kesalahan saat memuat cerita');
    }
  }

  static isUserLoggedIn() {
    const token = this.getAuthToken();
    return !!token;
  }

  static debugAuth() {
    return {
      hasToken: !!this.getAuthToken(),
      token: this.getAuthToken() ? this.getAuthToken().substring(0, 20) + '...' : null,
      tokenLength: this.getAuthToken() ? this.getAuthToken().length : 0
    };
  }
}

export default ApiService;