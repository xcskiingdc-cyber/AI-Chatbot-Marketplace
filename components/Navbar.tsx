import React, { useContext } from 'react';
import type { AppView } from '../types';
import { AuthContext } from '../context/AuthContext';
import { HomeIcon, PlusIcon, MessageIcon, UserIcon, LogoutIcon, BellIcon, SettingsIcon } from './Icons';

interface NavButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    text: string;
    notificationCount?: number;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, icon, text, notificationCount = 0 }) => (
    <button onClick={onClick} className="relative flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200">
        {icon}
        <span>{text}</span>
        {notificationCount > 0 && (
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">
                {notificationCount}
            </span>
        )}
    </button>
);


const Navbar: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const auth = useContext(AuthContext);
  const unreadNotifications = auth?.currentUser?.profile.notifications.filter(n => !n.isRead).length || 0;

  return (
    <header className="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-100 cursor-pointer" onClick={() => setView({ type: 'HOME' })}>AI Chatbot Marketplace</h1>
            <nav className="hidden md:flex space-x-1">
              <NavButton onClick={() => setView({ type: 'HOME' })} icon={<HomeIcon className="h-5 w-5" />} text="Home" />
              {auth?.currentUser && (
                  <>
                    <NavButton onClick={() => setView({ type: 'PROFILE' })} icon={<UserIcon className="h-5 w-5" />} text="Profile" />
                    <NavButton onClick={() => setView({ type: 'CREATE_CHARACTER' })} icon={<PlusIcon className="h-5 w-5" />} text="Create" />
                    <NavButton onClick={() => setView({ type: 'RECENT_CHATS' })} icon={<MessageIcon className="h-5 w-5" />} text="Recent Chats" />
                    <NavButton onClick={() => setView({ type: 'NOTIFICATIONS' })} icon={<BellIcon className="h-5 w-5" />} text="Notifications" notificationCount={unreadNotifications} />
                    {auth.currentUser.userType === 'Admin' && (
                        <NavButton onClick={() => setView({ type: 'ADMIN_SETTINGS' })} icon={<SettingsIcon className="h-5 w-5" />} text="Admin Settings" />
                    )}
                  </>
              )}
            </nav>
          </div>
          <div className="flex items-center">
             {auth?.currentUser ? (
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">Welcome, {auth.currentUser.profile.name}</span>
                    <button onClick={auth.logout} className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800" aria-label="Logout">
                        <LogoutIcon className="h-5 w-5" />
                    </button>
                </div>
             ) : (
                <NavButton onClick={() => setView({ type: 'PROFILE' })} icon={<UserIcon className="h-5 w-5" />} text="Login" />
             )}
          </div>
        </div>
      </div>
       {/* A responsive mobile nav could be added here for smaller screens */}
    </header>
  );
};

export default Navbar;