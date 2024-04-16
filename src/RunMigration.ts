require("dotenv/config");

import chalk from "chalk";
import { queue } from "./lib/queue";

import { db } from "./services/db";
import cliProgress from "cli-progress";

const log = console.log;

async function populateQueue() {
  const data = (await db.getData("/videos")) as Record<string, string>;

  log(chalk.blue(`Populating queue with ${Object.keys(data)?.length} videos.`));

  Object.entries(data).forEach(async ([id, downloadUrl]) => {


    queue
      .push({
        videoId: id,
        url: downloadUrl,
      })
      .then((uploadId) => {
        log(chalk.green(`Uploaded: ${id} (Upload ID: ${uploadId})`));
      })
      .catch((err) => {
        log(chalk.red(`Error on video: ${id}`), err);
      });
  });
}

populateQueue();
