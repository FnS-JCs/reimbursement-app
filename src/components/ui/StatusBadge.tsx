import type { BillStatus } from '../../types';

interface StatusBadgeProps {
  status: BillStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<BillStatus, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
    reimbursed: { label: 'Reimbursed', className: 'bg-green-100 text-green-800' },
    handed_to_fs: { label: 'Handed to F&S', className: 'bg-blue-100 text-blue-800' },
    disputed: { label: 'Disputed', className: 'bg-red-100 text-red-800' },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
