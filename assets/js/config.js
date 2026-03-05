/**
 * BLOG CONFIGURATION — Supabase Backend
 * =======================================
 * Supabase Project URL and Anon Key are set below.
 * Posts, Likes, and Comments are all stored in Supabase.
 *
 * Tables required in Supabase:
 *   posts    — id, title, description, image_url, category, author, date, status
 *   likes    — post_id (PRIMARY KEY), count
 *   comments — id, post_id, name, message, created_at, edited
 *   newsletter_subscribers — id, email, created_at (optional)
 *
 * Storage: Create bucket "post-images" (public) for image uploads
 */

const CONFIG = {
  /* ── Supabase ───────────────────────────────────────────── */
  SUPABASE_URL: 'https://fyhnjefjtzrkdltgmvdn.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aG5qZWZqdHpya2RsdGdtdmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjk1MjAsImV4cCI6MjA4Nzk0NTUyMH0.FlY9aqcytrR7jC7OhpcVxcIsf2tkgWjn3VOQFWnjQwU',

  /* ── Admin (change password after first login) ───────────── */
  ADMIN_PASSWORD: 'admin123',

  /* ── Rate Limiting ───────────────────────────────────────── */
  RATE_LIMIT_LIKES:    10,   // max likes per hour per user
  RATE_LIMIT_COMMENTS: 5,   // max comments per hour per user

  /* ── Cache & Refresh ────────────────────────────────────── */
  CACHE_DURATION: 60 * 1000,
  AUTO_REFRESH:   5 * 60 * 1000,
  POSTS_PER_PAGE: 9,

  /* ── Site Meta ──────────────────────────────────────────── */
  SITE_NAME:        'TheBlog',
  SITE_DESCRIPTION: 'Stories, ideas, and inspiration from around the world.',
  get SITE_URL()    { return window.location.origin; },

  /* ── Fallback image ─────────────────────────────────────── */
  DEFAULT_IMAGE: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&auto=format&fit=crop',

  /* ── Storage bucket for uploads ──────────────────────────── */
  STORAGE_BUCKET: 'post-images',

  /* ── Category colors (HSL hue) ──────────────────────────── */
  CATEGORY_COLORS: {
    'Tech':      { hue: 220 },
    'Life':      { hue: 150 },
    'News':      { hue: 30  },
    'Travel':    { hue: 190 },
    'Food':      { hue: 20  },
    'Health':    { hue: 120 },
    'Finance':   { hue: 60  },
    'Education': { hue: 270 },
    'Science':   { hue: 200 },
    'Culture':   { hue: 310 },
  },

  /* ── Demo posts (shown if Supabase is unreachable) ──────── */
  DEMO_POSTS: [
    {
      id: '1', title: 'Getting Started with Modern Web Development',
      description: `Web development has evolved dramatically over the past decade. From simple static HTML pages to complex single-page applications, the journey has been incredible. In this post, we explore the modern tools and techniques that every developer should know.\n\nWe'll cover topics like CSS Grid, Flexbox, JavaScript ES6+, and the importance of responsive design. Whether you're a beginner or an experienced developer, there's always something new to learn in this ever-changing field.\n\nThe key is to stay curious, keep experimenting, and never stop learning. The web is a canvas—paint it beautifully.`,
      imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop',
      category: 'Tech', author: 'Alex Johnson', date: '2026-02-28', status: 'Published'
    },
    {
      id: '2', title: 'The Art of Mindful Living in a Busy World',
      description: `In today's fast-paced world, finding moments of peace can seem impossible. But mindfulness isn't about sitting in silence for hours—it's about bringing awareness to everyday moments.\n\nFrom mindful eating to mindful commuting, there are countless ways to integrate this practice into your daily routine. The benefits are profound: reduced stress, improved focus, and a deeper sense of connection to the present moment.\n\nStart small. Take three deep breaths before checking your phone in the morning. These tiny moments of awareness can transform your entire day.`,
      imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop',
      category: 'Life', author: 'Sarah Chen', date: '2026-02-25', status: 'Published'
    },
    {
      id: '3', title: 'Exploring the Hidden Gems of Southeast Asia',
      description: `Southeast Asia is a treasure trove of experiences waiting to be discovered. Beyond the popular tourist trails lie hidden villages, pristine beaches, and ancient temples that few travelers ever see.\n\nFrom the terraced rice fields of northern Vietnam to the untouched islands of the Philippines, the region offers a diversity of landscapes and cultures that is truly breathtaking.\n\nTravel opens the mind and softens the heart. Go off the beaten path. The best adventures are unplanned.`,
      imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&auto=format&fit=crop',
      category: 'Travel', author: 'Marco Rivera', date: '2026-02-20', status: 'Published'
    },
    {
      id: '4', title: 'The Science Behind a Perfect Night\'s Sleep',
      description: `Sleep is not just rest—it's the foundation of health, cognitive performance, and emotional well-being. Yet millions of people struggle with poor sleep quality every night.\n\nRecent research has revealed fascinating insights about sleep architecture, circadian rhythms, and the critical role of REM cycles.\n\nFrom optimizing your sleep environment to strategic caffeine timing, science-backed strategies can transform your nights and, by extension, your days.`,
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&auto=format&fit=crop',
      category: 'Health', author: 'Dr. Emily Watts', date: '2026-02-18', status: 'Published'
    },
    {
      id: '5', title: 'Mastering Personal Finance in Your 20s',
      description: `Your 20s are the most powerful decade for building financial foundations that will compound for the rest of your life. Yet most young people receive almost no practical financial education.\n\nThis post breaks down the essentials: emergency funds, compound interest, index investing, debt management, and the psychological side of money.\n\nMoney is a tool. Learn to use it intentionally, and it will work for you rather than against you.`,
      imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop',
      category: 'Finance', author: 'James Park', date: '2026-02-15', status: 'Published'
    },
    {
      id: '6', title: 'Artificial Intelligence: The Next Chapter',
      description: `We are living through one of the most significant technological shifts in human history. Artificial intelligence is no longer a futuristic concept—it's woven into the fabric of our daily lives.\n\nThe questions we need to ask are not just "what can AI do?" but "what should AI do?" The next chapter of AI will be written by those who grapple with both the technical and the ethical dimensions.`,
      imageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop',
      category: 'Tech', author: 'Priya Nair', date: '2026-02-10', status: 'Published'
    }
  ]
};
