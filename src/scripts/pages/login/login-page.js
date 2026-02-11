import ApiService from '../../data/api';

export default class LoginPage {
  async render() {
    return `
      <section class="login-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Login ke TravelLog</h1>
            <p class="page-subtitle">Masuk untuk berbagi cerita perjalanan Anda</p>
          </div>
        </header>

        <div class="container">
          <div class="login-container">
            <div class="debug-info" style="background: #f3f4f6; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; display: none;" id="debug-info">
              <strong>Debug Info:</strong>
              <div id="debug-content"></div>
            </div>

            <form id="login-form" class="auth-form">
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                  placeholder="contoh: user@example.com"
                  class="form-input"
                >
                <span class="error-message" id="email-error"></span>
              </div>

              <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  placeholder="masukkan password Anda"
                  class="form-input"
                >
                <span class="error-message" id="password-error"></span>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-large">
                  <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button type="button" class="btn btn-outline" id="debug-btn" style="margin-top: 0.5rem;">
                  <i class="fas fa-bug"></i> Debug Info
                </button>
              </div>

              <div class="auth-links">
                <p>Belum punya akun? <a href="#/register" id="register-link">Daftar di sini</a></p>
                <p style="font-size: 0.8rem; color: #6b7280; margin-top: 0.5rem;">
                  Gunakan email dan password yang sudah didaftarkan di story-api.dicoding.dev
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.setupEventListeners();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    if (ApiService.isUserLoggedIn()) {
      this.showSuccess('Anda sudah login!');
      setTimeout(() => {
        location.hash = '#/add-story';
      }, 1500);
    }

  this.addPlaceholderStyles();
  }

  addPlaceholderStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .form-input::placeholder {
        color: #9ca3af;
        opacity: 1;
        transition: all 0.2s ease;
      }

      .form-input:focus::placeholder {
        color: transparent;
        opacity: 0;
      }

      .form-input:-webkit-autofill,
      .form-input:-webkit-autofill:hover, 
      .form-input:-webkit-autofill:focus {
        -webkit-text-fill-color: #1f2937;
        -webkit-box-shadow: 0 0 0px 1000px white inset;
        transition: background-color 5000s ease-in-out 0s;
      }
    `;
    document.head.appendChild(style);
  }

  setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const debugBtn = document.getElementById('debug-btn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => this.toggleDebugInfo());
    }

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (emailInput) {
      emailInput.addEventListener('focus', () => {
        this.clearError('email-error');
        emailInput.setAttribute('data-focused', 'true');
      });
      emailInput.addEventListener('blur', () => {
        if (!emailInput.value) {
          emailInput.removeAttribute('data-focused');
        }
      });
    }
    
    if (passwordInput) {
      passwordInput.addEventListener('focus', () => {
        this.clearError('password-error');
        passwordInput.setAttribute('data-focused', 'true');
      });
      passwordInput.addEventListener('blur', () => {
        if (!passwordInput.value) {
          passwordInput.removeAttribute('data-focused');
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailInput.value) {
          emailInput.setAttribute('data-typing', 'true');
        } else {
          emailInput.removeAttribute('data-typing');
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (passwordInput.value) {
          passwordInput.setAttribute('data-typing', 'true');
        } else {
          passwordInput.removeAttribute('data-typing');
        }
      });
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    this.clearError('email-error');
    this.clearError('password-error');

    if (!email) {
      this.showError('email-error', 'Email harus diisi');
      return;
    }

    if (!password) {
      this.showError('password-error', 'Password harus diisi');
      return;
    }

    const originalText = submitBtn.innerHTML;
    
    try {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Login...';
      submitBtn.disabled = true;

      console.log('Login attempt:', { email, password: '***' });
      
      await ApiService.login(email, password);
      
      this.showSuccess('Login berhasil!');

      setTimeout(() => {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '#/stories';
        sessionStorage.removeItem('redirectAfterLogin'); // Clear setelah digunakan
        location.hash = redirectUrl;
      }, 1500);

    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login gagal: ' + error;
      
      if (error.includes('token')) {
        errorMessage = 'Terjadi kesalahan authentication. Silakan coba lagi.';
      } else if (error.includes('user') || error.includes('password')) {
        errorMessage = 'Email atau password salah. Pastikan Anda sudah mendaftar di story-api.dicoding.dev';
      } else if (error.includes('network') || error.includes('fetch')) {
        errorMessage = 'Koneksi internet bermasalah. Periksa koneksi Anda.';
      }
      
      this.showError('email-error', errorMessage);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  toggleDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    const debugContent = document.getElementById('debug-content');
    
    if (debugInfo.style.display === 'none') {
      const authDebug = ApiService.debugAuth();
      debugContent.innerHTML = `
        <div>Token: ${authDebug.hasToken ? 'Ada' : 'Tidak ada'}</div>
        <div>Token Preview: ${authDebug.token || 'null'}</div>
        <div>Token Length: ${authDebug.tokenLength}</div>
        <div>Local Storage: ${JSON.stringify(localStorage)}</div>
      `;
      debugInfo.style.display = 'block';
    } else {
      debugInfo.style.display = 'none';
    }
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
}