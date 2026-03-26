import { configureStore, createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "yopii-session";

const loadStoredSession = () => {
  if (typeof window === "undefined") {
    return { accessToken: null, user: null, isAuthenticated: false };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { accessToken: null, user: null, isAuthenticated: false };
    }

    const parsed = JSON.parse(raw);

    return {
      accessToken: parsed.accessToken || null,
      user: parsed.user || null,
      isAuthenticated: Boolean(parsed.accessToken && parsed.user)
    };
  } catch (_error) {
    return { accessToken: null, user: null, isAuthenticated: false };
  }
};

const persistSession = (state) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!state.accessToken || !state.user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken: state.accessToken,
      user: state.user
    })
  );
};

const initialState = loadStoredSession();

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      persistSession(state);
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      persistSession(state);
    },
    setRole: (state, action) => {
      if (state.user) {
        state.user.role = action.payload;
        persistSession(state);
      }
    },
    setAgencyId: (state, action) => {
      if (state.user) {
        state.user.agencyId = action.payload;
        persistSession(state);
      }
    }
  }
});

export const { loginSuccess, logoutSuccess, setRole, setAgencyId } = sessionSlice.actions;

export const store = configureStore({
  reducer: {
    session: sessionSlice.reducer
  }
});

export const selectSession = (state) => state.session;
export const selectCurrentUser = (state) => state.session.user;
export const selectAccessToken = (state) => state.session.accessToken;
export const selectIsAuthenticated = (state) => state.session.isAuthenticated;
export const selectAgencyId = (state) => state.session.user?.agencyId || null;
