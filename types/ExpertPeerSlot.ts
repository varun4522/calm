export type ExpertPeerSlot = {
  id: string;
  type: "EXPERT" | "PEER"; // matches your enum type_of_user
  expert_peer_id: string;
  start_time: string; // "HH:MM:SS"
  end_time: string;   // "HH:MM:SS"
  date: string;       // "YYYY-MM-DD"
};