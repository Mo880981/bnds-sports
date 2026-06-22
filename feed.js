/**
 * BNDS 运动圈 — 动态页
 */

const GRADIENTS = [
  'linear-gradient(135deg, #e05252, #e8954a)',
  'linear-gradient(135deg, #e8954a, #d4b84a)',
  'linear-gradient(135deg, #5aab6e, #4a8fd4)',
  'linear-gradient(135deg, #4a8fd4, #8b6fd4)',
  'linear-gradient(135deg, #8b6fd4, #c45a9a)',
  'linear-gradient(135deg, #c45a9a, #e05252)',
];

const DEMO_FEEDS = [
  {
    id: 'demo-1',
    demo: true,
    authorName: 'L同学',
    authorGrade: '高二',
    text: '今天手感 finally 回来了。被虐也开心。',
    sportName: '篮球',
    minutes: 45,
    calories: 312,
    likes: 0,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'demo-2',
    demo: true,
    authorName: 'W同学',
    authorGrade: '高一',
    text: '晨跑第七天。操场的光很好看。',
    sportName: '跑步',
    minutes: 20,
    calories: 156,
    likes: 0,
    createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
  },
];

const els = {
  profileOverlay: document.getElementById('profile-overlay'),
  profileName: document.getElementById('profile-name'),
  profileGrade: document.getElementById('profile-grade'),
  profileError: document.getElementById('profile-error'),
  profileConfirm: document.getElementById('profile-confirm'),
  composeAvatar: document.getElementById('compose-avatar'),
  composeName: document.getElementById('compose-name'),
  composeGrade: document.getElementById('compose-grade'),
  composeText: document.getElementById('compose-text'),
  checkinSelect: document.getElementById('checkin-select'),
  sportPreview: document.getElementById('sport-preview'),
  sportPreviewText: document.getElementById('sport-preview-text'),
  sportPreviewKcal: document.getElementById('sport-preview-kcal'),
  charCount: document.getElementById('char-count'),
  submitBtn: document.getElementById('submit-post'),
  feedStream: document.getElementById('feed-stream'),
  feedEmpty: document.getElementById('feed-empty'),
  toast: document.getElementById('toast'),
};

let profile = null;
let selectedCheckin = null;
let feeds = [];
let likedIds = {};
let toastTimer;

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i) * (i + 1)) % GRADIENTS.length;
  return h;
}

