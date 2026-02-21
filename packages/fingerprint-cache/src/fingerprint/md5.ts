import SparkMD5 from "spark-md5";
import { stableSerialize } from "./stableSerialize.js";

export function createMd5Fingerprint(payload: unknown): string {
  const normalized = stableSerialize(payload);
  return SparkMD5.hash(normalized);
}
