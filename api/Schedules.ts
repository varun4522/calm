import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ExpertPeerSlot } from "@/types/ExpertPeerSlot";

export const useGetExpertPeerSlots = (expertPeerId: string | undefined, date: string, type: "EXPERT" | "PEER" | undefined) => {
  return useQuery<ExpertPeerSlot[], Error>({
    queryKey: ["expertPeerSlots", expertPeerId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_peer_slots")
        .select("*")
        .eq("expert_peer_id", expertPeerId)
        .eq("date", date)
        .eq("type", type)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error loading slots:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!expertPeerId && !!date // don't run if values missing
  });
};
