import { EventEmitter } from "events";

export interface PlanEvent {
  type: "VIDEO_UPDATE" | "BATCH_COMPLETE" | "BATCH_FAILED" | "ERROR";
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

// Ring buffer: stores the last 50 events per plan so late SSE subscribers
// (arriving after the batch generator has already fired) can catch up on connect.
const eventRings = new Map<string, PlanEvent[]>();
const RING_SIZE = 50;

function getOrCreate(planId: string): EventEmitter {
  let emitter = emitters.get(planId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitter.setMaxListeners(100);
    emitters.set(planId, emitter);
  }
  return emitter;
}

function pushToRing(planId: string, event: PlanEvent): void {
  let ring = eventRings.get(planId);
  if (!ring) {
    ring = [];
    eventRings.set(planId, ring);
  }
  ring.push(event);
  if (ring.length > RING_SIZE) ring.shift();
}

export function emitPlanEvent(planId: string, event: PlanEvent): void {
  // Always buffer first — even if no subscriber is connected yet.
  pushToRing(planId, event);

  const emitter = emitters.get(planId);
  if (emitter) {
    emitter.emit("event", event);
  }

  if (event.type === "BATCH_COMPLETE" || event.type === "BATCH_FAILED") {
    completedPlans.add(planId);
    setTimeout(() => {
      emitters.delete(planId);
      eventRings.delete(planId);
      completedPlans.delete(planId);
    }, 5 * 60 * 1000);
  }
}

export function subscribeToPlan(planId: string, handler: PlanEventHandler): () => void {
  // Replay buffered events immediately so the subscriber is fully caught up.
  const ring = eventRings.get(planId);
  if (ring && ring.length > 0) {
    for (const event of ring) {
      handler(event);
    }
  }

  const emitter = getOrCreate(planId);
  emitter.on("event", handler);

  return () => {
    emitter.off("event", handler);
    if (emitter.listenerCount("event") === 0 && !completedPlans.has(planId)) {
      emitters.delete(planId);
    }
  };
}
