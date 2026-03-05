# TheBlog — Setup Guide

## Supabase Setup

### 1. Posts Table — RLS Policies (REQUIRED for Admin)

**The admin panel must be able to create, edit, and delete posts.** If you get "Failed to save" or "Failed to delete", add these policies in Supabase SQL Editor:

```sql
-- Allow anon to INSERT (create posts)
CREATE POLICY "Allow anon insert posts" ON posts
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to UPDATE (edit posts)
CREATE POLICY "Allow anon update posts" ON posts
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Allow anon to DELETE (delete posts)
CREATE POLICY "Allow anon delete posts" ON posts
  FOR DELETE TO anon USING (true);
```

If you get "policy already exists" errors, run `DROP POLICY IF EXISTS "policy_name" ON posts;` first, then create the policy.

**Posts table must have:** id, title, description, image_url, category, author, date, status  
If `id` is UUID with default, new posts will auto-generate. If `id` is TEXT, ensure it has a default or the insert provides it.

### 3. Newsletter Subscribers (optional)

**If table exists but signup fails:** Add the RLS policy. Run in Supabase SQL Editor:

```sql
-- REQUIRED: Allow public to subscribe (anon INSERT)
CREATE POLICY "Allow anon insert newsletter" ON newsletter_subscribers
  FOR INSERT TO anon WITH CHECK (true);

-- For admin to view subscribers
CREATE POLICY "Allow anon select newsletter" ON newsletter_subscribers
  FOR SELECT TO anon USING (true);
```

If you get "policy already exists", skip that line. To create the table from scratch:

```sql
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert newsletter" ON newsletter_subscribers
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon select newsletter" ON newsletter_subscribers
  FOR SELECT TO anon USING (true);
```

### 4. Storage Bucket for Images (for admin image upload)

**IMPORTANT:** If images upload but don't show on the blog, the bucket is likely **private**. It must be **Public**.

**Step-by-step:**

1. Go to **Supabase Dashboard** → **Storage** (left sidebar)
2. Click **New bucket** (or edit existing `post-images`)
3. Name: `post-images`
4. **Check "Public bucket"** — required for images to display on the blog
5. Click **Create bucket**
6. If bucket already exists: Click the bucket → **Settings** (gear icon) → enable **Public bucket**
6. Click the `post-images` bucket → **Policies** tab
7. Click **New policy** → **For full customization**
8. Add **INSERT** policy:
   - Policy name: `Allow anon upload`
   - Allowed operation: **INSERT**
   - Target roles: **anon**
   - WITH CHECK expression: `true`
9. Add **SELECT** policy (if not already public):
   - Policy name: `Allow public read`
   - Allowed operation: **SELECT**
   - Target roles: **anon**
   - USING expression: `true`

**Alternative:** Skip upload and paste an image URL (e.g. from Unsplash) in the "Featured Image" field.

### 5. Admin Access
- **URL:** `/admin` or `admin.html`
- **Password:** Set in `config.js` → `CONFIG.ADMIN_PASSWORD` (default: `admin123`)
- **Change the password** after first login!

### 6. Sitemap & RSS
- Replace `yoursite.netlify.app` in `sitemap.xml` and `rss.xml` with your actual domain
- Or use your Netlify URL (e.g. `your-site-name.netlify.app`)

## Features

- **Admin Panel:** Create, edit, delete posts. Moderate comments. View newsletter subscribers.
- **Image Upload:** Upload images when creating/editing posts (requires Supabase Storage bucket).
- **Markdown:** Post content supports Markdown (bold, italic, links, headings, etc.).
- **Rate Limiting:** 10 likes/hour, 5 comments/hour per user.
- **Newsletter:** Email signup stored in Supabase.
- **SEO:** Sitemap, RSS, meta tags.
