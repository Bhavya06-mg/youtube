import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import planroutes from "./routes/plan.js";
import otproutes from "./routes/otp.js";
import subscribeRoutes from "./routes/subscribe.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use("/uploads", express.static(path.join("uploads")));

app.use(bodyParser.json());

/* ✅ API ROUTES FIRST */
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/download", downloadroutes);
app.use("/plan", planroutes);
app.use("/otp", otproutes);
app.use("/subscribe", subscribeRoutes);

/* ✅ STATIC FRONTEND LAST */
const __dirname = path.resolve();


app.use(express.static(path.join(__dirname, "out")));

app.get(/^(?!\/api|\/video|\/user|\/like|\/watch|\/history|\/comment).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "out", "index.html"));
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL;

mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
