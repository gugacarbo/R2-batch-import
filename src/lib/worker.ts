import { QueueTask } from "./queue";

import { PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";

import { r2Client } from "../services/r2";
import axios from "axios";
import chalk from "chalk";
import { extractDataFromUrl } from "../helpers/extractDataFromUrl";

axios.defaults.timeout = 600000;

function bytesToMb(bytes: number, decimals = 2) {
  return Number((bytes / 1024 / 1024).toFixed(decimals));
}

export async function worker({
  videoId,
  url,
  barCreator,
  onProgress,
}: QueueTask) {
  const uploadBar = barCreator.create(100, 0, {
    filename: videoId,
    speed: "0",
  });

  const fileUploadName = `streamyard/${videoId}`;

  return await new Promise<{
    uploadId: string;
    videoId: string;
    fileSizeMb: number;
  }>((resolve, reject) => {
    const startTime = Date.now();

    let lastLoaded = 0;
    let lastTime = Date.now();

    axios
      .get(url, {
        responseType: "stream",
        timeout: 600000,
      })
      .then((response) => {
        const streamPass = new PassThrough();

        const fileSizeMb = bytesToMb(
          parseFloat(response.headers["content-length"] || "0")
        );

        uploadBar.start(fileSizeMb, 0, {
          filename: videoId,
          speed: "0",
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

          uploadBar.update(bytesToMb(progress.loaded ?? 0), {
            speed: speed.toFixed(2),
            eta: ((fileSizeMb - lastLoaded) / speed).toFixed(2),
          });

          onProgress?.({
            progress: bytesToMb(progress.loaded ?? 0),
            total: fileSizeMb,
            speed: speed.toFixed(2),
            videoId,
            fileName: extractDataFromUrl(url).fileName ?? videoId,
            eta: ((fileSizeMb - lastLoaded) / speed).toFixed(2),
            startTime,
          });
        });

        streamPromise.done().then(() => {
          uploadBar.update(fileSizeMb, {
            filename: chalk.green("Uploaded #" + videoId),
            barsize: 10,
            format: `${chalk.green("{bar} {filename}")} in {eta}s`,
            eta: ((Date.now() - startTime) / 1000).toFixed(2),
          });
          onProgress?.({
            progress: fileSizeMb,
            startTime,
            videoId,
            speed: "0",
            fileName: extractDataFromUrl(url).fileName ?? videoId,
            eta: "0",
            total: fileSizeMb,
          });
          uploadBar.stop();
          resolve({
            uploadId: fileUploadName,
            videoId,
            fileSizeMb,
          });
        });
      })
      .catch((error) => {
        uploadBar.update(0, {
          filename: chalk.red("Error #" + videoId),
          format: `${chalk.red("{bar} {filename}")}`,
        });
        uploadBar.stop();
        reject({ error });
      });
  });
}
