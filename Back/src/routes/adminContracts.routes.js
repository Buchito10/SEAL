const router = require("express").Router();

const authJWT = require("../middlewares/authJWT");
const requireRole = require("../middlewares/requireRole");
const controller = require("../controllers/adminContracts.controller");

router.use(authJWT, requireRole("ADMIN"));

// placeholders catálogo
router.get("/placeholders", controller.getPlaceholders);

// list / get
router.get("/", controller.listContracts);
router.get("/:id", controller.getContract);

// template
router.get("/:id/versions/:version/template", controller.getVersionTemplate);

// versions (list + compare)
router.get("/:id/versions", controller.listContractVersions);
router.post("/:id/versions/compare", controller.compareContractVersions);

// upload contrato (docx)
router.post("/", controller.uploadContract);

// save template (misma versión) + commit
router.put("/:id/versions/:version/template", controller.saveTemplateSameVersion);

// nueva versión + commit
router.post("/:id/versions", controller.createNewVersion);

// drafts
router.post("/:id/drafts", controller.saveDraft);
router.get("/:id/drafts", controller.listDrafts);
router.get("/:id/drafts/:draftId", controller.getDraft);
router.post("/:id/drafts/:draftId/publish", controller.publishDraft);

// clone contrato (guardar como nuevo contrato)
router.post("/:id/clone", controller.cloneContract);

// locks
router.post("/:id/lock", controller.acquireLock);
router.post("/:id/lock/refresh", controller.refreshLock);
router.delete("/:id/lock", controller.releaseLock);

module.exports = router;
