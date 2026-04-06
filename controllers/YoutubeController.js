const { execFile } = require("child_process");
const path = require("path");

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
  async getAudio(req, res) {
    try {
      const { videoId } = req.query;

      if (!videoId) {
        return res.status(400).json({ message: "Missing videoId" });
      }

      // validate videoId
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ message: "Invalid videoId" });
      }
      const ytdlpPath = path.join(process.cwd(), "yt-dlp");
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      execFile(
        ytdlpPath,
        ["-f", "bestaudio", "-g", url],
        { timeout: 10000 },
        (err, stdout, stderr) => {
          if (err) {
            console.error(stderr);
            return res.status(500).json({
              message: "Không thể lấy audio",
            });
          }

          res.json({
            success: true,
            videoId,
            audioUrl: stdout.trim(),
          });
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = new YoutubeController();
