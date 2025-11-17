/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const chartData = [
    { day: 'Mon', queries: 65 },
    { day: 'Tue', queries: 59 },
    { day: 'Wed', queries: 80 },
    { day: 'Thu', queries: 81 },
    { day: 'Fri', queries: 56 },
    { day: 'Sat', queries: 55 },
    { day: 'Sun', queries: 40 },
];

const QueryVolumeChart: React.FC = () => {
    const maxValue = Math.max(...chartData.map(d => d.queries));

    return (
        <div>
            <h3 className="text-lg font-bold text-cratic-text-primary mb-1">Query Volume</h3>
            <p className="text-sm text-cratic-text-secondary mb-6">Last 7 Days</p>
            <div className="flex justify-between items-end h-48 space-x-2" aria-label="Query volume bar chart">
                {chartData.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                        <div
                            className="w-full bg-cratic-purple-light hover:bg-cratic-purple transition-colors rounded-t-md"
                            style={{ height: `${(data.queries / maxValue) * 100}%` }}
                            role="presentation"
                            aria-label={`${data.day}: ${data.queries} queries`}
                        >
                             <div className="relative">
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-cratic-text-primary text-white text-xs px-2 py-1 rounded-md whitespace-nowrap">
                                    {data.queries} queries
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-cratic-text-secondary mt-2">{data.day}</span>
                    </div>
                ))}
            </div>
             <div className="mt-4 border-t border-cratic-border"></div>
        </div>
    );
};

export default QueryVolumeChart;
