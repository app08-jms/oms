import {
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  PERMISSION_FEATURES,
  isFeatureAction,
  type FeatureKey,
  type PermissionAction,
  type PermissionGrid,
} from '@/features/permissions/permissionRules';

interface PermissionMatrixProps {
  grid: PermissionGrid;
  inheritedGrid?: PermissionGrid;
  onToggle: (feature: FeatureKey, action: PermissionAction) => void;
}

const HEAD_CLASS = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C6670]';
const CHECKBOX_CLASS =
  'h-4 w-4 cursor-pointer rounded border-[#CBD5E1] accent-[#4F7284] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7284]/40';

export function PermissionMatrix({ grid, inheritedGrid, onToggle }: PermissionMatrixProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#E2E8F0]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th scope="col" className={HEAD_CLASS}>Tính năng</th>
              {PERMISSION_ACTIONS.map((action) => (
                <th key={action} scope="col" className={`${HEAD_CLASS} text-center`}>
                  {PERMISSION_ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {PERMISSION_FEATURES.map((feature) => (
              <tr key={feature.key} className="align-middle">
                <td className="max-w-xs px-4 py-3">
                  <p className="text-sm font-medium text-[#1F2A30]">{feature.name}</p>
                  <p className="mt-0.5 text-xs text-[#5C6670]">{feature.note}</p>
                </td>
                {PERMISSION_ACTIONS.map((action) => {
                  if (!isFeatureAction(feature, action)) {
                    return (
                      <td key={action} className="px-4 py-3 text-center text-sm text-[#CBD5E1]">
                        —
                      </td>
                    );
                  }
                  const checked = grid[feature.key][action];
                  const inherited = inheritedGrid?.[feature.key][action];
                  const isCustom = inherited !== undefined && inherited !== checked;
                  return (
                    <td key={action} className={`px-4 py-3 text-center transition-colors duration-150 ${isCustom ? 'bg-amber-50' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="checkbox"
                          aria-label={`${feature.name} - ${PERMISSION_ACTION_LABELS[action]}`}
                          checked={checked}
                          onChange={() => onToggle(feature.key, action)}
                          className={CHECKBOX_CLASS}
                        />
                        {inheritedGrid && (
                          <span className={`text-[11px] font-medium ${isCustom ? 'text-amber-700' : 'text-[#94A3B8]'}`}>
                            {isCustom ? (checked ? 'Cấp riêng' : 'Thu hồi') : 'Theo vai trò'}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
