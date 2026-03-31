import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { logoutSuccess, selectAgencyId, selectCurrentUser, updateSessionUser } from "../../../app/store/session.store.js";
import {
  changeMyPassword,
  deleteAgency,
  getAgencyDetail,
  getAgencyMembers,
  getAgencyRoles,
  getMyProfile,
  updateAgencyProfile,
  updateMyProfile
} from "../services/settings.service.js";

export const useSettingsWorkspace = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const user = useSelector(selectCurrentUser);
  const agencyId = useSelector(selectAgencyId);

  const profileQuery = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: getMyProfile,
    enabled: Boolean(user)
  });

  const agencyQuery = useQuery({
    queryKey: ["agency-detail", agencyId],
    queryFn: () => getAgencyDetail(agencyId),
    enabled: Boolean(user?.role === "agency" && agencyId)
  });

  const rolesQuery = useQuery({
    queryKey: ["agency-roles", agencyId],
    queryFn: () => getAgencyRoles(agencyId),
    enabled: Boolean(user?.role === "agency" && agencyId)
  });

  const membersQuery = useQuery({
    queryKey: ["agency-members-settings", agencyId],
    queryFn: () => getAgencyMembers(agencyId),
    enabled: Boolean(user?.role === "agency" && agencyId)
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      dispatch(updateSessionUser(data));
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    }
  });

  const changePasswordMutation = useMutation({ mutationFn: changeMyPassword });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ payload }) => updateAgencyProfile({ agencyId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["agency-detail", agencyId] });
    }
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: () => deleteAgency(agencyId),
    onSuccess: () => {
      queryClient.clear();
      dispatch(logoutSuccess());
    }
  });

  return {
    user,
    agencyId,
    profileQuery,
    agencyQuery,
    rolesQuery,
    membersQuery,
    updateProfileMutation,
    changePasswordMutation,
    updateAgencyMutation,
    deleteAgencyMutation
  };
};
