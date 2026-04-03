import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, Button, StatusBadge, Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell, Modal } from '../components/ui';
import { Plus, Eye, FileText, Calendar, Building2, Wallet } from 'lucide-react';
import { BillForm } from '../components/BillForm';
import { format } from 'date-fns';
import type { Bill, POCMapping, Vendor, Company, Category } from '../types';

const mockBills: Bill[] = [
  { id: '1', user_id: 'mock', sc_id: 'sc1', company_id: 'c1', vendor_id: 'v1', category_id: 'cat1', date: '2024-03-15', amount: 2500, bill_number: 'BILL001', status: 'pending', process_type: 'Other', is_online: false, file_url: null, created_at: '' },
  { id: '2', user_id: 'mock', sc_id: 'sc1', company_id: 'c2', vendor_id: 'v2', category_id: 'cat2', date: '2024-03-10', amount: 4500, bill_number: 'BILL002', status: 'reimbursed', process_type: 'Other', is_online: true, file_url: null, created_at: '' },
  { id: '3', user_id: 'mock', sc_id: 'sc1', company_id: 'c1', vendor_id: 'v3', category_id: 'cat1', date: '2024-03-05', amount: 1200, bill_number: 'BILL003', status: 'disputed', process_type: 'Other', is_online: false, file_url: null, created_at: '' },
];

const mockVendors: Record<string, Vendor> = { v1: { id: 'v1', name: 'Swiggy' }, v2: { id: 'v2', name: 'Uber' }, v3: { id: 'v3', name: 'Amazon' } };
const mockCompanies: Record<string, Company> = { c1: { id: 'c1', name: 'Google' }, c2: { id: 'c2', name: 'Microsoft' } };
const mockCategories: Record<string, Category> = { cat1: { id: 'cat1', name: 'Travel' }, cat2: { id: 'cat2', name: 'Food' } };

export function JCDashboard() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [pocMapping, setPocMapping] = useState<POCMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchBills();
    fetchPOCMapping();
  }, [user?.id]);

  const fetchBills = async () => {
    if (!user?.id) {
      setBills(mockBills.map(b => ({ ...b, vendors: mockVendors[b.vendor_id], companies: mockCompanies[b.company_id], categories: mockCategories[b.category_id], sc: { id: 'sc1', name: 'Rahul Sharma', email: 'rahul@test.com', roll_no: '001', role: 'SC' as const, created_at: '' } })));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        vendors (name),
        companies (name),
        categories (name),
        sc:users!bills_sc_id_fkey (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBills(data as Bill[]);
    }
    setLoading(false);
  };

  const fetchPOCMapping = async () => {
    if (!user?.id) {
      setPocMapping({ id: '1', sc_id: 'sc1', fs_jc_id: 'fs1', fs_jc: { id: 'fs1', name: 'Priya Patel', email: 'priya@test.com', roll_no: '002', role: 'F_S' as const, created_at: '' } });
      return;
    }

    const { data } = await supabase
      .from('poc_mapping')
      .select(`
        *,
        fs_jc:users!poc_mapping_fs_jc_id_fkey (name)
      `)
      .eq('sc_id', user.id)
      .single();

    if (data) {
      setPocMapping(data as POCMapping);
    }
  };

  const totalPending = bills
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalReimbursed = bills
    .filter((b) => b.status === 'reimbursed')
    .reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Junior Coordinator Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your bill submissions and reimbursements</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{bills.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Wallet className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Reimbursement</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalPending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reimbursed</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalReimbursed.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Your Bills</h2>
        </CardHeader>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No bills submitted yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                Submit Your First Bill
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Date</TableHeadCell>
                  <TableHeadCell>Company</TableHeadCell>
                  <TableHeadCell>Vendor</TableHeadCell>
                  <TableHeadCell>Amount</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {format(new Date(bill.date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        {bill.companies?.name}
                      </div>
                    </TableCell>
                    <TableCell>{bill.vendors?.name}</TableCell>
                    <TableCell className="font-medium">₹{bill.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={bill.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedBill(bill)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Submit New Bill">
        <BillForm
          onSuccess={() => {
            setShowForm(false);
            fetchBills();
          }}
          onCancel={() => setShowForm(false)}
          pocName={pocMapping?.fs_jc?.name}
        />
      </Modal>

      <Modal isOpen={!!selectedBill} onClose={() => setSelectedBill(null)} title="Bill Details">
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{format(new Date(selectedBill.date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium">₹{selectedBill.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Company</p>
                <p className="font-medium">{selectedBill.companies?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                <p className="font-medium">{selectedBill.vendors?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{selectedBill.categories?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Process Type</p>
                <p className="font-medium">{selectedBill.process_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bill Number</p>
                <p className="font-medium">{selectedBill.bill_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={selectedBill.status} />
              </div>
            </div>
            {selectedBill.sc && (
              <div>
                <p className="text-sm text-gray-500">Submitted to SC</p>
                <p className="font-medium">{selectedBill.sc.name}</p>
              </div>
            )}
            {selectedBill.is_online && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  This is a digital invoice (no physical bill required)
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
