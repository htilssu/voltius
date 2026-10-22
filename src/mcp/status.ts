import { invoke } from "@/lib/invoke";

export interface McpStatus {
  enabled: boolean;
  socketPath: string;
  exePath: string;
  /** False on Android: the backend never opens the socket there. */
  supported?: boolean;
}

export async function getMcpStatus(): Promise<McpStatus> {
  return invoke("mcp_status");
}