function getInitial(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function displayName(name, grade) {
  return grade ? `${grade} · ${name}` : name;
}

function updateComposeUser() {
  if (!profile) return;
  const initial = getInitial(profile.name);
  els.composeAvatar.textContent = initial;
  els.composeAvatar.style.background = GRADIENTS[hashStr(profile.name)];
  els.composeName.textContent = profile.name;
  els.composeGrade.textContent = profile.grade || '';
}

async function populateCheckinSelect() {
  const logs = (await BNDS_DB.getCheckins())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  els.checkinSelect.innerHTML = '<option value="">不关联打卡</option>';
  logs.forEach((log) => {
    const opt = document.createElement('option');
    opt.value = String(log.id);
    opt.textContent = `${log.sportName} · ${log.minutes}min · ${log.calories}kcal · ${log.date}`;
    els.checkinSelect.appendChild(opt);
  });
}

async function onCheckinSelectChange() {
  const id = els.checkinSelect.value;
  if (!id) {
    selectedCheckin = null;
    els.sportPreview.classList.remove('show');
    return;
  }
  const logs = await BNDS_DB.getCheckins();
  selectedCheckin = logs.find((l) => String(l.id) === id) || null;
  if (selectedCheckin) {
    els.sportPreviewText.textContent = `${selectedCheckin.sportName} · ${selectedCheckin.minutes} min`;
    els.sportPreviewKcal.textContent = `${selectedCheckin.calories} kcal`;
    els.sportPreview.classList.add('show');
  }
}

function validateCompose() {
  const len = els.composeText.value.trim().length;
  els.charCount.textContent = `${len} / 500`;
  els.charCount.classList.toggle('warn', len > 500);
  els.submitBtn.disabled = len === 0 || len > 500;
}

function openProfileSetup() {
  els.profileOverlay.classList.remove('hidden');
  if (profile) {
    els.profileName.value = profile.name;
    els.profileGrade.value = profile.grade || '';
  }
  els.profileError.textContent = '';
  els.profileName.focus();
}

function closeProfileSetup() {
  els.profileOverlay.classList.add('hidden');
}

async function confirmProfile() {
  const name = els.profileName.value.trim();
  const grade = els.profileGrade.value;
  if (!name || name.length > 12) {
    els.profileError.textContent = '请输入 1–12 个字的昵称';
    return;
  }

  profile = { name, grade };

  try {
    await BNDS_DB.saveProfile(profile);
    closeProfileSetup();
    updateComposeUser();
    showToast(BNDS_DB.isOnline() ? '资料已同步' : '资料已保存');
  } catch (err) {
    els.profileError.textContent = '保存失败，请检查 Supabase';
    console.error(err);
  }
}

async function submitPost() {
  const text = els.composeText.value.trim();
  if (!text || text.length > 500 || !profile) return;

  const post = {
    id: BNDS_DB.genId(),
    userId: BNDS_DB.getUserId(),
    authorName: profile.name,
    authorGrade: profile.grade || '',
    text,
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  if (selectedCheckin) {
    post.checkinId = selectedCheckin.id;
    post.sportName = selectedCheckin.sportName;
    post.minutes = selectedCheckin.minutes;
    post.calories = selectedCheckin.calories;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = '发布中…';

  try {
    await BNDS_DB.saveFeed(post);
    feeds = await BNDS_DB.getFeeds();
    likedIds = await BNDS_DB.getMyLikedIds();

    els.composeText.value = '';
    els.checkinSelect.value = '';
    selectedCheckin = null;
    els.sportPreview.classList.remove('show');
    validateCompose();
    renderFeed();
    showToast(BNDS_DB.isOnline() ? '动态已发布 · 同学可见' : '动态已发布');
  } catch (err) {
    console.error(err);
    showToast('发布失败，请检查 Supabase 表');
  } finally {
    els.submitBtn.textContent = '发布';
    validateCompose();
  }
}

async function toggleLike(postId) {
  try {
    await BNDS_DB.toggleLike(postId);
    feeds = await BNDS_DB.getFeeds();
    likedIds = await BNDS_DB.getMyLikedIds();
    renderFeed();
  } catch (err) {
    console.error(err);
    showToast('点赞失败');
  }
}

function renderFeedCard(post) {
  const initial = getInitial(post.authorName);
  const gradient = GRADIENTS[hashStr(post.authorName)];
  const liked = !!likedIds[String(post.id)];
  const likeCount = post.likes || 0;
  const isDemo = post.demo;
  const isMine = post.userId === BNDS_DB.getUserId();

  const sportTag = post.sportName
    ? `<div class="feed-sport-tag">${escapeHtml(post.sportName)} · ${post.minutes} min · ${post.calories} kcal</div>`
    : '';

  const badge = isDemo ? '<span class="feed-badge">示例</span>' : isMine ? '<span class="feed-badge">我</span>' : '';

  const likeBtn = isDemo
    ? `<span class="like-btn" style="cursor:default; opacity:0.5"><span class="like-icon">♡</span> ${likeCount}</span>`
    : `<button type="button" class="like-btn${liked ? ' liked' : ''}" data-like="${escapeHtml(String(post.id))}">
        <span class="like-icon">${liked ? '♥' : '♡'}</span> ${likeCount}
       </button>`;

  return `
    <article class="feed-card" data-id="${escapeHtml(String(post.id))}">
      <div class="feed-card-header">
        <div class="feed-avatar" style="background:${gradient}">${initial}</div>
        <div class="feed-author-block">
          <div class="feed-author">${escapeHtml(displayName(post.authorName, post.authorGrade))}</div>
          <div class="feed-time">${formatTime(post.createdAt)}</div>
        </div>
        ${badge}
      </div>
      ${sportTag}
      <p class="feed-content">${escapeHtml(post.text)}</p>
      <div class="feed-actions">${likeBtn}</div>
    </article>`;
}

function renderFeed() {
  const realFeeds = feeds.filter((f) => !f.demo);
  const showDemo = realFeeds.length === 0 && !BNDS_DB.isOnline();
  const allFeeds = showDemo ? [...DEMO_FEEDS] : [...feeds.filter((f) => !f.demo)];

  const sorted = [...allFeeds].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sorted.length === 0) {
    els.feedEmpty.style.display = 'block';
    els.feedStream.style.display = 'none';
    return;
  }

  els.feedEmpty.style.display = 'none';
  els.feedStream.style.display = 'flex';
  els.feedStream.innerHTML = sorted.map(renderFeedCard).join('');

  els.feedStream.querySelectorAll('[data-like]').forEach((btn) => {
    btn.addEventListener('click', () => toggleLike(btn.dataset.like));
  });
}

async function init() {
  await BNDS_DB.init();

  profile = BNDS_DB.getProfileLocal();
  if (!profile?.name) {
    openProfileSetup();
  } else {
    updateComposeUser();
  }

  feeds = await BNDS_DB.getFeeds();
  likedIds = await BNDS_DB.getMyLikedIds();
  await populateCheckinSelect();
  validateCompose();
  renderFeed();

  els.profileConfirm.addEventListener('click', confirmProfile);
  els.profileName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmProfile();
  });
  els.composeText.addEventListener('input', validateCompose);
  els.checkinSelect.addEventListener('change', onCheckinSelectChange);
  els.submitBtn.addEventListener('click', submitPost);

  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  });
}

init();
