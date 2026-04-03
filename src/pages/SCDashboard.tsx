import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, Button, StatusBadge, Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell, Modal } from '../components/ui';
import { Eye, Filter, Flag, CheckCircle, Search, Wallet, Plus } from 'lucide-react';
import { BillForm } from '../components/BillForm';
import { format } from 'date-fns';
import type { Bill, Vendor, Company, User } from '../types';

const mockSCBills: Bill[] = [
  { id: '1', user_id: 'jc1', sc_id: 'mock', company_id: 'c1', vendor_id: 'v1', category_id: 'cat1', date: '2024-03-15', amount: 2500, bill_number: 'BILL001', status: 'pending', process_type: 'Other', is_online: false, file_url: null, created_at: '' },
  { id: '2', user_id: 'jc2', sc_id: 'mock', company_id: 'c2', vendor_id: 'v2', category_id: 'cat2', date: '2024-03-10', amount: 4500, bill_number: 'BILL002', status: 'reimbursed', process_type: 'Other', is_online: true, file_url: null, created_at: '' },
  { id: '3', user_id: 'jc1', sc_id: 'mock', company_id: 'c1', vendor_id: 'v3', category_id: 'cat1', date: '2024-03-05', amount: 1200, bill_number: 'BILL003', status: 'disputed', process_type: 'Other', is_online: false, file_url: null, created_at: '' },
  { id: '4', user_id: 'jc3', sc_id: 'mock', company_id: 'c3', vendor_id: 'v1', category_id: 'cat3', date: '2024-03-12', amount: 3800, bill_number: 'BILL004', status: 'pending', process_type: 'Other', is_online: false, file_url: null, created_at: '' },
];

const mockSCVendors: Record<string, Vendor> = { v1: { id: 'v1', name: 'Swiggy' }, v2: { id: 'v2', name: 'Uber' }, v3: { id: 'v3', name: 'Amazon' } };
const mockSCCompanies: Record<string, Company> = { c1: { id: 'c1', name: 'Google' }, c2: { id: 'c2', name: 'Microsoft' }, c3: { id: 'c3', name: 'Meta' } };
const mockSCCategories: Record<string, { id: string; name: string }> = { cat1: { id: 'cat1', name: 'Travel' }, cat2: { id: 'cat2', name: 'Food' }, cat3: { id: 'cat3', name: 'Equipment' } };
const mockJCUsers: User[] = [
  { id: 'jc1', name: 'Amit Kumar', email: 'amit@test.com', roll_no: '003', role: 'JC', created_at: '' },
  { id: 'jc2', name: 'Priya Singh', email: 'priya@test.com', roll_no: '004', role: 'JC', created_at: '' },
  { id: 'jc3', name: 'Rahul Verma', email: 'rahul@test.com', roll_no: '005', role: 'JC', created_at: '' },
];

