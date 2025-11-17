/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import UploadIcon from '../icons/UploadIcon';
import DocumentChatbotIcon from '../icons/DocumentChatbotIcon';
import PlusIcon from '../icons/PlusIcon';

const activityData = [
    {
        icon: <DocumentChatbotIcon />,
        text: "New query on 'Safety Protocol v2.1'",
        time: "2m ago",
    },
    {
        icon: <UploadIcon />,
        text: "Uploaded 'Calibration-XYZ.pdf'",
        time: "15m ago",
    },
     {
        icon: <DocumentChatbotIcon />,
        text: "New query on 'Assembly Line Maintenance'",
        time: "1h ago",
    },
    {
        icon: <PlusIcon />,
        text: "Store 'Assembly Line B' created",
        time: "3h ago",
    },
    {
        icon: <UploadIcon />,
        text: "Uploaded 3 documents to 'Quality Control'",
        time: "Yesterday",
    },
];


const RecentActivity: React.FC = () => {
    return (
        <div>
            <h3 className="text-lg font-bold text-cratic-text-primary mb-4">Recent Activity</h3>
            <ul className="space-y-4">
                {activityData.map((item, index) => (
                    <li key={index} className="flex items-center space-x-3">
                        <div className="flex-shrink-0 bg-cratic-subtle p-2 rounded-full text-cratic-purple">
                           {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-cratic-text-primary truncate">{item.text}</p>
                        </div>
                        <p className="text-xs text-cratic-text-secondary flex-shrink-0">{item.time}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RecentActivity;
