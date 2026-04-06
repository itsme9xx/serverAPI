import fs from "fs";
import https from "https";

const file = fs.createWriteStream("./yt-dlp");

https
  .get(
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
    (response) => {
      if (response.statusCode !== 200) {
        console.error("Download failed");
        process.exit(1);
      }

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        fs.chmodSync("./yt-dlp", 0o755);
        console.log("yt-dlp downloaded");
      });
    }
  )
  .on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
