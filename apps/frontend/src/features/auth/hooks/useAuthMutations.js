import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../../app/store/session.store.js";
import { loginRequest, registerRequest, socialLoginRequest, verifyTwoFactorRequest } from "../services/auth.service.js";

const resolveRedirectPath = (user) => {
  if (user.role === "independent_agent") {
    return "/dashboard/agent";
  }

  if ((user.role === "agency" || user.role === "agency_agent") && user.agencyId) {
    return "/dashboard/agency";
  }

  if (user.role === "proprietaire") {
    return "/dashboard/owner";
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
      if (data?.accessToken) {
        dispatch(loginSuccess(data));
      }
    }
  });

  const registerMutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      dispatch(loginSuccess(data));
    }
  });

  const socialLoginMutation = useMutation({
    mutationFn: socialLoginRequest,
    onSuccess: (data) => {
      if (data?.accessToken) {
        dispatch(loginSuccess(data));
      }
    }
  });

  const verifyTwoFactorMutation = useMutation({
    mutationFn: verifyTwoFactorRequest,
    onSuccess: (data) => {
      if (data?.accessToken) {
        dispatch(loginSuccess(data));
      }
    }
  });

  return {
    loginMutation,
    registerMutation,
    socialLoginMutation,
    verifyTwoFactorMutation,
    resolveRedirectPath,
    extractApiErrorMessage
  };
};
