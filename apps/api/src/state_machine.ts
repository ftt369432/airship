import type { Build, BuildState } from './types.js';

/**
 * Valid state transitions for Airship build state machine (ARCHITECTURE.md §4).
 */
const VALID_TRANSITIONS: Record<BuildState, BuildState[]> = {
  queued: ['preparing', 'failed'],
  preparing: ['building', 'failed'],
  building: ['signing', 'failed'],
  signing: ['uploading', 'failed'],
  uploading: ['submitted', 'failed'],
  submitted: ['in_review', 'failed'],
  in_review: ['live', 'rejected', 'failed'],
  live: [],
  failed: ['queued'],
  rejected: ['queued']
};

export class BuildStateMachine {
  /**
   * Validate if a transition from currentState to targetState is legal.
   */
  public static canTransition(from: BuildState, to: BuildState): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Perform state transition with audit and timestamp management.
   */
  public static transition(build: Build, nextState: BuildState, errorCode?: string): Build {
    if (!this.canTransition(build.state, nextState)) {
      throw new Error(
        `Illegal state transition: Cannot transition build ${build.id} from '${build.state}' to '${nextState}'`
      );
    }

    const updated: Build = {
      ...build,
      state: nextState
    };

    if (nextState === 'preparing' && !updated.startedAt) {
      updated.startedAt = new Date().toISOString();
    }

    if (['live', 'failed', 'rejected'].includes(nextState)) {
      updated.finishedAt = new Date().toISOString();
    }

    if (errorCode) {
      updated.errorCode = errorCode;
    }

    return updated;
  }
}
