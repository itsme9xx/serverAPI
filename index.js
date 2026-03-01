// const path = require("path");
// const express = require("express");
// const app = express();
// const cors = require("cors");
// const port = process.env.PORT || 3000;

// // Page Home
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "/index.html"));
// });

// // ZingMp3Router
// const ZingMp3Router = require("./routers/api/ZingRouter");
// app.use("/api", cors(), ZingMp3Router);

// // Page Error
// app.get("*", (req, res) => {
//   res.send("Nhập Sai Đường Dẫn! Vui Lòng Nhập Lại >.<");
// });

// // app.listen(port, () => {
// //   console.log(`Start server listen at http://localhost:${port}`);
// // });
// app.listen(3000, "0.0.0.0", () => {
//   console.log("Server running on 0.0.0.0");
// });

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Page Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/index.html"));
});

// ZingMp3Router
const ZingMp3Router = require("./routers/api/ZingRouter");
app.use("/api", cors(), ZingMp3Router);

// Page Error
app.get("*", (req, res) => {
  res.send("Nhập Sai Đường Dẫn! Vui Lòng Nhập Lại >.<");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
