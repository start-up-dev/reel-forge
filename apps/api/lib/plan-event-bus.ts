import { EventEmitter } from "events";

export interface PlanEvent {
  type: "VIDEO_UPDATE" | "BATCH_COMPLETE" | "ERROR";
  videoId?: string;
  title?: string;
  status?: string;
  message?: string;
  totalVideos?: number;
  successCount?: number;
  failCount?: number;
}

type PlanEventHandler = (event: PlanEvent) => void;

const emitters = new Map<string, EventEmitter>();
const completedPlans = new Set<string>();

function getOrCreate(planId: string): EventEmitter {
  let emitter = emitters.get(planId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    emitters.set(planId, emitter);
  }
  return emitter;
}

export function emitPlanEvent(planId: string, event: PlanEvent): void {
  const emitter = emitters.get(planId);
  if (!emitter) return;
  emitter.emit("event", event);

  if (event.type === "BATCH_COMPLETE") {
    completedPlans.add(planId);
    setTimeout(() => {
      emitters.delete(planId);
      completedPlans.delete(planId);
    }, 5 * 60 * 1000);
  }
}

export function subscribeToPlan(planId: string, handler: PlanEventHandler): () => void {
  const emitter = getOrCreate(planId);
  emitter.on("event", handler);
  return () => {
    emitter.off("event", handler);
    // Only delete the emitter if BATCH_COMPLETE has not been emitted —
    // after completion, keep it alive for the 5-minute grace window.
    if (emitter.listenerCount("event") === 0 && !completedPlans.has(planId)) {
      emitters.delete(planId);
    }
  };
}
