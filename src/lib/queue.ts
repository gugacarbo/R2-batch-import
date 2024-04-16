import fastq, { queueAsPromised } from "fastq";
import { worker } from "./worker";
import { SingleBar } from "cli-progress";

export type QueueTask = {
  videoId: string;
  url: string;
};

/**
 * How many videos will be processed in parallel.
 */
const CONCURRENCY = 1;

export const queue: queueAsPromised<QueueTask> = fastq.promise(
  worker,
  CONCURRENCY
);
