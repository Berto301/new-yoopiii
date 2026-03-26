import { create } from "zustand";

const demoUser = {
  id: "65f0f0f0f0f0f0f0f0f0f0f1",
  firstName: "Aminata",
  lastName: "Kone",
  email: "aminata@yopii.app",
  role: "agency",
  agencyId: "65f0f0f0f0f0f0f0f0f0f0a1"
};

export const useSessionStore = create((set) => ({
  accessToken: null,
  user: demoUser,
  isAuthenticated: true,
  login: ({ user, accessToken }) =>
    set({
      user,
      accessToken,
      isAuthenticated: true
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false
    }),
  setRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, role } : state.user
    })),
  setAgencyId: (agencyId) =>
    set((state) => ({
      user: state.user ? { ...state.user, agencyId } : state.user
    }))
}));
