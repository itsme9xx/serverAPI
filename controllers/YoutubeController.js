const { execFile } = require("child_process");
const { Readable } = require("stream");

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
        .slice(0, 10)
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

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      execFile(
        "python",
        ["-m", "yt_dlp", "-f", "bestaudio", "-g", url],
        { timeout: 10000 },
        (err, stdout, stderr) => {
          if (err) {
            console.error(stderr);
            return res.status(500).json({
              message: "Không thể lấy audio",
            });
          }

          const audioUrl = stdout.trim();

          res.json({
            success: true,
            videoId,
            audioUrl,
          });
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
  async getDownload(req, res) {
    try {
      const { url } = req.query;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      console.log("status:", response.status);
      console.log("content-type:", response.headers.get("content-type"));
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        return res.status(500).json({ msg: "Fail" });
      }

      res.setHeader("Content-Type", contentType);
      const stream = Readable.fromWeb(response.body);
      stream.pipe(res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error" });
    }
  }
}

module.exports = new YoutubeController();
