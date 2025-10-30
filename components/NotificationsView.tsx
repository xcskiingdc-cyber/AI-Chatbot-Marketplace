
import React, { useEffect, useState, useMemo } from 'react';
import type { User, AppView, Character, Notification } from '../types';
import { BellIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';

interface NotificationsViewProps {
  user: User;
  setView: (view: AppView) => void;
  onCharacterClick: (character: Character) => void;
  markNotificationsAsRead: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ user, setView, onCharacterClick, markNotificationsAsRead }) => {
    const auth = React.useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<'Following' | 'My Characters' | 'Replies'>('Following');

    useEffect(() => {
        markNotificationsAsRead();
    }, [markNotificationsAsRead]);
    
    const handleNotificationClick = (notification: Notification) => {
        if (['NEW_BOT', 'NEW_LIKE', 'NEW_COMMENT', 'REPLY'].includes(notification.type)) {
            const character = auth?.characters.find(c => c.id === notification.relatedId);
            if (character) {
                onCharacterClick(character);
            }
        }
    };

    const { followingNotifs, myCharNotifs, replyNotifs } = useMemo(() => {
        const notifications = user.profile.notifications || [];
        return {
            followingNotifs: notifications.filter(n => n.type === 'NEW_BOT'),
            myCharNotifs: notifications.filter(n => ['NEW_LIKE', 'NEW_COMMENT'].includes(n.type)),
            replyNotifs: notifications.filter(n => n.type === 'REPLY'),
        };
    }, [user.profile.notifications]);

    const renderNotifications = (notifications: Notification[]) => {
        if (notifications.length === 0) {
            return (
                <div className="text-center py-12 text-[--text-secondary]">
                    <BellIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>No notifications in this category yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {notifications.map(notification => {
                     const character = auth?.characters.find(c => c.id === notification.relatedId);
                     const isClickable = !!character;
                    return (
                        <div
                            key={notification.id}
                            onClick={() => isClickable && handleNotificationClick(notification)}
                            className={`p-4 bg-[--bg-secondary] rounded-lg transition-colors duration-200 group relative flex items-start space-x-4 ${isClickable ? 'cursor-pointer hover:bg-[--bg-hover]' : ''}`}
                        >
                            <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${notification.isRead ? 'bg-[--bg-tertiary]' : 'bg-[--accent-primary]'}`}></div>
                            
                            {notification.type === 'NEW_BOT' && character && (
                                <>
                                    <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className={`text-[--text-secondary] ${!notification.isRead ? 'text-[--text-primary]' : ''}`} dangerouslySetInnerHTML={{__html: notification.message.replace(character.name, `<strong class="font-semibold text-[--accent-primary]">${character.name}</strong>`)}} />
                                        <p className="text-sm text-[--text-secondary] mt-1 p-2 bg-[--bg-tertiary] rounded-md border-l-2 border-[--border-color] truncate">{character.description}</p>
                                        <p className="text-xs text-gray-500 mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                                    </div>
                                </>
                            )}
                            {notification.type !== 'NEW_BOT' && (
                                <div className="flex-1">
                                    <p className={`text-[--text-secondary] ${!notification.isRead ? 'text-[--text-primary]' : ''}`}>{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const tabs = [
        { name: 'Following', count: followingNotifs.length },
        { name: 'My Characters', count: myCharNotifs.length },
        { name: 'Replies', count: replyNotifs.length },
    ] as const;

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-[--text-primary]">Notifications</h1>
            
            <div className="mb-6 border-b border-[--border-color]">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`${
                                activeTab === tab.name
                                ? 'border-[--accent-primary] text-[--accent-primary]'
                                : 'border-transparent text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-color]'
                            } whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            {tab.name}
                            {tab.count > 0 && <span className="bg-[--bg-tertiary] text-[--accent-primary] text-xs font-semibold px-2 py-0.5 rounded-full">{tab.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {activeTab === 'Following' && renderNotifications(followingNotifs)}
                {activeTab === 'My Characters' && renderNotifications(myCharNotifs)}
                {activeTab === 'Replies' && renderNotifications(replyNotifs)}
            </div>
        </div>
    );
};

export default NotificationsView;