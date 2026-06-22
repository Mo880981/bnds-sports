/**
 * BNDS 运动圈 — 约练页
 */

const GRADIENTS = [
  'linear-gradient(135deg, #e05252, #e8954a)',
  'linear-gradient(135deg, #e8954a, #d4b84a)',
  'linear-gradient(135deg, #5aab6e, #4a8fd4)',
  'linear-gradient(135deg, #4a8fd4, #8b6fd4)',
  'linear-gradient(135deg, #8b6fd4, #c45a9a)',
  'linear-gradient(135deg, #c45a9a, #e05252)',
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
  sportSelect: document.getElementById('sport-select'),
  timeText: document.getElementById('time-text'),
  placeText: document.getElementById('place-text'),
  slots: document.getElementById('slots'),
  messageText: document.getElementById('message-text'),
  charCount: document.getElementById('char-count'),
  submitBtn: document.getElementById('submit-buddy'),
  buddyStream: document.getElementById('buddy-stream'),
  buddyEmpty: document.getElementById('buddy-empty'),
  toast: document.getElementById('toast'),
};

let profile = null;
let posts = [];
let joins = [];
let myJoinIds = {};
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
  els.composeAvatar.textContent = getInitial(profile.name);
  els.composeAvatar.style.background = GRADIENTS[hashStr(profile.name)];
  els.composeName.textContent = profile.name;
  els.composeGrade.textContent = profile.grade || '';
}

