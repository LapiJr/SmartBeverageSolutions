# Vienna Konditorei website

A small, fast, bilingual website for Vienna Konditorei, a cafe on the Plaats in The Hague.

- Plain HTML, CSS and a little JavaScript. No framework, no build step.
- English at the root (`/`), Dutch in `/nl/`.
- Ready for Netlify, including Netlify Forms for the contact and job forms.

## Folder overview

```
/index.html, about.html, menu.html, contact.html, vacancies.html, privacy.html, thank-you.html, 404.html
/nl/index.html, over-ons.html, menu.html, contact.html, vacatures.html, privacy.html, bedankt.html
/css/style.css      all styling (colors, fonts and spacing are at the top)
/js/main.js         opening hours, mobile menu, language switch, small effects
/js/menu-data.js    the full menu with prices, in English and Dutch
/images/            all photos (placeholders for now)
/netlify.toml       Netlify settings (404 page, security and cache headers)
/robots.txt, /sitemap.xml, /favicon.svg
```

## Everyday changes

### Change opening hours
Open `js/main.js`. At the top you will find `HOURS`. Change the times there and they update in the
footer of every page, on the home page, on the contact page, and in the Google data on the home page.

> The HTML also holds a static copy of the hours for the rare visitor without JavaScript.
> If you want that copy to match too, search the `.html` files for `08:30` and replace it.

### Change menu prices or items
Open `js/menu-data.js`. Every item looks like this:

```js
{ "name": "Flat White", "price": 4.9, "desc": null }
```

- `price` is a number in euros, with a dot (`4.90` or `4.9`). Use `null` for "ask our staff".
- `desc` has an English (`en`) and a Dutch (`nl`) text, or is `null`.
- `"highlight": true` puts an item in a red box (like Bitterballen).

The menu page and the "A few favourites" block on the home page are built from this file in both
languages. The HTML pages also contain a copy of the menu so Google can read it; visitors always see the
version from `menu-data.js`. To change which items appear in "A few favourites", edit the
`data-menu-teaser` list in `index.html` and `nl/index.html`.

### Change colors or fonts
Open `css/style.css`. All colors (`--vienna-red`, `--ink`, `--paper` and so on), fonts and spacing are
defined at the top in `:root`.

### Use a real logo file
The logo is now text (`VIENNA` with `KONDITOREI` underneath). To use a file, save it as
`/images/logo.svg` and in every page replace

```html
<span class="logo-main">Vienna</span><span class="logo-sub">Konditorei</span>
```

with

```html
<img src="/images/logo.svg" alt="Vienna Konditorei" width="150" height="48">
```

