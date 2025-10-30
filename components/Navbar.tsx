import React, { useContext, useState, useRef, useEffect } from 'react';
import type { AppView, User } from '../types';
import { AuthContext } from '../context/AuthContext';
import { HomeIcon, PlusIcon, MessageIcon, UserIcon, LogoutIcon, BellIcon, SettingsIcon, MenuIcon, CloseIcon } from './Icons';
import Avatar from './Avatar';

interface NavButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    text: string;
    notificationCount?: number;
    isActive?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, icon, text, notificationCount = 0, isActive = false }) => (
    <button onClick={onClick} className={`relative flex items-center w-full text-left space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? 'bg-hover text-text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary'}`}>
        {icon}
        <span>{text}</span>
        {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                {notificationCount}
            </span>
        )}
    </button>
);

const Navbar: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const auth = useContext(AuthContext);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const unreadNotifications = auth?.currentUser?.profile.notifications.filter(n => !n.isRead).length || 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const navAction = (view: AppView) => {
      setView(view);
      setMobileMenuOpen(false);
  }

  const renderNavLinks = (isMobile = false) => (
    <>
      <NavButton onClick={() => navAction({ type: 'HOME' })} icon={<HomeIcon className="h-5 w-5" />} text="Home" />
      {auth?.currentUser && (
        <>
          <NavButton onClick={() => navAction({ type: 'RECENT_CHATS' })} icon={<MessageIcon className="h-5 w-5" />} text="Recent Chats" />
          <NavButton onClick={() => navAction({ type: 'CREATE_CHARACTER' })} icon={<PlusIcon className="h-5 w-5" />} text="Create" />
          <NavButton onClick={() => navAction({ type: 'NOTIFICATIONS' })} icon={<BellIcon className="h-5 w-5" />} text="Notifications" notificationCount={unreadNotifications} />
          {auth.currentUser.userType === 'Admin' && (
            <NavButton onClick={() => navAction({ type: 'ADMIN_SETTINGS' })} icon={<SettingsIcon className="h-5 w-5" />} text="Admin Settings" />
          )}
        </>
      )}
       {!auth?.currentUser && isMobile && (
           <NavButton onClick={() => navAction({ type: 'PROFILE' })} icon={<UserIcon className="h-5 w-5" />} text="Login" />
       )}
    </>
  );

  return (
    <header className="bg-secondary text-text-primary border-b border-border sticky top-0 z-30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
             <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-text-secondary hover:text-text-primary">
                 {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
             </button>
            <h1 className="text-2xl font-bold cursor-pointer hover:text-accent-primary transition-colors" onClick={() => setView({ type: 'HOME' })}>HereHaven</h1>
            <nav className="hidden md:flex space-x-1">
              {renderNavLinks()}
            </nav>
          </div>
          <div className="flex items-center">
             {auth?.currentUser ? (
                <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2">
                        <Avatar imageId={auth.currentUser.profile.avatarUrl} alt={auth.currentUser.profile.name} className="h-8 w-8 rounded-full object-cover"/>
                        <span className="hidden sm:block text-sm font-medium">{auth.currentUser.profile.name}</span>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-tertiary rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-border">
                            <div className="py-1">
                                <button onClick={() => { navAction({ type: 'PROFILE' }); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary">
                                    <UserIcon className="h-5 w-5 mr-3" /> Profile
                                </button>
                                <div className="border-t border-border my-1"></div>
                                <button onClick={() => { auth.logout(); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary">
                                    <LogoutIcon className="h-5 w-5 mr-3" /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             ) : (
                <button onClick={() => setView({ type: 'PROFILE' })} className="hidden md:block px-4 py-2 rounded-md text-sm font-medium bg-accent-secondary text-white hover:bg-accent-secondary-hover">
                    Login
                </button>
             )}
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
          <div className="md:hidden bg-secondary border-t border-border">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  {renderNavLinks(true)}
              </div>
          </div>
      )}
    </header>
  );
};

export default Navbar;