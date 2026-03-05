/* ============================================================
   ADMIN PANEL — TheBlog
   ============================================================ */
'use strict';

const ADMIN_SESSION_KEY = 'blog_admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let sb = null;
function getSupabase() {
  if (sb) return sb;
  if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
    sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
  }
  return sb;
}

function isAdminLoggedIn() {
  const sess = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!sess) return false;
  try {
    const { t } = JSON.parse(sess);
    return Date.now() - t < SESSION_DURATION;
  } catch { return false; }
}

function setAdminSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ t: Date.now() }));
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (isAdminLoggedIn()) {
    showDashboard();
  } else {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('adminDashboard').style.display = 'none';
  }

  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const pw = document.getElementById('adminPassword').value;
    if (pw === CONFIG.ADMIN_PASSWORD) {
      setAdminSession();
      document.getElementById('loginError').style.display = 'none';
      showDashboard();
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    clearAdminSession();
    location.reload();
  });

  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      document.getElementById('tabPosts').style.display = name === 'posts' ? 'block' : 'none';
      document.getElementById('tabComments').style.display = name === 'comments' ? 'block' : 'none';
      document.getElementById('tabNewsletter').style.display = name === 'newsletter' ? 'block' : 'none';
      if (name === 'comments') loadComments();
      if (name === 'newsletter') loadNewsletter();
    });
  });

  document.getElementById('newPostBtn')?.addEventListener('click', () => openEditor());
  document.getElementById('cancelEdit')?.addEventListener('click', () => closeEditor());
  document.getElementById('postForm')?.addEventListener('submit', savePost);
  document.getElementById('postImageFile')?.addEventListener('change', handleImageSelect);
});

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  loadPosts();
}

