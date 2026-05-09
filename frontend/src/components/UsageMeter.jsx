import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../api';

export default function UsageMeter() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const data = await fetchWithAuth('/usage/stats');
      setUsage(data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!usage) return null;

  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'bg-red-600';
    if (percentage >= 75) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const ProgressBar = ({ label, used, limit, percentage }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">
          {used} / {limit === 999999 ? '∞' : limit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getColorClass(percentage)}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );

  const shouldShowUpgrade = 
    usage.vehicles.percentage >= 75 || 
    usage.orders.percentage >= 75 || 
    usage.users.percentage >= 75;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Usage & Limits</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full uppercase font-medium">
          {usage.plan}
        </span>
      </div>

      <div className="space-y-3">
        <ProgressBar 
          label="Vehicles"
          used={usage.vehicles.used}
          limit={usage.vehicles.limit}
          percentage={usage.vehicles.percentage}
        />
        <ProgressBar 
          label="Orders (this month)"
          used={usage.orders.used}
          limit={usage.orders.limit}
          percentage={usage.orders.percentage}
        />
        <ProgressBar 
          label="Team Members"
          used={usage.users.used}
          limit={usage.users.limit}
          percentage={usage.users.percentage}
        />
      </div>

      {shouldShowUpgrade && usage.plan !== 'enterprise' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a
            href="/subscription"
            className="block w-full text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 transition font-medium text-sm"
          >
            🚀 Upgrade Plan
          </a>
        </div>
      )}

      {usage.plan === 'starter' && (
        <div className="mt-3 text-xs text-gray-600 text-center">
          <a href="/subscription" className="text-blue-600 hover:text-blue-800 underline">
            See all plans →
          </a>
        </div>
      )}
    </div>
  );
}
