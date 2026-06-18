import { db } from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

class ChannelManager {
  constructor() {
    this.channels = [];
    this.categories = [
      { id: 'bangladesh', name: 'বাংলাদেশ', icon: '🇧🇩' },
      { id: 'india', name: 'ভারত', icon: '🇮🇳' },
      { id: 'sports', name: 'স্পোর্টস', icon: '⚽' },
      { id: 'news', name: 'নিউজ', icon: '📰' },
      { id: 'movies', name: 'মুভিজ', icon: '🎬' },
      { id: 'kids', name: 'কিডস', icon: '🧒' },
      { id: 'religious', name: 'ধর্মীয়', icon: '🕌' },
      { id: 'international', name: 'আন্তর্জাতিক', icon: '🌍' }
    ];
    this.activeCategory = 'all';
    this.activeChannel = null;
    this.searchQuery = '';

    this.listEl = document.getElementById('channelList');
    this.searchEl = document.getElementById('searchInput');
    this.tabsEl = document.getElementById('catTabs');
  }

  async init() {
    try {
      await this._loadFromFirestore();
      this.renderTabs();
      this.renderChannels();
    } catch (e) {
      console.error('Channel load failed:', e);
      showToast('চ্যানেল লোড করা যায়নি', 'error');
    }

    this.searchEl?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderChannels();
    });
  }

  async _loadFromFirestore() {
    const q = query(collection(db, 'channels'), orderBy('name'));
    const snapshot = await getDocs(q);
    this.channels = snapshot.docs.map(doc => ({
      firestoreId: doc.id,
      ...doc.data()
    }));
  }

  renderTabs() {
    if (!this.tabsEl) return;
    this.tabsEl.innerHTML = '';
    const allBtn = this._makeTab({ id: 'all', name: 'সব', icon: '📺' }, true);
    this.tabsEl.appendChild(allBtn);
    this.categories.forEach(cat => {
      const btn = this._makeTab(cat, false);
      this.tabsEl.appendChild(btn);
    });
  }

  _makeTab(cat, isActive) {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (isActive ? ' active' : '');
    btn.dataset.cat = cat.id;
    btn.innerHTML = `<span>${cat.icon || ''}</span> ${cat.name}`;
    btn.addEventListener('click', () => {
      this.activeCategory = cat.id;
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.renderChannels();
    });
    return btn;
  }

  getFiltered() {
    return this.channels.filter(ch => {
      const matchCat = this.activeCategory === 'all' || ch.category === this.activeCategory;
      const matchSearch = !this.searchQuery ||
        ch.name?.toLowerCase().includes(this.searchQuery) ||
        ch.description?.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });
  }

  renderChannels() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    const filtered = this.getFiltered();

    if (filtered.length === 0) {
      this.listEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px;">কোনো চ্যানেল পাওয়া যায়নি</div>`;
      return;
    }

    const groups = {};
    filtered.forEach(ch => {
      const cat = this.categories.find(c => c.id === ch.category);
      const label = cat ? `${cat.icon} ${cat.name}` : 'অন্যান্য';
      if (!groups[label]) groups[label] = [];
      groups[label].push(ch);
    });

    for (const [label, chs] of Object.entries(groups)) {
      if (this.activeCategory === 'all') {
        const sec = document.createElement('div');
        sec.className = 'ch-section-label';
        sec.textContent = label;
        this.listEl.appendChild(sec);
      }
      chs.forEach(ch => {
        const item = this._makeChannelItem(ch);
        this.listEl.appendChild(item);
      });
    }
  }

  _makeChannelItem(ch) {
    const item = document.createElement('div');
    item.className = 'ch-item' + (this.activeChannel?.id === ch.id ? ' active' : '');
    item.dataset.chId = ch.id;

    const logoHtml = ch.logo
      ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.style.display='none';this.parentElement.textContent='${ch.name?.substring(0,3).toUpperCase()}';">`
      : ch.name?.substring(0, 3).toUpperCase();

    item.innerHTML = `
      <div class="ch-logo-wrap">${logoHtml}</div>
      <div class="ch-info">
        <div class="ch-name">${ch.name}</div>
        <div class="ch-status">
          <div class="ch-status-dot"></div>
          <span>সরাসরি</span>
        </div>
      </div>`;

    item.addEventListener('click', () => this.selectChannel(ch));
    return item;
  }

  selectChannel(ch) {
    this.activeChannel = ch;
    document.querySelectorAll('.ch-item').forEach(el => el.classList.remove('active'));
    const el = document.querySelector(`.ch-item[data-ch-id="${ch.id}"]`);
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    window.dispatchEvent(new CustomEvent('channelSelected', { detail: ch }));
  }
}

window.ChannelManager = ChannelManager;
export default ChannelManager;