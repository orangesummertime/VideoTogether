(function () {
  'use strict';

  var isBilibili = location.hostname.includes('bilibili.com');
  var isYouTube = location.hostname.includes('youtube.com') || location.hostname === 'youtu.be';
  if (!isBilibili && !isYouTube) return;

  if (window.__VT_ENHANCED_SPA_EMBED_LOADED__) return;
  window.__VT_ENHANCED_SPA_EMBED_LOADED__ = true;

  function parseBilibiliInput(input) {
    input = (input || '').trim();
    if (!input) return null;

    var m;
    if ((m = input.match(/bilibili\.com\/video\/(BV[\w]+|av\d+)/i))) return '/video/' + m[1] + '/';
    if ((m = input.match(/^(BV[\w]{10,})$/i))) return '/video/' + m[1] + '/';
    if ((m = input.match(/^av(\d+)$/i))) return '/video/av' + m[1] + '/';
    if (/^\d+$/.test(input)) return '/video/av' + input + '/';

    try {
      var u = new URL(input.startsWith('http') ? input : 'https://' + input);
      if (u.hostname.includes('bilibili.com') && /^\/video\//i.test(u.pathname)) {
        return u.pathname.endsWith('/') ? u.pathname : (u.pathname + '/');
      }
    } catch (e) { }

    return null;
  }

  function parseYouTubeInput(input) {
    input = (input || '').trim();
    if (!input) return null;

    try {
      var u = new URL(input.startsWith('http') ? input : 'https://' + input);
      if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
        var v = u.searchParams.get('v');
        if (v) return '/watch?v=' + v;
      }
      if (u.hostname.includes('youtube.com') && u.pathname.startsWith('/shorts/')) {
        return u.pathname;
      }
      if (u.hostname === 'youtu.be') {
        var id = u.pathname.replace(/^\//, '');
        if (id) return '/watch?v=' + id;
      }
    } catch (e) { }

    if (/^[\w-]{11}$/.test(input)) return '/watch?v=' + input;
    return null;
  }

  function setStatus(shadow, text, color) {
    var el = shadow.querySelector('#videoTogetherStatusText');
    if (!el) return;
    el.textContent = text;
    el.style.color = color || 'inherit';
  }

  function mountOnce() {
    var host = document.querySelector('#VideoTogetherWrapper');
    if (!host || !host.shadowRoot) return false;

    var shadow = host.shadowRoot;
    if (shadow.getElementById('videoTogetherSpaNavRow')) return true;

    var panel = shadow.querySelector('#videoTogetherFlyPannel');
    var body = shadow.querySelector('.vt-modal-body');
    if (panel) panel.style.height = '266px';
    if (body) body.style.height = '220px';

    var pwdInput = shadow.querySelector('#videoTogetherRoomPdIpt');
    if (!pwdInput || !pwdInput.parentElement) return false;

    var row = document.createElement('div');
    row.id = 'videoTogetherSpaNavRow';
    row.style.marginTop = '8px';
    row.style.marginBottom = '8px';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '4px';
    row.innerHTML = '' +
      '<span class="ellipsis" style="display:inline-block;width:64px;flex:0 0 64px;">站内跳转</span>' +
      '<input id="videoTogetherSpaNavInput" autocomplete="off" placeholder="' + (isBilibili ? 'BV / 链接' : 'YT / 链接') + '" style="flex:0 0 96px;min-width:96px;height:24px;font-family:inherit;font-size:12px;display:inline-block;padding:0 6px;color:#00000073;background-color:#ffffff;border:1px solid #e9e9e9;margin:0;">' +
      '<button id="videoTogetherSpaNavBtn" class="vt-btn vt-btn-primary" type="button" style="flex:0 0 38px;padding:0;height:24px;line-height:24px;">Go</button>';

    pwdInput.parentElement.insertAdjacentElement('afterend', row);

    var input = shadow.getElementById('videoTogetherSpaNavInput');
    var btn = shadow.getElementById('videoTogetherSpaNavBtn');

    function doNavigate() {
      var path = isBilibili ? parseBilibiliInput(input.value) : parseYouTubeInput(input.value);
      if (!path) {
        setStatus(shadow, isBilibili ? '请输入有效 BV/av/链接' : '请输入有效 YouTube 链接/ID', 'red');
        return;
      }

      window.postMessage({
        __VT_ENHANCED_SPA_CMD__: true,
        site: isBilibili ? 'bilibili' : 'youtube',
        path: path,
        fullUrl: (isBilibili ? 'https://www.bilibili.com' : 'https://www.youtube.com') + path
      }, '*');

      input.value = '';
      setStatus(shadow, '已发送站内跳转', 'green');
    }

    btn.addEventListener('click', doNavigate);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doNavigate();
      }
    });

    return true;
  }

  if (mountOnce()) return;

  var observer = new MutationObserver(function () {
    if (mountOnce()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  setTimeout(function () { observer.disconnect(); }, 20000);
})();

