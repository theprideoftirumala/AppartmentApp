/**
 * Status Badge Component
 */

import { getStatusColor } from '../../utils/helpers';

export default function StatusBadge({ status }) {
  const color = getStatusColor(status);
  return (
    <span className={`badge badge-${color}`}>
      {status}
    </span>
  );
}
