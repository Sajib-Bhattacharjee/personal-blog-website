/* ============================================================
   BLOG — MAIN SCRIPT  (Supabase Backend)
   ============================================================ */

'use strict';

/* ── Supabase Client ──────────────────────────────────────── */
let _sb = null;

function getSupabase() {
  if (_sb) return _sb;
  if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
    _sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  }
  return _sb;
}

/* ── State ────────────────────────────────────────────────── */
const State = {
  posts:         [],
  filteredPosts: [],
  currentPage:   1,
  activeCategory: 'All',
  sortOrder:     'newest',
  searchQuery:   '',
  darkMode:      false,
  likesCache:    {},   // { postId: count } — loaded once per page
};

/* ── DOM Ready ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Clear stale cache on every load during development
  // (safe to keep — only clears if URL changed or cache is empty)
  const savedUrl = localStorage.getItem('blog_supabase_url');
  if (savedUrl !== CONFIG.SUPABASE_URL) {
    localStorage.removeItem('blog_posts_cache');
    localStorage.removeItem('blog_posts_cache_time');
    localStorage.setItem('blog_supabase_url', CONFIG.SUPABASE_URL);
  }
  // Also clear cache if it was previously an empty result
  const cachedPosts = localStorage.getItem('blog_posts_cache');
  if (cachedPosts) {
    try {
      const parsed = JSON.parse(cachedPosts);
      if (!parsed.length) {
        localStorage.removeItem('blog_posts_cache');
        localStorage.removeItem('blog_posts_cache_time');
      }
    } catch {
      localStorage.removeItem('blog_posts_cache');
      localStorage.removeItem('blog_posts_cache_time');
    }
  }

  initTheme();
  initNavbar();
  initBackToTop();
  initSearchOverlay();
  initParticles();

  const page = detectPage();
  if (page === 'home') initHomePage();
  if (page === 'blog') initBlogPage();
  if (page === 'post') initPostPage();

  initNewsletter();
  initScrollAnimations();
});

/* ── Page Detection ───────────────────────────────────────── */
function detectPage() {
  // Works with both blog.html (local) and /blog (Netlify pretty URLs)
  const path = window.location.pathname.replace(/\.html$/, '').toLowerCase();
  if (path.endsWith('/blog')  || path.endsWith('blog'))  return 'blog';
  if (path.endsWith('/post')  || path.endsWith('post'))  return 'post';
  return 'home';
}

/* ── Theme ────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('blogTheme') || 'light';
  applyTheme(saved);
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('blogTheme', theme);
  State.darkMode = theme === 'dark';
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
  });
}

/* ── Navbar ───────────────────────────────────────────────── */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const path = (window.location.pathname || '').replace(/\.html$/, '').toLowerCase();
  const isBlog = path.endsWith('/blog') || path === 'blog';
  const isPost = path.endsWith('/post') || path === 'post';
  const isAbout = path.endsWith('/about') || path === 'about';
  const isContact = path.endsWith('/contact') || path === 'contact';
  const isHome = !isBlog && !isPost && !isAbout && !isContact;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    const href = (link.getAttribute('href') || '').toLowerCase();
    if ((isBlog || isPost) && href.includes('blog')) link.classList.add('active');
    else if (isAbout && href.includes('about')) link.classList.add('active');
    else if (isContact && href.includes('contact')) link.classList.add('active');
    else if (isHome && (href.includes('index') || href === '/')) link.classList.add('active');
  });
}

/* ── Search Overlay ───────────────────────────────────────── */
function initSearchOverlay() {
  const overlay = document.getElementById('searchOverlay');
  if (!overlay) return;
  const input   = overlay.querySelector('input');
  const closeBtn = overlay.querySelector('.search-close');

  document.querySelectorAll('.nav-search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.classList.add('active');
      setTimeout(() => input && input.focus(), 100);
    });
  });
  closeBtn && closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.classList.remove('active');
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      overlay.classList.add('active');
      setTimeout(() => input && input.focus(), 100);
    }
  });
  input && input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim())
      window.location.href = `blog.html?search=${encodeURIComponent(input.value.trim())}`;
  });
}

/* ── Newsletter ───────────────────────────────────────────── */
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('newsletterEmail');
    const msgEl = document.getElementById('newsletterMsg');
    const email = (input?.value || '').trim().toLowerCase();
    if (!email) return;
    const sb = getSupabase();
    if (!sb) {
      if (msgEl) { msgEl.textContent = 'Newsletter signup is not available.'; msgEl.style.display = 'block'; }
      return;
    }
    try {
      const { error } = await sb.from('newsletter_subscribers').insert({ email });
      if (error) {
        if (error.code === '23505') {
          if (msgEl) { msgEl.textContent = 'You\'re already subscribed!'; msgEl.style.display = 'block'; msgEl.style.color = '#4fffb0'; }
        } else if (error.code === '42501' || (error.message && (error.message.includes('policy') || error.message.includes('row-level security') || error.message.includes('RLS')))) {
          if (msgEl) { msgEl.textContent = 'RLS blocking: Add INSERT policy on newsletter_subscribers. Run SQL in SETUP.md'; msgEl.style.display = 'block'; }
        } else if (error.code === '42P01') {
          if (msgEl) { msgEl.textContent = 'Table newsletter_subscribers not found. Create it in Supabase.'; msgEl.style.display = 'block'; }
        } else {
          console.error('[Newsletter]', error);
          if (msgEl) { msgEl.textContent = error.message || 'Signup failed.'; msgEl.style.display = 'block'; }
        }
      } else {
        if (msgEl) { msgEl.textContent = 'Thanks for subscribing!'; msgEl.style.display = 'block'; msgEl.style.color = '#4fffb0'; }
        input.value = '';
      }
    } catch (err) {
      console.error('[Newsletter]', err);
      if (msgEl) {
        msgEl.textContent = err?.message || err?.error_description || 'Signup failed.';
        msgEl.style.display = 'block';
      }
    }
  });
}

