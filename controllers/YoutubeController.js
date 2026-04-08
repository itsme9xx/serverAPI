const { execFile } = require("child_process");
const { spawn } = require("child_process");
const { Readable } = require("stream");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

const cacheDir = path.join(__dirname, "audio_cache");
fs.ensureDirSync(cacheDir);

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
      const userAgent = req.headers["user-agent"] || "";
      const isIphone = /iPhone|iPad|iPod/i.test(userAgent);
      const filePath = path.join(cacheDir, `${videoId}.mp3`);

      execFile(
        "python",
        ["-m", "yt_dlp", "-f", "bestaudio", "-g", url],
        { timeout: 15000 },
        (err, stdout, stderr) => {
          if (err) {
            console.error(stderr);
            return res.status(500).json({
              message: "Không thể lấy audio",
            });
          }

          const audioUrl = stdout.trim();

          if (!isIphone) {
            return res.json({
              success: true,
              videoId,
              audioUrl,
            });
          }
          console.log(`[FFmpeg] Đang convert bài mới: ${videoId}`);
          if (fs.existsSync(filePath)) {
            console.log(`[Cache] Serving existing file for: ${videoId}`);
            return res.sendFile(filePath);
          }
          const ffmpeg = spawn("ffmpeg", [
            "-i",
            audioUrl,
            "-vn",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            filePath,
          ]);
          let startedSending = false;

          ffmpeg.stderr.on("data", () => {
            if (!startedSending) {
              startedSending = true;
              setTimeout(() => {
                if (fs.existsSync(filePath) && !res.headersSent) {
                  console.log(`[Stream] Bắt đầu gửi file đang convert...`);
                  res.sendFile(filePath);
                }
              }, 3000);
            }
          });
          ffmpeg.on("close", (code) => {
            console.log(
              `[FFmpeg] Hoàn tất convert file: ${videoId} (Code ${code})`
            );
            if (!res.headersSent) {
              res.sendFile(filePath);
            }
          });

          ffmpeg.on("error", (err) => {
            console.error("FFmpeg Fatal Error:", err);
            if (!res.headersSent) res.status(500).end();
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
      const userAgent = req.headers["user-agent"] || "";
      const isIphone = /iPhone|iPad|iPod/i.test(userAgent);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        return res.status(500).json({ msg: "Fail" });
      }
      if (isIphone) {
        const ffmpeg = spawn("ffmpeg", [
          "-i",
          "pipe:0",
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-f",
          "adts",
          "pipe:1",
        ]);
        Readable.fromWeb(response.body).pipe(ffmpeg.stdin);

        res.setHeader("Content-Type", "audio/aac");
        res.setHeader("Accept-Ranges", "bytes");
        ffmpeg.stdout.pipe(res);
        ffmpeg.stderr.on("data", (data) =>
          console.log("ffmpeg:", data.toString())
        );
        ffmpeg.on("close", (code) => res.end());
      } else {
        res.setHeader("Content-Type", contentType);
        const stream = Readable.fromWeb(response.body);
        stream.pipe(res);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error" });
    }
  }
}

module.exports = new YoutubeController();
