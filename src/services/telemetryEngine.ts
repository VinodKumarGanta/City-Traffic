/**
 * Real-Time Telemetry Pipeline (Production Gateway Adapter)
 * Delegates all stream subscriptions to the live backend SSE pipeline (/api/db/stream/detections)
 * ALL MOCK ARRAYS & SIMULATION LOOPS HAVE BEEN REMOVED.
 */

import { ANPRDetection } from '../types/traffic';
import { dbService } from './dbService';

type TelemetryListener = (detection: ANPRDetection) => void;

class RealtimeTelemetryEngine {
  private listeners: TelemetryListener[] = [];
  private unsubscribeSse: (() => void) | null = null;

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.push(listener);

    if (!this.unsubscribeSse) {
      this.unsubscribeSse = dbService.subscribeLiveTelemetry((detection) => {
        this.listeners.forEach(fn => {
          try {
            fn(detection);
          } catch (e) {
            console.error('Error in telemetry listener:', e);
          }
        });
      });
    }

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
      if (this.listeners.length === 0 && this.unsubscribeSse) {
        this.unsubscribeSse();
        this.unsubscribeSse = null;
      }
    };
  }
}

export const telemetryEngine = new RealtimeTelemetryEngine();
