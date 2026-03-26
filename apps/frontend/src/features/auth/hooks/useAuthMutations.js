import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../../app/store/session.store.js";
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
  const dispatch = useDispatch();

  const loginMutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      dispatch(loginSuccess(data));
    }
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      dispatch(loginSuccess(data));
    }
  });

  return {
    loginMutation,
    registerMutation,
    resolveRedirectPath,
    extractApiErrorMessage
  };
};