/* ── Back to Top ──────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Particles ────────────────────────────────────────────── */
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${Math.random()*100}%;width:${Math.random()*4+2}px;height:${Math.random()*4+2}px;animation-duration:${Math.random()*8+6}s;animation-delay:${Math.random()*-10}s;opacity:${Math.random()*0.5+0.2};`;
    container.appendChild(p);
  }
}

/* ═══════════════════════════════════════════════════════════
   SUPABASE — POSTS
   ═══════════════════════════════════════════════════════════ */
async function fetchPosts() {
  const CACHE_KEY  = 'blog_posts_cache';
  const CACHE_TIME = 'blog_posts_cache_time';
  const now        = Date.now();
  const cachedAt   = parseInt(localStorage.getItem(CACHE_TIME) || '0');

  if (now - cachedAt < CONFIG.CACHE_DURATION) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { try { return JSON.parse(cached); } catch {} }
  }

  const sb = getSupabase();
  if (!sb) {
    const demoPosts = CONFIG.DEMO_POSTS.map(p => ({ ...p, category: normalizeCategory(p.category) }));
    localStorage.setItem(CACHE_KEY,  JSON.stringify(demoPosts));
    localStorage.setItem(CACHE_TIME, now.toString());
    return demoPosts;
  }

  try {
    const { data, error } = await sb
      .from('posts')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    const posts = (data || [])
      // Accept any casing of "published", and also include rows with no status set
      .filter(p => !p.status || p.status.toLowerCase() === 'published')
      .map(p => ({
        id:          String(p.id),
        title:       (p.title        || '').trim(),
        description: (p.description  || '').trim(),
        imageUrl:    (p.image_url    || CONFIG.DEFAULT_IMAGE).trim(),
        category:    normalizeCategory(p.category),
        author:      (p.author       || 'Unknown').trim(),
        date:        (p.date         || '').trim(),
        status:      'Published',
      }));

    console.log(`[Supabase] Fetched ${posts.length} posts`);

    // Only cache if we actually got posts — never cache an empty result
    if (posts.length > 0) {
      localStorage.setItem(CACHE_KEY,  JSON.stringify(posts));
      localStorage.setItem(CACHE_TIME, now.toString());
      return posts;
    }

    // Table exists but is empty — show demo posts so site is not blank
    console.warn('[Supabase] posts table is empty — showing demo posts');
    return CONFIG.DEMO_POSTS;

  } catch (err) {
    console.error('[Supabase] fetchPosts error:', err);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { try { return JSON.parse(cached); } catch {} }
    return CONFIG.DEMO_POSTS;
  }
}

/* ═══════════════════════════════════════════════════════════
   SUPABASE — LIKES  (count global, liked-state per device)
   ═══════════════════════════════════════════════════════════ */

/** Pre-load all like counts in one query, store in State.likesCache */
async function preloadLikes(posts) {
  const sb = getSupabase();
  if (!sb || !posts.length) return;
  try {
    const ids = posts.map(p => p.id);
    const { data } = await sb.from('likes').select('post_id, count').in('post_id', ids);
    if (data) data.forEach(l => { State.likesCache[l.post_id] = l.count || 0; });
  } catch {}
}

function getLikes(postId) {
  return State.likesCache[postId] || 0;
}

function isLiked(postId) {
  const data = JSON.parse(localStorage.getItem('blog_liked_posts') || '{}');
  return !!data[postId];
}

function checkRateLimit(key, limit) {
  const raw = localStorage.getItem(key) || '[]';
  let arr = []; try { arr = JSON.parse(raw); } catch {}
  const hourAgo = Date.now() - 3600000;
  arr = arr.filter(t => t > hourAgo);
  if (arr.length >= limit) return false;
  arr.push(Date.now());
  localStorage.setItem(key, JSON.stringify(arr));
  return true;
}

async function toggleLike(postId) {
  const likedData  = JSON.parse(localStorage.getItem('blog_liked_posts') || '{}');
  const wasLiked   = !!likedData[postId];
  const newLiked   = !wasLiked;

  if (newLiked && !checkRateLimit('blog_rate_likes', CONFIG.RATE_LIMIT_LIKES || 10)) {
    showToast('Rate limit: try again later.', 'info', 3000);
    return { liked: false, count: State.likesCache[postId] || 0 };
  }

  likedData[postId] = newLiked;
  localStorage.setItem('blog_liked_posts', JSON.stringify(likedData));

  const currentCount = State.likesCache[postId] || 0;
  const newCount     = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
  State.likesCache[postId] = newCount;

  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('likes').upsert({ post_id: postId, count: newCount }, { onConflict: 'post_id' });
    } catch (err) { console.error('Like upsert error:', err); }
  }

  return { liked: newLiked, count: newCount };
}

/* ═══════════════════════════════════════════════════════════
   SUPABASE — COMMENTS  (stored globally, edit key per device)
   ═══════════════════════════════════════════════════════════ */
async function getComments(postId) {
  const sb = getSupabase();
  if (!sb) {
    const data = JSON.parse(localStorage.getItem('blog_comments') || '{}');
    return (data[postId] || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  try {
    const { data, error } = await sb
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getComments error:', err);
    return [];
  }
}

async function addComment(postId, name, message) {
  if (!checkRateLimit('blog_rate_comments', CONFIG.RATE_LIMIT_COMMENTS || 5)) {
    showToast('Rate limit: try again in an hour.', 'info', 3000);
    return null;
  }
  const sb = getSupabase();
  if (!sb) {
    const data = JSON.parse(localStorage.getItem('blog_comments') || '{}');
    if (!data[postId]) data[postId] = [];
    const comment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: name.trim(), message: message.trim(),
      timestamp: new Date().toISOString(), edited: false,
    };
    data[postId].unshift(comment);
    localStorage.setItem('blog_comments', JSON.stringify(data));
    const keys = JSON.parse(localStorage.getItem('blog_comment_keys') || '{}');
    keys[comment.id] = true;
    localStorage.setItem('blog_comment_keys', JSON.stringify(keys));
    return comment;
  }
  try {
    const { data, error } = await sb
      .from('comments')
      .insert({ post_id: postId, name: name.trim(), message: message.trim() })
      .select().single();
    if (error) throw error;
    // Save comment ID locally so user can edit/delete from same device
    const keys = JSON.parse(localStorage.getItem('blog_comment_keys') || '{}');
    keys[data.id] = true;
    localStorage.setItem('blog_comment_keys', JSON.stringify(keys));
    return data;
  } catch (err) {
    console.error('addComment error:', err);
    return null;
  }
}

async function editComment(postId, commentId, newMessage) {
  const sb = getSupabase();
  if (!sb) {
    const data = JSON.parse(localStorage.getItem('blog_comments') || '{}');
    if (!data[postId]) return false;
    const idx = data[postId].findIndex(c => c.id === commentId);
    if (idx < 0) return false;
    data[postId][idx].message = newMessage.trim();
    data[postId][idx].edited  = true;
    localStorage.setItem('blog_comments', JSON.stringify(data));
    return true;
  }
  try {
    const { error } = await sb
      .from('comments')
      .update({ message: newMessage.trim(), edited: true })
      .eq('id', commentId);
    return !error;
  } catch { return false; }
}

async function deleteComment(postId, commentId) {
  const sb = getSupabase();
  if (!sb) {
    const data = JSON.parse(localStorage.getItem('blog_comments') || '{}');
    if (!data[postId]) return false;
    data[postId] = data[postId].filter(c => c.id !== commentId);
    localStorage.setItem('blog_comments', JSON.stringify(data));
    return true;
  }
  try {
    const { error } = await sb.from('comments').delete().eq('id', commentId);
    return !error;
  } catch { return false; }
}

function canManageComment(commentId) {
  const keys = JSON.parse(localStorage.getItem('blog_comment_keys') || '{}');
  return !!keys[commentId];
}

/* ── Post Utilities ───────────────────────────────────────── */
function readTime(text) {
  return Math.max(1, Math.ceil((text || '').split(/\s+/).length / 200));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)      return 'just now';
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getCategoryColor(category) {
  if (CONFIG.CATEGORY_COLORS[category]) return CONFIG.CATEGORY_COLORS[category].hue;
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function getCardGradient(post) {
  const hue = getCategoryColor(post.category);
  return `linear-gradient(135deg, hsl(${hue},72%,52%), hsl(${(hue+40)%360},70%,48%), hsl(${(hue+80)%360},68%,55%))`;
}

function getCategoryStyle(category) {
  const hue = getCategoryColor(category);
  return `background: linear-gradient(135deg, hsl(${hue},65%,50%), hsl(${(hue+35)%360},65%,50%));`;
}

/* ── Toast ────────────────────────────────────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]||icons.info} toast-icon"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, duration);
}

/* ── Confetti ─────────────────────────────────────────────── */
function launchConfetti(x, y) {
  const colors = ['#667eea','#764ba2','#f093fb','#4facfe','#00f2fe','#ff6b8a','#ffd700'];
  for (let i = 0; i < 28; i++) {
    const el    = document.createElement('div');
    el.className = 'confetti-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 80 + 40;
    el.style.cssText = `left:${x+Math.cos(angle)*dist}px;top:${y+Math.sin(angle)*dist-50}px;background:${colors[Math.floor(Math.random()*colors.length)]};width:${Math.random()*10+6}px;height:${Math.random()*10+6}px;border-radius:${Math.random()>.5?'50%':'2px'};animation-duration:${Math.random()*.7+.8}s;animation-delay:${Math.random()*.3}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

