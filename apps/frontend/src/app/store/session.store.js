import { create } from "zustand";

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

const persistSession = ({ accessToken, user }) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!accessToken || !user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken,
      user
    })
  );
};

const initialSession = loadStoredSession();

export const useSessionStore = create((set) => ({
  accessToken: initialSession.accessToken,
  user: initialSession.user,
  isAuthenticated: initialSession.isAuthenticated,
  login: ({ user, accessToken }) => {
    persistSession({ user, accessToken });

    set({
      user,
      accessToken,
      isAuthenticated: true
    });
  },
  logout: () => {
    persistSession({ user: null, accessToken: null });

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false
    });
  },
  setRole: (role) =>
    set((state) => {
      const nextUser = state.user ? { ...state.user, role } : state.user;
      persistSession({ user: nextUser, accessToken: state.accessToken });

      return {
        user: nextUser
      };
    }),
  setAgencyId: (agencyId) =>
    set((state) => {
      const nextUser = state.user ? { ...state.user, agencyId } : state.user;
      persistSession({ user: nextUser, accessToken: state.accessToken });

      return {
        user: nextUser
      };
    })
}));
