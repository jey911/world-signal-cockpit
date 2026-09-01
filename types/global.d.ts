import type { WorldFrame } from "@/types/market";

declare global {
  interface Window {
    __WSE_WORLD_FRAME__?: WorldFrame;
  }
}

export {};
