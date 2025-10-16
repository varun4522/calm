export type Notification = {
  id: string;
  sender_id: string; 
  sender_name: string;
  sender_type: 'STUDENT' | 'EXPERT' | 'PEER' | 'ADMIN';
  receiver_type: 'STUDENTS' | 'EXPERTS' | 'PEERS' | 'ADMIN' | 'ALL';
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
};
