import { TelnyxAdapter } from "./adapter";
import type { TelnyxAdapterConfig } from "./types";

export function createTelnyxAdapter(config?: TelnyxAdapterConfig): TelnyxAdapter {
  return new TelnyxAdapter(config);
}
