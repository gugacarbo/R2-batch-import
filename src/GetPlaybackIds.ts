require("dotenv/config");

import chalk from "chalk";
import fs from "fs";
import path from "path";
import { r2Client } from "./services/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

const outStream = fs.createWriteStream(
  path.join(__dirname, "..", "data", "export.csv"),
  {
    flags: "a",
  }
);

async function getPlaybackIds() {
  console.log(chalk.blue("Fetching assets."));

  const command = await r2Client.send(
    new ListObjectsV2Command({ Bucket: "storage" })
  );

  const assets = command.Contents ?? [];

  if (assets.length === 0) {
    console.log(chalk.yellow("No assets found."));
    return;
  }

  console.log(chalk.blue(`Importing ${command.KeyCount} videos.`));

  outStream.write("Key,Size,Size (Bytes),Last Modified\n");

  assets.forEach((asset) => {
    const Key = asset.Key;
    const Size = asset.Size;
    const lastModiified = asset.LastModified;

    if (!Key) {
      console.log(chalk.yellow(`Key not found for: ${asset.Key}`));
      return;
    }

    if (!Size) {
      console.log(chalk.yellow(`Size not found for: ${asset.Key}`));
      return;
    }

    outStream.write(
      `${[Key, Size, Math.floor(Number(asset.Size)), lastModiified].join(
        ","
      )}\n`
    );
  });

  console.log(chalk.green("Exported data to CSV."));
}

getPlaybackIds();
