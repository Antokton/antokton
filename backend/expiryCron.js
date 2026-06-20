const { buildExpiryFields, isExpired } = require("./importAssistant/expiry");

let timer = null;

async function ensureExpiryDefaults(store) {
  const jobs = await store.allRecords("Job");
  const updates = [];
  for (const job of jobs) {
    if (job.expires_at) continue;
    const expiry = buildExpiryFields(job);
    updates.push(store.updateRecord("Job", job.id, expiry).catch(() => null));
  }
  await Promise.allSettled(updates);
}

async function expirePosts(store) {
  const jobs = await store.allRecords("Job");
  const now = new Date();
  let expiredCount = 0;
  for (const job of jobs) {
    if (!job.expires_at || job.is_expired === true || !isExpired(job, now)) continue;
    const update = {
      is_expired: true,
      expired_at: now.toISOString(),
    };
    if (job.auto_archive_after_expiry !== false) {
      update.status = "archived";
      update.previous_status = job.status || "approved";
    }
    await store.updateRecord("Job", job.id, update).catch(() => null);
    expiredCount += 1;
  }
  return expiredCount;
}

async function scheduleExpiryCron({ store } = {}) {
  await ensureExpiryDefaults(store);
  await expirePosts(store);
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    expirePosts(store).catch((error) => {
      console.warn(`Expiry cron failed: ${error.message}`);
    });
  }, 24 * 60 * 60 * 1000);
  return { frequencyHours: 24 };
}

module.exports = {
  ensureExpiryDefaults,
  expirePosts,
  scheduleExpiryCron
};
