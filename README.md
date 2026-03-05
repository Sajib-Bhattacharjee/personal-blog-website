

<div align="center">

   # ✍️ TheBlog
  
  <strong>📖 Stories, Ideas & Inspiration</strong>
</div>

<p align="center">
  A modern, full-featured blog platform built for simplicity and performance.
</p>

<p align="center">
  <a href="#features">✨ Features</a> •
  <a href="#quick-start">🚀 Quick Start</a> •
  <a href="#deployment">🌐 Deployment</a> •
  <a href="#configuration">⚙️ Configuration</a> •
  <a href="#project-structure">📁 Structure</a>
</p>

---

## 📋 Overview

**TheBlog** is a production-ready blog platform designed for writers, creators, and organizations who want a beautiful, fast, and easy-to-manage publishing experience. Built with modern web standards and a serverless architecture, it requires no backend infrastructure—just configure your database and deploy.

### ✨ Highlights

- ➤ **Zero server management** — Fully static frontend with Supabase as the backend
- ➤ **Instant deployment** — One-click deploy to Netlify or any static host
- ➤ **Admin panel** — Create, edit, and manage content without touching code
- ➤ **SEO-ready** — Sitemap, RSS feed, and meta tags included
- ➤ **Responsive & accessible** — Works beautifully on all devices
- ➤ **Light & dark mode** — Theme preference saved per user

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 📝 **Content Management** | Create, edit, and delete posts via a password-protected admin panel |
| 🖼️ **Image Upload** | Upload featured images directly from the admin or use external URLs |
| 📄 **Markdown Support** | Write posts in Markdown for rich formatting |
| 💬 **Comments** | Readers can leave comments; authors can edit or delete their own |
| ❤️ **Likes** | Post likes with rate limiting to prevent abuse |
| 📧 **Newsletter** | Email signup form with subscriber list in admin |
| 🔍 **Search & Filter** | Full-text search and category filtering on the blog listing |
| 🔗 **Related Posts** | Automatic suggestions based on category |
| 📊 **Reading Progress** | Visual progress bar on article pages |
| 📤 **Share Buttons** | Copy link, WhatsApp, Facebook, Twitter |
| 🚫 **Custom 404** | Branded error page for missing routes |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| 🎨 Frontend | HTML5, CSS3, Bootstrap 5 |
| ⚡ Interactivity | Vanilla JavaScript |
| 🗄️ Backend | Supabase (PostgreSQL, Storage, Auth-ready) |
| 🌐 Hosting | Netlify (recommended) or any static host |

---

## 🚀 Quick Start

### 📌 Prerequisites

- ➤ A [Supabase](https://supabase.com) account
- ➤ A [Netlify](https://netlify.com) account (or similar)

### 1️⃣ Clone & Deploy

Clone the repository and deploy to Netlify via Git, or drag-and-drop the project folder into the Netlify dashboard.

### 2️⃣ Configure Supabase

Create a new Supabase project and configure the required tables, policies, and storage bucket. **See [SETUP.md](SETUP.md) for complete instructions.**

### 3️⃣ Update Configuration

Edit `assets/js/config.js`:

- ➤ Set `SUPABASE_URL` and `SUPABASE_KEY` from your Supabase project settings
- ➤ Change `ADMIN_PASSWORD` from the default
- ➤ Adjust rate limits and cache settings if needed

### 4️⃣ Update Sitemap & RSS

Replace `yoursite.netlify.app` in `sitemap.xml` and `rss.xml` with your production domain.

---

## 🌐 Deployment

### 🟢 Netlify

The project includes a `netlify.toml` configuration with:

- ➤ Clean URLs (e.g. `/blog` instead of `/blog.html`)
- ➤ Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- ➤ Cache headers for static assets

Connect your repository to Netlify and deploy. No build step required—the site is static.

### 🔗 Other Hosts

Deploy the project root to any static hosting service (Vercel, GitHub Pages, Cloudflare Pages, etc.). Ensure the host supports:

- ➤ Custom 404 pages (`404.html`)
- ➤ URL rewriting for clean paths (or use `.html` URLs)

---

## ⚙️ Configuration

| Setting | Location | Purpose |
|---------|----------|---------|
| 🔗 Supabase URL & Key | `assets/js/config.js` | Backend connection |
| 🔐 Admin Password | `assets/js/config.js` | Admin panel access |
| ⏱️ Rate Limits | `assets/js/config.js` | Likes and comments per hour |
| 📄 Posts per Page | `assets/js/config.js` | Blog listing pagination |
| 📝 Site Name & Description | `assets/js/config.js` | Meta tags and branding |
| 🖼️ Default Image | `assets/js/config.js` | Fallback when post has no image |

---

## 📁 Project Structure

```
├── 📄 index.html          # Homepage
├── 📄 blog.html           # Blog listing with search & filters
├── 📄 post.html           # Single post view
├── 📄 admin.html          # Admin dashboard
├── 📄 about.html          # About page
├── 📄 contact.html        # Contact page
├── 📄 privacy.html        # Privacy policy
├── 📄 terms.html          # Terms of service
├── 📄 404.html            # Custom not-found page
├── 🗺️ sitemap.xml         # SEO sitemap
├── 📡 rss.xml             # RSS feed
├── ⚙️ netlify.toml        # Netlify configuration
├── 📖 SETUP.md            # Detailed setup guide
├── 📖 README.md           # This file
└── 📁 assets/
    ├── 📁 css/
    │   └── 🎨 style.css   # Styles
    └── 📁 js/
        ├── ⚙️ config.js   # Configuration
        ├── 📜 script.js   # Main application logic
        └── 🔧 admin.js   # Admin panel logic
```

---

## 📄 Pages

| Page | Path | Description |
|------|------|-------------|
| 🏠 Home | `/` | Featured post, categories, latest posts, newsletter signup |
| 📝 Blog | `/blog` | All posts with search, category filter, and sort |
| 📖 Post | `/post?id=...` | Full article with comments, likes, share, related posts |
| 🔐 Admin | `/admin` | Password-protected content management |
| ℹ️ About | `/about` | Site information |
| 📧 Contact | `/contact` | Contact details |
| 🔒 Privacy | `/privacy` | Privacy policy |
| 📜 Terms | `/terms` | Terms of service |

---

## 🔒 Security Notes

- ➤ **Change the default admin password** immediately after first login
- ➤ Supabase Row Level Security (RLS) policies control data access—follow SETUP.md
- ➤ Admin panel is not indexed by search engines (`noindex, nofollow`)
- ➤ Consider environment variables for sensitive config in production

---

## 🌐 Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge) with ES6+ support. Gracefully degrades for older browsers.

---

## 📜 License

This project is open source. Use it for personal or commercial projects.

---

<p align="center">
  <strong>✍️ TheBlog</strong> — Built with HTML · CSS · JavaScript · Supabase
</p>


---

## 👨‍💻 About the Author

**Sajib Bhattacharjee**
MERN Stack Specialist | Full-Stack Web Developer

- 🌐 [Portfolio & Projects](https://github.com/Sajib-Bhattacharjee)
- 💼 [LinkedIn](https://www.linkedin.com/in/sajib-bhattacharjee-42682a178/)
- 📧 [Contact Me](mailto:sajibbhattacjarjee2000@gmail.com)

---

<p align="center"><i>Created with ❤️ — 2026 Edition</i></p>
