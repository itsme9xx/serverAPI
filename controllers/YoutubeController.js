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
      // 1. Validate videoId
      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return res.status(400).json({ message: "Invalid videoId" });
      }

      const userAgent = req.headers["user-agent"] || "";
      const isIphone = /iPhone|iPad|iPod/i.test(userAgent);
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      if (!isIphone) {
        return spawn("yt-dlp", ["-f", "bestaudio", "-g", url]).stdout.on(
          "data",
          (data) => {
            res.json({
              success: true,
              videoId,
              audioUrl: data.toString().trim(),
            });
          }
        );
      }

      console.log(`[iOS] Đang khởi tạo stream cho video: ${videoId}`);

      const ytDlp = spawn("yt-dlp", [
        "-f",
        "bestaudio",
        "--no-playlist",
        "-o",
        "-",
        url,
      ]);

      const ffmpeg = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ab",
        "128k",
        "-f",
        "mp3",
        "pipe:1",
      ]);

      let audioBuffer = Buffer.alloc(0);
      ffmpeg.stdout.on("data", (chunk) => {
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
      });
      ffmpeg.on("close", (code) => {
        if (code === 0 && audioBuffer.length > 0) {
          console.log(
            `[iOS] Đã nạp xong ${audioBuffer.length} bytes. Gửi cho iPhone...`
          );

          res.writeHead(200, {
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.length,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
          });
          res.end(audioBuffer);
        } else {
          if (!res.headersSent) res.status(500).send("Lỗi xử lý nhạc");
        }
      });

      ytDlp.stdout.pipe(ffmpeg.stdin);
      ytDlp.stderr.on("data", () => {});
      ffmpeg.stderr.on("data", () => {});

      req.on("close", () => {
        ytDlp.kill("SIGKILL");
        ffmpeg.kill("SIGKILL");
      });
    } catch (err) {
      console.error("Global getAudio Error:", err);
      if (!res.headersSent) res.status(500).json({ message: "Server error" });
    }
  }
  async getDownload(req, res) {
    try {
      const { videoId } = req.query;
      if (!videoId) return res.status(400).send("Missing Video ID");

      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Transfer-Encoding", "chunked");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");

      const ytDlp = spawn("yt-dlp", [
        "-f",
        "bestaudio",
        "--no-playlist",
        "--limit-rate",
        "1M",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--no-check-certificates",
        "--geo-bypass",
        "-o",
        "-",
        youtubeUrl,
      ]);

      const ffmpeg = spawn("ffmpeg", [
        "-i",
        "pipe:0",
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ab",
        "128k",
        "-f",
        "mp3",
        "pipe:1",
      ]);

      let hasError = false;
      ytDlp.stderr.on("data", (data) => {
        const errorMsg = data.toString();
        console.error(`yt-dlp log: ${errorMsg}`);

        if (errorMsg.includes("ERROR") && !hasError) {
          hasError = true;
          if (!res.headersSent) {
            res
              .status(500)
              .set("Content-Type", "application/json")
              .json({ error: "YouTube Blocked" });
          }
          ytDlp.kill();
          ffmpeg.kill();
        }
      });

      ffmpeg.stdout.once("data", () => {
        if (!hasError) {
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Transfer-Encoding", "chunked");
          res.setHeader("X-Accel-Buffering", "no");
          res.setHeader("Connection", "keep-alive");
        }
      });

      ytDlp.stdout.pipe(ffmpeg.stdin);
      ffmpeg.stdout.pipe(res);

      req.on("close", () => {
        console.log("Client disconnected, killing processes...");
        ytDlp.kill("SIGINT");
        ffmpeg.kill("SIGINT");
      });
    } catch (err) {
      console.error("Stream Error:", err);
      if (!res.headersSent) res.status(500).send("Stream Error");
    }
  }
}

module.exports = new YoutubeController();
