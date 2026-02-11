import type { ExternalPlatform, PlatformAdapter } from "./types";
import { CourseraAdapter } from "./coursera/adapter";
import { PluralsightAdapter } from "./pluralsight/adapter";
import { UdemyAdapter } from "./udemy/adapter";

const adapters: Record<ExternalPlatform, PlatformAdapter> = {
  coursera: new CourseraAdapter(),
  pluralsight: new PluralsightAdapter(),
  udemy: new UdemyAdapter(),
};

export function getAdapter(platform: ExternalPlatform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return adapter;
}
