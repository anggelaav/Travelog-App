import ApiService from '../../data/api';

export default class RegisterPage {
  async render() {
    return `
      <section class="register-page">
        <header class="page-header">
          <div class="container">
            <h1 class="page-title">Daftar Akun TravelLog</h1>
            <p class="page-subtitle">Buat akun baru untuk mulai berbagi cerita perjalanan Anda</p>
          </div>
        </header>

        <div class="container">
          <div class="register-container">
            <form id="register-form" class="auth-form">
              <div class="form-group">
                <label for="name" class="form-label">Nama Lengkap *</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="Masukkan nama lengkap Anda"
                  class="form-input"
                >
                <span class="error-message" id="name-error"></span>
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email *</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                  placeholder="contoh: nama@email.com"
                  class="form-input"
                >
                <span class="error-message" id="email-error"></span>
              </div>

              <div class="form-group">
                <label for="password" class="form-label">Password *</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  placeholder="Buat password minimal 6 karakter"
                  class="form-input"
                  minlength="6"
                >
                <span class="error-message" id="password-error"></span>
              </div>

              <div class="form-group">
                <label for="confirm-password" class="form-label">Konfirmasi Password *</label>
                <input 
                  type="password" 
                  id="confirm-password" 
                  name="confirm-password" 
                  required 
                  placeholder="Ketik ulang password Anda"
                  class="form-input"
                >
                <span class="error-message" id="confirm-password-error"></span>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-large">
                  <i class="fas fa-user-plus"></i> Daftar Sekarang
                </button>
              </div>

              <div class="auth-links">
                <p>Sudah punya akun? <a href="#/login" id="login-link">Login di sini</a></p>
              </div>
            </form>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.setupEventListeners();
    
    if (ApiService.isUserLoggedIn()) {
      location.hash = '#/';
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
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (passwordInput && confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => {
        this.validatePasswordMatch();
      });
    }

    const allInputs = document.querySelectorAll('.form-input');
    allInputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.setAttribute('data-focused', 'true');
      });
      
      input.addEventListener('blur', () => {
        if (!input.value) {
          input.removeAttribute('data-focused');
        }
      });
      
      input.addEventListener('input', () => {
        if (input.value) {
          input.setAttribute('data-typing', 'true');
        } else {
          input.removeAttribute('data-typing');
        }
      });
    });
  }

  async handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    this.clearAllErrors();

    if (!this.validateForm(name, email, password, confirmPassword)) {
      return;
    }

    const originalText = submitBtn.innerHTML;
    
    try {
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendaftarkan...';
      submitBtn.disabled = true;

      await ApiService.register(name, email, password);
      
      this.showSuccess('Pendaftaran berhasil! Silakan login dengan akun Anda.');
      setTimeout(() => {
        location.hash = '#/login';
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      this.showError('email-error', 'Pendaftaran gagal: ' + error);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  validateForm(name, email, password, confirmPassword) {
    let isValid = true;

    if (!name) {
      this.showError('name-error', 'Nama lengkap harus diisi');
      isValid = false;
    } else if (name.length < 2) {
      this.showError('name-error', 'Nama terlalu pendek');
      isValid = false;
    }

    if (!email) {
      this.showError('email-error', 'Email harus diisi');
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showError('email-error', 'Format email tidak valid');
      isValid = false;
    }

    if (!password) {
      this.showError('password-error', 'Password harus diisi');
      isValid = false;
    } else if (password.length < 6) {
      this.showError('password-error', 'Password minimal 6 karakter');
      isValid = false;
    }

    if (!confirmPassword) {
      this.showError('confirm-password-error', 'Konfirmasi password harus diisi');
      isValid = false;
    } else if (password !== confirmPassword) {
      this.showError('confirm-password-error', 'Password tidak cocok');
      isValid = false;
    }

    return isValid;
  }

  validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorElement = document.getElementById('confirm-password-error');

    if (confirmPassword && password !== confirmPassword) {
      this.showError('confirm-password-error', 'Password tidak cocok');
    } else if (confirmPassword && password === confirmPassword) {
      this.clearError('confirm-password-error');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  clearAllErrors() {
    this.clearError('name-error');
    this.clearError('email-error');
    this.clearError('password-error');
    this.clearError('confirm-password-error');
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