export type UserRole = 'JC' | 'SC' | 'F_S';

export interface User {
  id: string;
  email: string;
  name: string;
  roll_no: string;
  role: UserRole;
  upi_id?: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export type ProcessType = 'PPT' | 'Interview' | 'Test' | 'GD' | 'Other';
export type BillStatus = 'pending' | 'reimbursed' | 'handed_to_fs' | 'disputed';

export interface Bill {
  id: string;
  user_id: string;
  sc_id: string;
  vendor_id: string;
  company_id: string;
  category_id: string;
  bill_number: string;
  date: string;
  amount: number;
  process_type: ProcessType;
  file_url: string | null;
  is_online: boolean;
  status: BillStatus;
  created_at: string;
  users?: User;
  vendors?: Vendor;
  companies?: Company;
  categories?: Category;
  sc?: User;
}

export interface POCMapping {
  id: string;
  sc_id: string;
  fs_jc_id: string;
  sc?: User;
  fs_jc?: User;
}

export interface ReimbursementCycle {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_closed: boolean;
}
