export function createActivityState(overrides = {}) {
  return {
    domain: null,
    focused: true,
    idle: false,
    startedAt: null,
    ...overrides
  };
}

function canTrack(state) {
  return Boolean(state.domain && state.focused && !state.idle);
}

function closeRunningSession(state, at, completed) {
  if (state.startedAt === null || !state.domain) return;
  const end = Math.max(at, state.startedAt);
  const durationMs = end - state.startedAt;
  if (durationMs > 0) {
    completed.push({ domain: state.domain, start: state.startedAt, end, durationMs });
  }
  state.startedAt = null;
}

function startIfEligible(state, at) {
  if (canTrack(state) && state.startedAt === null) state.startedAt = at;
}

export function transitionActivity(previousState, event) {
  const state = createActivityState(previousState);
  const completed = [];
  const at = Number.isFinite(event?.at) ? event.at : Date.now();

  switch (event?.type) {
    case 'ACTIVE_DOMAIN': {
      const nextDomain = event.domain || null;
      if (nextDomain !== state.domain) closeRunningSession(state, at, completed);
      state.domain = nextDomain;
      startIfEligible(state, at);
      break;
    }
    case 'FOCUS': {
      const nextFocused = Boolean(event.focused);
      if (!nextFocused && state.focused) closeRunningSession(state, at, completed);
      state.focused = nextFocused;
      startIfEligible(state, at);
      break;
    }
    case 'IDLE': {
      const nextIdle = Boolean(event.idle);
      if (nextIdle && !state.idle) closeRunningSession(state, at, completed);
      state.idle = nextIdle;
      startIfEligible(state, at);
      break;
    }
    case 'FLUSH': {
      closeRunningSession(state, at, completed);
      startIfEligible(state, at);
      break;
    }
    default:
      break;
  }

  return { state, completed };
}
