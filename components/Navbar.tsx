
import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import type { AppView, User, Notification, DMConversation } from '../types';
import { AuthContext } from '../context/AuthContext';
import { HomeIcon, PlusIcon, MessageIcon, UserIcon, LogoutIcon, BellIcon, SettingsIcon, MenuIcon, CloseIcon, ShieldCheckIcon, TicketIcon, BookIcon, SystemMonitorIcon } from './Icons';
import Avatar from './Avatar';
import Logo from './Logo';

interface NavButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    text: string;
    notificationCount?: number;
    isActive?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ onClick, icon, text, notificationCount = 0, isActive = false }) => (
    <button onClick={onClick} className={`relative flex items-center w-full text-left space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/10 text-white shadow-sm backdrop-blur-sm' : 'text-text-secondary hover:bg-white/5 hover:text-white hover:shadow-sm'}`}>
        {icon}
        <span>{text}</span>
        {notificationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white shadow-glow">
                {notificationCount}
            </span>
        )}
    </button>
);

interface NavbarProps { 
    setView: (view: AppView) => void;
}

const Navbar: React.FC<NavbarProps> = ({ setView }) => {
  const auth = useContext(AuthContext);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Re-calculate counts whenever AuthContext changes (reports/tickets/alerts/etc are updated)
  const { userNotifications, moderatorNotifications } = useMemo(() => {
    if (!auth?.currentUser) return { userNotifications: 0, moderatorNotifications: 0 };
    
    // User Notifications (Likes, Follows, Comments, Replies, User DMs)
    const userRole = auth.currentUser.role;
    const generalModNotifTypes: Notification['type'][] = ['NEW_REPORT', 'NEW_AI_ALERT', 'NEW_TICKET'];
    
    let userCount = 0;
    if (auth.currentUser.profile.notifications) {
        auth.currentUser.profile.notifications.forEach(n => {
            if (!n.isRead) {
                // If it's a DM, check role. Admins see DM notifs in mod console usually, but personal ones here.
                // Current logic: NEW_DM goes to 'Messages' tab in NotificationsView for regular users.
                if (n.type === 'NEW_DM' && ['Admin', 'Assistant Admin', 'Moderator'].includes(userRole)) {
                     // Admin receiving DM -> likely mod business, handled by Mod Console Badge
                } else if (!generalModNotifTypes.includes(n.type)) {
                    userCount++;
                }
            }
        });
    }
    
    // Moderator Notifications (Reports, Alerts, Tickets)
    let modCount = 0;
    if (['Admin', 'Assistant Admin', 'Moderator'].includes(userRole)) {
        const pendingReports = auth.reports ? auth.reports.filter(r => !r.isResolved).length : 0;
        const newTickets = auth.tickets ? auth.tickets.filter(t => t.status === 'New').length : 0;
        const newAlerts = auth.aiAlerts ? auth.aiAlerts.filter(a => a.status === 'New').length : 0;
        
        // Check for unread admin DMs
        const unreadAdminDMs = auth.dmConversations ? Object.values(auth.dmConversations).filter((c: DMConversation) => c.hasUnreadByAdmin).length : 0;

        modCount = pendingReports + newTickets + newAlerts + unreadAdminDMs;
    }

    return { userNotifications: userCount, moderatorNotifications: modCount };
  }, [auth?.currentUser, auth?.reports, auth?.tickets, auth?.aiAlerts, auth?.dmConversations]);


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
      <NavButton onClick={() => navAction({ type: 'FORUM_HOME' })} icon={<BookIcon className="h-5 w-5" />} text="Forum" />
      {auth?.currentUser && (
        <>
          <NavButton onClick={() => navAction({ type: 'RECENT_CHATS' })} icon={<MessageIcon className="h-5 w-5" />} text="Recent Chats" />
          <NavButton onClick={() => navAction({ type: 'CREATE_CHARACTER' })} icon={<PlusIcon className="h-5 w-5" />} text="Create" />
          <NavButton onClick={() => navAction({ type: 'NOTIFICATIONS' })} icon={<BellIcon className="h-5 w-5" />} text="Notifications" notificationCount={userNotifications} />
          {['Admin', 'Assistant Admin', 'Moderator'].includes(auth.currentUser.role) && (
             <NavButton onClick={() => navAction({ type: 'MODERATOR_CONSOLE' })} icon={<TicketIcon className="h-5 w-5" />} text="Mod Console" notificationCount={moderatorNotifications} />
          )}
          {['Admin', 'Assistant Admin'].includes(auth.currentUser.role) && (
            <NavButton onClick={() => navAction({ type: 'ADMIN_CONSOLE' })} icon={<ShieldCheckIcon className="h-5 w-5" />} text="Admin Console" />
          )}
           {auth.currentUser.role === 'Admin' && (
            <NavButton onClick={() => navAction({ type: 'AI_API_SETTINGS' })} icon={<SettingsIcon className="h-5 w-5" />} text="AI API Settings" />
          )}
          {auth.currentUser.role === 'Admin' && (
            <NavButton onClick={() => navAction({ type: 'SYSTEM_MONITOR' })} icon={<SystemMonitorIcon className="h-5 w-5" />} text="System Monitor" />
          )}
        </>
      )}
       {!auth?.currentUser && isMobile && (
           <NavButton onClick={() => navAction({ type: 'PROFILE' })} icon={<UserIcon className="h-5 w-5" />} text="Login" />
       )}
    </>
  );

  return (
    <header className="glass-strong text-text-primary sticky top-0 z-30 border-b border-white/5 shadow-lg backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
             <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-text-secondary hover:text-white transition-colors">
                 {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
             </button>
            <button onClick={() => setView({ type: 'HOME' })} className="flex-shrink-0 hover:opacity-90 transition-opacity">
              <Logo className="h-14 w-auto" logoUrl={auth?.siteLogo} />
            </button>
            <nav className="hidden md:flex space-x-1 ml-4">
              {renderNavLinks()}
            </nav>
          </div>
          <div className="flex items-center">
             {auth?.currentUser ? (
                <div className="relative" ref={userMenuRef}>
                    <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2 hover:bg-white/5 p-1.5 rounded-full transition-colors border border-transparent hover:border-white/10">
                        <Avatar imageId={auth.currentUser.profile.avatarUrl} alt={auth.currentUser.profile.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"/>
                        <span className="hidden sm:block text-sm font-medium">{auth.currentUser.profile.name}</span>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute right-0 mt-2 w-64 origin-top-right bg-primary rounded-lg shadow-2xl ring-1 ring-white/10 focus:outline-none border border-white/10 overflow-hidden animate-fade-in z-50">
                            <div className="py-1">
                                <button onClick={() => { navAction({ type: 'PROFILE' }); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-white/10 hover:text-white transition-colors">
                                    <UserIcon className="h-5 w-5 mr-3 opacity-70" /> Profile
                                </button>
                                <div className="border-t border-white/10 my-1"></div>
                                <button onClick={() => { setView({ type: 'HOME' }); auth?.logout(); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-white/10 hover:text-white transition-colors">
                                    <LogoutIcon className="h-5 w-5 mr-3 opacity-70" /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
             ) : (
                <button onClick={() => setView({ type: 'PROFILE' })} className="hidden md:block px-6 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-accent-secondary to-accent-secondary-hover text-white hover:shadow-glow transform hover:-translate-y-0.5 transition-all duration-200">
                    Login
                </button>
             )}
          </div>
        </div>
      </div>
      {isMobileMenuOpen && (
          <div className="md:hidden glass border-t border-white/10 animate-slide-up">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                  {renderNavLinks(true)}
              </div>
          </div>
      )}
    </header>
  );
};

export default Navbar;
