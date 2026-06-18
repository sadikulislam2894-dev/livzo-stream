import { auth } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

class AuthManager {
  constructor() {
    this.currentUser = null;
    this._init();
  }

  _init() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.currentUser = user;
        this._onLoginSuccess(user);
      } else {
        this.currentUser = null;
        this._onLogout();
      }
    });
  }

  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      return { success: false, message: 'ভুল email বা password' };
    }
  }

  async logout() {
    await signOut(auth);
    window.location.reload();
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  isAdmin() {
    return !!this.currentUser;
  }

  _onLoginSuccess(user) {
    document.getElementById('loginModal')?.classList.add('hidden');

    const loginBtn = document.getElementById('btnLogin');
    if (loginBtn) {
      loginBtn.textContent = '⚙️ Admin';
      loginBtn.onclick = () => {
        if (confirm('লগআউট করবেন?')) this.logout();
      };
    }

    document.getElementById('adminLink')?.classList.remove('hidden');
    showToast('স্বাগতম Admin!', 'success');
  }

  _onLogout() {
    const loginBtn = document.getElementById('btnLogin');
    if (loginBtn) {
      loginBtn.textContent = 'লগইন';
      loginBtn.onclick = () => this.showLoginModal();
    }
    document.getElementById('adminLink')?.classList.add('hidden');
  }

  showLoginModal() {
    document.getElementById('loginModal')?.classList.remove('hidden');
  }
}

window.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

window.AuthManager = AuthManager;
export default AuthManager;