/* ── Posts ────────────────────────────────────────────────── */
async function loadPosts() {
  const el = document.getElementById('postsList');
  const s = getSupabase();
  if (!s) {
    el.innerHTML = '<p class="text-muted">Supabase not configured.</p>';
    return;
  }
  try {
    const { data, error } = await s.from('posts').select('*').order('date', { ascending: false });
    if (error) throw error;
    const posts = data || [];
    if (!posts.length) {
      el.innerHTML = '<p class="text-muted">No posts yet. Click "New Post" to create one.</p>';
      return;
    }
    el.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${posts.map(p => `
            <tr>
              <td><strong>${escapeHtml(p.title)}</strong></td>
              <td>${escapeHtml(p.category || '')}</td>
              <td>${escapeHtml(p.author || '')}</td>
              <td>${p.date || ''}</td>
              <td><span class="badge bg-${(p.status || '').toLowerCase() === 'published' ? 'success' : 'secondary'}">${escapeHtml(p.status || 'Draft')}</span></td>
              <td>
                <button class="btn btn-sm btn-admin-outline me-1" onclick="editPost('${escapeHtml(String(p.id))}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-admin-danger" onclick="deletePost('${escapeHtml(String(p.id))}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="text-danger">Failed to load posts.</p>';
  }
}

function openEditor(post = null) {
  document.getElementById('postEditor').style.display = 'block';
  document.getElementById('editorTitle').textContent = post ? 'Edit Post' : 'New Post';
  document.getElementById('editPostId').value = post ? post.id : '';
  document.getElementById('postTitle').value = post?.title || '';
  document.getElementById('postCategory').value = post?.category || '';
  document.getElementById('postAuthor').value = post?.author || '';
  document.getElementById('postImageUrl').value = post?.image_url || '';
  document.getElementById('postContent').value = post?.description || '';
  document.getElementById('postStatus').value = post?.status || 'Published';
  document.getElementById('imagePreview').style.display = post?.image_url ? 'block' : 'none';
  if (post?.image_url) document.querySelector('#imagePreview img').src = post.image_url;
}

function closeEditor() {
  document.getElementById('postEditor').style.display = 'none';
  document.getElementById('postForm').reset();
}

async function editPost(id) {
  const s = getSupabase();
  if (!s) return;
  const { data } = await s.from('posts').select('*').eq('id', id).single();
  if (data) openEditor(data);
}

async function savePost(e) {
  e.preventDefault();
  const id = document.getElementById('editPostId').value.trim();
  const title = document.getElementById('postTitle').value.trim();
  const category = document.getElementById('postCategory').value.trim();
  const author = document.getElementById('postAuthor').value.trim();
  const imageUrl = document.getElementById('postImageUrl').value.trim() || CONFIG.DEFAULT_IMAGE;
  const description = document.getElementById('postContent').value.trim();
  const status = document.getElementById('postStatus').value;

  const s = getSupabase();
  if (!s) { alert('Supabase not configured'); return; }

  const row = { title, description, image_url: imageUrl, category, author, status, date: new Date().toISOString().slice(0, 10) };

  try {
    if (id) {
      const { error } = await s.from('posts').update(row).eq('id', id).select().single();
      if (error) throw error;
      alert('Post updated!');
    } else {
      row.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; const v = c==='x'?r:(r&0x3|0x8); return v.toString(16); });
      const { error } = await s.from('posts').insert(row);
      if (error) throw error;
      localStorage.removeItem('blog_posts_cache');
      localStorage.removeItem('blog_posts_cache_time');
      alert('Post created!');
    }
    localStorage.removeItem('blog_posts_cache');
    localStorage.removeItem('blog_posts_cache_time');
    closeEditor();
    loadPosts();
  } catch (err) {
    console.error(err);
    const msg = err?.message || err?.error_description || (err?.error ? JSON.stringify(err.error) : 'Unknown error');
    alert('Failed to save: ' + msg + '\n\nIf using Supabase: Add RLS policies to allow INSERT/UPDATE on posts. See SETUP.md');
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  const s = getSupabase();
  if (!s) return;
  try {
    const { error } = await s.from('posts').delete().eq('id', id);
    if (error) throw error;
    localStorage.removeItem('blog_posts_cache');
    localStorage.removeItem('blog_posts_cache_time');
    loadPosts();
  } catch (err) {
    console.error(err);
    const msg = err?.message || err?.error_description || (err?.error ? JSON.stringify(err.error) : 'Unknown error');
    alert('Failed to delete: ' + msg + '\n\nIf using Supabase: Add RLS policy to allow DELETE on posts. See SETUP.md');
  }
}

/* ── Image Upload ─────────────────────────────────────────── */
async function handleImageSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const s = getSupabase();
  if (!s) { alert('Supabase not configured'); return; }
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    const bucket = CONFIG.STORAGE_BUCKET || 'post-images';
    const { error } = await s.storage.from(bucket).upload(path, file, { upsert: true, cacheControl: '3600' });
    if (error) throw error;
    const baseUrl = CONFIG.SUPABASE_URL.replace(/\/$/, '');
    const publicUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
    document.getElementById('postImageUrl').value = publicUrl;
    document.getElementById('imagePreview').style.display = 'block';
    document.querySelector('#imagePreview img').src = publicUrl;
  } catch (err) {
    console.error(err);
    const msg = err?.message || '';
    const hint = msg.includes('Bucket not found') || msg.includes('not found')
      ? 'Create bucket "post-images" in Supabase Dashboard → Storage → New bucket. Set it to Public.'
      : 'Create a public bucket "post-images" in Supabase Storage, or paste an image URL instead.';
    alert('Upload failed: ' + (msg || 'Unknown error') + '\n\n' + hint);
  }
  e.target.value = '';
}

/* ── Comments ─────────────────────────────────────────────── */
async function loadComments() {
  const el = document.getElementById('commentsList');
  const s = getSupabase();
  if (!s) {
    el.innerHTML = '<p class="text-muted">Supabase not configured.</p>';
    return;
  }
  try {
    const { data, error } = await s.from('comments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const comments = data || [];
    if (!comments.length) {
      el.innerHTML = '<p class="text-muted">No comments yet.</p>';
      return;
    }
    el.innerHTML = comments.map(c => `
      <div class="d-flex justify-content-between align-items-start py-3 border-bottom border-color" style="border-color:var(--border-color)!important;">
        <div>
          <strong>${escapeHtml(c.name)}</strong> on post ${escapeHtml(c.post_id)}<br>
          <span class="text-muted small">${c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span><br>
          <p class="mb-0 mt-1">${escapeHtml(c.message)}</p>
        </div>
        <button class="btn btn-sm btn-admin-danger" onclick="adminDeleteComment('${c.id}')"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = '<p class="text-danger">Failed to load comments.</p>';
  }
}

async function adminDeleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  const s = getSupabase();
  if (!s) return;
  try {
    await s.from('comments').delete().eq('id', id);
    loadComments();
  } catch (err) {
    alert('Failed to delete.');
  }
}

/* ── Newsletter ───────────────────────────────────────────── */
async function loadNewsletter() {
  const el = document.getElementById('newsletterList');
  const s = getSupabase();
  if (!s) {
    el.innerHTML = '<p class="text-muted">Supabase not configured.</p>';
    return;
  }
  try {
    const { data, error } = await s.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
    if (error) {
      el.innerHTML = '<p class="text-muted">Create table "newsletter_subscribers" (id, email, created_at) in Supabase, or no subscribers yet.</p>';
      return;
    }
    const subs = data || [];
    if (!subs.length) {
      el.innerHTML = '<p class="text-muted">No subscribers yet.</p>';
      return;
    }
    el.innerHTML = '<table class="admin-table"><thead><tr><th>Email</th><th>Joined</th></tr></thead><tbody>' +
      subs.map(s => `<tr><td>${escapeHtml(s.email)}</td><td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</td></tr>`).join('') +
      '</tbody></table>';
  } catch (err) {
    el.innerHTML = '<p class="text-muted">Table may not exist. Create "newsletter_subscribers" (id, email, created_at) in Supabase.</p>';
  }
}

window.editPost = editPost;
window.deletePost = deletePost;
window.adminDeleteComment = adminDeleteComment;
