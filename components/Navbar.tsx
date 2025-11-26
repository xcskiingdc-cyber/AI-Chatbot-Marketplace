
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
  <button 
    onClick={onClick} 
    className={`relative flex items-center w-full text-left space-x-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all duration-300 ${
      isActive 
        ? 'bg-accent-primary/10 text-accent-secondary border border-accent-secondary/20 shadow-glow' 
        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary hover:translate-x-1'
    }`}
  >
    <span className={isActive ? 'text-accent-secondary' : 'opacity-70 group-hover:opacity-100'}>{icon}</span>
    <span className="font-serif">{text}</span>
    {notificationCount > 0 && (
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white shadow-glow animate-pulse">
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
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { userNotifications, moderatorNotifications } = useMemo(() => {
    if (!auth?.currentUser) return { userNotifications: 0, moderatorNotifications: 0 };
    const userRole = auth.currentUser.role;
    const generalModNotifTypes: Notification['type'][] = ['NEW_REPORT', 'NEW_AI_ALERT', 'NEW_TICKET'];
    let userCount = 0;
    
    if (auth.currentUser.profile.notifications) {
      auth.currentUser.profile.notifications.forEach(n => {
        if (!n.isRead) {
          if (n.type === 'NEW_DM' && ['Admin', 'Assistant Admin', 'Moderator'].includes(userRole)) {
            // handled by Mod Console
          } else if (!generalModNotifTypes.includes(n.type)) {
            userCount++;
          }
        }
      });
    }

    let modCount = 0;
    if (['Admin', 'Assistant Admin', 'Moderator'].includes(userRole)) {
      const pendingReports = auth.reports ? auth.reports.filter(r => !r.isResolved).length : 0;
      const newTickets = auth.tickets ? auth.tickets.filter(t => t.status === 'New').length : 0;
      const newAlerts = auth.aiAlerts ? auth.aiAlerts.filter(a => a.status === 'New').length : 0;
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

  // Scroll detection for navbar visibility - Listen to the main container
  useEffect(() => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY < 10) {
        // Always show at the very top
        setIsVisible(true);
      } else if (Math.abs(currentScrollY - lastScrollY) > 5) {
        // Only change state if scrolled more than 5px to avoid jitter
        if (currentScrollY > lastScrollY) {
          // Scrolling down
          setIsVisible(false);
          setMobileMenuOpen(false);
          setUserMenuOpen(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
            <NavButton onClick={() => navAction({ type: 'AI_API_SETTINGS' })} icon={<SettingsIcon className="h-5 w-5" />} text="API Settings" />
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
    <header className={`fixed top-0 left-0 right-0 z-40 glass-strong text-text-primary transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-6">
            <button onClick={() => setMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-text-secondary hover:text-accent-secondary transition-colors">
              {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
            <button onClick={() => setView({ type: 'HOME' })} className="flex-shrink-0 hover:scale-105 transition-transform duration-300">
               <Logo className="h-12 w-auto filter drop-shadow-[0_0_8px_rgba(230,170,104,0.3)]" logoUrl={auth?.siteLogo} />
            </button>
            <nav className="hidden md:flex space-x-1">
              {renderNavLinks()}
            </nav>
          </div>
          
          <div className="flex items-center">
            {auth?.currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-3 hover:bg-white/5 pl-2 pr-4 py-1.5 rounded-full transition-all border border-transparent hover:border-white/10 group">
                  <Avatar imageId={auth.currentUser.profile.avatarUrl} alt={auth.currentUser.profile.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-accent-secondary/50 transition-all"/>
                  <span className="hidden sm:block text-sm font-serif font-bold text-text-primary group-hover:text-accent-secondary transition-colors">{auth.currentUser.profile.name}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 origin-top-right bg-secondary border border-white/5 rounded-xl shadow-2xl ring-1 ring-black/5 focus:outline-none overflow-hidden animate-fade-in z-50">
                    <div className="py-2">
                       <button onClick={() => { navAction({ type: 'PROFILE' }); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-5 py-3 text-sm text-text-primary hover:bg-white/5 hover:text-accent-secondary transition-colors font-serif">
                        <UserIcon className="h-4 w-4 mr-3 opacity-70" /> Profile
                      </button>
                      <div className="border-t border-white/5 my-1"></div>
                      <button onClick={() => { setView({ type: 'HOME' }); auth?.logout(); setUserMenuOpen(false); }} className="flex items-center w-full text-left px-5 py-3 text-sm text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors font-serif">
                        <LogoutIcon className="h-4 w-4 mr-3 opacity-70" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setView({ type: 'PROFILE' })} className="hidden md:block px-6 py-2 rounded-full text-sm font-serif font-bold bg-gradient-to-r from-accent-secondary to-accent-secondary-hover text-primary shadow-glow hover:shadow-glow-strong transform hover:-translate-y-0.5 transition-all duration-300">
                Enter the Haven
              </button>
            )}
          </div>
        </div>
      </div>
      
      {isMobileMenuOpen && (
        <div className="md:hidden bg-primary border-t border-white/10 animate-slide-up shadow-2xl">
          <div className="px-3 pt-4 pb-6 space-y-2">
            {renderNavLinks(true)}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
