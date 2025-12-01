/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CraticLogoIcon from './icons/CraticLogoIcon';
import DashboardIcon from './icons/DashboardIcon';
import DocumentChatbotIcon from './icons/DocumentChatbotIcon';
import DocumentsControlIcon from './icons/DocumentsControlIcon';

interface SidebarProps {
    isOpen: boolean;
    closeSidebar: () => void;
}

interface SidebarLinkProps {
    icon: React.ReactNode;
    label: string;
    path: string;
    badge?: number;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ icon, label, path, badge }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isActive = location.pathname === path;

    const handleClick = () => {
        navigate(path);
    };

    const activeClass = isActive
        ? 'bg-cratic-purple-active-bg text-cratic-purple'
        : 'text-cratic-text-primary hover:bg-cratic-subtle';

    const iconClass = isActive ? 'text-cratic-purple' : 'text-cratic-text-secondary';

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`flex items-center px-3 py-2.5 rounded-lg transition-colors text-sm font-medium w-full text-left ${activeClass}`}
        >
            <span className={iconClass}>{icon}</span>
            <span className="ml-3 flex-1">{label}</span>
            {badge && <span className="bg-cratic-purple text-white text-xs font-semibold px-2 py-0.5 rounded-full">{badge}</span>}
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
    const sidebarClass = `w-64 bg-cratic-panel border-r border-cratic-border flex-col flex-shrink-0 fixed md:relative h-full z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex`;

    return (
        <>
            {isOpen && <div onClick={closeSidebar} className="fixed inset-0 bg-black/50 z-20 md:hidden" aria-hidden="true"></div>}

            <aside className={sidebarClass}>
                <div className="h-16 flex items-center px-4 border-b border-cratic-border flex-shrink-0">
                    <a href="https://mfgcompliance.craticai.com/" target="_blank" rel="noopener noreferrer">
                        <CraticLogoIcon />
                    </a>
                    <div className="ml-3">
                        <h1 className="text-base font-bold text-cratic-text-primary">CraticAI</h1>
                        <p className="text-xs text-cratic-text-secondary">AI-Powered Workspace</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                    <div>
                        <div className="space-y-1">
                            <SidebarLink icon={<DashboardIcon />} label="Dashboard" path="/dashboard" />
                        </div>
                    </div>
                    <div>
                        <h2 className="px-3 text-xs font-bold uppercase text-cratic-purple-text tracking-wider mb-2">SOP Assistant</h2>
                        <div className="space-y-1">
                            <SidebarLink icon={<DocumentChatbotIcon />} label="Document Chatbot" path="/chat" />
                            <SidebarLink icon={<DocumentsControlIcon />} label="Documents Control" path="/files" />
                        </div>
                    </div>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
