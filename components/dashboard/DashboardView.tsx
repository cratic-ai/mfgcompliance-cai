/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import KpiCard from './KpiCard';
import QueryVolumeChart from './QueryVolumeChart';
import TopDocumentsChart from './TopDocumentsChart';
import RecentActivity from './RecentActivity';
import DocumentChatbotIcon from '../icons/DocumentChatbotIcon';
import DocumentsControlIcon from '../icons/DocumentsControlIcon';
import ClockIcon from '../icons/ClockIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';

// Mock Data for the Dashboard
const kpiData = {
    totalSops: { value: 128, change: 5 },
    activeStores: { value: 12, change: 1 },
    avgQueryTime: { value: 2.3, change: -0.2 },
    complianceRate: { value: 98.5, change: 0.5 },
};

const DashboardView: React.FC = () => {
    return (
        <div className="p-4 sm:p-6 bg-cratic-background space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-cratic-text-primary">Dashboard</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total SOPs"
                    value={kpiData.totalSops.value.toString()}
                    change={`+${kpiData.totalSops.change} this week`}
                    icon={<DocumentChatbotIcon />}
                    changeType="increase"
                />
                <KpiCard
                    title="Active Document Stores"
                    value={kpiData.activeStores.value.toString()}
                    change={`+${kpiData.activeStores.change} this month`}
                    icon={<DocumentsControlIcon />}
                    changeType="increase"
                />
                <KpiCard
                    title="Avg. Query Time (s)"
                    value={kpiData.avgQueryTime.value.toFixed(1)}
                    change={`${kpiData.avgQueryTime.change.toFixed(1)}s faster`}
                    icon={<ClockIcon />}
                    changeType="decrease"
                />
                <KpiCard
                    title="Compliance Rate (%)"
                    value={kpiData.complianceRate.value.toFixed(1)}
                    change={`+${kpiData.complianceRate.change}% vs last audit`}
                    icon={<CheckCircleIcon />}
                    changeType="increase"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main chart */}
                <div className="lg:col-span-2 bg-cratic-panel p-4 sm:p-6 rounded-lg border border-cratic-border">
                    <QueryVolumeChart />
                </div>

                {/* Side panel */}
                <div className="bg-cratic-panel p-4 sm:p-6 rounded-lg border border-cratic-border">
                    <RecentActivity />
                </div>
            </div>

             {/* Bottom Content */}
            <div className="grid grid-cols-1 gap-6">
                 <div className="bg-cratic-panel p-4 sm:p-6 rounded-lg border border-cratic-border">
                    <TopDocumentsChart />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