/* ── Scroll Animations ────────────────────────────────────── */
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));
}

/* ── Skeleton ─────────────────────────────────────────────── */
function renderSkeletonCards(container, count = 9) {
  container.innerHTML = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line skeleton-title"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-text"></div>
      </div>
    </div>`).join('');
}

/* ── Build Post Card ──────────────────────────────────────── */
function buildPostCard(post, index) {
  const gradient = getCardGradient(post);
  const catStyle = getCategoryStyle(post.category);
  const hue      = getCategoryColor(post.category);
  const liked    = isLiked(post.id);
  const likes    = getLikes(post.id);
  const rt       = readTime(post.description);
  const dateStr  = formatDate(post.date);
  const excerpt  = (post.description || '').replace(/\n/g,' ').slice(0,130) + '…';
  const initials = (post.author||'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const postUrl  = `post.html?id=${encodeURIComponent(post.id)}`;

  return `
    <article class="post-card animate-on-scroll">
      <a href="${postUrl}" class="post-card-img-wrap d-block">
        <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" loading="lazy"
             onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
        <div class="post-card-gradient-overlay" style="background:${gradient};"></div>
        <span class="post-card-category" style="${catStyle}">${escapeHtml(post.category)}</span>
      </a>
      <div class="post-card-body">
        <a href="${postUrl}"><h2 class="post-card-title">${escapeHtml(post.title)}</h2></a>
        <p class="post-card-excerpt">${escapeHtml(excerpt)}</p>
        <div class="post-card-footer">
          <div class="post-card-author">
            <div class="author-avatar" style="background:linear-gradient(135deg,hsl(${hue},60%,50%),hsl(${(hue+50)%360},60%,50%));">${initials}</div>
            <span>${escapeHtml(post.author)}</span>
          </div>
          <div class="post-card-meta-right">
            <span class="meta-item"><i class="far fa-calendar-alt"></i> ${dateStr}</span>
            <span class="meta-item"><i class="far fa-clock"></i> ${rt}m</span>
            <button class="like-btn-card ${liked?'liked':''}"
                    onclick="handleCardLike(event,'${post.id}',this)" aria-label="Like">
              <i class="${liked?'fas':'far'} fa-heart"></i>
              <span class="like-count">${likes}</span>
            </button>
          </div>
        </div>
        <div class="mt-2"><a href="${postUrl}" class="read-more-link">Read More <i class="fas fa-arrow-right"></i></a></div>
      </div>
    </article>`;
}

async function handleCardLike(e, postId, btn) {
  e.preventDefault(); e.stopPropagation();
  btn.disabled = true;
  const result = await toggleLike(postId);
  btn.disabled = false;
  btn.querySelector('i').className  = result.liked ? 'fas fa-heart' : 'far fa-heart';
  btn.querySelector('.like-count').textContent = result.count;
  btn.classList.toggle('liked', result.liked);
  if (result.liked) {
    const rect = btn.getBoundingClientRect();
    launchConfetti(rect.left + rect.width/2, rect.top + window.scrollY);
    showToast('Added to your favorites!', 'success', 2000);
  }
}

function escapeHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function normalizeCategory(cat) {
  if (!cat) return 'General';
  const t = cat.trim();
  if (!t) return 'General';
  // Title Case: capitalize first letter of EVERY word
  // "web design" → "Web Design" | "TECH NEWS" → "Tech News" | " food " → "Food"
  return t.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */
async function initHomePage() {
  const featuredEl   = document.getElementById('featuredPost');
  const latestEl     = document.getElementById('latestPostsGrid');
  const categoryEl   = document.getElementById('categoryPills');

  if (latestEl) renderSkeletonCards(latestEl, 6);

  const posts = await fetchPosts();
  State.posts = posts;
  if (!posts.length) {
    console.warn('[Blog] No posts available to render');
    return;
  }

  await preloadLikes(posts);

  if (featuredEl) renderFeaturedPost(featuredEl, posts[0]);

  if (latestEl) {
    latestEl.innerHTML = posts.slice(1,7).map((p,i) => buildPostCard(p,i)).join('');
    initScrollAnimations();
  }

  if (categoryEl) renderCategoryPills(categoryEl, posts);

  document.dispatchEvent(new CustomEvent('postsReady', { detail: posts }));

  setTimeout(() => {
    localStorage.removeItem('blog_posts_cache');
    localStorage.removeItem('blog_posts_cache_time');
  }, CONFIG.AUTO_REFRESH);
}

function renderFeaturedPost(container, post) {
  const rt      = readTime(post.description);
  const dateStr = formatDate(post.date);
  container.innerHTML = `
    <a href="post.html?id=${encodeURIComponent(post.id)}" class="featured-post d-block text-decoration-none animate-on-scroll">
      <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
      <div class="featured-post-overlay"></div>
      <div class="featured-post-body">
        <div class="featured-badge"><i class="fas fa-star"></i> Featured Post</div>
        <h2 class="featured-post-title">${escapeHtml(post.title)}</h2>
        <div class="featured-post-meta">
          <span><i class="fas fa-user"></i> ${escapeHtml(post.author)}</span>
          <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
          <span><i class="far fa-clock"></i> ${rt} min read</span>
          <span><i class="far fa-heart"></i> ${getLikes(post.id)} likes</span>
        </div>
        <span class="btn-read">Read Article <i class="fas fa-arrow-right"></i></span>
      </div>
    </a>`;
  setTimeout(() => initScrollAnimations(), 50);
}

function renderCategoryPills(container, posts) {
  const counts = {};
  posts.forEach(p => { counts[p.category] = (counts[p.category]||0)+1; });
  const cats = ['All', ...Object.keys(counts).sort()];
  container.innerHTML = cats.map(cat => {
    const count = cat==='All' ? posts.length : (counts[cat]||0);
    return `
      <button class="category-pill ${cat==='All'?'active':''}" data-cat="${escapeHtml(cat)}"
              onclick="filterByCategory(this.dataset.cat)">
        <i class="fas ${cat==='All'?'fa-th-large':'fa-tag'}"></i>
        ${escapeHtml(cat)} <span class="count">${count}</span>
      </button>`;
  }).join('');
  styleCategoryPills();
}

function styleCategoryPills() {
  document.querySelectorAll('.category-pill').forEach(pill => {
    const cat = pill.dataset.cat;
    const hue = getCategoryColor(cat);
    const bg  = cat==='All' ? 'linear-gradient(135deg,#667eea,#764ba2)' : `linear-gradient(135deg,hsl(${hue},65%,50%),hsl(${(hue+35)%360},65%,50%))`;
    pill.addEventListener('mouseover', () => { if (!pill.classList.contains('active')) { pill.style.background=bg; pill.style.color='white'; } });
    pill.addEventListener('mouseout',  () => { if (!pill.classList.contains('active')) { pill.style.background=''; pill.style.color=''; } });
  });
}

function filterByCategory(cat) {
  document.querySelectorAll('.category-pill').forEach(p => { p.classList.remove('active'); p.style.background=''; p.style.color=''; });
  const activePill = document.querySelector(`.category-pill[data-cat="${CSS.escape(cat)}"]`);
  if (activePill) {
    activePill.classList.add('active');
    const hue = getCategoryColor(cat);
    activePill.style.background = cat==='All' ? 'linear-gradient(135deg,#667eea,#764ba2)' : `linear-gradient(135deg,hsl(${hue},65%,50%),hsl(${(hue+35)%360},65%,50%))`;
    activePill.style.color = 'white';
  }
  const el = document.getElementById('latestPostsGrid');
  if (!el) { window.location.href = `blog.html?category=${encodeURIComponent(cat)}`; return; }
  const filtered = cat==='All' ? State.posts.slice(1,7) : State.posts.filter(p=>p.category===cat).slice(0,6);
  if (!filtered.length) {
    el.innerHTML = `<div class="col-12"><div class="empty-state"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3>No posts in "${cat}"</h3><p>Check back soon.</p></div></div>`;
  } else {
    el.innerHTML = filtered.map((p,i)=>buildPostCard(p,i)).join('');
  }
  initScrollAnimations();
}

/* ═══════════════════════════════════════════════════════════
   BLOG PAGE
   ═══════════════════════════════════════════════════════════ */
async function initBlogPage() {
  const container      = document.getElementById('blogPostsGrid');
  const searchInput    = document.getElementById('blogSearch');
  const sortSelect     = document.getElementById('sortSelect');
  const categorySelect = document.getElementById('categorySelect');
  const catPillsWrap   = document.getElementById('blogCategoryPills');

  if (container) renderSkeletonCards(container, 9);

  const posts = await fetchPosts();
  State.posts = posts;
  await preloadLikes(posts);

  if (categorySelect) {
    const cats = ['All', ...new Set(posts.map(p=>p.category).sort())];
    categorySelect.innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  }

  const params   = new URLSearchParams(window.location.search);
  const urlSearch = params.get('search')   || '';
  const urlCat    = params.get('category') || 'All';
  const urlSort   = params.get('sort')      || '';

  if (urlSearch && searchInput) { searchInput.value = urlSearch; State.searchQuery = urlSearch; }
  if (urlCat !== 'All' && categorySelect) { categorySelect.value = urlCat; State.activeCategory = urlCat; }
  if ((urlSort === 'newest' || urlSort === 'oldest') && sortSelect) { sortSelect.value = urlSort; State.sortOrder = urlSort; }

  if (catPillsWrap) renderBlogCategoryPills(catPillsWrap, posts, urlCat);

  applyFiltersAndRender();

  let searchTimer;
  searchInput && searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { State.searchQuery = searchInput.value.trim(); State.currentPage=1; applyFiltersAndRender(); }, 300);
  });
  sortSelect && sortSelect.addEventListener('change', () => { State.sortOrder=sortSelect.value; State.currentPage=1; applyFiltersAndRender(); });
  categorySelect && categorySelect.addEventListener('change', () => { State.activeCategory=categorySelect.value; State.currentPage=1; syncCategoryPills(State.activeCategory); applyFiltersAndRender(); });
}

function renderBlogCategoryPills(container, posts, active='All') {
  const counts = {};
  posts.forEach(p => { counts[p.category]=(counts[p.category]||0)+1; });
  const cats = ['All', ...Object.keys(counts).sort()];
  container.innerHTML = cats.map(cat => {
    const count    = cat==='All' ? posts.length : (counts[cat]||0);
    const isActive = cat === active;
    const hue      = getCategoryColor(cat);
    const activeBg = cat==='All' ? 'background:linear-gradient(135deg,#667eea,#764ba2);' : `background:linear-gradient(135deg,hsl(${hue},65%,50%),hsl(${(hue+35)%360},65%,50%));`;
    return `<button class="category-pill ${isActive?'active':''}" data-cat="${escapeHtml(cat)}" style="${isActive?activeBg+'color:white;':''}" onclick="setBlogCategory(this.dataset.cat)">${escapeHtml(cat)}<span class="count">${count}</span></button>`;
  }).join('');
}

function setBlogCategory(cat) {
  State.activeCategory=cat; State.currentPage=1;
  const sel = document.getElementById('categorySelect');
  if (sel) sel.value = cat;
  syncCategoryPills(cat);
  applyFiltersAndRender();
}

function syncCategoryPills(cat) {
  document.querySelectorAll('.category-pill').forEach(p => {
    const isCat = p.dataset.cat===cat;
    p.classList.toggle('active', isCat);
    p.style.background=''; p.style.color='';
    if (isCat) {
      const hue = getCategoryColor(p.dataset.cat);
      p.style.background = p.dataset.cat==='All' ? 'linear-gradient(135deg,#667eea,#764ba2)' : `linear-gradient(135deg,hsl(${hue},65%,50%),hsl(${(hue+35)%360},65%,50%))`;
      p.style.color = 'white';
    }
  });
}

function applyFiltersAndRender() {
  let filtered = [...State.posts];
  if (State.activeCategory && State.activeCategory!=='All') filtered = filtered.filter(p=>p.category===State.activeCategory);
  if (State.searchQuery) {
    const q = State.searchQuery.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q)||p.description.toLowerCase().includes(q)||p.author.toLowerCase().includes(q)||p.category.toLowerCase().includes(q));
  }
  filtered.sort((a,b) => State.sortOrder==='newest' ? new Date(b.date)-new Date(a.date) : new Date(a.date)-new Date(b.date));
  State.filteredPosts = filtered;
  const countEl = document.getElementById('postsCount');
  if (countEl) countEl.textContent = `${filtered.length} post${filtered.length!==1?'s':''} found`;
  renderBlogPage();
  renderPagination();
}

function renderBlogPage() {
  const container = document.getElementById('blogPostsGrid');
  if (!container) return;
  const start = (State.currentPage-1)*CONFIG.POSTS_PER_PAGE;
  const page  = State.filteredPosts.slice(start, start+CONFIG.POSTS_PER_PAGE);
  if (!page.length) {
    container.innerHTML = `<div class="col-12"><div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3>No posts found</h3><p>Try a different search or category.</p><button class="btn-gradient mt-3" onclick="clearAllFilters()"><i class="fas fa-refresh"></i> Clear Filters</button></div></div>`;
    return;
  }
  container.innerHTML = page.map((p,i)=>buildPostCard(p,start+i)).join('');
  setTimeout(()=>initScrollAnimations(), 50);
}

function clearAllFilters() {
  State.searchQuery=''; State.activeCategory='All'; State.sortOrder='newest'; State.currentPage=1;
  const s=document.getElementById('blogSearch'), c=document.getElementById('categorySelect'), o=document.getElementById('sortSelect');
  if(s)s.value=''; if(c)c.value='All'; if(o)o.value='newest';
  syncCategoryPills('All');
  applyFiltersAndRender();
}

function clearSearch() {
  const input = document.getElementById('blogSearch');
  if (input) input.value='';
  State.searchQuery=''; State.currentPage=1;
  applyFiltersAndRender();
}

function renderPagination() {
  const wrap  = document.getElementById('pagination');
  if (!wrap) return;
  const total = Math.ceil(State.filteredPosts.length/CONFIG.POSTS_PER_PAGE);
  if (total<=1) { wrap.innerHTML=''; return; }
  let html = `<button class="page-btn" onclick="goToPage(${State.currentPage-1})" ${State.currentPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i=1;i<=total;i++) {
    if (total>7 && i>3 && i<total-1 && Math.abs(i-State.currentPage)>1) {
      if (i===4||i===total-2) html+='<span style="padding:0 0.3rem;color:var(--text-muted);">…</span>';
      continue;
    }
    html+=`<button class="page-btn ${i===State.currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`;
  }
  html+=`<button class="page-btn" onclick="goToPage(${State.currentPage+1})" ${State.currentPage===total?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
  wrap.innerHTML=html;
}

function goToPage(page) {
  const total = Math.ceil(State.filteredPosts.length/CONFIG.POSTS_PER_PAGE);
  if (page<1||page>total) return;
  State.currentPage=page;
  renderBlogPage(); renderPagination();
  document.getElementById('blogPostsGrid')?.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ═══════════════════════════════════════════════════════════
   POST PAGE
   ═══════════════════════════════════════════════════════════ */
async function initPostPage() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  if (!postId) { window.location.href='blog.html'; return; }

  const posts = await fetchPosts();
  State.posts = posts;
  await preloadLikes(posts);

  const post = posts.find(p=>p.id===postId||slugify(p.title)===postId);
  if (!post) {
    const el = document.getElementById('postContent');
    if (el) el.innerHTML=`<div class="empty-state"><div class="empty-icon"><i class="fas fa-file-slash"></i></div><h3>Post not found</h3><a href="blog.html" class="btn-gradient mt-3"><i class="fas fa-arrow-left"></i> Back to Blog</a></div>`;
    return;
  }
  renderPostPage(post, posts);
}

function renderPostPage(post, allPosts) {
  const rt      = readTime(post.description);
  const dateStr = formatDate(post.date);
  const catStyle = getCategoryStyle(post.category);
  const liked    = isLiked(post.id);
  const likes    = getLikes(post.id);

  document.title = `${post.title} | TheBlog`;
  setMeta('description', post.description.slice(0,160));
  setMeta('og:title',    post.title);
  setMeta('og:description', post.description.slice(0,200));
  setMeta('og:image',   post.imageUrl);

  const hero = document.getElementById('postHero');
  if (hero) {
    hero.innerHTML = `
      <img src="${post.imageUrl}" alt="${escapeHtml(post.title)}" onerror="this.src='${CONFIG.DEFAULT_IMAGE}'">
      <div class="post-hero-overlay"></div>
      <div class="container post-hero-content">
        <span class="post-category-tag" style="${catStyle}">${escapeHtml(post.category)}</span>
        <h1 class="post-hero-title">${escapeHtml(post.title)}</h1>
        <div class="post-meta-bar">
          <span><i class="fas fa-user"></i> ${escapeHtml(post.author)}</span>
          <span class="divider"></span>
          <span><i class="far fa-calendar-alt"></i> ${dateStr}</span>
          <span class="divider"></span>
          <span><i class="far fa-clock"></i> ${rt} min read</span>
          <span class="divider"></span>
          <span><i class="far fa-heart"></i> <span id="heroLikeCount">${likes}</span> likes</span>
        </div>
      </div>`;
  }

  const contentEl = document.getElementById('postContent');
  if (contentEl) {
    const raw = post.description || '(No content)';
    let html;
    if (typeof marked !== 'undefined' && marked.parse) {
      try { html = marked.parse(raw); } catch { html = raw.split('\n').filter(p=>p.trim()).map(p=>`<p>${escapeHtml(p)}</p>`).join(''); }
    } else {
      html = raw.split('\n').filter(p=>p.trim()).map(p=>`<p>${escapeHtml(p)}</p>`).join('');
    }
    contentEl.innerHTML = html;
  }

  const likeBtn   = document.getElementById('likeBtn');
  const likeCount = document.getElementById('likeCount');
  if (likeBtn && likeCount) {
    likeCount.textContent = likes;
    if (liked) likeBtn.classList.add('liked');
    likeBtn.querySelector('i').className = liked ? 'fas fa-heart' : 'far fa-heart';
    likeBtn.addEventListener('click', async () => {
      likeBtn.disabled = true;
      const result = await toggleLike(post.id);
      likeBtn.disabled = false;
      likeBtn.classList.toggle('liked', result.liked);
      likeBtn.querySelector('i').className = result.liked ? 'fas fa-heart' : 'far fa-heart';
      likeCount.textContent = result.count;
      const heroCount = document.getElementById('heroLikeCount');
      if (heroCount) heroCount.textContent = result.count;
      const sideCount = document.getElementById('sidebarLikeCount');
      if (sideCount) sideCount.textContent = result.count;
      if (result.liked) {
        const rect = likeBtn.getBoundingClientRect();
        launchConfetti(rect.left+rect.width/2, rect.top+window.scrollY);
        showToast('❤️ You loved this post!', 'success');
      } else {
        showToast('Removed from favorites', 'info', 2000);
      }
    });
  }

  initShareButtons(post);
  renderRelatedPosts(post, allPosts);
  renderComments(post.id);
  initCommentForm(post.id);
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"],meta[property="${name}"]`);
  if (!el) { el=document.createElement('meta'); el.setAttribute(name.startsWith('og:')?'property':'name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

function initShareButtons(post) {
  const url = window.location.href;
  document.querySelector('.share-btn.copy-link')?.addEventListener('click',()=>{ navigator.clipboard.writeText(url).then(()=>showToast('Link copied!','success')); });
  document.querySelector('.share-btn.whatsapp')?.addEventListener('click',()=>{ window.open(`https://wa.me/?text=${encodeURIComponent(post.title+'\n'+url)}`,'_blank'); });
  document.querySelector('.share-btn.facebook')?.addEventListener('click',()=>{ window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank'); });
  document.querySelector('.share-btn.twitter')?.addEventListener('click',()=>{ window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`,'_blank'); });
}

function renderRelatedPosts(post, allPosts) {
  const container = document.getElementById('relatedPostsGrid');
  if (!container) return;
  const related = allPosts.filter(p=>p.id!==post.id&&p.category===post.category).slice(0,3);
  if (!related.length) { document.getElementById('relatedPostsSection')?.style && (document.getElementById('relatedPostsSection').style.display='none'); return; }
  container.innerHTML = related.map((p,i)=>buildPostCard(p,i)).join('');
  setTimeout(()=>initScrollAnimations(), 50);
}

/* ── Comments ─────────────────────────────────────────────── */
async function renderComments(postId) {
  const container  = document.getElementById('commentsContainer');
  const countBadge = document.getElementById('commentsCount');
  if (!container) return;

  container.innerHTML = `<div class="text-center py-4" style="color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading comments…</div>`;

  const comments = await getComments(postId);
  if (countBadge) countBadge.textContent = comments.length;

  if (!comments.length) {
    container.innerHTML = `<div class="empty-state" style="padding:2rem 0;"><div class="empty-icon" style="font-size:2.5rem;"><i class="far fa-comment-alt"></i></div><h3>No comments yet</h3><p>Be the first to share your thoughts!</p></div>`;
    return;
  }
  container.innerHTML = comments.map(c=>buildCommentHTML(c,postId)).join('');
}

function buildCommentHTML(comment, postId) {
  const canManage = canManageComment(comment.id);
  const initials  = comment.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const hue       = Math.abs(comment.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % 360;
  const timestamp = comment.created_at || comment.timestamp || '';
  const timeStr   = relativeTime(timestamp);
  const fullTime  = timestamp ? new Date(timestamp).toLocaleString() : '';
  return `
    <div class="comment-item" id="comment-${comment.id}">
      <div class="comment-header">
        <div class="comment-author-info">
          <div class="comment-avatar" style="background:linear-gradient(135deg,hsl(${hue},60%,50%),hsl(${(hue+50)%360},60%,50%));">${initials}</div>
          <div>
            <div class="comment-author-name">${escapeHtml(comment.name)}</div>
            <div class="comment-timestamp" title="${fullTime}">${timeStr}${comment.edited?' <em style="opacity:.6;">(edited)</em>':''}</div>
          </div>
        </div>
        ${canManage ? `
          <div class="comment-actions">
            <button class="comment-action-btn" onclick="startEditComment('${comment.id}','${postId}')"><i class="fas fa-pen"></i> Edit</button>
            <button class="comment-action-btn delete" onclick="confirmDeleteComment('${comment.id}','${postId}')"><i class="fas fa-trash"></i> Delete</button>
          </div>` : ''}
      </div>
      <div class="comment-text" id="comment-text-${comment.id}">${escapeHtml(comment.message)}</div>
    </div>`;
}

function initCommentForm(postId) {
  const form      = document.getElementById('commentForm');
  const nameEl    = document.getElementById('commentName');
  const msgEl     = document.getElementById('commentMessage');
  const submitBtn = document.getElementById('submitComment');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name    = nameEl?.value.trim();
    const message = msgEl?.value.trim();
    if (!name||!message) { showToast('Please fill in your name and message.','error'); return; }

    submitBtn && (submitBtn.disabled=true);
    submitBtn && (submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Posting…');

    const result = await addComment(postId, name, message);
    submitBtn && (submitBtn.disabled=false);
    submitBtn && (submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> Post Comment');

    if (result) {
      nameEl.value=''; msgEl.value='';
      await renderComments(postId);
      showToast('Comment posted!', 'success');
    } else {
      showToast('Failed to post comment. Try again.', 'error');
    }
  });
}

function startEditComment(commentId, postId) {
  const textEl = document.getElementById(`comment-text-${commentId}`);
  if (!textEl) return;
  const current = textEl.textContent;
  textEl.innerHTML = `
    <div class="comment-edit-form">
      <textarea id="edit-textarea-${commentId}">${escapeHtml(current)}</textarea>
      <div class="comment-edit-actions">
        <button class="btn-gradient" style="padding:.45rem 1.2rem;font-size:.82rem;" onclick="saveEditComment('${commentId}','${postId}')"><i class="fas fa-check"></i> Save</button>
        <button class="btn-outline" style="padding:.45rem 1.2rem;font-size:.82rem;" onclick="cancelEditComment('${commentId}','${postId}')">Cancel</button>
      </div>
    </div>`;
  document.getElementById(`edit-textarea-${commentId}`)?.focus();
}

async function saveEditComment(commentId, postId) {
  const ta = document.getElementById(`edit-textarea-${commentId}`);
  if (!ta||!ta.value.trim()) { showToast('Comment cannot be empty.','error'); return; }
  const ok = await editComment(postId, commentId, ta.value);
  if (ok) { await renderComments(postId); showToast('Comment updated!','success'); }
  else showToast('Could not update comment.','error');
}

async function cancelEditComment(commentId, postId) {
  await renderComments(postId);
}

async function confirmDeleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  const ok = await deleteComment(postId, commentId);
  if (ok) { await renderComments(postId); showToast('Comment deleted.','info'); }
  else showToast('Could not delete comment.','error');
}

/* ── Global exposure for inline handlers ──────────────────── */
window.handleCardLike       = handleCardLike;
window.filterByCategory     = filterByCategory;
window.setBlogCategory      = setBlogCategory;
window.goToPage             = goToPage;
window.clearAllFilters      = clearAllFilters;
window.clearSearch          = clearSearch;
window.startEditComment     = startEditComment;
window.saveEditComment      = saveEditComment;
window.cancelEditComment    = cancelEditComment;
window.confirmDeleteComment = confirmDeleteComment;
