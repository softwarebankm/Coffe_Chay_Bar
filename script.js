(function () {
  "use strict";

  // ═══════════════ پیکربندی بخش‌ها ═══════════════
  var sections = [
    { id: "breakfast", path: "data/صبحانه.txt" },
    { id: "food", path: "data/غذاها.txt" },
    { id: "condiments", path: "data/چاشنی‌ها.txt" },
    { id: "drinks", path: "data/نوشیدنی‌ها.txt" }
  ];

  var searchInput = document.getElementById("menu-search");
  var clearButton = document.getElementById("clear-search");
  var status = document.getElementById("menu-status");
  var errorBox = document.getElementById("menu-error");
  var warningBox = document.getElementById("menu-warning");
  var noResults = document.getElementById("no-results");
  var header = document.getElementById("site-header");
  var navBar = document.getElementById("category-nav-bar");
  var chips = document.querySelectorAll(".category-chip");
  var allItems = [];

  // ═══════════════ تجزیه فایل متنی منو ═══════════════
  function parseItems(text, sectionId) {
    return text.split(/\r?\n/).map(function (line) {
      var value = line.trim();
      if (!value || value.charAt(0) === "#") return null;
      var divider = value.indexOf("|");
      var name = (divider < 0 ? value : value.slice(0, divider)).trim();
      var price = divider < 0 ? "" : value.slice(divider + 1).trim();
      if (!name) return null;
      return { name: name, price: price, section: sectionId };
    }).filter(Boolean);
  }

  // ═══════════════ ساخت المان آیتم منو ═══════════════
  function renderItem(item) {
    var row = document.createElement("div");
    row.className = "menu-item";
    var name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;
    var price = document.createElement("span");
    price.className = item.price ? "item-price" : "item-price price-missing";
    price.textContent = item.price || "قیمت وارد نشده";
    row.appendChild(name);
    row.appendChild(price);
    return row;
  }

  // ═══════════════ تبدیل ارقام به فارسی ═══════════════
  function toPersianDigits(value) {
    return String(value).replace(/[0-9]/g, function (d) {
      return "۰۱۲۳۴۵۶۷۸۹"[Number(d)];
    });
  }

  // ═══════════════ اعمال فیلتر جست‌وجو ═══════════════
  function applyFilter() {
    var query = searchInput.value.trim().toLocaleLowerCase();
    var visibleTotal = 0;

    sections.forEach(function (section) {
      var matched = allItems.filter(function (item) {
        return item.section === section.id && item.name.toLocaleLowerCase().indexOf(query) !== -1;
      });
      var list = document.getElementById("items-" + section.id);
      var sectionElement = document.querySelector('[data-section="' + section.id + '"]');
      if (!sectionElement || !list) return;

      var countValue = sectionElement.querySelector(".count-value");
      list.replaceChildren();
      matched.forEach(function (item) { list.appendChild(renderItem(item)); });

      if (!matched.length) {
        var empty = document.createElement("p");
        empty.className = "empty-section";
        empty.textContent = query ? "موردی برای نمایش نیست." : "هنوز موردی ثبت نشده است.";
        list.appendChild(empty);
      }

      if (countValue) countValue.textContent = toPersianDigits(matched.length);

      sectionElement.hidden = Boolean(query) && matched.length === 0;
      visibleTotal += matched.length;
    });

    clearButton.hidden = !searchInput.value;
    noResults.hidden = !query || visibleTotal > 0;
  }

  // ═══════════════ نمایش خطای کلی ═══════════════
  function showLoadError() {
    status.hidden = true;
    errorBox.hidden = false;
    errorBox.replaceChildren();
    
    var title = document.createElement("strong");
    title.textContent = "بارگذاری منو انجام نشد.";
    
    var message = document.createElement("span");
    message.textContent = "اگر فایل را با نشانی file:// باز کرده‌اید، مرورگر اجازه‌ی خواندن فایل‌های منو را نمی‌دهد. پوشه را با یک سرور محلی اجرا کنید (مثلاً python -m http.server 8000) و سپس http://localhost:8000 را باز کنید. همچنین مطمئن شوید فایل‌های پوشه‌ی data کنار این صفحه هستند.";
    
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-btn";
    retry.textContent = "تلاش دوباره";
    retry.addEventListener("click", function () { window.location.reload(); });
    
    errorBox.appendChild(title);
    errorBox.appendChild(message);
    errorBox.appendChild(retry);
  }

  // ═══════════════ نمایش هشدار بارگذاری ناقص ═══════════════
  function showPartialWarning(failedCount) {
    if (!warningBox) return;
    warningBox.hidden = false;
    warningBox.replaceChildren();
    var text = document.createElement("span");
    text.textContent = "⚠️ " + toPersianDigits(failedCount) + " بخش از منو بارگذاری نشد. سایر بخش‌ها به‌درستی نمایش داده شده‌اند.";
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-btn";
    retry.textContent = "تلاش دوباره";
    retry.addEventListener("click", function () { window.location.reload(); });
    warningBox.appendChild(text);
    warningBox.appendChild(retry);
  }

  // ═══════════════ بارگذاری داده‌ها ═══════════════
  Promise.allSettled(sections.map(function (section) {
    return fetch(encodeURI(section.path))
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.text();
      })
      .then(function (text) {
        return { id: section.id, items: parseItems(text, section.id) };
      });
  })).then(function (results) {
    var successful = results.filter(function (r) { return r.status === "fulfilled"; });
    var failed = results.filter(function (r) { return r.status === "rejected"; });

    status.hidden = true;

    if (successful.length === 0) {
      showLoadError();
      return;
    }

    allItems = successful.reduce(function (items, r) {
      return items.concat(r.value.items);
    }, []);

    applyFilter();

    if (failed.length > 0) {
      showPartialWarning(failed.length);
    }
  }).catch(function () {
    showLoadError();
  });

  // ═══════════════ جست‌وجو با debounce ═══════════════
  var searchTimer;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 150);
  });

  clearButton.addEventListener("click", function () {
    searchInput.value = "";
    applyFilter();
    searchInput.focus();
  });

  document.getElementById("reset-search").addEventListener("click", function () {
    searchInput.value = "";
    applyFilter();
    searchInput.focus();
  });

  // ═══════════════ همگام‌سازی ارتفاع هدر ═══════════════
  function syncHeaderHeight() {
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        header.classList.toggle("is-compact", window.scrollY > 40);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  if (window.ResizeObserver) {
    new ResizeObserver(syncHeaderHeight).observe(header);
  }
  window.addEventListener("resize", syncHeaderHeight, { passive: true });
  syncHeaderHeight();
  header.classList.toggle("is-compact", window.scrollY > 40);

  // ═══════════════ اشتراک‌گذاری منو ═══════════════
  document.getElementById("share-menu").addEventListener("click", function () {
    var message = document.getElementById("share-status");

    if (window.location.protocol === "file:") {
      message.textContent = "برای اشتراک‌گذاری، سایت را روی یک سرور اجرا کنید.";
      return;
    }

    var cleanUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "/") + window.location.search;
    var shareData = { url: cleanUrl };

    if (navigator.share) {
      navigator.share(shareData).then(function () {
        message.textContent = "منو با موفقیت به اشتراک گذاشته شد.";
      }).catch(function (error) {
        if (error.name !== "AbortError") copyLink();
      });
    } else {
      copyLink();
    }

    function copyLink() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanUrl).then(function () {
          message.textContent = "پیوند منو در کلیپ‌بورد کپی شد.";
        }).catch(function () {
          message.textContent = "امکان کپی خودکار نبود؛ نشانی صفحه را دستی کپی کنید.";
        });
      } else {
        message.textContent = "برای اشتراک‌گذاری، نشانی این صفحه را کپی کنید.";
      }
    }
  });

  // ═══════════════ اسکرول هوشمند چیپ‌ها ═══════════════
  chips.forEach(function (chip) {
    chip.addEventListener("click", function (event) {
      var cleanId = (chip.getAttribute("href") || "").replace(/^#/, "").trim();
      if (!cleanId) return;

      var target = document.getElementById(cleanId);
      if (!target) return;

      event.preventDefault();

      var headerOffset = (header ? header.offsetHeight : 0) + (navBar ? navBar.offsetHeight : 0) + 12;
      var offsetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      setActiveChip(cleanId);
    });
  });

  // ═══════════════ چیپ فعال با اسکرول ═══════════════
  function setActiveChip(id) {
    chips.forEach(function (chip) {
      var chipId = (chip.getAttribute("href") || "").replace(/^#/, "");
      var isActive = chipId === id;
      chip.classList.toggle("active", isActive);
      if (isActive) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.dataset.section || entry.target.id;
          if (id) setActiveChip(id);
        }
      });
    }, {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0
    });

    document.querySelectorAll(".menu-section").forEach(function (s) {
      sectionObserver.observe(s);
    });
  }
})();

// ═══════════════ ثبت Service Worker ═══════════════
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js").catch(function (err) {
      console.log("SW registration failed:", err);
    });
  });
}

// ═══════════════ مدیریت نصب PWA ═══════════════
var deferredPrompt = null;
var installBanner = document.getElementById("pwa-install-banner");
var installBtn = document.getElementById("pwa-install-btn");
var dismissBtn = document.getElementById("pwa-dismiss-btn");

if (localStorage.getItem("chaybar-pwa-dismissed") && installBanner) {
  installBanner.style.display = "none";
}

window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPrompt = e;
  if (installBanner && !localStorage.getItem("chaybar-pwa-dismissed")) {
    installBanner.style.display = "flex";
  }
});

if (installBtn) {
  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (choice) {
      if (choice.outcome === "accepted") console.log("PWA Installed");
      deferredPrompt = null;
      if (installBanner) installBanner.style.display = "none";
    });
  });
}

if (dismissBtn) {
  dismissBtn.addEventListener("click", function () {
    if (installBanner) installBanner.style.display = "none";
    localStorage.setItem("chaybar-pwa-dismissed", "1");
  });
}

window.addEventListener("appinstalled", function () {
  if (installBanner) installBanner.style.display = "none";
  deferredPrompt = null;
});
