const express = require("express");
const YoutubeController = require("../../controllers/YoutubeController");

const router = express.Router();

router.get("/youtube", YoutubeController.search);

module.exports = router;
