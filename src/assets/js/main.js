/* ============================================================
   main.js — єдиний JS-бандл сайту (vanilla, без залежностей)
   Мобільне меню · версія для слабозорих · тінь хедера ·
   поява секцій · фільтр новин · lightbox · валідація форми
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

  /* ---------- 4. Кнопка «Нагору» ---------- */
  var toTop = document.getElementById("to-top");
  if (toTop) {
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

  /* ---------- 6. Фільтр новин за категорією ---------- */
  var newsGrid = document.querySelector("[data-news-grid]");
  var filterBtns = document.querySelectorAll(".filter__btn");
  var emptyNote = document.querySelector("[data-filter-empty]");

  if (newsGrid && filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-filter");

        filterBtns.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });

        var visible = 0;
        newsGrid.querySelectorAll("[data-category]").forEach(function (item) {
          var show = value === "all" || item.getAttribute("data-category") === value;
          item.hidden = !show;
          if (show) visible++;
        });

        if (emptyNote) emptyNote.hidden = visible > 0;
      });
    });
  }

  /* ---------- 7. Lightbox галереї ---------- */
  var lbTriggers = document.querySelectorAll("[data-lightbox]");
  if (lbTriggers.length) {
    var lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Перегляд фото");
    lightbox.innerHTML =
      '<button class="lightbox__close" type="button" aria-label="Закрити">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button>" +
      '<div class="lightbox__inner"><div class="lightbox__content"></div><p class="lightbox__caption"></p></div>';
    document.body.appendChild(lightbox);

    var lbContent = lightbox.querySelector(".lightbox__content");
    var lbCaption = lightbox.querySelector(".lightbox__caption");
    var lbClose = lightbox.querySelector(".lightbox__close");
    var lastFocused = null;

    var closeLightbox = function () {
      lightbox.classList.remove("is-open");
      lbContent.innerHTML = "";
      if (lastFocused) lastFocused.focus();
    };

    lbTriggers.forEach(function (btn) {
      btn.addEventListener("click", function () {
        lastFocused = btn;
        var image = btn.getAttribute("data-image");
        var caption = btn.getAttribute("data-caption") || "";

        if (image) {
          var img = document.createElement("img");
          img.src = image;
          img.alt = caption;
          lbContent.appendChild(img);
        } else {
          // Плейсхолдер без фото — показуємо збільшений підпис
          var ph = document.createElement("p");
          ph.textContent = "[ФОТО: " + caption + "]";
          lbContent.appendChild(ph);
        }
        lbCaption.textContent = caption;
        lightbox.classList.add("is-open");
        lbClose.focus();
      });
    });

    lbClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
    });
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
