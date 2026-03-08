(function () {
  'use strict';

  var isBilibili = location.hostname.includes('bilibili.com');
  var isYouTube = location.hostname.includes('youtube.com') || location.hostname === 'youtu.be';
  if (!isBilibili && !isYouTube) return;

  if (window.__VT_ENHANCED_SPA_MAIN_LOADED__) return;
  window.__VT_ENHANCED_SPA_MAIN_LOADED__ = true;

  function postResult(success, method, detail) {
    window.postMessage({
      __VT_ENHANCED_SPA_RESULT__: true,
      success: success,
      method: method,
      detail: detail || ''
    }, '*');
  }

  function normalizePath(p) {
    try {
      var u = new URL(p, location.origin);
      return u.pathname.replace(/\/+$/, '');
    } catch (e) {
      return (p || '').split('?')[0].replace(/\/+$/, '');
    }
  }

  function extractVideoKey(p) {
    var m = (p || '').match(/\/video\/(BV[\w]+|av\d+)/i);
    return m ? m[1].toLowerCase() : '';
  }

  function getBvidFromState() {
    try {
      var s = window.__INITIAL_STATE__ || {};
      return ((s.videoData && s.videoData.bvid) || (s.videoInfo && s.videoInfo.bvid) || s.bvid || '');
    } catch (e) {
      return '';
    }
  }

  function isBilibiliApplied(targetPath) {
    var currentNorm = normalizePath(location.pathname);
    var targetNorm = normalizePath(targetPath);
    var urlMatch = currentNorm === targetNorm || (
      extractVideoKey(location.pathname) &&
      extractVideoKey(location.pathname) === extractVideoKey(targetPath)
    );
    if (!urlMatch) return false;

    var stateBvid = (getBvidFromState() || '').toLowerCase();
    var targetKey = extractVideoKey(targetPath);
    if (!stateBvid || !targetKey) return true;
    return stateBvid === targetKey;
  }

  function findRouters() {
    var app = document.getElementById('app');
    var nuxt = document.getElementById('__nuxt');
    var roots = [app, nuxt].filter(Boolean);
    var results = [];

    for (var i = 0; i < roots.length; i++) {
      var el = roots[i];
      if (el.__vue__ && el.__vue__.$router) {
        results.push({ src: 'vue2-root#' + el.id, router: el.__vue__.$router });
      }
      if (el.__vue_app__) {
        try {
          var r = el.__vue_app__.config.globalProperties.$router;
          if (r) results.push({ src: 'vue3-root#' + el.id, router: r });
        } catch (e) { }
      }
    }
    return results;
  }

  function runBilibiliFallback(path, fullUrl) {
    try {
      history.pushState({ key: Date.now().toString() }, '', fullUrl);
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      if (isBilibiliApplied(path)) {
        postResult(true, 'history.pushState+popstate', '');
        return;
      }
    } catch (e) { }

    try {
      var targetKey = extractVideoKey(path);
      var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/video/"]'));
      var matched = links.filter(function (a) {
        return extractVideoKey(a.getAttribute('href') || a.href) === targetKey;
      });
      if (matched.length === 0) {
        postResult(false, 'all-methods-failed', 'no matching anchor');
        return;
      }
      var link = matched[0];
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (evtName) {
        var evt = evtName.indexOf('pointer') === 0
          ? new PointerEvent(evtName, { bubbles: true, cancelable: true, view: window })
          : new MouseEvent(evtName, { bubbles: true, cancelable: true, view: window, button: 0 });
        link.dispatchEvent(evt);
      });
      setTimeout(function () {
        if (isBilibiliApplied(path)) {
          postResult(true, 'anchor-click-sequence', link.href);
        } else {
          postResult(false, 'all-methods-failed', 'router/fallback did not apply');
        }
      }, 900);
    } catch (e) {
      postResult(false, 'all-methods-failed', e.message || 'unknown');
    }
  }

  function navBilibili(path, fullUrl) {
    var routers = findRouters();

    function tryRouter(index) {
      if (index >= routers.length) {
        runBilibiliFallback(path, fullUrl);
        return;
      }

      var entry = routers[index];

      function fail() {
        tryRouter(index + 1);
      }

      function verify(method) {
        setTimeout(function () {
          if (isBilibiliApplied(path)) {
            postResult(true, method, entry.src);
          } else {
            fail();
          }
        }, 900);
      }

      try {
        var result = entry.router.push({ path: path });
        if (result && typeof result.then === 'function') {
          result.then(function () {
            verify('vue-router-push');
          }).catch(function (err) {
            if (err && err.name === 'NavigationDuplicated' && isBilibiliApplied(path)) {
              postResult(true, 'vue-router-push-duplicated', entry.src);
            } else {
              fail();
            }
          });
        } else {
          verify('vue-router-push-sync');
        }
      } catch (e) {
        fail();
      }
    }

    if (routers.length > 0) {
      tryRouter(0);
    } else {
      runBilibiliFallback(path, fullUrl);
    }
  }

  function navYouTube(path, fullUrl) {
    var videoId = (path.match(/[?&]v=([\w-]+)/) || [])[1] || '';

    try {
      if (typeof yt !== 'undefined') {
        var navCmd = {
          commandMetadata: { webCommandMetadata: { url: path, webPageType: 'WEB_PAGE_TYPE_WATCH', rootVe: 3832 } },
          watchEndpoint: { videoId: videoId }
        };

        if (yt.www && yt.www.navigate && typeof yt.www.navigate.navigate === 'function') {
          yt.www.navigate.navigate(navCmd);
          postResult(true, 'yt.www.navigate.navigate', '');
          return;
        }
        if (yt.www && typeof yt.www.navigate === 'function') {
          yt.www.navigate(navCmd);
          postResult(true, 'yt.www.navigate', '');
          return;
        }
        if (typeof yt.navigate === 'function') {
          yt.navigate(navCmd);
          postResult(true, 'yt.navigate', '');
          return;
        }
      }
    } catch (e) { }

    try {
      if (typeof spf !== 'undefined' && typeof spf.navigate === 'function') {
        spf.navigate(fullUrl);
        postResult(true, 'spf.navigate', '');
        return;
      }
    } catch (e) { }

    try {
      history.pushState({ path: path }, '', fullUrl);
      window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
      postResult(true, 'history.pushState+popstate', '');
      return;
    } catch (e) { }

    postResult(false, 'all-youtube-methods-failed', 'navigation API unavailable');
  }

  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.__VT_ENHANCED_SPA_CMD__) return;
    var cmd = e.data;
    if (cmd.site === 'bilibili') {
      navBilibili(cmd.path, cmd.fullUrl);
    } else if (cmd.site === 'youtube') {
      navYouTube(cmd.path, cmd.fullUrl);
    }
  });

  window.postMessage({ __VT_ENHANCED_SPA_READY__: true }, '*');
})();
