/**
 * Конфігурація Eleventy (11ty) для сайту Андріївської різнопрофільної гімназії.
 * Джерело — /src, збірка — /_site. CSS збирається окремо через PostCSS (див. package.json).
 */
const fs = require("node:fs");
const path = require("node:path");
const MarkdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // ---------- Passthrough: файли, які копіюються в збірку без обробки ----------
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/docs": "assets/docs" });
  // Адмінпанель. Тека називається так само, як адреса, за якою вона
  // відкривається. Щоб змінити адресу — перейменуйте теку src/panel-8f2k
  // і виправте обидві назви в рядку нижче. Більше ніде шлях не згадується.
  eleventyConfig.addPassthroughCopy({ "src/panel-8f2k": "panel-8f2k" });
  eleventyConfig.addPassthroughCopy({ "src/CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // CSS збирає PostCSS, але стежимо за змінами для live-reload у dev-режимі
  eleventyConfig.addWatchTarget("src/assets/css/");

  // ---------- Колекції (сумісні з Decap CMS: 1 папка = 1 колекція) ----------
  eleventyConfig.addCollection("news", (api) =>
    api.getFilteredByGlob("src/content/news/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("teachers", (api) =>
    api.getFilteredByGlob("src/content/teachers/*.md").sort((a, b) =>
      (a.data.order ?? 99) - (b.data.order ?? 99)
    )
  );
  // Документ потрапляє на сайт, лише якщо файл справді лежить у src/assets/docs.
  // Причина: у проєкті є плейсхолдери (PDF на ~90 байтів) і записи, для яких
  // файл ще не завантажили — без перевірки відвідувач отримував би 404 або
  // порожній PDF. Пропущені записи видно в логах збірки (у тому числі в GitHub
  // Actions), тож нічого не губиться мовчки.
  const DOC_MIN_BYTES = 1024;
  eleventyConfig.addCollection("documents", (api) => {
    const all = api.getFilteredByGlob("src/content/documents/*.md");
    const ready = [];

    for (const doc of all) {
      const file = doc.data.file;
      const label = doc.data.title || doc.inputPath;

      if (!file) {
        console.warn(`[документи] пропущено «${label}»: не вказано поле file`);
        continue;
      }

      const onDisk = path.join("src", file.replace(/^\//, ""));
      let size = -1;
      try { size = fs.statSync(onDisk).size; } catch { /* немає файлу */ }

      if (size < 0) {
        console.warn(`[документи] пропущено «${label}»: немає файлу ${onDisk}`);
        continue;
      }
      if (size < DOC_MIN_BYTES) {
        console.warn(`[документи] пропущено «${label}»: ${onDisk} схожий на плейсхолдер (${size} Б)`);
        continue;
      }

      ready.push(doc);
    }

    return ready.sort((a, b) => new Date(b.data.updatedAt) - new Date(a.data.updatedAt));
  });
  eleventyConfig.addCollection("gallery", (api) =>
    api.getFilteredByGlob("src/content/gallery/*.md").sort((a, b) =>
      (a.data.order ?? 99) - (b.data.order ?? 99)
    )
  );

  // ---------- Фільтри ----------
  const MONTHS_UA = [
    "січня", "лютого", "березня", "квітня", "травня", "червня",
    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
  ];

  // 12 березня 2026
  eleventyConfig.addFilter("dateUA", (value) => {
    const d = new Date(value);
    return `${d.getDate()}\u00A0${MONTHS_UA[d.getMonth()]} ${d.getFullYear()}`;
  });

  // 2026-03-12 — для <time datetime> і sitemap
  eleventyConfig.addFilter("dateISO", (value) => {
    const d = new Date(value);
    return d.toISOString().split("T")[0];
  });

  // Час читання: рахуємо слова у вже зібраному HTML статті.
  // 180 слів/хв — обережна оцінка для української мови.
  eleventyConfig.addFilter("readTime", (html) => {
    const words = String(html || "")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  });

  // ---------- Прозорість / публічна інформація ----------

  // Документи одного розділу: {{ collections.documents | inSection("finansy") }}
  eleventyConfig.addFilter("inSection", (items, slug) =>
    (items || []).filter((item) => item.data.section === slug)
  );

  // Позначені як основні — для добірки на хаб-сторінці
  eleventyConfig.addFilter("featuredDocs", (items) =>
    (items || []).filter((item) => item.data.featured)
  );

  // Групування за категорією зі стабільним порядком.
  // Повертає масив [{ category, docs }] — порядок задає transparency.json,
  // усе, чого немає в списку, потрапляє в кінець за алфавітом.
  eleventyConfig.addFilter("groupByCategory", (items, order) => {
    const groups = new Map();
    for (const item of items || []) {
      const cat = item.data.category || "інше";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(item);
    }

    const known = (order || []).filter((cat) => groups.has(cat));
    const rest = [...groups.keys()]
      .filter((cat) => !known.includes(cat))
      .sort((a, b) => a.localeCompare(b, "uk"));

    return [...known, ...rest].map((category) => ({
      category,
      docs: groups.get(category),
    }));
  });

  // Найдовший день у розкладі класу: {{ cls.week | maxLessons }}
  // Кількість рядків таблиці має дорівнювати найдовшому дню, інакше уроки
  // з довших днів мовчки зникають (раніше бралася довжина понеділка).
  eleventyConfig.addFilter("maxLessons", (week) =>
    (week || []).reduce((max, day) => Math.max(max, (day.lessons || []).length), 0)
  );

  // ---------- Markdown у полях адмінпанелі ----------
  // Тексти сторінок лежать у JSON і редагуються модератором. Щоб він міг
  // поставити жирний шрифт або посилання, не знаючи HTML, поля проганяються
  // через markdown. `md` — з абзацами, `mdInline` — без обгортки <p>
  // (для заголовків, підписів, рядків усередині готової розмітки).
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

  eleventyConfig.addFilter("md", (value) => md.render(String(value || "")));
  eleventyConfig.addFilter("mdInline", (value) => md.renderInline(String(value || "")));

  // Обмеження масиву: {{ collections.news | limit(3) }}
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));

  // Унікальні категорії новин для фільтра на сторінці «Новини»
  eleventyConfig.addFilter("newsCategories", (items) => {
    const set = new Set();
    for (const item of items || []) if (item.data.category) set.add(item.data.category);
    return [...set];
  });

  // Абсолютна адреса для sitemap/og
  eleventyConfig.addFilter("absoluteUrl", (path, base) => {
    try { return new URL(path, base).href; } catch { return path; }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
