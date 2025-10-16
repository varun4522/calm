export interface TimeSlot {
  id?: string;
  expert_id: string;
  expert_name: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_by_user_name: string;
  booked_by_user_id: string;
}