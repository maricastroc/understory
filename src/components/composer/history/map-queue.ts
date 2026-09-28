export type MapJob = { key: string; run: (signal: AbortSignal) => Promise<void> };

export class MapQueue {
  private jobs: MapJob[] = [];
  private running: { job: MapJob; ctrl: AbortController } | null = null;
  private paused = false;

  constructor(private readonly onIdle: () => void = () => {}) {}

  enqueue(job: MapJob, front = false): void {
    if (this.running?.job.key === job.key || this.jobs.some((j) => j.key === job.key)) return;
    if (front) this.jobs.unshift(job);
    else this.jobs.push(job);
    this.pump();
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.pump();
  }

  clear(): string[] {
    const dropped = this.jobs.map((j) => j.key);
    this.jobs = [];
    if (this.running) {
      dropped.unshift(this.running.job.key);
      this.running.ctrl.abort();
      this.running = null;
    }
    return dropped;
  }

  get size(): number {
    return this.jobs.length + (this.running ? 1 : 0);
  }

  private pump(): void {
    if (this.paused || this.running) return;
    const job = this.jobs.shift();
    if (!job) {
      this.onIdle();
      return;
    }
    const ctrl = new AbortController();
    const current = { job, ctrl };
    this.running = current;
    job
      .run(ctrl.signal)
      .catch(() => {})
      .finally(() => {
        if (this.running === current) this.running = null;
        this.pump();
      });
  }
}
