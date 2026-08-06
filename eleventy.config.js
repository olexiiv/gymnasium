/**
 * Конфігурація Eleventy (11ty) для сайту Андріївської різнопрофільної гімназії.
 * Джерело — /src, збірка — /_site. CSS збирається окремо через PostCSS (див. package.json).
 */
module.exports = function (eleventyConfig) {
  // ---------- Passthrough: файли, які копіюються в збірку без обробки ----------
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/docs": "assets/docs" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
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
  eleventyConfig.addCollection("documents", (api) =>
    api.getFilteredByGlob("src/content/documents/*.md").sort((a, b) =>
      new Date(b.data.updatedAt) - new Date(a.data.updatedAt)
    )
  );
  eleventyConfig.addCollection("gallery", (api) =>
    api.getFilteredByGlob("src/content/gallery/*.md")
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
