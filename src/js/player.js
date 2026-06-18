/**
 * LiveBD Stream — Video Player Engine
 * HLS.js + YouTube iframe + Source Fallback
 */

class StreamPlayer {
  constructor() {
    this.videoEl = document.getElementById('mainPlayer');
    this.iframeEl = document.getElementById('ytPlayer');
    this.loadingEl = document.getElementById('playerLoading');
    this.errorEl = document.getElementById('playerError');
    this.idleEl = document.getElementById('idleScreen');
    this.topBarName = document.getElementById('topBarName');
    this.topBarLogo = document.getElementById('topBarLogo');
    this.nowChName = document.getElementById('nowChName');
    this.nowChMeta = document.getElementById('nowChMeta');
    this.loadingChName = document.getElementById('loadingChName');
    this.sourceRow = document.getElementById('sourceRow');

    this.hls = null;
    this.currentChannel = null;
    this.currentStreamIndex = 0;
    this.volume = 1;
    this.muted = false;

    this._initControls();
    this._listenChannelSelect();
  }

  _listenChannelSelect() {
    window.addEventListener('channelSelected', (e) => {
      this.loadChannel(e.detail);
    });
  }

  _initControls() {
    // Play/Pause
    document.getElementById('btnPlayPause')?.addEventListener('click', () => this.togglePlay());

    // Mute
    document.getElementById('btnMute')?.addEventListener('click', () => this.toggleMute());

    // Volume slider
    const volSlider = document.getElementById('volumeSlider');
    volSlider?.addEventListener('input', (e) => {
      this.volume = e.target.value / 100;
      if (this.videoEl) this.videoEl.volume = this.volume;
    });

    // Fullscreen
    document.getElementById('btnFullscreen')?.addEventListener('click', () => this.toggleFullscreen());

    // Retry button
    document.getElementById('btnRetry')?.addEventListener('click', () => {
      if (this.currentChannel) this.loadChannel(this.currentChannel);
    });

    // EPG toggle
    document.getElementById('btnGuide')?.addEventListener('click', () => {
      document.getElementById('epgPanel')?.classList.toggle('open');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); this.togglePlay(); }
      if (e.key === 'f') this.toggleFullscreen();
      if (e.key === 'm') this.toggleMute();
      if (e.key === 'ArrowLeft') this._prevChannel();
      if (e.key === 'ArrowRight') this._nextChannel();
    });

    // Video events
    if (this.videoEl) {
      this.videoEl.addEventListener('waiting', () => this.showLoading(true));
      this.videoEl.addEventListener('playing', () => {
        this.showLoading(false);
        this.hideError();
        this._hideIdle();
      });
      this.videoEl.addEventListener('error', () => this._tryNextSource());
      this.videoEl.addEventListener('pause', () => this._updatePlayBtn(false));
      this.videoEl.addEventListener('play', () => this._updatePlayBtn(true));
    }
  }

  async loadChannel(ch) {
    this.currentChannel = ch;
    this.currentStreamIndex = 0;

    // UI updates
    if (this.topBarName) this.topBarName.textContent = ch.name;
    if (this.nowChName) this.nowChName.textContent = ch.name;
    if (this.nowChMeta) this.nowChMeta.textContent = ch.description || 'লাইভ স্ট্রিম';
    if (this.loadingChName) this.loadingChName.textContent = ch.name;
    if (this.topBarLogo && ch.logo) {
      this.topBarLogo.innerHTML = `<img src="${ch.logo}" alt="${ch.name}">`;
    }

    // Render source buttons
    this._renderSources(ch.streams);

    // Start playing first source
    this._playSource(ch.streams[0]);
  }

  _renderSources(streams) {
    if (!this.sourceRow) return;
    this.sourceRow.innerHTML = '';
    streams.forEach((s, i) => {
      const btn = document.createElement('button');
      btn.className = 'source-btn' + (i === 0 ? ' active' : '');
      btn.textContent = s.label || `সোর্স ${i + 1}`;
      btn.addEventListener('click', () => {
        this.currentStreamIndex = i;
        document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._playSource(s);
      });
      this.sourceRow.appendChild(btn);
    });
  }

  _playSource(source) {
    this.showLoading(true);
    this.hideError();
    this._hideIdle();

    if (source.type === 'youtube') {
      this._playYouTube(source.url);
    } else {
      this._playHLS(source.url);
    }
  }

  _playHLS(url) {
    // Destroy existing HLS instance
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    // Hide YouTube iframe
    if (this.iframeEl) this.iframeEl.src = '';
    this.iframeEl?.classList.add('hidden');
    this.videoEl?.classList.remove('hidden');

    if (Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 60,
      });

      this.hls.loadSource(url);
      this.hls.attachMedia(this.videoEl);

      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.showLoading(false);
        this.videoEl.play().catch(() => {});
      });

      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => this._tryNextSource(), 3000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls.recoverMediaError();
              break;
            default:
              this._tryNextSource();
          }
        }
      });

    } else if (this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      this.videoEl.src = url;
      this.videoEl.addEventListener('loadedmetadata', () => {
        this.showLoading(false);
        this.videoEl.play();
      }, { once: true });
      this.videoEl.addEventListener('error', () => this._tryNextSource(), { once: true });
    } else {
      this.showError('এই ব্রাউজারে HLS সাপোর্ট নেই।');
    }
  }

  _playYouTube(url) {
    if (!this.iframeEl) return;

    // Hide native video
    this.videoEl?.classList.add('hidden');
    if (this.hls) { this.hls.destroy(); this.hls = null; }

    this.iframeEl.src = url + '&autoplay=1&rel=0';
    this.iframeEl.classList.remove('hidden');
    this.showLoading(false);
  }

  _tryNextSource() {
    if (!this.currentChannel) return;
    const sources = this.currentChannel.streams;
    this.currentStreamIndex++;
    if (this.currentStreamIndex < sources.length) {
      const next = sources[this.currentStreamIndex];
      document.querySelectorAll('.source-btn').forEach((b, i) => {
        b.classList.toggle('active', i === this.currentStreamIndex);
      });
      this._playSource(next);
    } else {
      this.showLoading(false);
      this.showError('সব সোর্স ট্রাই করা হয়েছে। চ্যানেলটি এখন অফলাইন হতে পারে।');
    }
  }

  _prevChannel() {
    const mgr = window.channelMgr;
    if (!mgr || !this.currentChannel) return;
    const list = mgr.getFiltered();
    const idx = list.findIndex(c => c.id === this.currentChannel.id);
    if (idx > 0) mgr.selectChannel(list[idx - 1]);
  }

  _nextChannel() {
    const mgr = window.channelMgr;
    if (!mgr || !this.currentChannel) return;
    const list = mgr.getFiltered();
    const idx = list.findIndex(c => c.id === this.currentChannel.id);
    if (idx < list.length - 1) mgr.selectChannel(list[idx + 1]);
  }

  togglePlay() {
    if (!this.videoEl || this.videoEl.classList.contains('hidden')) return;
    if (this.videoEl.paused) this.videoEl.play();
    else this.videoEl.pause();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.videoEl) this.videoEl.muted = this.muted;
    const icon = document.querySelector('#btnMute svg use, #btnMute svg path');
    // Icon update handled in HTML via data attribute
    document.getElementById('btnMute')?.setAttribute('data-muted', this.muted);
  }

  toggleFullscreen() {
    const wrap = document.querySelector('.video-wrap');
    if (!document.fullscreenElement) {
      wrap?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  }

  showLoading(show) {
    this.loadingEl?.classList.toggle('show', show);
  }

  showError(msg) {
    this.showLoading(false);
    const msgEl = document.getElementById('errorMsgText');
    if (msgEl) msgEl.textContent = msg;
    this.errorEl?.classList.add('show');
  }

  hideError() {
    this.errorEl?.classList.remove('show');
  }

  _hideIdle() {
    this.idleEl?.classList.add('hide');
  }

  _updatePlayBtn(playing) {
    const btn = document.getElementById('btnPlayPause');
    if (!btn) return;
    btn.setAttribute('data-playing', playing);

    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');
    if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
    if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
  }
}

window.StreamPlayer = StreamPlayer;