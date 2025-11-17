/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ArrowUpRightIcon from '../icons/ArrowUpRightIcon';
import ArrowDownRightIcon from '../icons/ArrowDownRightIcon';

interface KpiCardProps {
    title: string;
    value: string;
    change: string;
    icon: React.ReactNode;
    changeType: 'increase' | 'decrease';
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, icon, changeType }) => {
    const isIncrease = changeType === 'increase';
    return (
        <div className="bg-cratic-panel p-5 rounded-lg border border-cratic-border flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-cratic-text-secondary">{title}</h3>
                <div className="text-cratic-purple">{icon}</div>
            </div>
            <div>
                <p className="text-2xl sm:text-3xl font-bold text-cratic-text-primary">{value}</p>
                <div className="flex items-center text-xs mt-1">
                    <span className={`flex items-center ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncrease ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
                        <span className="font-semibold ml-1">{change}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default KpiCard;