(Use your editor's "find and replace in all files".)

## Images

All images are clearly labelled placeholders (a beige card with the file name and the ideal size).
Replace each file in `/images/` with a real photo **using the same file name**, ideally at the size
below, saved as JPG at about 75 to 80 percent quality. Photos of your own cafe will look best. For
temporary stock photos, Unsplash works well (search terms are suggested).

| File | Ideal size (px) | Where | What to show (Unsplash search) |
|---|---|---|---|
| `hero-cafe.jpg` | 2400 x 1500 | Home, top | Coffee with a pastry, or the cafe interior ("coffee and cake table") |
| `home-intro.jpg` | 1200 x 1600 (tall) | Home, welcome | Coffee by the window ("coffee window cafe") |
| `highlight-pastries.jpg` | 900 x 1125 | Home, highlights | Pastries and cakes ("croissants bakery") |
| `highlight-coffee.jpg` | 900 x 1125 | Home, highlights | Specialty coffee ("flat white latte art") |
| `highlight-lunch.jpg` | 900 x 1125 | Home, highlights | Breakfast or lunch ("sourdough sandwich") |
| `gallery-1.jpg` | 1200 x 1600 (tall) | Home, gallery | Interior ("cafe interior wood") |
| `gallery-2.jpg` | 1200 x 1200 | Home, gallery | Cakes ("slice of cake") |
| `gallery-3.jpg` | 1200 x 1200 | Home, gallery | Coffee ("espresso pour") |
| `gallery-4.jpg` | 1800 x 1200 (wide) | Home, gallery | **Terrace** over the Hofvijver |
| `gallery-5.jpg` | 1200 x 1200 | Home, gallery | Sandwiches ("sandwich sourdough") |
| `gallery-6.jpg` | 1800 x 1200 (wide) | Home, gallery | Pastry counter ("pastry display") |
| `insta-1.jpg` to `insta-6.jpg` | 800 x 800 | Home, Instagram strip | Your own Instagram photos |
| `about-hero.jpg` | 2400 x 1030 (very wide) | About, top | Wide interior photo |
| `about-cakes.jpg` | 1200 x 1500 | About | Cakes in the counter |
| `about-coffee.jpg` | 1200 x 1500 | About | Barista at work |
| `about-terrace.jpg` | 1200 x 1500 | About | Terrace |
| `about-team.jpg` | 1200 x 1500 | About, owner story | Owner or team |
| `vacancies-team.jpg` | 1200 x 1500 | Vacancies | Team member at work |
| `contact-cafe.jpg` | 1200 x 1500 | Contact | Front of the cafe |
| `og-image.jpg` | 1200 x 630 | Shown when the site is shared on WhatsApp, Facebook etc. | Your best photo with some calm space |

**WebP:** every image already has `width`, `height` and lazy loading. To switch to WebP later, save
the photos as `.webp` and change `.jpg` to `.webp` in the HTML (find and replace).

## Deploy on Netlify

1. Create a free account at [netlify.com](https://www.netlify.com).
2. **Option A, drag and drop:** in Netlify go to *Sites*, then drag this whole folder onto the page
   that says "Drag and drop your site output folder here". Done.
   **Option B, connect GitHub (recommended):** *Add new site* > *Import an existing project* >
   *GitHub* > choose this repository. Leave the build command empty and set the publish directory
   to `.` (this is already set in `netlify.toml`). Every change you push to GitHub then goes live
   automatically.
3. Netlify gives you an address like `something.netlify.app`. Under *Site configuration* > *Change
   site name* you can make it `viennakonditorei.netlify.app`.

> The site currently uses `https://viennakonditorei.netlify.app` as its address in the SEO tags,
> `sitemap.xml` and `robots.txt`. If your address is different (or once you connect your own
> domain), find and replace `https://viennakonditorei.netlify.app` in all files.

### Forms
Netlify finds the four forms automatically when the site is deployed:

| Form name | Page |
|---|---|
| `contact-en` | contact.html |
| `contact-nl` | nl/contact.html |
| `application-en` | vacancies.html |
| `application-nl` | nl/vacatures.html |

- **First time:** in Netlify go to *Site configuration* > *Forms* and click *Enable form detection*,
  then deploy the site again (Deploys > Trigger deploy).
- **See submissions:** open your site in Netlify and click *Forms*. Click a form name to see every
  message. Uploaded CVs can be downloaded from there.
- **Email notifications:** *Site configuration* > *Notifications* > *Emails and webhooks* >
  *Form submission notifications* > *Add notification* > *Email notification*. Choose the form (or
  "Any form") and fill in the email address that should receive them.
- Spam is filtered with a hidden honeypot field and Netlify's own spam filter.
- CVs can be up to 8 MB (Netlify's limit per form submission).
- Privacy: delete old applications in the Forms page as described in the privacy statement
  (4 weeks after a hiring round, or 1 year with permission).

### Connect your own domain (later)
1. In Netlify: *Domain management* > *Add a domain* > type your domain (for example
   `viennakonditorei.nl`).
2. Netlify shows which DNS records to add. Log in where you bought the domain and add them, or move
   the domain's nameservers to Netlify (Netlify explains both options step by step).
3. HTTPS is switched on automatically within an hour or so.
4. Replace `https://viennakonditorei.netlify.app` with your new address in all files and deploy.
5. Optional: add the site to [Google Search Console](https://search.google.com/search-console) and
   submit `https://yourdomain/sitemap.xml`.

## Placeholders still to fill in

- **Opening hours** in `js/main.js` (now an example: Mon to Fri 08:30 to 19:00, Sat 09:00 to 19:00,
  Sun 10:00 to 18:00). Also update the static copy in the HTML, see above.
- **Email address:** none is shown. If you want one, add it in all pages (footer and contact page)
  and in the JSON-LD on both home pages.
- **All photos** in `/images/` (see the table above), including `og-image.jpg`.
- **Short description of the cafe** on the home page (marked `PLACEHOLDER` in `index.html` and
  `nl/index.html`).
- **Owner story** on the About page (`about.html`, `nl/over-ons.html`), the block marked
  "Placeholder: owner story".
- **Vacancies:** the job titles, hours and descriptions, and the "What you can expect" list
  (`vacancies.html`, `nl/vacatures.html`).
- **Privacy statement:** marked as a draft. Add the legal company name and KvK number, the date, and
  have it checked.
- **Site address:** `https://viennakonditorei.netlify.app` (see Deploy).
- **Logo file** (optional), see "Use a real logo file".
