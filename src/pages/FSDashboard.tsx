import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardContent, Button, Table, TableHeader, TableBody, TableRow, TableCell, TableHeadCell, Modal, Input } from '../components/ui';
import { Plus, Edit2, Trash2, Eye, Download, Filter, Users, Tag, Calendar, Search, X, ChevronLeft, ChevronRight, Database, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import type { Bill, Vendor, Company, Category, User, POCMapping, ReimbursementCycle, BillStatus } from '../types';

type TabType = 'database' | 'dropdowns' | 'users' | 'poc' | 'cycles' | 'export';

const ITEMS_PER_PAGE = 25;

export function FSDashboard() {
  useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('database');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">FnS Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Master Database Controls</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'database', label: 'Database', icon: Database },
            { id: 'export', label: 'Export Center', icon: FileSpreadsheet },
            { id: 'dropdowns', label: 'Dropdowns', icon: Tag },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'poc', label: 'POC Mapping', icon: Users },
            { id: 'cycles', label: 'Cycles', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'database' && <DatabaseView />}
      {activeTab === 'export' && <ExportCenter />}
      {activeTab === 'dropdowns' && <DropdownsManager />}
      {activeTab === 'users' && <UsersManager />}
      {activeTab === 'poc' && <POCManager />}
      {activeTab === 'cycles' && <CyclesManager />}
    </div>
  );
}

