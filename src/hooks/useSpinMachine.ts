import { useCallback, useMemo, useReducer } from "react";

export type SpinState =
  | { status: "idle" }
  | { status: "committing" }
  | { status: "spinning"; outcomeIndex: number; spinId: number }
  | { status: "settling"; outcomeIndex: number; spinId: number }
  | { status: "result"; outcomeIndex: number; spinId: number };

export type SpinEvent =
  | { type: "SPIN_CLICK" }
  | { type: "COMMIT_OK"; outcomeIndex: number }
  | { type: "SPIN_ANIM_DONE" }
  | { type: "RESULT_HANDLED" }
  | { type: "ERROR" };

interface SpinMachineAPI {
  state: SpinState;
  send: (evt: SpinEvent) => void;
  isIdle: boolean;
  isCommitting: boolean;
  isSpinning: boolean;
  outcomeIndex?: number;
  spinId?: number;
}

function reducer(state: SpinState, evt: SpinEvent): SpinState {
  switch (evt.type) {
    case "SPIN_CLICK":
      if (state.status !== "idle") return state;
      console.info("MACHINE_STATE: committing");
      return { status: "committing" };
    case "COMMIT_OK": {
      const spinId = Date.now();
      console.info("MACHINE_STATE: spinning", { outcomeIndex: evt.outcomeIndex, spinId });
      return { status: "spinning", outcomeIndex: evt.outcomeIndex, spinId };
    }
    case "SPIN_ANIM_DONE": {
      if (state.status !== "spinning") return state;
      console.info("MACHINE_STATE: settling", { outcomeIndex: state.outcomeIndex, spinId: state.spinId });
      return { status: "settling", outcomeIndex: state.outcomeIndex, spinId: state.spinId };
    }
    case "RESULT_HANDLED": {
      console.info("MACHINE_STATE: idle");
      return { status: "idle" };
    }
    case "ERROR": {
      console.warn("MACHINE_STATE: error → idle");
      return { status: "idle" };
    }
    default:
      return state;
  }
}

export function useSpinMachine(): SpinMachineAPI {
  const [state, dispatch] = useReducer(reducer, { status: "idle" } as SpinState);

  const send = useCallback((evt: SpinEvent) => dispatch(evt), []);

  return useMemo(
    () => ({
      state,
      send,
      isIdle: state.status === "idle",
      isCommitting: state.status === "committing",
      isSpinning: state.status === "spinning" || state.status === "settling",
      outcomeIndex: (state as any).outcomeIndex,
      spinId: (state as any).spinId,
    }),
    [state, send]
  );
}
