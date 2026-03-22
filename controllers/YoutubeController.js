const { exec } = require("child_process");

class YoutubeController {
  async search(req, res) {
    try {
      const keyword = req.query.keyword;

      if (!keyword) {
        return res.status(400).json({ message: "Missing keyword" });
      }

      const { Innertube } = await import("youtubei.js");

      const yt = await Innertube.create();
      const result = await yt.search(keyword);

      const videos = result.results
        .filter((item) => item.type === "Video" && item.id)
        .slice(0, 8)
        .map((video) => ({
          title: video.title?.text,
          videoId: video.id,
          duration: video.duration?.text,
          thumbnail: video.thumbnails?.[0]?.url,
          channel: video.author?.name,
        }));

      res.json({
        data: videos,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = new YoutubeController();