function DatabaseView() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cycles, setCycles] = useState<ReimbursementCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<BillStatus | ''>('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterJC, setFilterJC] = useState('');
  const [filterSC, setFilterSC] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [billsRes, vendorsRes, companiesRes, categoriesRes, usersRes, cyclesRes] = await Promise.all([
      supabase.from('bills').select(`
        *,
        users (id, name, email, upi_id),
        vendors (id, name),
        companies (id, name),
        categories (id, name),
        sc:users!bills_sc_id_fkey (id, name, email, upi_id)
      `).order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('users').select('*').order('name'),
      supabase.from('reimbursement_cycles').select('*').order('start_date', { ascending: false }),
    ]);

    if (billsRes.data) setBills(billsRes.data as Bill[]);
    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (cyclesRes.data) setCycles(cyclesRes.data);
    setLoading(false);
  };

  const filteredBills = useMemo(() => {
    let result = bills;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((b) =>
        b.bill_number?.toLowerCase().includes(term) ||
        b.vendors?.name?.toLowerCase().includes(term) ||
        b.companies?.name?.toLowerCase().includes(term) ||
        b.users?.name?.toLowerCase().includes(term) ||
        b.sc?.name?.toLowerCase().includes(term) ||
        b.amount.toString().includes(term)
      );
    }

    if (filterStatus) result = result.filter((b) => b.status === filterStatus);
    if (filterCompany) result = result.filter((b) => b.company_id === filterCompany);
    if (filterCategory) result = result.filter((b) => b.category_id === filterCategory);
    if (filterJC) result = result.filter((b) => b.user_id === filterJC);
    if (filterSC) result = result.filter((b) => b.sc_id === filterSC);
    if (dateFrom) result = result.filter((b) => new Date(b.date) >= new Date(dateFrom));
    if (dateTo) result = result.filter((b) => new Date(b.date) <= new Date(dateTo));
    if (filterCycle) {
      const cycle = cycles.find((c) => c.id === filterCycle);
      if (cycle) {
        result = result.filter((b) => {
          const billDate = new Date(b.date);
          return billDate >= new Date(cycle.start_date) && 
            (cycle.end_date ? billDate <= new Date(cycle.end_date) : true);
        });
      }
    }

    return result;
  }, [bills, searchTerm, filterStatus, filterCompany, filterCategory, filterJC, filterSC, dateFrom, dateTo, filterCycle, cycles]);

  const paginatedBills = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredBills.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBills, page]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);

  const activeCycle = cycles.find((c) => c.is_active);

  const scUsers = users.filter((u) => u.role === 'SC');

  const stats = useMemo(() => ({
    total: filteredBills.length,
    pending: filteredBills.filter((b) => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0),
    reimbursed: filteredBills.filter((b) => b.status === 'reimbursed').reduce((sum, b) => sum + b.amount, 0),
    disputed: filteredBills.filter((b) => b.status === 'disputed').length,
  }), [filteredBills]);

  const handleUpdateBill = async (bill: Bill) => {
    await supabase.from('bills').update({
      date: bill.date,
      vendor_id: bill.vendor_id,
      company_id: bill.company_id,
      category_id: bill.category_id,
      sc_id: bill.sc_id,
      amount: bill.amount,
      bill_number: bill.bill_number,
      status: bill.status,
      is_online: bill.is_online,
      process_type: bill.process_type,
    }).eq('id', bill.id);
    setEditingBill(null);
    fetchData();
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    await supabase.from('bills').delete().eq('id', id);
    setViewingBill(null);
    fetchData();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterCompany('');
    setFilterCategory('');
    setFilterJC('');
    setFilterSC('');
    setFilterCycle('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Bills</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Filter className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Amount</p>
              <p className="text-xl font-bold">₹{stats.pending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Reimbursed</p>
              <p className="text-xl font-bold">₹{stats.reimbursed.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Disputed</p>
              <p className="text-xl font-bold">{stats.disputed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">All Bills</h2>
              {activeCycle && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  Active: {activeCycle.name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              {(searchTerm || filterStatus || filterCompany || filterCategory || filterJC || filterSC || dateFrom || dateTo || filterCycle) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as BillStatus | ''); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reimbursed">Reimbursed</option>
                <option value="handed_to_fs">Handed to FnS</option>
                <option value="disputed">Disputed</option>
              </select>
              <select value={filterCycle} onChange={(e) => { setFilterCycle(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Cycles</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Companies</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filterJC} onChange={(e) => { setFilterJC(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All JCs</option>
                {users.filter(u => u.role === 'JC').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select value={filterSC} onChange={(e) => { setFilterSC(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All SCs</option>
                {users.filter(u => u.role === 'SC').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div className="flex gap-1">
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="text-xs" placeholder="From" />
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="text-xs" placeholder="To" />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadCell>Date</TableHeadCell>
                  <TableHeadCell>Bill No.</TableHeadCell>
                  <TableHeadCell>Company</TableHeadCell>
                  <TableHeadCell>Vendor</TableHeadCell>
                  <TableHeadCell>Category</TableHeadCell>
                  <TableHeadCell>JC</TableHeadCell>
                  <TableHeadCell>SC</TableHeadCell>
                  <TableHeadCell>Amount</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Actions</TableHeadCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.map((bill) => (
                  <TableRow key={bill.id} className={bill.status === 'disputed' ? 'bg-red-50' : bill.status === 'reimbursed' ? 'bg-green-50' : ''}>
                    <TableCell className="text-xs">{format(new Date(bill.date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs font-mono">{bill.bill_number}</TableCell>
                    <TableCell className="text-xs">{bill.companies?.name}</TableCell>
                    <TableCell className="text-xs">{bill.vendors?.name}</TableCell>
                    <TableCell className="text-xs">{bill.categories?.name}</TableCell>
                    <TableCell className="text-xs">{bill.users?.name || '-'}</TableCell>
                    <TableCell className="text-xs">{bill.sc?.name || '-'}</TableCell>
                    <TableCell className="text-xs font-medium">₹{bill.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <select
                        value={bill.status}
                        onChange={async (e) => {
                          await supabase.from('bills').update({ status: e.target.value }).eq('id', bill.id);
                          fetchData();
                        }}
                        className={`text-xs border rounded px-2 py-1 ${
                          bill.status === 'pending' ? 'border-yellow-400 bg-yellow-50' :
                          bill.status === 'reimbursed' ? 'border-green-400 bg-green-50' :
                          bill.status === 'disputed' ? 'border-red-400 bg-red-50' :
                          'border-gray-300'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="reimbursed">Reimbursed</option>
                        <option value="handed_to_fs">To FnS</option>
                        <option value="disputed">Disputed</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="p-1" onClick={() => setViewingBill(bill)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="p-1" onClick={() => setEditingBill(bill)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="p-1" onClick={() => handleDeleteBill(bill.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No bills found matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredBills.length)} of {filteredBills.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={!!viewingBill} onClose={() => setViewingBill(null)} title="Bill Details">
        {viewingBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium">{format(new Date(viewingBill.date), 'dd MMMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bill Number</p>
                <p className="font-medium font-mono">{viewingBill.bill_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Company</p>
                <p className="font-medium">{viewingBill.companies?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor</p>
                <p className="font-medium">{viewingBill.vendors?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="font-medium">{viewingBill.categories?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Process Type</p>
                <p className="font-medium">{viewingBill.process_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-medium text-lg">₹{viewingBill.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium capitalize">{viewingBill.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Junior Coordinator</p>
                <p className="font-medium">{viewingBill.users?.name || '-'}</p>
                {viewingBill.users?.upi_id && <p className="text-xs text-gray-400">{viewingBill.users.upi_id}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-500">Senior Coordinator</p>
                <p className="font-medium">{viewingBill.sc?.name || '-'}</p>
                {viewingBill.sc?.upi_id && <p className="text-xs text-gray-400">{viewingBill.sc.upi_id}</p>}
              </div>
            </div>
            {viewingBill.is_online && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">Digital Invoice</p>
              </div>
            )}
            {viewingBill.file_url && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Attached File</p>
                <a href={viewingBill.file_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">
                  View Attachment
                </a>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => { setViewingBill(null); setEditingBill(viewingBill); }}>
                Edit Bill
              </Button>
              <Button variant="danger" onClick={() => handleDeleteBill(viewingBill.id)}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!editingBill} onClose={() => setEditingBill(null)} title="Edit Bill">
        {editingBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" type="date" value={editingBill.date} onChange={(e) => setEditingBill({ ...editingBill, date: e.target.value })} />
              <Input label="Bill Number" value={editingBill.bill_number} onChange={(e) => setEditingBill({ ...editingBill, bill_number: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select value={editingBill.company_id} onChange={(e) => setEditingBill({ ...editingBill, company_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select value={editingBill.vendor_id} onChange={(e) => setEditingBill({ ...editingBill, vendor_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={editingBill.category_id} onChange={(e) => setEditingBill({ ...editingBill, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Input label="Amount" type="number" value={editingBill.amount} onChange={(e) => setEditingBill({ ...editingBill, amount: parseFloat(e.target.value) || 0 })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SC</label>
                <select value={editingBill.sc_id} onChange={(e) => setEditingBill({ ...editingBill, sc_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {scUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editingBill.status} onChange={(e) => setEditingBill({ ...editingBill, status: e.target.value as BillStatus })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="pending">Pending</option>
                  <option value="reimbursed">Reimbursed</option>
                  <option value="handed_to_fs">Handed to FnS</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingBill(null)}>Cancel</Button>
              <Button onClick={() => handleUpdateBill(editingBill)}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ExportCenter() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [cycles, setCycles] = useState<ReimbursementCycle[]>([]);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'date', 'bill_number', 'company', 'vendor', 'category', 'jc_name', 'sc_name', 'amount', 'status', 'process_type'
  ]);

  const fieldOptions = [
    { id: 'date', label: 'Date' },
    { id: 'bill_number', label: 'Bill Number' },
    { id: 'company', label: 'Company' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'category', label: 'Category' },
    { id: 'jc_name', label: 'JC Name' },
    { id: 'jc_email', label: 'JC Email' },
    { id: 'jc_upi', label: 'JC UPI ID' },
    { id: 'sc_name', label: 'SC Name' },
    { id: 'sc_email', label: 'SC Email' },
    { id: 'sc_upi', label: 'SC UPI ID' },
    { id: 'amount', label: 'Amount' },
    { id: 'status', label: 'Status' },
    { id: 'process_type', label: 'Process Type' },
    { id: 'is_online', label: 'Is Online' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [billsRes, cyclesRes] = await Promise.all([
      supabase.from('bills').select(`
        *,
        users (id, name, email, upi_id),
        vendors (id, name),
        companies (id, name),
        categories (id, name),
        sc:users!bills_sc_id_fkey (id, name, email, upi_id)
      `).order('created_at', { ascending: false }),
      supabase.from('reimbursement_cycles').select('*').order('start_date', { ascending: false }),
    ]);

    if (billsRes.data) setBills(billsRes.data as Bill[]);
    if (cyclesRes.data) setCycles(cyclesRes.data);
  };

  const filteredBills = useMemo(() => {
    let result = bills;

    if (dateFrom) result = result.filter((b) => new Date(b.date) >= new Date(dateFrom));
    if (dateTo) result = result.filter((b) => new Date(b.date) <= new Date(dateTo));
    if (filterCycle) {
      const cycle = cycles.find((c) => c.id === filterCycle);
      if (cycle) {
        result = result.filter((b) => {
          const billDate = new Date(b.date);
          return billDate >= new Date(cycle.start_date) &&
            (cycle.end_date ? billDate <= new Date(cycle.end_date) : true);
        });
      }
    }

    return result;
  }, [bills, dateFrom, dateTo, filterCycle, cycles]);

  const exportToCSV = () => {
    const headers = selectedFields.map((f) => fieldOptions.find((opt) => opt.id === f)?.label || f);
    const rows = filteredBills.map((b) =>
      selectedFields.map((field) => {
        switch (field) {
          case 'date': return format(new Date(b.date), 'yyyy-MM-dd');
          case 'bill_number': return b.bill_number || '';
          case 'company': return b.companies?.name || '';
          case 'vendor': return b.vendors?.name || '';
          case 'category': return b.categories?.name || '';
          case 'jc_name': return b.users?.name || '';
          case 'jc_email': return b.users?.email || '';
          case 'jc_upi': return b.users?.upi_id || '';
          case 'sc_name': return b.sc?.name || '';
          case 'sc_email': return b.sc?.email || '';
          case 'sc_upi': return b.sc?.upi_id || '';
          case 'amount': return b.amount.toString();
          case 'status': return b.status;
          case 'process_type': return b.process_type;
          case 'is_online': return b.is_online ? 'Yes' : 'No';
          default: return '';
        }
      })
    );

    const csv = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <h2 className="text-lg font-semibold">Export Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Select fields and filters for your export</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Date Range</h3>
            <div className="flex gap-4">
              <Input type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <Input type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Or by Cycle</label>
                <select value={filterCycle} onChange={(e) => setFilterCycle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Select Cycle</option>
                  {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Select Fields to Export</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {fieldOptions.map((field) => (
                <label key={field.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                    className="rounded text-indigo-600"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{filteredBills.length} bills will be exported</p>
                <p className="text-sm text-gray-500">{selectedFields.length} fields selected</p>
              </div>
              <Button onClick={exportToCSV} disabled={selectedFields.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Preview</h2>
        </CardHeader>
        <CardContent>
          {filteredBills.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">First 5 rows preview:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-50">
                      {selectedFields.slice(0, 5).map((f) => (
                        <th key={f} className="px-2 py-1 border">{fieldOptions.find((o) => o.id === f)?.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.slice(0, 5).map((b, i) => (
                      <tr key={i}>
                        {selectedFields.slice(0, 5).map((f) => (
                          <td key={f} className="px-2 py-1 border truncate max-w-[100px]">
                            {f === 'date' ? format(new Date(b.date), 'dd MMM') :
                             f === 'amount' ? `₹${b.amount}` :
                             f === 'company' ? b.companies?.name :
                             f === 'vendor' ? b.vendors?.name :
                             f === 'category' ? b.categories?.name :
                             f === 'jc_name' ? b.users?.name :
                             f === 'sc_name' ? b.sc?.name :
                             f === 'jc_email' ? b.users?.email :
                             f === 'sc_email' ? b.sc?.email :
                             f === 'jc_upi' ? b.users?.upi_id :
                             f === 'sc_upi' ? b.sc?.upi_id :
                             f === 'status' ? b.status :
                             f === 'process_type' ? b.process_type :
                             f === 'bill_number' ? b.bill_number :
                             f === 'is_online' ? (b.is_online ? 'Yes' : 'No') : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No bills match the selected filters</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DropdownsManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; table: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [v, c, cat] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);
    if (v.data) setVendors(v.data);
    if (c.data) setCompanies(c.data);
    if (cat.data) setCategories(cat.data);
    setLoading(false);
  };

  const handleAdd = async (table: string) => {
    if (!newItem.trim()) return;
    await supabase.from(table).insert([{ name: newItem.trim() }]);
    setNewItem('');
    setShowAddModal(null);
    fetchData();
  };

  const handleEdit = async () => {
    if (!editingItem) return;
    await supabase.from(editingItem.table).update({ name: editingItem.name }).eq('id', editingItem.id);
    setEditingItem(null);
    fetchData();
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm('Delete this item?')) return;
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {[
        { title: 'Vendors', items: vendors, table: 'vendors' },
        { title: 'Companies', items: companies, table: 'companies' },
        { title: 'Categories', items: categories, table: 'categories' },
      ].map(({ title, items, table }) => (
        <Card key={table}>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold">{title}</h3>
            <Button size="sm" onClick={() => setShowAddModal(table)}><Plus className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y max-h-96 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingItem({ id: item.id, name: item.name, table })} className="p-1 text-gray-400 hover:text-gray-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(table, item.id)} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              {items.length === 0 && <li className="px-4 py-8 text-center text-gray-500">No items</li>}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Modal isOpen={!!showAddModal} onClose={() => setShowAddModal(null)} title={`Add ${showAddModal}`}>
        <div className="flex gap-2">
          <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={`Enter ${showAddModal} name`} onKeyDown={(e) => e.key === 'Enter' && showAddModal && handleAdd(showAddModal)} />
          <Button onClick={() => showAddModal && handleAdd(showAddModal)}>Add</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        {editingItem && (
          <div className="flex gap-2">
            <Input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleEdit()} />
            <Button onClick={handleEdit}>Save</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<{ name: string; email: string; roll_no: string; role: 'JC' | 'SC' | 'F_S'; upi_id: string }>({ name: '', email: '', roll_no: '', role: 'JC', upi_id: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) setUsers(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    await supabase.from('users').insert([{ ...newUser, upi_id: newUser.upi_id || null }]);
    setNewUser({ name: '', email: '', roll_no: '', role: 'JC', upi_id: '' });
    setShowAddUser(false);
    fetchData();
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    await supabase.from('users').update({ name: editingUser.name, email: editingUser.email, roll_no: editingUser.roll_no, role: editingUser.role, upi_id: editingUser.upi_id || null }).eq('id', editingUser.id);
    setEditingUser(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await supabase.from('users').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Users</h2>
        <Button onClick={() => setShowAddUser(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold">Junior Coordinators ({users.filter(u => u.role === 'JC').length})</h3></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHeadCell>Name</TableHeadCell><TableHeadCell>Email</TableHeadCell><TableHeadCell>UPI ID</TableHeadCell><TableHeadCell>Actions</TableHeadCell></TableRow></TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'JC').map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs font-mono">{u.upi_id || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="p-1" onClick={() => setEditingUser(u)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="p-1" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold">Senior Coordinators ({users.filter(u => u.role === 'SC').length})</h3></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHeadCell>Name</TableHeadCell><TableHeadCell>Email</TableHeadCell><TableHeadCell>UPI ID</TableHeadCell><TableHeadCell>Actions</TableHeadCell></TableRow></TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'SC').map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs font-mono">{u.upi_id || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="p-1" onClick={() => setEditingUser(u)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" className="p-1" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add User">
        <div className="space-y-4">
          <Input label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
          <Input label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <Input label="Roll Number" value={newUser.roll_no} onChange={(e) => setNewUser({ ...newUser, roll_no: e.target.value })} />
          <Input label="UPI ID (optional)" value={newUser.upi_id} onChange={(e) => setNewUser({ ...newUser, upi_id: e.target.value })} placeholder="name@upi" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'JC' | 'SC' | 'F_S' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="JC">Junior Coordinator</option>
              <option value="SC">Senior Coordinator</option>
              <option value="F_S">FnS</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button><Button onClick={handleAdd}>Add User</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        {editingUser && (
          <div className="space-y-4">
            <Input label="Name" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
            <Input label="Email" type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
            <Input label="Roll Number" value={editingUser.roll_no} onChange={(e) => setEditingUser({ ...editingUser, roll_no: e.target.value })} />
            <Input label="UPI ID" value={editingUser.upi_id || ''} onChange={(e) => setEditingUser({ ...editingUser, upi_id: e.target.value })} placeholder="name@upi" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'JC' | 'SC' | 'F_S' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="JC">Junior Coordinator</option>
                <option value="SC">Senior Coordinator</option>
                <option value="F_S">FnS</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4"><Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button><Button onClick={handleUpdate}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function POCManager() {
  const [pocMappings, setPocMappings] = useState<POCMapping[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pocRes, usersRes] = await Promise.all([
      supabase.from('poc_mapping').select(`
        *,
        sc:users!poc_mapping_sc_id_fkey (id, name),
        fs_jc:users!poc_mapping_fs_jc_id_fkey (id, name)
      `),
      supabase.from('users').select('*').order('name'),
    ]);
    if (pocRes.data) setPocMappings(pocRes.data as POCMapping[]);
    if (usersRes.data) setUsers(usersRes.data);
    setLoading(false);
  };

  const handleAssign = async (scId: string, fsJcId: string) => {
    const existing = pocMappings.find((p) => p.sc_id === scId);
    if (existing) {
      await supabase.from('poc_mapping').update({ fs_jc_id: fsJcId }).eq('id', existing.id);
    } else {
      await supabase.from('poc_mapping').insert([{ sc_id: scId, fs_jc_id: fsJcId }]);
    }
    fetchData();
  };

  const handleRemove = async (id: string) => {
    await supabase.from('poc_mapping').delete().eq('id', id);
    fetchData();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />;

  const scUsers = users.filter((u) => u.role === 'SC');
  const fsUsers = users.filter((u) => u.role === 'F_S');

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">SC to FnS POC Mapping</h2>
        <p className="text-sm text-gray-500">Assign each SC to their designated FnS POC</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadCell>Senior Coordinator</TableHeadCell>
              <TableHeadCell>Assigned FnS POC</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scUsers.map((sc) => {
              const mapping = pocMappings.find((p) => p.sc_id === sc.id);
              return (
                <TableRow key={sc.id}>
                  <TableCell className="font-medium">{sc.name}</TableCell>
                  <TableCell>
                    <select
                      value={mapping?.fs_jc_id || ''}
                      onChange={(e) => handleAssign(sc.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select FnS POC</option>
                      {fsUsers.map((fs) => <option key={fs.id} value={fs.id}>{fs.name}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    {mapping && <Button variant="outline" size="sm" onClick={() => handleRemove(mapping.id)}>Remove</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CyclesManager() {
  const [cycles, setCycles] = useState<ReimbursementCycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('reimbursement_cycles').select('*').order('start_date', { ascending: false });
    if (data) setCycles(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    const now = new Date();
    const name = format(now, 'MMMM yyyy');
    await supabase.from('reimbursement_cycles').insert([{ name, start_date: format(now, 'yyyy-MM-01'), is_active: false, is_closed: false }]);
    fetchData();
  };

  const handleToggleActive = async (cycle: ReimbursementCycle) => {
    if (!cycle.is_active) {
      await supabase.from('reimbursement_cycles').update({ is_active: false }).neq('id', cycle.id);
    }
    await supabase.from('reimbursement_cycles').update({ is_active: !cycle.is_active }).eq('id', cycle.id);
    fetchData();
  };

  const handleClose = async (cycle: ReimbursementCycle) => {
    if (!confirm(`Close cycle "${cycle.name}"? This cannot be undone.`)) return;
    await supabase.from('reimbursement_cycles').update({ is_closed: true, is_active: false, end_date: format(new Date(), 'yyyy-MM-dd') }).eq('id', cycle.id);
    fetchData();
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Reimbursement Cycles</h2>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />New Cycle</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>Cycle Name</TableHeadCell>
                <TableHeadCell>Start Date</TableHeadCell>
                <TableHeadCell>End Date</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell className="font-medium">{cycle.name}</TableCell>
                  <TableCell>{format(new Date(cycle.start_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{cycle.end_date ? format(new Date(cycle.end_date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell>
                    {cycle.is_closed ? <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Closed</span> :
                     cycle.is_active ? <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Active</span> :
                     <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Inactive</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!cycle.is_closed && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(cycle)}>
                            {cycle.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleClose(cycle)}>Close</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
