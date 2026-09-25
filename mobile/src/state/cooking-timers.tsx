import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useKitchen } from "./kitchen-store";
import { useFeedback } from "../components/feedback";
import { newId } from "../utils/kitchen";
import { remainingSeconds } from "../utils/durations";
import type { CookingTimer } from "../utils/local-data";
import {
  cancelTimerAlert,
  configureTimerNotifications,
  requestTimerAlerts,
  scheduleTimerAlert,
} from "../services/timer-notifications";

type TimerInput = Pick<
  CookingTimer,
  "recipeId" | "recipeTitle" | "stepIndex" | "durationIndex" | "seconds"
>;
function useTimerStore() {
  const { data, ready, commit } = useKitchen();
  const { notify } = useFeedback();
  const timers = data.timers || [];
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  const announced = useRef(new Set<string>());
  useEffect(() => {
    void configureTimerNotifications().catch(() => {});
  }, []);
  useEffect(() => {
    if (!timers.length) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [timers.length]);
  useEffect(() => {
    if (AppState.currentState !== "active" && AppState.currentState !== null)
      return;
    const finished = timers.filter(
      (timer) => timer.endsAt <= now && !announced.current.has(timer.id),
    );
    if (!finished.length) return;
    finished.forEach((timer) => announced.current.add(timer.id));
    notify(
      finished
        .map(
          (timer) =>
            `${timer.recipeTitle}, step ${timer.stepIndex + 1}: timer finished`,
        )
        .join(". "),
    );
  }, [timers, now, notify]);

  async function start(input: TimerInput) {
    if (
      working.current ||
      !ready ||
      !Number.isFinite(input.seconds) ||
      input.seconds <= 0
    )
      return;
    if (
      timers.some(
        (timer) =>
          timer.recipeId === input.recipeId &&
          timer.stepIndex === input.stepIndex &&
          timer.durationIndex === input.durationIndex,
      )
    )
      return;
    working.current = true;
    setBusy(true);
    setError("");
    let timer: CookingTimer | undefined;
    try {
      const allowed = await requestTimerAlerts().catch(() => false);
      timer = {
        ...input,
        id: newId(),
        endsAt: Date.now() + input.seconds * 1000,
      };
      if (allowed) {
        try {
          timer.notificationId = await scheduleTimerAlert(timer);
        } catch {
          /* Countdown remains available; the UI explains the missing alert. */
        }
      }
      const saved = timer;
      await commit((previous) => ({
        ...previous,
        timers: [...(previous.timers || []), saved],
      }));
      setNow(Date.now());
      notify(
        timer.notificationId
          ? "Timer started"
          : "Timer started. Keep the app open for the alert.",
      );
    } catch {
      if (timer) await cancelTimerAlert(timer).catch(() => {});
      setError("Could not save the timer. Try again.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function stop(timer: CookingTimer) {
    if (working.current || !ready) return;
    working.current = true;
    setBusy(true);
    setError("");
    let cancelled = false;
    try {
      await cancelTimerAlert(timer);
      cancelled = true;
      await commit((previous) => ({
        ...previous,
        timers: (previous.timers || []).filter(
          (value) => value.id !== timer.id,
        ),
      }));
      announced.current.delete(timer.id);
    } catch {
      // If removing the saved record fails, restore its pending native alert.
      if (
        cancelled &&
        timer.notificationId &&
        remainingSeconds(timer.endsAt) > 0
      ) {
        try {
          await scheduleTimerAlert(timer);
        } catch {
          setError(
            "Could not remove the timer or restore its alert. Keep the app open and try again.",
          );
          return;
        }
      }
      setError("Could not remove the timer. Try again.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return { timers, now, busy, ready, error, start, stop };
}
const TimerContext = createContext<ReturnType<typeof useTimerStore> | null>(
  null,
);
export function CookingTimerProvider({ children }: { children: ReactNode }) {
  return <TimerContext value={useTimerStore()}>{children}</TimerContext>;
}
export function useCookingTimers() {
  const value = use(TimerContext);
  if (!value) throw new Error("CookingTimerProvider is required");
  return value;
}
