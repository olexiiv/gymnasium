/**
 * Дані для src/novyny.njk — сторінок стрічки новин.
 *
 * Шаблон один, а сторінок із нього виходить багато: «Усі новини» з розбивкою
 * по 9–10 матеріалів і окрема стрічка для кожної рубрики. Що саме показує
 * конкретна сторінка, знає елемент колекції `newsArchive` (див.
 * eleventy.config.js), який пагінація підставляє в змінну `feed`.
 *
 * Чому не front matter: заголовок і адреса залежать від `feed`, тобто їх
 * треба обчислювати. YAML цього не вміє, а eleventyComputed — уміє, і тут
 * це звичайні JS-функції, які видно й легко змінити.
 */
module.exports = {
  eleventyComputed: {
    // Адресу сторінки визначає колекція: /novyny/, /novyny/storinka-2/,
    // /novyny/tema/vstup/ і так далі.
    permalink: (data) => (data.feed ? data.feed.permalink : "/novyny/"),

    // Заголовок <h1>. У рубриці — назва рубрики, шлях до неї видно в хлібних
    // крихтах, тож дублювати слово «Новини» в заголовку не треба.
    title: (data) => (data.feed && data.feed.categoryLabel) || "Новини",

    // <title> у вкладці браузера. Тут навпаки — потрібен повний контекст:
    // рубрика «Вступ» не має виглядати як сторінка вступної кампанії,
    // а друга сторінка стрічки — як дубль першої.
    metaTitle: (data) => {
      if (!data.feed) return "Новини";
      const base = data.feed.categoryLabel ? `Новини: ${data.feed.categoryLabel}` : "Новини";
      return data.feed.pageNumber > 1
        ? `${base} — сторінка ${data.feed.pageNumber}`
        : base;
    },

    intro: (data) => {
      if (!data.feed) return "Оголошення, події та фотозвіти з життя гімназії.";
      return data.feed.categoryLabel
        ? `Матеріали рубрики «${data.feed.categoryLabel}».`
        : "Оголошення, події та фотозвіти з життя гімназії.";
    },

    description: (data) => {
      if (!data.feed) return null;
      return data.feed.categoryLabel
        ? `Новини Андріївської гімназії в рубриці «${data.feed.categoryLabel}».`
        : "Новини, оголошення та анонси Андріївської різнопрофільної гімназії.";
    },

    // Хлібні крихти: у рубриці додається проміжна ланка «Новини».
    parent: (data) =>
      data.feed && data.feed.categoryLabel ? { url: "/novyny/", label: "Новини" } : null,
  },
};
