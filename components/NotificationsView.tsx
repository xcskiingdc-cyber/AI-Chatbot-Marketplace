import React, { useEffect, useState, useMemo } from 'react';
import type { User, AppView, Character, Notification } from '../types';
import { BellIcon, UserIcon, ThumbsUpIcon } from './Icons';
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
                <div className="text-center py-12 text-gray-500">
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
                            className={`p-4 bg-gray-900 rounded-lg transition-colors duration-200 group relative flex items-start space-x-4 ${isClickable ? 'cursor-pointer hover:bg-gray-800' : ''}`}
                        >
                            <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${notification.isRead ? 'bg-gray-600' : 'bg-pink-500'}`}></div>
                            
                            {notification.type === 'NEW_BOT' && character && (
                                <>
                                    <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className={`text-gray-300 ${!notification.isRead ? 'text-white' : ''}`} dangerouslySetInnerHTML={{__html: notification.message.replace(character.name, `<strong class="font-semibold text-pink-400">${character.name}</strong>`)}} />
                                        <p className="text-sm text-gray-400 mt-1 p-2 bg-gray-800 rounded-md border-l-2 border-gray-700 truncate">{character.description}</p>
                                        <p className="text-xs text-gray-500 mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                                    </div>
                                </>
                            )}
                            {notification.type !== 'NEW_BOT' && (
                                <div className="flex-1">
                                    <p className={`text-gray-300 ${!notification.isRead ? 'text-white' : ''}`}>{notification.message}</p>
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
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-white">Notifications</h1>
            
            <div className="mb-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`${
                                activeTab === tab.name
                                ? 'border-pink-500 text-pink-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            {tab.name}
                            {tab.count > 0 && <span className="bg-gray-700 text-pink-400 text-xs font-semibold px-2 py-0.5 rounded-full">{tab.count}</span>}
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