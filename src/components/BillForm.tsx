import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Select } from './ui';
import { Upload, AlertCircle, Info } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { format } from 'date-fns';
import type { Vendor, Company, Category, ProcessType, User } from '../types';

interface BillFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  pocName?: string;
  isForSC?: boolean;
  editBill?: {
    id: string;
    date: string;
    vendor_id: string;
    bill_number: string;
    company_id: string;
    category_id: string;
    process_type: ProcessType;
    amount: number;
    sc_id: string;
    file_url: string | null;
    is_online: boolean;
  };
}

export function BillForm({ onSuccess, onCancel, pocName, isForSC, editBill }: BillFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scUsers, setScUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    vendor_id: editBill?.vendor_id || '',
    bill_number: editBill?.bill_number || '',
    company_id: editBill?.company_id || '',
    category_id: editBill?.category_id || '',
    process_type: editBill?.process_type || 'PPT' as ProcessType,
    amount: editBill?.amount?.toString() || '',
    sc_id: isForSC ? (user?.id || '') : (editBill?.sc_id || ''),
    is_online: editBill?.is_online || false,
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  const fetchDropdowns = async () => {
    const [vendorsRes, companiesRes, categoriesRes, usersRes] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('users').select('*').eq('role', 'SC').order('name'),
    ]);

    if (vendorsRes.data) setVendors(vendorsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (usersRes.data) setScUsers(usersRes.data);
  };

  const checkDuplicate = async (vendorId: string, billNumber: string) => {
    if (!vendorId || !billNumber) return;

    const { data } = await supabase
      .from('bills')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('bill_number', billNumber)
      .single();

    setIsDuplicate(!!data);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    if (name === 'vendor_id' || name === 'bill_number') {
      await checkDuplicate(
        name === 'vendor_id' ? value : formData.vendor_id,
        name === 'bill_number' ? value : formData.bill_number
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const isImage = selectedFile.type.startsWith('image/');
    if (isImage) {
      try {
        const compressed = await imageCompression(selectedFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
        });
        setFile(new File([compressed], selectedFile.name, { type: selectedFile.type }));
      } catch {
        setFile(selectedFile);
      }
    } else {
      setFile(selectedFile);
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let fileUrl = editBill?.file_url || null;

      if (file) {
        const scUser = scUsers.find((sc) => sc.id === formData.sc_id);
        const company = companies.find((c) => c.id === formData.company_id);
        const vendor = vendors.find((v) => v.id === formData.vendor_id);

        const fileName = `${scUser?.name || 'Unknown'}_${format(new Date(formData.date), 'ddMMyyyy')}_${company?.name || 'Company'}_${vendor?.name || 'Vendor'}_${formData.bill_number}.${file.name.split('.').pop()}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bills')
          .upload(`${format(new Date(formData.date), 'yyyy-MM')}/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('bills')
          .getPublicUrl(uploadData.path);

        fileUrl = urlData.publicUrl;
      }

      const billData = {
        user_id: user.id,
        date: formData.date,
        vendor_id: formData.vendor_id,
        bill_number: formData.bill_number,
        company_id: formData.company_id,
        category_id: formData.category_id,
        process_type: formData.process_type,
        amount: parseFloat(formData.amount),
        sc_id: formData.sc_id,
        is_online: formData.is_online,
        file_url: fileUrl,
        status: 'pending' as const,
      };

      if (editBill?.id) {
        const { error: updateError } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', editBill.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('bills').insert([billData]);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit bill');
    } finally {
      setLoading(false);
    }
  };

  const processTypes: { value: ProcessType; label: string }[] = [
    { value: 'PPT', label: 'Pre-Placement Talk' },
    { value: 'Interview', label: 'Interview' },
    { value: 'Test', label: 'Test' },
    { value: 'GD', label: 'Group Discussion' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {isDuplicate && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">A bill with this vendor and bill number already exists.</p>
        </div>
      )}

      {pocName && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <Info className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Kindly give the physical bill to <strong>{pocName}</strong>.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          name="date"
          label="Date of Bill"
          value={formData.date}
          onChange={handleInputChange}
          required
        />

        <Select
          id="process_type"
          name="process_type"
          label="Process Type"
          value={formData.process_type}
          onChange={handleInputChange}
          options={processTypes}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="company_id"
          name="company_id"
          label="Company Name"
          value={formData.company_id}
          onChange={handleInputChange}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select company"
          required
        />

        {!isForSC && (
          <Select
            id="sc_id"
            name="sc_id"
            label="Associated SC"
            value={formData.sc_id}
            onChange={handleInputChange}
            options={scUsers.map((sc) => ({ value: sc.id, label: sc.name }))}
            placeholder="Select SC"
            required
          />
        )}
        {isForSC && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500">Your name will be auto-recorded</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="vendor_id"
          name="vendor_id"
          label="Vendor"
          value={formData.vendor_id}
          onChange={handleInputChange}
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Select vendor"
          required
        />

        <Select
          id="category_id"
          name="category_id"
          label="Category"
          value={formData.category_id}
          onChange={handleInputChange}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select category"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="bill_number"
          name="bill_number"
          label="Bill Number"
          value={formData.bill_number}
          onChange={handleInputChange}
          placeholder="Invoice/receipt number"
          required
        />

        <Input
          type="number"
          id="amount"
          name="amount"
          label="Amount (₹)"
          value={formData.amount}
          onChange={handleInputChange}
          placeholder="0.00"
          min="0"
          step="0.01"
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_online"
          name="is_online"
          checked={formData.is_online}
          onChange={handleInputChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="is_online" className="text-sm text-gray-700">
          This is a digital invoice (e.g., Swiggy/Zomato) - no physical bill required
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Bill Image/PDF {formData.is_online ? '(Screenshot of digital invoice)' : '(Photo of physical bill)'}
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors">
          <div className="space-y-1 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || isDuplicate}>
          {loading ? 'Submitting...' : editBill ? 'Update Bill' : 'Submit Bill'}
        </Button>
      </div>
    </form>
  );
}
