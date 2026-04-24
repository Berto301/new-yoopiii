import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { logoutSuccess, selectAgencyId, selectCurrentUser, updateSessionUser } from "../../../app/store/session.store.js";
import {
  changeMyPassword,
  createAgencyMember,
  createAgencyRole,
  deleteAgencyMember,
  deleteAgency,
  deleteAgencyRole,
  duplicateAgencyRole,
  getAgencyDetail,
  getAgencyMembers,
  getAgencyRoles,
  getMyProfile,
  updateMyPreferences,
  updateAgencyMember,
  updateAgencyProfile,
  updateAgencyRole,
  updateMyProfile,
  uploadAgencyAsset,
  uploadMyAvatar
} from "../services/settings.service.js";

export const useSettingsWorkspace = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const user = useSelector(selectCurrentUser);
  const agencyId = useSelector(selectAgencyId);
  const isAgencyWorkspace = ["agency", "agency_agent"].includes(user?.role);

  const profileQuery = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: getMyProfile,
    enabled: Boolean(user)
  });

  const agencyQuery = useQuery({
    queryKey: ["agency-detail", agencyId],
    queryFn: () => getAgencyDetail(agencyId),
    enabled: Boolean(isAgencyWorkspace && agencyId)
  });

  const rolesQuery = useQuery({
    queryKey: ["agency-roles", agencyId],
    queryFn: () => getAgencyRoles(agencyId),
    enabled: Boolean(isAgencyWorkspace && agencyId)
  });

  const membersQuery = useQuery({
    queryKey: ["agency-members-settings", agencyId],
    queryFn: () => getAgencyMembers(agencyId),
    enabled: Boolean(isAgencyWorkspace && agencyId)
  });

  const syncProfileState = (data) => {
    dispatch(updateSessionUser(data));
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  };

  const invalidateAgencyQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["agency-dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["agency-detail", agencyId] });
  };

  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: syncProfileState
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: updateMyPreferences,
    onSuccess: syncProfileState
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: syncProfileState
  });

  const changePasswordMutation = useMutation({ mutationFn: changeMyPassword });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ payload }) => updateAgencyProfile({ agencyId, payload }),
    onSuccess: invalidateAgencyQueries
  });

  const uploadAgencyAssetMutation = useMutation({
    mutationFn: ({ assetKind, file }) => uploadAgencyAsset({ agencyId, assetKind, file }),
    onSuccess: invalidateAgencyQueries
  });

  const createRoleMutation = useMutation({
    mutationFn: (payload) => createAgencyRole({ agencyId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-roles", agencyId] });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, payload }) => updateAgencyRole({ agencyId, roleId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-roles", agencyId] });
    }
  });

  const duplicateRoleMutation = useMutation({
    mutationFn: ({ roleId, payload }) => duplicateAgencyRole({ agencyId, roleId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-roles", agencyId] });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId) => deleteAgencyRole({ agencyId, roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-roles", agencyId] });
    }
  });

  const createMemberMutation = useMutation({
    mutationFn: (payload) => createAgencyMember({ agencyId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members-settings", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-members", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-dashboard-summary"] });
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, payload }) => updateAgencyMember({ agencyId, memberId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members-settings", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-members", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-dashboard-summary"] });
    }
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId) => deleteAgencyMember({ agencyId, memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members-settings", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-members", agencyId] });
      queryClient.invalidateQueries({ queryKey: ["agency-dashboard-summary"] });
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
    updatePreferencesMutation,
    uploadAvatarMutation,
    changePasswordMutation,
    updateAgencyMutation,
    uploadAgencyAssetMutation,
    createRoleMutation,
    updateRoleMutation,
    duplicateRoleMutation,
    deleteRoleMutation,
    createMemberMutation,
    updateMemberMutation,
    deleteMemberMutation,
    deleteAgencyMutation
  };
};
