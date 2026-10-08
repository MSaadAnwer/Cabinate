const { test } = require("node:test");
const assert = require("node:assert/strict");
const loadTypeScript = require("./load-typescript.cjs");

function clockHarness(timers, initialState = "active") {
  let now = 2000;
  let listener;
  let removed = false;
  const ticks = [], intervals = new Set(), effects = [];
  const modules = {
    react: {
      createContext: () => "context",
      useState: (initial) => [typeof initial === "function" ? initial() : initial, (value) => ticks.push(value)],
      useRef: (current) => ({ current }),
      useEffect: (effect) => effects.push(effect),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "react-native": {
      AppState: {
        currentState: initialState,
        addEventListener: (event, callback) => {
          assert.equal(event, "change");
          listener = callback;
          return { remove: () => { removed = true; } };
        },
      },
    },
    "./kitchen-store": { useKitchen: () => ({ data: { timers }, ready: true }) },
    "../components/feedback": { useFeedback: () => ({ notify: () => {} }) },
    "../utils/kitchen": {},
    "../utils/durations": {},
    "../services/timer-notifications": {},
  };
  const { CookingTimerProvider } = loadTypeScript(require.resolve("../src/state/cooking-timers.tsx"), modules, {
    Date: { now: () => now },
    setInterval: (callback, delay) => {
      assert.equal(delay, 1000);
      const interval = { callback };
      intervals.add(interval);
      return interval;
    },
    clearInterval: (interval) => intervals.delete(interval),
  });
  CookingTimerProvider({ children: null });
  const cleanup = effects[1]();
  return {
    intervals,
    ticks,
    cleanup,
    changeState(state, time) { now = time; listener(state); },
    get removed() { return removed; },
  };
}

test("countdowns pause in the background and resync to elapsed time on return", () => {
  const h = clockHarness([{ endsAt: 6000 }]);
  assert.equal(h.intervals.size, 1);
  assert.deepEqual(h.ticks, [2000]);
  h.changeState("background", 3000);
  assert.equal(h.intervals.size, 0);
  h.changeState("active", 5000);
  assert.equal(h.intervals.size, 1);
  assert.deepEqual(h.ticks, [2000, 5000]);
  h.cleanup();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.removed, true);
});

test("finished timers stop periodic updates but can announce on foreground return", () => {
  const h = clockHarness([{ endsAt: 1000 }], "background");
  assert.equal(h.intervals.size, 0);
  assert.deepEqual(h.ticks, []);
  h.changeState("active", 4000);
  assert.equal(h.intervals.size, 0);
  assert.deepEqual(h.ticks, [4000]);
  h.cleanup();
});
