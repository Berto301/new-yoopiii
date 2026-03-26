import { useMutation } from "@tanstack/react-query";
import { useSessionStore } from "../../../app/store/session.store.js";
import { loginRequest, registerRequest } from "../services/auth.service.js";

const resolveRedirectPath = (user) => {
  if (user.role === "independent_agent") {
    return "/dashboard/agent";
  }

  if ((user.role === "agency" || user.role === "agency_agent") && user.agencyId) {
    return "/dashboard/agency";
  }

  return "/dashboard/user";
};

const extractApiErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || fallbackMessage;

export const useAuthMutations = () => {
  const loginToSession = useSessionStore((state) => state.login);

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      loginToSession(data);
    }
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      loginToSession(data);
    }
  });

  return {
    loginMutation,
    registerMutation,
    resolveRedirectPath,
    extractApiErrorMessage
  };
};
