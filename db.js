/**
 * BNDS 运动圈 — 数据层（localStorage + Supabase）
 */
const BNDS_DB = (() => {
  const KEYS = {
    uid: 'bnds_uid',
    weight: 'bnds_weight',
    profile: 'bnds_profile',
    logs: 'bnds_logs',
    feeds: 'bnds_feeds',
    likes: 'bnds_likes',
    buddyPosts: 'bnds_buddy_posts',
    buddyJoins: 'bnds_buddy_joins',
  };

  let client = null;
  let ready = false;
  let status = 'loading';
  let userId = localStorage.getItem(KEYS.uid);

  if (!userId) {
    userId = `bnds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(KEYS.uid, userId);
  }

  function genId() {
    return `bnds_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function rowToCheckin(row) {
    return {
      id: row.id,
      sportId: row.sport_id,
      sportName: row.sport_name,
      met: row.met,
      minutes: row.minutes,
      calories: row.calories,
      weight: row.weight,
      date: row.date,
      note: row.note || '',
      createdAt: row.created_at,
      userId: row.user_id,
    };
  }

  function rowToFeed(row) {
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.author_name,
      authorGrade: row.author_grade || '',
      text: row.text,
      sportName: row.sport_name || null,
      minutes: row.minutes || null,
      calories: row.calories || null,
      checkinId: row.checkin_id || null,
      likes: row.likes_count || 0,
      createdAt: row.created_at,
    };
  }

  function rowToBuddyPost(row) {
    return {
      id: row.id,
      userId: row.user_id,
      authorName: row.author_name,
      authorGrade: row.author_grade || '',
      sportName: row.sport_name,
      timeText: row.time_text,
      place: row.place || '',
      slots: row.slots,
      message: row.message || '',
      status: row.status || 'open',
      joinCount: row.join_count || 0,
      createdAt: row.created_at,
    };
  }

  function rowToBuddyJoin(row) {
    return {
      userId: row.user_id,
      postId: row.post_id,
      joinerName: row.joiner_name,
      joinerGrade: row.joiner_grade || '',
      createdAt: row.created_at,
    };
  }

  async function init() {
    const cfg = window.BNDS_SUPABASE;
    if (!cfg?.url || !cfg?.anonKey || cfg.url.includes('YOUR_')) {
      status = 'local';
      ready = true;
      updateStatusUI();
      return false;
    }


    try {
      if (typeof supabase === 'undefined' || !supabase.createClient) {
        throw new Error('Supabase SDK 未加载');
      }
      client = supabase.createClient(cfg.url, cfg.anonKey);
      const { error } = await client.from('bnds_profiles').select('user_id').limit(1);
      if (error) throw error;
      ready = true;
      status = 'online';
      await syncFromCloud();
    } catch (err) {
      console.warn('Supabase 连接失败，使用本地模式:', err.message);
      ready = true;
      status = 'offline';
    }

    updateStatusUI();
    return status === 'online';
  }

  function updateStatusUI() {
    document.querySelectorAll('[data-sync-status]').forEach((el) => {
      const labels = {
        loading: '连接中…',
        online: '云端已连接',
        offline: '离线模式（本地缓存）',
        local: '本地模式（未配置 Supabase）',
      };
      el.textContent = labels[status] || '';
      el.dataset.state = status;
    });
  }

  async function syncFromCloud() {
    if (!client) return;

    const [{ data: profileRow }, { data: checkinRows }, { data: feedRows }, { data: likeRows }] =
      await Promise.all([
        client.from('bnds_profiles').select('*').eq('user_id', userId).maybeSingle(),
        client.from('bnds_checkins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        client.from('bnds_feeds').select('*').order('created_at', { ascending: false }).limit(100),
        client.from('bnds_likes').select('feed_id').eq('user_id', userId),
      ]);

    if (profileRow) {
      const profile = {
        name: profileRow.name,
        grade: profileRow.grade || '',
      };
      writeJSON(KEYS.profile, profile);
      if (profileRow.weight) {
        localStorage.setItem(KEYS.weight, String(profileRow.weight));
      }
    }

    if (checkinRows?.length) {
      writeJSON(KEYS.logs, checkinRows.map(rowToCheckin));
    }

    if (feedRows?.length) {
      writeJSON(KEYS.feeds, feedRows.map(rowToFeed));
    }

    if (likeRows?.length) {
      const likes = {};
      likeRows.forEach((r) => {
        likes[r.feed_id] = true;
      });
      writeJSON(KEYS.likes, likes);
    }
  }

  function getUserId() {
    return userId;
  }

  function getStatus() {
    return status;
  }

  function isOnline() {
    return status === 'online' && !!client;
  }

  function getWeight() {
    return parseFloat(localStorage.getItem(KEYS.weight)) || 0;
  }

  async function saveWeight(weight) {
    localStorage.setItem(KEYS.weight, String(weight));
    if (!client) return;

    const profile = getProfileLocal();
    await client.from('bnds_profiles').upsert({
      user_id: userId,
      name: profile?.name || '同学',
      grade: profile?.grade || '',
      weight,
      updated_at: new Date().toISOString(),
    });
  }

  function getProfileLocal() {
    return readJSON(KEYS.profile, null);
  }

  async function saveProfile(profile) {
    writeJSON(KEYS.profile, profile);
    if (!client) return;

    await client.from('bnds_profiles').upsert({
      user_id: userId,
      name: profile.name,
      grade: profile.grade || '',
      weight: getWeight(),
      updated_at: new Date().toISOString(),
    });
  }

  function getCheckinsLocal() {
    return readJSON(KEYS.logs, []);
  }

  async function getCheckins() {
    if (client && status === 'online') {
      const { data, error } = await client
        .from('bnds_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        const logs = data.map(rowToCheckin);
        writeJSON(KEYS.logs, logs);
        return logs;
      }
    }
    return getCheckinsLocal();
  }

  async function saveCheckin(log) {
    const logs = getCheckinsLocal();
    logs.unshift(log);
    writeJSON(KEYS.logs, logs);

    if (!client) return { ok: true, local: true };

    const { error } = await client.from('bnds_checkins').insert({
      id: String(log.id),
      user_id: userId,
      sport_id: log.sportId,
      sport_name: log.sportName,
      met: log.met,
      minutes: log.minutes,
      calories: log.calories,
      weight: log.weight,
      date: log.date,
      note: log.note || '',
      created_at: log.createdAt,
    });

    if (error) throw error;
    return { ok: true, local: false };
  }

  function getFeedsLocal() {
    return readJSON(KEYS.feeds, []);
  }

  async function getFeeds() {
    if (client && status === 'online') {
      const { data, error } = await client
        .from('bnds_feeds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        const feeds = data.map(rowToFeed);
        writeJSON(KEYS.feeds, feeds);
        return feeds;
      }
    }
    return getFeedsLocal();
  }

  async function saveFeed(post) {
    const feeds = getFeedsLocal();
    feeds.unshift(post);
    writeJSON(KEYS.feeds, feeds);

    if (!client) return { ok: true, local: true };

    const { error } = await client.from('bnds_feeds').insert({
      id: String(post.id),
      user_id: userId,
      author_name: post.authorName,
      author_grade: post.authorGrade || '',
      text: post.text,
      sport_name: post.sportName || null,
      minutes: post.minutes || null,
      calories: post.calories || null,
      checkin_id: post.checkinId ? String(post.checkinId) : null,
      likes_count: 0,
      created_at: post.createdAt,
    });

    if (error) throw error;
    return { ok: true, local: false };
  }

  function getLikesLocal() {
    return readJSON(KEYS.likes, {});
  }

  async function getMyLikedIds() {
    if (client && status === 'online') {
      const { data, error } = await client.from('bnds_likes').select('feed_id').eq('user_id', userId);
      if (!error && data) {
        const likes = {};
        data.forEach((r) => {
          likes[r.feed_id] = true;
        });
        writeJSON(KEYS.likes, likes);
        return likes;
      }
    }
    return getLikesLocal();
  }

  async function toggleLike(feedId) {
    const id = String(feedId);
    const likes = getLikesLocal();
    const feeds = getFeedsLocal();
    const feed = feeds.find((f) => String(f.id) === id);
    if (!feed) return;

    const liked = !!likes[id];
    if (liked) {
      delete likes[id];
      feed.likes = Math.max(0, (feed.likes || 0) - 1);
    } else {
      likes[id] = true;
      feed.likes = (feed.likes || 0) + 1;
    }

    writeJSON(KEYS.likes, likes);
    writeJSON(KEYS.feeds, feeds);

    if (!client) return { liked: !liked, count: feed.likes };

    if (liked) {
      await client.from('bnds_likes').delete().eq('user_id', userId).eq('feed_id', id);
    } else {
      await client.from('bnds_likes').insert({ user_id: userId, feed_id: id });
    }

    await client.from('bnds_feeds').update({ likes_count: feed.likes }).eq('id', id);
    return { liked: !liked, count: feed.likes };
  }

  function getBuddyPostsLocal() {
    return readJSON(KEYS.buddyPosts, []);
  }

  function getBuddyJoinsLocal() {
    return readJSON(KEYS.buddyJoins, []);
  }

  async function getBuddyPosts() {
    if (client && status === 'online') {
      const { data, error } = await client
        .from('bnds_buddy_posts')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        const posts = data.map(rowToBuddyPost);
        writeJSON(KEYS.buddyPosts, posts);
        return posts;
      }
    }
    return getBuddyPostsLocal().filter((p) => p.status !== 'closed');
  }

  async function getBuddyJoins() {
    if (client && status === 'online') {
      const { data, error } = await client
        .from('bnds_buddy_joins')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        const joins = data.map(rowToBuddyJoin);
        writeJSON(KEYS.buddyJoins, joins);
        return joins;
      }
    }
    return getBuddyJoinsLocal();
  }

  async function getMyBuddyJoinIds() {
    const joins = await getBuddyJoins();
    const ids = {};
    joins.filter((j) => j.userId === userId).forEach((j) => {
      ids[String(j.postId)] = true;
    });
    return ids;
  }

  async function saveBuddyPost(post) {
    const posts = getBuddyPostsLocal();
    posts.unshift(post);
    writeJSON(KEYS.buddyPosts, posts);

    if (!client) return { ok: true, local: true };

    const { error } = await client.from('bnds_buddy_posts').insert({
      id: String(post.id),
      user_id: userId,
      author_name: post.authorName,
      author_grade: post.authorGrade || '',
      sport_name: post.sportName,
      time_text: post.timeText,
      place: post.place || '',
      slots: post.slots,
      message: post.message || '',
      status: 'open',
      join_count: 0,
      created_at: post.createdAt,
    });

    if (error) throw error;
    return { ok: true, local: false };
  }

  async function joinBuddyPost(postId, profile) {
    const id = String(postId);
    const posts = getBuddyPostsLocal();
    const post = posts.find((p) => String(p.id) === id);
    if (!post) throw new Error('约练不存在');

    const joins = getBuddyJoinsLocal();
    if (joins.some((j) => j.userId === userId && String(j.postId) === id)) {
      return { joined: true, count: post.joinCount };
    }

    const join = {
      userId,
      postId: id,
      joinerName: profile.name,
      joinerGrade: profile.grade || '',
      createdAt: new Date().toISOString(),
    };
    joins.push(join);
    post.joinCount = (post.joinCount || 0) + 1;
    writeJSON(KEYS.buddyJoins, joins);
    writeJSON(KEYS.buddyPosts, posts);

    if (!client) return { joined: true, count: post.joinCount };

    const { error: joinErr } = await client.from('bnds_buddy_joins').insert({
      user_id: userId,
      post_id: id,
      joiner_name: profile.name,
      joiner_grade: profile.grade || '',
      created_at: join.createdAt,
    });
    if (joinErr) throw joinErr;

    await client.from('bnds_buddy_posts').update({ join_count: post.joinCount }).eq('id', id);
    return { joined: true, count: post.joinCount };
  }

  async function leaveBuddyPost(postId) {
    const id = String(postId);
    const posts = getBuddyPostsLocal();
    const post = posts.find((p) => String(p.id) === id);
    const joins = getBuddyJoinsLocal().filter(
      (j) => !(j.userId === userId && String(j.postId) === id),
    );
    writeJSON(KEYS.buddyJoins, joins);

    if (post) {
      post.joinCount = Math.max(0, (post.joinCount || 0) - 1);
      writeJSON(KEYS.buddyPosts, posts);
    }

    if (!client) return { joined: false, count: post?.joinCount || 0 };

    await client.from('bnds_buddy_joins').delete().eq('user_id', userId).eq('post_id', id);
    if (post) {
      await client.from('bnds_buddy_posts').update({ join_count: post.joinCount }).eq('id', id);
    }
    return { joined: false, count: post?.joinCount || 0 };
  }

  async function closeBuddyPost(postId) {
    const id = String(postId);
    const posts = getBuddyPostsLocal();
    const post = posts.find((p) => String(p.id) === id);
    if (post) {
      post.status = 'closed';
      writeJSON(KEYS.buddyPosts, posts);
    }

    if (!client) return { ok: true };

    const { error } = await client.from('bnds_buddy_posts').update({ status: 'closed' }).eq('id', id);
    if (error) throw error;
    return { ok: true };
  }

  return {
    genId,
    init,
    getUserId,
    getStatus,
    isOnline,
    getWeight,
    saveWeight,
    getProfileLocal,
    saveProfile,
    getCheckins,
    saveCheckin,
    getFeeds,
    saveFeed,
    getMyLikedIds,
    toggleLike,
    getBuddyPosts,
    getBuddyJoins,
    getMyBuddyJoinIds,
    saveBuddyPost,
    joinBuddyPost,
    leaveBuddyPost,
    closeBuddyPost,
  };
})();
