/* ============================================================
   main.js — єдиний JS-бандл сайту (vanilla, без залежностей)
   Мобільне меню · версія для слабозорих · тінь хедера ·
   поява секцій · копіювання адреси · lightbox · валідація форми
   ============================================================ */
(function () {
  "use strict";

  // Позначаємо, що JS доступний (для CSS-анімацій .reveal)
  document.documentElement.classList.add("js");

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Мобільне меню ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
    });

    // Закриття по Esc і по кліку поза меню
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (
        nav.classList.contains("is-open") &&
        !nav.contains(e.target) &&
        !navToggle.contains(e.target)
      ) {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 1b. Випадаюче підменю в шапці ---------- */
  var navGroups = document.querySelectorAll("[data-nav-group]");

  if (navGroups.length) {
    var closeGroup = function (group) {
      group.classList.remove("is-open");
      var trigger = group.querySelector("[data-nav-trigger]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    };

    var closeAllGroups = function (except) {
      navGroups.forEach(function (group) {
        if (group !== except) closeGroup(group);
      });
    };

    navGroups.forEach(function (group) {
      var trigger = group.querySelector("[data-nav-trigger]");
      var panel = group.querySelector("[data-nav-panel]");
      if (!trigger || !panel) return;

      trigger.addEventListener("click", function () {
        var open = !group.classList.contains("is-open");
        closeAllGroups(group);
        group.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", String(open));
      });

      // Стрілка вниз із кнопки — одразу на перший пункт підменю
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          group.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          var first = panel.querySelector("a");
          if (first) first.focus();
        }
      });

      // Tab за межі підменю закриває його
      group.addEventListener("focusout", function (e) {
        if (!group.contains(e.relatedTarget)) closeGroup(group);
      });
    });

    document.addEventListener("click", function (e) {
      navGroups.forEach(function (group) {
        if (group.classList.contains("is-open") && !group.contains(e.target)) closeGroup(group);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      navGroups.forEach(function (group) {
        if (!group.classList.contains("is-open")) return;
        var trigger = group.querySelector("[data-nav-trigger]");
        closeGroup(group);
        // Якщо Esc закрив і бургер-меню, тригер уже прихований — фокус туди не повертаємо
        if (trigger && trigger.offsetParent !== null) trigger.focus();
      });
    });
  }

  /* ---------- 2. Версія для слабозорих ---------- */
  var a11yToggle = document.getElementById("a11y-toggle");
  if (a11yToggle) {
    var syncA11y = function () {
      var on = document.documentElement.classList.contains("a11y");
      a11yToggle.setAttribute("aria-pressed", String(on));
    };
    syncA11y();

    a11yToggle.addEventListener("click", function () {
      var on = document.documentElement.classList.toggle("a11y");
      try {
        localStorage.setItem("a11y-mode", on ? "on" : "off");
      } catch (e) { /* приватний режим */ }
      syncA11y();
    });
  }

  /* ---------- 3. Тінь хедера при скролі ---------- */
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 4. Плаваюча кнопка «Нагору» ---------- */
  var toTop = document.getElementById("to-top");
  if (toTop) {
    var toTopThreshold = 640; // з'являється, коли прокрутили приблизно на екран вниз
    var toTopVisible = false;
    var onToTopScroll = function () {
      var shouldShow = window.scrollY > toTopThreshold;
      if (shouldShow !== toTopVisible) {
        toTopVisible = shouldShow;
        toTop.classList.toggle("is-visible", shouldShow);
      }
    };
    onToTopScroll();
    window.addEventListener("scroll", onToTopScroll, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- 5. Поява секцій (IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- 6. Копіювання адреси стрічки ----------
     Раніше тут був фільтр новин за категорією. Рубрики стали окремими
     сторінками (/novyny/tema/...), тож фільтрувати на клієнті нема чого. */
  var copyButtons = document.querySelectorAll("[data-copy-button]");

  copyButtons.forEach(function (btn) {
    var field = document.getElementById(btn.getAttribute("data-copy-target"));
    if (!field) return;

    var label = btn.querySelector("span");
    var original = label ? label.textContent : "";
    var timer = null;

    function done(text) {
      if (!label) return;
      label.textContent = text;
      btn.classList.add("is-done");
      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = original;
        btn.classList.remove("is-done");
      }, 2000);
    }

    btn.addEventListener("click", function () {
      // Виділяємо рядок у будь-якому разі: навіть якщо копіювання не
      // спрацює, людина зможе натиснути Ctrl+C — це не тупик.
      field.focus();
      field.select();
      field.setSelectionRange(0, field.value.length);

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(field.value).then(
          function () { done("Скопійовано"); },
          function () { done("Натисніть Ctrl+C"); }
        );
      } else {
        // http, старий браузер, WebView — клавіатурне копіювання лишається.
        done("Натисніть Ctrl+C");
      }
    });
  });

  /* ---------- 7. Lightbox галереї ---------- */
  var lbTriggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (lbTriggers.length) {
    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Перегляд фото");

    var svg = function (path) {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        path + "</svg>";
    };

    lightbox.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Закрити (Esc)">' +
      svg('<path d="M18 6 6 18M6 6l12 12"/>') + "</button>" +
      '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Попереднє фото">' +
      svg('<path d="m15 18-6-6 6-6"/>') + "</button>" +
      '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Наступне фото">' +
      svg('<path d="m9 18 6-6-6-6"/>') + "</button>" +
      '<div class="lightbox__inner">' +
      '<div class="lightbox__content"></div>' +
      '<div class="lightbox__bar"><p class="lightbox__caption"></p>' +
      '<span class="lightbox__counter"></span></div></div>';
    document.body.appendChild(lightbox);

    var lbContent = lightbox.querySelector(".lightbox__content");
    var lbCaption = lightbox.querySelector(".lightbox__caption");
    var lbCounter = lightbox.querySelector(".lightbox__counter");
    var lbClose = lightbox.querySelector(".lightbox__close");
    var lbPrev = lightbox.querySelector(".lightbox__nav--prev");
    var lbNext = lightbox.querySelector(".lightbox__nav--next");
    var lastFocused = null;
    var lbIndex = 0;
    var multiple = lbTriggers.length > 1;

    lbPrev.hidden = !multiple;
    lbNext.hidden = !multiple;

    var preload = function (i) {
      var btn = lbTriggers[(i + lbTriggers.length) % lbTriggers.length];
      var src = btn && btn.getAttribute("data-image");
      if (src) { var p = new Image(); p.src = src; }
    };

    var paint = function (i) {
      lbIndex = (i + lbTriggers.length) % lbTriggers.length;
      var btn = lbTriggers[lbIndex];
      var image = btn.getAttribute("data-image");
      var caption = btn.getAttribute("data-caption") || "";
      var alt = btn.getAttribute("data-alt") || caption;

      lbContent.innerHTML = "";
      if (image) {
        var img = document.createElement("img");
        img.src = image;
        img.alt = alt;
        lbContent.appendChild(img);
      } else {
        // Плейсхолдер без фото — показуємо збільшений підпис
        var ph = document.createElement("p");
        ph.textContent = "[ФОТО: " + caption + "]";
        lbContent.appendChild(ph);
      }
      lbCaption.textContent = caption;
      lbCounter.textContent = multiple ? lbIndex + 1 + " / " + lbTriggers.length : "";
      lbContent.classList.remove("is-swapping");
      preload(lbIndex + 1);
      preload(lbIndex - 1);
    };

    var stepLightbox = function (delta) {
      if (!multiple) return;
      lbContent.classList.add("is-swapping");
      window.setTimeout(function () { paint(lbIndex + delta); }, 150);
    };

    var closeLightbox = function () {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("lightbox-open");
      lbContent.innerHTML = "";
      if (lastFocused) lastFocused.focus();
    };

    lbTriggers.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        lastFocused = btn;
        paint(i);
        lightbox.classList.add("is-open");
        document.body.classList.add("lightbox-open");
        lbClose.focus();
      });
    });

    lbClose.addEventListener("click", closeLightbox);
    lbPrev.addEventListener("click", function () { stepLightbox(-1); });
    lbNext.addEventListener("click", function () { stepLightbox(1); });

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") stepLightbox(-1);
      else if (e.key === "ArrowRight") stepLightbox(1);
      else if (e.key === "Tab") {
        // Утримуємо фокус у межах діалогу
        var focusable = [lbClose, lbPrev, lbNext].filter(function (b) { return !b.hidden; });
        var pos = focusable.indexOf(document.activeElement);
        var next = e.shiftKey ? pos - 1 : pos + 1;
        if (next < 0) next = focusable.length - 1;
        if (next >= focusable.length) next = 0;
        e.preventDefault();
        focusable[next].focus();
      }
    });

    // Свайп на сенсорних екранах
    var touchX = null, touchY = null;
    lightbox.addEventListener("touchstart", function (e) {
      touchX = e.changedTouches[0].clientX;
      touchY = e.changedTouches[0].clientY;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      var dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) stepLightbox(dx < 0 ? 1 : -1);
      touchX = touchY = null;
    }, { passive: true });
  }

  /* ---------- 8. Валідація форми + AJAX-відправлення на Formspree ---------- */
  var form = document.querySelector(".form");
  if (form) {
    var statusEl = form.querySelector("[data-form-status]");

    var validateField = function (field) {
      var error = document.getElementById(field.getAttribute("aria-describedby") || "");
      var valid = field.checkValidity();
      field.setAttribute("aria-invalid", String(!valid));
      if (error) error.hidden = valid;
      return valid;
    };

    form.querySelectorAll("input[required], textarea[required]").forEach(function (field) {
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      var allValid = true;
      var firstInvalid = null;

      form.querySelectorAll("input[required], textarea[required]").forEach(function (field) {
        if (!validateField(field)) {
          allValid = false;
          if (!firstInvalid) firstInvalid = field;
        }
      });

      if (!allValid) {
        e.preventDefault();
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Прогресивне покращення: AJAX замість переходу на сторінку Formspree
      if (window.fetch) {
        e.preventDefault();
        if (statusEl) statusEl.textContent = "Надсилаємо…";

        fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        })
          .then(function (res) {
            if (res.ok) {
              form.reset();
              if (statusEl) statusEl.textContent = "Дякуємо! Повідомлення надіслано — відповімо протягом робочого дня.";
            } else {
              throw new Error("send failed");
            }
          })
          .catch(function () {
            if (statusEl) {
              statusEl.textContent = "Не вдалося надіслати. Спробуйте ще раз або напишіть нам на пошту.";
            }
          });
      }
    });
  }
})();
