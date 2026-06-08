require("dotenv").config();
const app = require("./app");
const { PORT } = require("./config/env");
const { initFirebase } = require("./config/firebase");
const { startDraftCleanupJob } = require("./jobs/draftCleanup.job");

initFirebase();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Local cleanup job (drafts expiran y se borran solos)
    startDraftCleanupJob();
});