export function SCDashboard() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterJC, setFilterJC] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [jcUsers, setJcUsers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchBills();
    fetchFilters();
  }, [user?.id]);

  useEffect(() => {
    let result = bills;

    if (filterCompany) {
      result = result.filter((b) => b.company_id === filterCompany);
    }
    if (filterVendor) {
      result = result.filter((b) => b.vendor_id === filterVendor);
    }
    if (filterJC) {
      result = result.filter((b) => b.user_id === filterJC);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          b.bill_number?.toLowerCase().includes(term) ||
          b.companies?.name?.toLowerCase().includes(term) ||
          b.vendors?.name?.toLowerCase().includes(term)
      );
    }

    setFilteredBills(result);
  }, [bills, filterCompany, filterVendor, filterJC, searchTerm]);

  const fetchBills = async () => {
    if (!user?.id) {
      setBills(mockSCBills.map(b => ({
        ...b,
        users: mockJCUsers.find(jc => jc.id === b.user_id),
        vendors: mockSCVendors[b.vendor_id],
        companies: mockSCCompanies[b.company_id],
        categories: mockSCCategories[b.category_id]
      })));
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        users (id, name, email, upi_id),
        vendors (name),
        companies (name),
        categories (name)
      `)
      .eq('sc_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBills(data as Bill[]);
    }
    setLoading(false);
  };

  const fetchFilters = async () => {
    if (!user?.id) {
      setCompanies(Object.values(mockSCCompanies));
      setVendors(Object.values(mockSCVendors));
      setJcUsers(mockJCUsers.map(jc => ({ id: jc.id, name: jc.name })));
      return;
    }
    const [companiesRes, vendorsRes, usersRes] = await Promise.all([
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('vendors').select('id, name').order('name'),
      supabase.from('users').select('id, name').eq('role', 'JC').order('name'),
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (usersRes.data) setJcUsers(usersRes.data);
  };

  const handleMarkPaid = async (billId: string) => {
    await supabase.from('bills').update({ status: 'reimbursed' }).eq('id', billId);
    fetchBills();
  };

  const handleFlag = async (billId: string) => {
    await supabase.from('bills').update({ status: 'disputed' }).eq('id', billId);
    fetchBills();
  };

  const openUPI = (bill: Bill) => {
    const amount = bill.amount;
    const upiId = bill.users?.upi_id || 'unknown@upi';
    const name = bill.users?.name || 'JC';
    const url = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR`;
    window.location.href = url;
  };

  const totalPending = filteredBills
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.amount, 0);

  const totalReimbursed = filteredBills
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
          <h1 className="text-2xl font-bold text-gray-900">Senior Coordinator Dashboard</h1>
          <p className="text-gray-500 mt-1">Review and reimburse JC bills</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Bill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Wallet className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{filteredBills.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Wallet className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalPending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reimbursed</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalReimbursed.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <Flag className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Disputed</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredBills.filter((b) => b.status === 'disputed').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Bill Review</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <select
                value={filterJC}
                onChange={(e) => setFilterJC(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All JCs</option>
                {jcUsers.map((jc) => (
                  <option key={jc.id} value={jc.id}>{jc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBills.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No bills found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Date</TableHeadCell>
                  <TableHeadCell>JC Name</TableHeadCell>
                  <TableHeadCell>Company</TableHeadCell>
                  <TableHeadCell>Vendor</TableHeadCell>
                  <TableHeadCell>Bill No.</TableHeadCell>
                  <TableHeadCell>Amount</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{format(new Date(bill.date), 'dd MMM')}</TableCell>
                    <TableCell className="font-medium">{bill.users?.name}</TableCell>
                    <TableCell>{bill.companies?.name}</TableCell>
                    <TableCell>{bill.vendors?.name}</TableCell>
                    <TableCell>{bill.bill_number}</TableCell>
                    <TableCell className="font-medium">₹{bill.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={bill.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedBill(bill)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {bill.status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openUPI(bill)}
                              title="Pay via UPI"
                            >
                              ₹
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkPaid(bill.id)}
                              title="Mark as paid"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFlag(bill.id)}
                              title="Flag for dispute"
                            >
                              <Flag className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                <p className="text-sm text-gray-500">JC Name</p>
                <p className="font-medium">{selectedBill.users?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">JC Email</p>
                <p className="font-medium">{selectedBill.users?.email}</p>
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
            {selectedBill.is_online && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">Digital invoice (no physical bill)</p>
              </div>
            )}
            {selectedBill.users?.upi_id && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">JC UPI ID: <span className="font-mono font-medium">{selectedBill.users.upi_id}</span></p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button onClick={() => openUPI(selectedBill)}>
                Open UPI App
              </Button>
              {selectedBill.status === 'pending' && (
                <Button variant="primary" onClick={() => {
                  handleMarkPaid(selectedBill.id);
                  setSelectedBill(null);
                }}>
                  I Have Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Submit Bill">
        <BillForm
          isForSC={true}
          onSuccess={() => {
            setShowForm(false);
            fetchBills();
          }}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </div>
  );
}
