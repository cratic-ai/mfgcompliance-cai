/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import FileTextIcon from '../icons/FileTextIcon';

const topDocumentsData = [
    { name: 'Machine Calibration SOP', queries: 142, category: 'Maintenance' },
    { name: 'Assembly Line Safety Protocol', queries: 119, category: 'Safety' },
    { name: 'Quality Control Checklist Q3', queries: 98, category: 'QA' },
    { name: 'Emergency Shutdown Procedure', queries: 76, category: 'Safety' },
    { name: 'Component Handling Guide', queries: 51, category: 'Production' },
];


const TopDocumentsChart: React.FC = () => {
    return (
        <div>
            <h3 className="text-lg font-bold text-cratic-text-primary mb-4">Top Queried Documents</h3>
            <ul className="space-y-3">
                {topDocumentsData.map((doc, index) => (
                    <li key={index} className="flex items-center space-x-3 group p-2 -m-2 rounded-lg hover:bg-cratic-subtle">
                        <div className="flex-shrink-0 bg-cratic-purple-light p-2 rounded-lg text-cratic-purple">
                           <FileTextIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cratic-text-primary truncate">{doc.name}</p>
                            <p className="text-xs text-cratic-text-secondary">{doc.category}</p>
                        </div>
                        <p className="text-sm font-semibold text-cratic-text-primary flex-shrink-0">{doc.queries} <span className="font-normal text-cratic-text-secondary">queries</span></p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TopDocumentsChart;
