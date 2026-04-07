const express = require("express");
const YoutubeController = require("../../controllers/YoutubeController");

const router = express.Router();

router.get("/youtube", YoutubeController.search);
router.get("/audio", YoutubeController.getAudio);
router.get("/download", YoutubeController.getDownload);

module.exports = router;
