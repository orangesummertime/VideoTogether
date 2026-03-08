(function () {
  'use strict';

  if (!location.hostname.includes('bilibili.com')) return;
  if (document instanceof XMLDocument) return;
  if (window.__VT_ENHANCED_SPA_UI_LOADED__) return;
  window.__VT_ENHANCED_SPA_UI_LOADED__ = true;

  var LOG_STORE = [];
  var pageNavReady = false;

  function log(level, msg, data) {
    LOG_STORE.push({
      time: new Date().toISOString(),
      level: level,
      msg: msg,
      data: data === undefined ? null : data,
      url: location.href
    });
  }

  function getExtApi() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) return chrome;
    } catch (e) { }
    try {
      if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) return browser;
    } catch (e) { }
    return null;
  }

  function ensureMainScriptInjected() {
    var ext = getExtApi();
    if (!ext) return;
    if (document.getElementById('vt-enhanced-spa-main-script')) return;
    var script = document.createElement('script');
    script.id = 'vt-enhanced-spa-main-script';
    script.src = ext.runtime.getURL('spa-nav-main.js');
    (document.head || document.documentElement).appendChild(script);
  }

  ensureMainScriptInjected();

  window.addEventListener('message', function (e) {
    if (e.data && e.data.__VT_ENHANCED_SPA_LOG__) {
      LOG_STORE.push({
        time: e.data.time || new Date().toISOString(),
        level: e.data.level || 'INFO',
        msg: e.data.msg || '',
        data: e.data.data || null,
        url: e.data.url || location.href
      });
    }
    if (e.data && e.data.__VT_ENHANCED_SPA_READY__) {
      pageNavReady = true;
      log('INFO', 'spa-nav-main ready');
    }
    if (e.data && e.data.__VT_ENHANCED_SPA_RESULT__) {
      log('INFO', 'Nav result: ' + (e.data.success ? 'SUCCESS' : 'FAILED') + ' via ' + e.data.method, { detail: e.data.detail });
      if (statusEl) {
        if (e.data.success) {
          setStatus('跳转成功: ' + e.data.method, 'success');
        } else {
          setStatus('跳转失败: ' + e.data.method, 'error');
        }
      }
    }
  });

  function parseBilibiliInput(input) {
    input = (input || '').trim();
    if (!input) return null;
    var m;
    if ((m = input.match(/bilibili\.com\/video\/(BV[\w]+|av\d+)/i))) return '/video/' + m[1] + '/';
    if ((m = input.match(/^(BV[\w]{10,})$/i))) return '/video/' + m[1] + '/';
    if ((m = input.match(/^av(\d+)$/i))) return '/video/av' + m[1] + '/';
    if (/^\d+$/.test(input)) return '/video/av' + input + '/';
    return null;
  }

  function sendNav(path) {
    var fullUrl = 'https://www.bilibili.com' + path;
    log('INFO', 'send nav cmd', { path: path, fullUrl: fullUrl, pageNavReady: pageNavReady });
    window.postMessage({
      __VT_ENHANCED_SPA_CMD__: true,
      site: 'bilibili',
      path: path,
      fullUrl: fullUrl
    }, '*');
  }

  function downloadLog() {
    var envInfo = {
      site: 'Bilibili',
      url: location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      readyState: document.readyState,
      pageNavReady: pageNavReady
    };
    var content = [
      '===== VideoTogether_Enhanced SPA Debug Log =====',
      JSON.stringify(envInfo, null, 2),
      '==================================================',
      '',
      LOG_STORE.map(function (e) {
        return '[' + e.time + '] [' + e.level + '] ' + e.msg + (e.data !== null ? '\n  DATA: ' + JSON.stringify(e.data) : '');
      }).join('\n')
    ].join('\n');

    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vt-enhanced-spa-debug-' + Date.now() + '.log';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      a.remove();
      URL.revokeObjectURL(url);
    }, 100);
  }

  function createWidget() {
    if (document.getElementById('vt-enhanced-spa-widget')) return;

    var widget = document.createElement('div');
    widget.id = 'vt-enhanced-spa-widget';
    widget.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;font-family:Arial,sans-serif;';
    widget.innerHTML = '' +
      '<div id="vt-enhanced-spa-panel" style="display:none;width:300px;background:#fff;border:1px solid #ddd;border-radius:10px;box-shadow:0 8px 22px rgba(0,0,0,.2);overflow:hidden;">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#00a1d6;color:#fff;font-size:13px;font-weight:700;">' +
      '    <span>VideoTogether SPA</span><button id="vt-enhanced-spa-close" style="all:unset;cursor:pointer;font-size:16px;line-height:1;">×</button>' +
      '  </div>' +
      '  <div style="padding:10px;">' +
      '    <div style="font-size:12px;color:#666;margin-bottom:8px;">输入 BV / av / link 号快速无刷新跳转</div>' +
      '    <input id="vt-enhanced-spa-input" type="text" placeholder="例如 BV1xx411c7mD" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;" />' +
      '    <button id="vt-enhanced-spa-go" style="margin-top:8px;width:100%;padding:9px;border:none;background:#00a1d6;color:#fff;border-radius:6px;cursor:pointer;">SPA 跳转</button>' +
      '    <button id="vt-enhanced-spa-log" style="margin-top:8px;width:100%;padding:8px;border:1px dashed #999;background:#fff;border-radius:6px;cursor:pointer;">下载日志</button>' +
      '    <div id="vt-enhanced-spa-status" style="margin-top:8px;font-size:12px;color:#666;min-height:18px;"></div>' +
      '  </div>' +
      '</div>' +
      '<button id="vt-enhanced-spa-toggle" style="width:50px;height:50px;border:none;border-radius:999px;background:#00a1d6;color:#fff;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.25);font-size:12px;">SPA</button>';

    document.body.appendChild(widget);

    var panel = document.getElementById('vt-enhanced-spa-panel');
    var toggle = document.getElementById('vt-enhanced-spa-toggle');
    var closeBtn = document.getElementById('vt-enhanced-spa-close');
    var input = document.getElementById('vt-enhanced-spa-input');
    var go = document.getElementById('vt-enhanced-spa-go');
    var logBtn = document.getElementById('vt-enhanced-spa-log');
    statusEl = document.getElementById('vt-enhanced-spa-status');

    toggle.addEventListener('click', function () {
      panel.style.display = 'block';
      toggle.style.display = 'none';
      input.focus();
    });
    closeBtn.addEventListener('click', function () {
      panel.style.display = 'none';
      toggle.style.display = 'inline-block';
    });
    logBtn.addEventListener('click', downloadLog);

    function doNavigate() {
      var raw = input.value;
      var path = parseBilibiliInput(raw);
      if (!path) {
        setStatus('无法识别输入，请检查 BV/av 格式', 'error');
        return;
      }
      setStatus(pageNavReady ? '正在跳转...' : 'MAIN 脚本初始化中，已发送指令', 'info');
      sendNav(path);
      input.value = '';
    }

    go.addEventListener('click', doNavigate);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doNavigate();
      }
      if (e.key === 'Escape') {
        panel.style.display = 'none';
        toggle.style.display = 'inline-block';
      }
    });

    log('INFO', 'widget created');
  }

  var statusEl = null;
  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    if (type === 'error') statusEl.style.color = '#d93025';
    else if (type === 'success') statusEl.style.color = '#188038';
    else statusEl.style.color = '#666';
  }

  if (document.body) createWidget();
  else document.addEventListener('DOMContentLoaded', createWidget);
})();

