import fastq, { queueAsPromised } from "fastq";
import { worker } from "./worker";
import { MultiBar } from "cli-progress";

export interface Item {
  title: string;
  created_at: string;
  broadcast_id: string;
  id: string;
  videoId: string;
  thumbnail: string;
  dimensions: Dimensions;
  duration: number;
  status: ItemStatus;
  url?: string;
  uploadUrl?: string;
  expires?: Date;
}

export type ItemStatus =
  | "pending"
  | "generated"
  | "queued"
  | "uploaded"
  | "error";

export interface Dimensions {
  width: number;
  height: number;
}

export type QueueTask = {
  videoId: string;
  url: string;
  barCreator: MultiBar;
  onProgress?: (status: {
    progress?: number;
    videoId: string;
    total: number;
    speed: string;
    fileName: string;
    eta: string;
    startTime: number;
  }) => void;
};

/**
 * How many videos will be processed in parallel.
 */
export const CONCURRENCY = 8;

export const queue: queueAsPromised<QueueTask> = fastq.promise(
  worker,
  CONCURRENCY
);
