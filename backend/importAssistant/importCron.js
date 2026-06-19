const { runImport, ensureDefaultSettings, ensureDefaultSources } = require("./importRunner");

let timer = null;

async function scheduleImportCron({ store, config }) {
  await ensureDefaultSettings(store, config);
  await ensureDefaultSources(store);

  const tick = async () => {
    try {
      const settings = await ensureDefaultSettings(store, config);
      if (config.IMPORT_ASSISTANT_ENABLED === false || settings.auto_import_enabled === false) return;
      await runImport({ store, config, requestedBy: "cron" });
    } catch (error) {
      console.warn(`Import Assistant cron failed: ${error.message}`);
    }
  };

  const settings = await ensureDefaultSettings(store, config);
  const hours = Math.max(1, Number(settings.import_frequency_hours || config.IMPORT_ASSISTANT_DEFAULT_FREQUENCY_HOURS || 6));
  if (timer) clearInterval(timer);
  timer = setInterval(tick, hours * 60 * 60 * 1000);
  return { frequencyHours: hours };
}

module.exports = { scheduleImportCron };
