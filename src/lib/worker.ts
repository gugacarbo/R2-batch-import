import { QueueTask } from "./queue";

import { PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import cliProgress from "cli-progress";

import { r2Client } from "../services/r2";
import axios from "axios";
import chalk from "chalk";

const log = console.log;

function bytesToMb(bytes: number) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

export async function worker({ videoId, url }: QueueTask) {
  const bar = new cliProgress.SingleBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: `${chalk.blueBright(
        "{bar} {filename}"
      )} | {value}/{total} Mb | {speed} Mb/s | ETA: {eta}s`,
      barsize: 20,
    },
    cliProgress.Presets.shades_classic
  );

  const fileUploadName = `teast/${new Date()
    .getTime()
    .toString()}_${videoId.replace(/ /g, "_")}`;

  return await new Promise<string>((resolve, reject) => {
    log(chalk.green("Downloading video #"), videoId);

    let lastLoaded = 0;
    let lastTime = Date.now();

    axios.get(url, { responseType: "stream" }).then((response) => {
      const streamPass = new PassThrough();

      const fileSizeMb = bytesToMb(
        parseInt(response.headers["content-length"] || "0", 10)
      );

      bar.start(fileSizeMb, 0, {
        filename: videoId,
      });

      response.data.pipe(streamPass);

      const streamPromise = new Upload({
        client: r2Client,
        params: {
          Bucket: "storage",
          Key: fileUploadName,
          Body: streamPass,
          ContentType: response.headers["content-type"],
        },
      });

      streamPromise.on("httpUploadProgress", (progress) => {
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        const deltaLoaded = bytesToMb(progress.loaded ?? 0) - lastLoaded;
        const speed = deltaLoaded / deltaTime;

        lastLoaded = bytesToMb(progress.loaded ?? 0);
        lastTime = currentTime;

        bar.update(bytesToMb(progress.loaded ?? 0), {
          speed: speed.toFixed(2),
          eta: ((fileSizeMb - lastLoaded) / speed).toFixed(2),
        });
      });

      streamPromise.done().then(() => {
        bar.stop();
        resolve(fileUploadName);
      });
    });
  });
}
