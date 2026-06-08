const cron = require("node-cron");
const { ENABLE_LOCAL_DRAFT_CLEANUP, DRAFT_CLEANUP_CRON, APP_TZ } = require("../config/env");
const contractDraftsService = require("../services/contractDrafts.service");

function startDraftCleanupJob() {
    if (!ENABLE_LOCAL_DRAFT_CLEANUP) {
        console.log("[draftCleanup] disabled");
        return null;
    }

    // Importante: node-cron soporta timezone
    const task = cron.schedule(
        DRAFT_CLEANUP_CRON,
        async () => {
            try {
                const result = await contractDraftsService.cleanupExpiredDrafts();
                console.log(`[draftCleanup] cleaned=${result.cleaned} scanned=${result.scanned}`);
            } catch (err) {
                console.error("[draftCleanup] error:", err);
            }
        },
        { timezone: APP_TZ }
    );

    task.start();
    console.log(`[draftCleanup] scheduled cron="${DRAFT_CLEANUP_CRON}" tz="${APP_TZ}"`);
    return task;
}

module.exports = { startDraftCleanupJob };