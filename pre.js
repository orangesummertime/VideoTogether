(function () {
    if (document instanceof XMLDocument) {
        return;
    }

    const injectedScript = document.createElement('script');
    injectedScript.src = chrome.runtime.getURL('preInjected.js');
    (document.head || document.documentElement).appendChild(injectedScript);
    if ((window.location.hostname.includes('bilibili.com') || window.location.hostname.includes('youtube.com') || window.location.hostname === 'youtu.be')) {
        const spaMain = document.createElement('script');
        spaMain.id = 'vt-enhanced-spa-main-script';
        spaMain.src = chrome.runtime.getURL('spa-nav-main.js');
        (document.head || document.documentElement).appendChild(spaMain);
    }
    sessionStorage.removeItem("VideoTogetherSuperEasyShare");
    chrome.storage.local.get(["SuperEasyShare"], function (result) {
        if (result["SuperEasyShare"] == true) {
            sessionStorage.setItem("VideoTogetherSuperEasyShare", 'true');
        }
    });
})();

