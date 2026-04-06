const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const https = require("https");

const ytdlpPath = path.join(process.cwd(), "yt-dlp");

function downloadYtDlp() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(ytdlpPath)) {
      return resolve();
    }

    console.log("Downloading yt-dlp...");

    const file = fs.createWriteStream(ytdlpPath);

    https
      .get(
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
        (res) => {
          res.pipe(file);

          file.on("finish", () => {
            file.close();
            fs.chmodSync(ytdlpPath, 0o755);
            console.log("yt-dlp downloaded");
            resolve();
          });
        }
      )
      .on("error", reject);
  });
}

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

      res.json({ data: videos });
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

      await downloadYtDlp();

      const url = `https://www.youtube.com/watch?v=${videoId}`;

      execFile(
        ytdlpPath,
        ["-f", "bestaudio", "-g", "--no-warnings", "--no-playlist", url],
        {
          timeout: 20000,
          maxBuffer: 1024 * 1024 * 10,
        },
        (err, stdout, stderr) => {
          if (err) {
            console.error("yt-dlp error:", stderr || err);
            return res.status(500).json({
              message: "Không thể lấy audio",
            });
          }

          //
          const lines = stdout
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          const audioUrl = lines[0];

          if (!audioUrl) {
            return res.status(500).json({
              message: "Không tìm thấy audio URL",
            });
          }

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
}

module.exports = new YoutubeController();
