import { S3Client } from "@aws-sdk/client-s3";

import dotenv from "dotenv";

dotenv.config();

if (
  !process.env.R2_ENDPOINT ||
  !process.env.R2_ACCESS_KEY ||
  !process.env.R2_SECRET_KEY
) {
  throw new Error("Missing R2 credentials");
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