function validateForm() {
  const sport = els.sportSelect.value;
  const time = els.timeText.value.trim();
  const msgLen = els.messageText.value.length;
  els.charCount.textContent = `${msgLen} / 200`;
  els.submitBtn.disabled = !sport || !time;
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

function getJoinersForPost(postId) {
  return joins.filter((j) => String(j.postId) === String(postId));
}

async function submitBuddy() {
  if (!profile) return;

  const sportName = els.sportSelect.value;
  const timeText = els.timeText.value.trim();
  const place = els.placeText.value.trim();
  const slots = parseInt(els.slots.value, 10);
  const message = els.messageText.value.trim();

  if (!sportName || !timeText) return;

  const post = {
    id: BNDS_DB.genId(),
    userId: BNDS_DB.getUserId(),
    authorName: profile.name,
    authorGrade: profile.grade || '',
    sportName,
    timeText,
    place,
    slots,
    message,
    status: 'open',
    joinCount: 0,
    createdAt: new Date().toISOString(),
  };

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = '发布中…';

  try {
    await BNDS_DB.saveBuddyPost(post);
    posts = await BNDS_DB.getBuddyPosts();
    joins = await BNDS_DB.getBuddyJoins();
    myJoinIds = await BNDS_DB.getMyBuddyJoinIds();

    els.sportSelect.value = '';
    els.timeText.value = '';
    els.placeText.value = '';
    els.slots.value = '2';
    els.messageText.value = '';
    validateForm();
    renderList();
    showToast(BNDS_DB.isOnline() ? '约练已发布 · 同学可见' : '约练已发布');
  } catch (err) {
    console.error(err);
    showToast('发布失败，请检查 Supabase 约练表');
  } finally {
    els.submitBtn.textContent = '发布约练';
    validateForm();
  }
}

async function toggleJoin(postId) {
  if (!profile) {
    openProfileSetup();
    return;
  }

  const id = String(postId);
  const joined = !!myJoinIds[id];

  try {
    if (joined) {
      await BNDS_DB.leaveBuddyPost(id);
      showToast('已取消加入');
    } else {
      await BNDS_DB.joinBuddyPost(id, profile);
      showToast(BNDS_DB.isOnline() ? '已加入 · 发起人能看到你' : '已加入');
    }
    posts = await BNDS_DB.getBuddyPosts();
    joins = await BNDS_DB.getBuddyJoins();
    myJoinIds = await BNDS_DB.getMyBuddyJoinIds();
    renderList();
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
}

async function closePost(postId) {
  if (!confirm('确定结束这条约练？')) return;

  try {
    await BNDS_DB.closeBuddyPost(postId);
    posts = await BNDS_DB.getBuddyPosts();
    renderList();
    showToast('约练已结束');
  } catch (err) {
    console.error(err);
    showToast('操作失败');
  }
}

function renderCard(post) {
  const initial = getInitial(post.authorName);
  const gradient = GRADIENTS[hashStr(post.authorName)];
  const isMine = post.userId === BNDS_DB.getUserId();
  const joined = !!myJoinIds[String(post.id)];
  const postJoiners = getJoinersForPost(post.id);
  const joinerNames = postJoiners.map((j) => displayName(j.joinerName, j.joinerGrade)).join('、');
  const full = post.joinCount >= post.slots;

  const placeTag = post.place
    ? `<span class="buddy-tag">${escapeHtml(post.place)}</span>`
    : '';

  const messageBlock = post.message
    ? `<p class="buddy-message">${escapeHtml(post.message)}</p>`
    : '';

  const joinersBlock = postJoiners.length
    ? `<p class="buddy-joiners">已加入：<strong>${escapeHtml(joinerNames)}</strong></p>`
    : '';

  const badge = isMine ? '<span class="buddy-badge">我发的</span>' : '';

  let joinBtn = '';
  if (!isMine) {
    if (joined) {
      joinBtn = `<button type="button" class="btn btn-outline buddy-join-btn joined" data-join="${escapeHtml(String(post.id))}">已加入 · 取消</button>`;
    } else if (full) {
      joinBtn = `<span class="buddy-slots">已满员</span>`;
    } else {
      joinBtn = `<button type="button" class="btn btn-primary buddy-join-btn" data-join="${escapeHtml(String(post.id))}">我想加入</button>`;
    }
  }

  const closeBtn = isMine
    ? `<button type="button" class="buddy-close-btn" data-close="${escapeHtml(String(post.id))}">结束约练</button>`
    : '';

  const slotsText = `<span class="buddy-slots">${post.joinCount || 0} / ${post.slots} 人</span>`;

  return `
    <article class="buddy-card" data-id="${escapeHtml(String(post.id))}">
      <div class="buddy-card-header">
        <div class="buddy-avatar" style="background:${gradient}">${initial}</div>
        <div class="buddy-author-block">
          <div class="buddy-author">${escapeHtml(displayName(post.authorName, post.authorGrade))}</div>
          <div class="buddy-time">${formatTime(post.createdAt)}</div>
        </div>
        ${badge}
      </div>
      <div class="buddy-meta">
        <span class="buddy-tag buddy-tag--accent">${escapeHtml(post.sportName)}</span>
        <span class="buddy-tag">${escapeHtml(post.timeText)}</span>
        ${placeTag}
      </div>
      ${messageBlock}
      ${joinersBlock}
      <div class="buddy-actions">
        ${joinBtn}
        ${closeBtn}
        ${isMine || joined ? '' : slotsText}
        ${isMine ? slotsText : ''}
      </div>
    </article>`;
}

function renderList() {
  const sorted = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (sorted.length === 0) {
    els.buddyEmpty.style.display = 'block';
    els.buddyStream.style.display = 'none';
    return;
  }

  els.buddyEmpty.style.display = 'none';
  els.buddyStream.style.display = 'flex';
  els.buddyStream.innerHTML = sorted.map(renderCard).join('');

  els.buddyStream.querySelectorAll('[data-join]').forEach((btn) => {
    btn.addEventListener('click', () => toggleJoin(btn.dataset.join));
  });

  els.buddyStream.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closePost(btn.dataset.close));
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

  posts = await BNDS_DB.getBuddyPosts();
  joins = await BNDS_DB.getBuddyJoins();
  myJoinIds = await BNDS_DB.getMyBuddyJoinIds();
  validateForm();
  renderList();

  els.profileConfirm.addEventListener('click', confirmProfile);
  els.profileName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmProfile();
  });
  els.sportSelect.addEventListener('change', validateForm);
  els.timeText.addEventListener('input', validateForm);
  els.messageText.addEventListener('input', validateForm);
  els.submitBtn.addEventListener('click', submitBuddy);

  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  });
}

init();
