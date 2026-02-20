import { create } from "zustand";

interface TeamStore {
  currentTeam: string | null; // Team name
  companyId: string | null; // Company ID ("gilead" for superadmin, company_id for admin)
  currentRole: string | null; // Current user's role
  setTeam: (
    team: string | null,
    companyId: string | null,
    role?: string | null,
  ) => void;
  resetTeam: () => void;
}

export const useTeamStore = create<TeamStore>()((set) => ({
  currentTeam: null,
  companyId: null,
  currentRole: null,
  setTeam: (team, companyId, role = null) =>
    set({ currentTeam: team, companyId, currentRole: role }),
  resetTeam: () =>
    set({ currentTeam: null, companyId: null, currentRole: null }),
}));
