import express from "express";
import { db } from "./services/db";
import { CONCURRENCY, Item, queue } from "./lib/queue";
import path from "path";
import { barCreator } from "./lib/loadingBar";
import { Server } from "socket.io";

const app = express();
const server = require("http").createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

app.get("/", (_, res) =>
  res
    .setHeader("Content-Type", "text/html")
    .sendFile(path.join(__dirname, "/index.html"))
);
app.get("/videos", async (_, res) => {
  const videos = (await db.getData("/videos")) as Item[];
  res.send({
    videos,
    count: Object.keys(videos)?.length,
  });
});

io.on("connection", (socket) => {
  socket.on("gen_url", async () => {
    if (queue.running() >= CONCURRENCY) {
      return socket.emit("gen_url_response", {
        message: `Queue is full ${queue.running()}/${CONCURRENCY} Streaming`,
        error: `Queue is full ${queue.running()}/${CONCURRENCY} Streaming`,
      });
    }
    const videos = await db.filter<Item>(
      "/videos",
      (video: Item) => video.status === "pending"
    );
    const video = videos?.[0];

    if (!video) {
      return socket.emit("gen_url_response", {
        message: "No pending videos found",
      });
    }
    const url = `https://streamyard.com/api/broadcasts/${video.broadcast_id}/vod_download_urls?mediaId=${video.id}&type=video`;

    socket.emit("gen_url_response", {
      id: video.id,
      title: video.title,
      createdAt: video.created_at,
      duration: video.duration,
      dimensions: video.dimensions,
      url,
      thumbnail: video.thumbnail,
    });
  });

  socket.on("queue", async (video) => {
    if (new Date(video.expires) < new Date()) {
      socket.emit("queue_response", {
        error: "Video has expired",
        message: "Video has expired",
      });
    }

    video.status = "queued";

    await db.push(`/videos/${video.videoId}`, video, false);

    try {
      socket.emit("queue_response", {
        message: `Video ${video.videoId} added to queue`,
      });

      const { uploadId, fileZiseMb } = await queue
        .push({
          videoId: video.videoId,
          url: video.videoUrl,
          barCreator,
          onProgress: (progress_data) => {
            io.emit("upload_progress", progress_data);
          },
        })
        .then((ret) => {
          io.emit("upload_done", {
            running: queue.running(),
            max_running: CONCURRENCY,
            message: `Video ${ret.videoId} added to queue`,
            ...ret,
          });
          return ret;
        });

      video.status = "uploaded";
      video.uploadId = uploadId;
      video.fileZiseMb = fileZiseMb;

      db.push(`/videos/${video.videoId}`, video, false);
    } catch (err: any) {
      await db.push(`/videos/${video.videoId}`, { status: "failed" }, false);
      const at = new Date();
      await db.push(`/errors/${at.getTime()}-${video.videoId}`, {
        err: `Error uploading video ${video.videoId}`,
        at,
        message: err?.message,
        error: err,
      });

      io.emit("worker_error", {
        running: queue.running(),
        max_running: CONCURRENCY,
        message: `Error uploading video ${video.videoId}`,
        error: err.message,
      });
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
