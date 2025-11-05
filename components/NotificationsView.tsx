


import React, { useEffect, useState, useMemo, useContext, useRef } from 'react';
import type { User, AppView, Character, Notification, DMConversation, DirectMessage } from '../types';
import { BellIcon, MessageIcon, SendIcon, UploadIcon, CloseIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import useIndexedDBImage from '../hooks/useIndexedDBImage';

const ImagePreview: React.FC<{ src: string; onRemove: () => void }> = ({ src, onRemove }) => (
    <div className="relative inline-block m-2">
        <img src={src} alt="Preview" className="h-20 w-20 object-cover rounded-md" />
        <button onClick={onRemove} className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 shadow-md">
            <CloseIcon className="w-4 h-4" />
        </button>
    </div>
);

const DMImage: React.FC<{ imageId: string }> = ({ imageId }) => {
    const imageUrl = useIndexedDBImage(imageId);
    if (!imageUrl) return <div className="w-48 h-32 bg-tertiary animate-pulse rounded-md mt-2" />;
    return (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img src={imageUrl} alt="Direct message content" className="max-w-xs max-h-64 rounded-md mt-2 object-contain" />
        </a>
    );
};

const MessagesTab: React.FC = () => {
    const auth = useContext(AuthContext);
    const { currentUser, dmConversations, sendDirectMessage, markDMAsReadByUser } = auth || {};
    const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
    const [messageText, setMessageText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversations = useMemo(() => {
        if (!currentUser || !dmConversations) return [];
        return Object.values(dmConversations).filter((convo: DMConversation) => convo.userId === currentUser.id);
    }, [currentUser, dmConversations]);
    
    useEffect(() => {
        if (conversations.length > 0 && !selectedConversation) {
            setSelectedConversation(conversations[0]);
        }
    }, [conversations, selectedConversation]);
    
    useEffect(() => {
        if (selectedConversation && dmConversations) {
            const updatedConvo = dmConversations[selectedConversation.userId];
            if (updatedConvo && JSON.stringify(updatedConvo) !== JSON.stringify(selectedConversation)) {
                setSelectedConversation(updatedConvo);
            }
        }
    }, [dmConversations, selectedConversation]);

    useEffect(() => {
        if (selectedConversation && selectedConversation.hasUnreadByUser && markDMAsReadByUser) {
            markDMAsReadByUser(selectedConversation.userId);
        }
    }, [selectedConversation, markDMAsReadByUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversation?.messages]);

    const handleSendMessage = () => {
        if (selectedConversation && (messageText.trim() || imageFile) && sendDirectMessage && currentUser) {
            sendDirectMessage(currentUser.id, { text: messageText.trim(), imageFile }, false); // isFromAdmin = false
            setMessageText('');
            setImageFile(null);
            if(imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type === 'image/jpeg' && file.size <= 3 * 1024 * 1024) {
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                alert('Please select a JPEG image under 3MB.');
            }
        }
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // FIX: The type of items from `e.clipboardData.items` was inferred as `unknown`.
        // We cast the array to `any[]` to allow access to `type` and `getAsFile` properties.
        const file = (Array.from(e.clipboardData.items) as any[]).find(item => item.type.startsWith('image/'))?.getAsFile();
        if (file) {
            e.preventDefault();
            if (file.type === 'image/jpeg' && file.size <= 3 * 1024 * 1024) {
                if (imagePreview) URL.revokeObjectURL(imagePreview);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } else {
                alert('Pasted image must be a JPEG under 3MB.');
            }
        }
    };
    
    if (!currentUser) return null;
    const adminUser = auth?.allUsers.find(u => u.role === 'Admin');

    if (conversations.length === 0) {
        return (
            <div className="text-center py-12 text-text-secondary">
                <MessageIcon className="w-12 h-12 mx-auto mb-2" />
                <p>You have no messages from administrators.</p>
            </div>
        );
    }
    
    return (
        <div className="border border-border rounded-lg overflow-hidden h-[70vh] flex flex-col">
            <div className="p-3 border-b border-border flex items-center gap-3 bg-tertiary">
                {adminUser && <Avatar imageId={adminUser.profile.avatarUrl} alt={adminUser.profile.name} className="w-10 h-10 rounded-full object-cover" />}
                <h3 className="font-bold text-lg">Messages with Admin</h3>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-primary">
               {selectedConversation?.messages.map(msg => {
                    const isFromAdmin = msg.senderId === 'ADMIN';
                    const sender = isFromAdmin ? adminUser : currentUser;
                    return (
                        <div key={msg.id} className={`flex items-start gap-3 ${!isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                            {isFromAdmin && sender && <Avatar imageId={sender.profile.avatarUrl} alt={sender.profile.name} className="w-8 h-8 rounded-full object-cover" />}
                            <div className={`px-4 py-2 rounded-lg max-w-lg ${!isFromAdmin ? 'bg-accent-primary text-white' : 'bg-tertiary'}`}>
                                {msg.imageUrl && <DMImage imageId={msg.imageUrl} />}
                                {msg.text && <p className={msg.imageUrl ? 'mt-2' : ''}>{msg.text}</p>}
                                <p className="text-xs opacity-70 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                            </div>
                            {!isFromAdmin && sender && <Avatar imageId={sender.profile.avatarUrl} alt={sender.profile.name} className="w-8 h-8 rounded-full object-cover" />}
                        </div>
                    );
               })}
               <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border bg-secondary">
                {imagePreview && <ImagePreview src={imagePreview} onRemove={() => { if(imagePreview) URL.revokeObjectURL(imagePreview); setImageFile(null); setImagePreview(null); }} />}
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-text-secondary hover:text-text-primary">
                        <UploadIcon className="w-5 h-5"/>
                    </button>
                    <textarea
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        placeholder="Reply to admin..."
                        className="flex-1 bg-tertiary border border-border rounded-lg p-2 focus:outline-none resize-none"
                        rows={1}
                    />
                    <button onClick={handleSendMessage} className="p-2 bg-accent-secondary rounded-full text-white hover:bg-accent-secondary-hover disabled:bg-tertiary" disabled={!messageText.trim() && !imageFile}>
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};


const NotificationsTab: React.FC<{
    user: User, 
    onCharacterClick: (character: Character) => void,
    onCreatorClick: (user: User) => void,
    category: 'Following' | 'My Characters' | 'Replies',
}> = ({ user, onCharacterClick, onCreatorClick, category }) => {
    const auth = React.useContext(AuthContext);

    const { notifications, unreadCount } = useMemo(() => {
        const allNotifs = user.profile.notifications || [];
        let filteredNotifs: Notification[] = [];
        if (category === 'Following') {
            filteredNotifs = allNotifs.filter(n => ['NEW_BOT', 'NEW_FOLLOWER'].includes(n.type));
        } else if (category === 'My Characters') {
            filteredNotifs = allNotifs.filter(n => ['NEW_LIKE', 'NEW_COMMENT'].includes(n.type));
        } else if (category === 'Replies') {
            filteredNotifs = allNotifs.filter(n => n.type === 'REPLY');
        }
        
        return {
            notifications: filteredNotifs,
            unreadCount: filteredNotifs.filter(n => !n.isRead).length
        };
    }, [user.profile.notifications, category]);
    
     const handleNotificationClick = (notification: Notification) => {
        auth?.markSingleNotificationAsRead(notification.id);
        if (['NEW_BOT', 'NEW_LIKE', 'NEW_COMMENT', 'REPLY'].includes(notification.type)) {
            const character = auth?.characters.find(c => c.id === notification.relatedId);
            if (character) {
                onCharacterClick(character);
            }
        }
    };

    const renderMessage = (notification: Notification) => {
        const fromUser = notification.fromUserId ? auth?.findUserById(notification.fromUserId) : null;
    
        if (!fromUser) {
            return <span>{notification.message}</span>;
        }
    
        const nameToReplace = fromUser.profile.name;
        const parts = notification.message.split(nameToReplace);
    
        return (
            <>
                {parts.length > 1 ? (
                    <>
                        {parts[0]}
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                onCreatorClick(fromUser); 
                            }} 
                            className="font-semibold text-accent-secondary hover:underline"
                        >
                            {nameToReplace}
                        </button>
                        {parts[1]}
                    </>
                ) : (
                    <span>{notification.message}</span>
                )}
            </>
        );
    };

    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 text-text-secondary">
                <BellIcon className="w-12 h-12 mx-auto mb-2" />
                <p>No notifications in this category yet.</p>
            </div>
        );
    }
    
    return (
        <div>
             {unreadCount > 0 && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            auth?.markCategoryAsRead(category);
                        }}
                        className="text-sm font-medium text-accent-secondary hover:underline"
                    >
                        Mark all as read in this category
                    </button>
                </div>
            )}
            <div className="space-y-3">
                {notifications.map(notification => {
                    const character = auth?.characters.find(c => c.id === notification.relatedId);
                    const isClickable = !!character || notification.type === 'NEW_FOLLOWER';
                    return (
                        <div
                            key={notification.id}
                            onClick={() => isClickable && handleNotificationClick(notification)}
                            className={`p-4 bg-secondary rounded-lg transition-colors duration-200 group relative flex items-start space-x-4 ${isClickable ? 'cursor-pointer hover:bg-hover' : ''}`}
                        >
                            <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${notification.isRead ? 'bg-tertiary' : 'bg-accent-primary'}`}></div>
                            
                            {notification.type === 'NEW_BOT' && character ? (
                                <>
                                    <Avatar imageId={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className={`text-text-secondary ${!notification.isRead ? 'text-text-primary' : ''}`}>
                                          {renderMessage(notification)}
                                        </p>
                                        <p className="text-sm text-text-secondary mt-1 p-2 bg-tertiary rounded-md border-l-2 border-border truncate">{character.description}</p>
                                        <p className="text-xs text-gray-500 mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1">
                                    <p className={`text-text-secondary ${!notification.isRead ? 'text-text-primary' : ''}`}>
                                        {renderMessage(notification)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const NotificationsView: React.FC<{
  user: User;
  setView: (view: AppView) => void;
  onCharacterClick: (character: Character) => void;
  onCreatorClick: (user: User) => void;
}> = ({ user, setView, onCharacterClick, onCreatorClick }) => {
    const auth = React.useContext(AuthContext);
    const [activeTab, setActiveTab] = useState<'Following' | 'My Characters' | 'Replies' | 'Messages'>('Following');

    const {
        unreadFollowing,
        unreadMyChar,
        unreadReplies,
        unreadMessages
    } = useMemo(() => {
        const notifications = user.profile.notifications || [];
        const unreadDms = auth?.dmConversations[user.id]?.hasUnreadByUser ?? false;
        
        return {
            unreadFollowing: notifications.filter(n => !n.isRead && ['NEW_BOT', 'NEW_FOLLOWER'].includes(n.type)).length,
            unreadMyChar: notifications.filter(n => !n.isRead && ['NEW_LIKE', 'NEW_COMMENT'].includes(n.type)).length,
            unreadReplies: notifications.filter(n => !n.isRead && n.type === 'REPLY').length,
            unreadMessages: unreadDms ? 1 : 0, // Simplified count for the badge
        };
    }, [user, auth?.dmConversations]);
    
    const hasUnread = unreadFollowing > 0 || unreadMyChar > 0 || unreadReplies > 0;

    const tabs = [
        { name: 'Following', count: unreadFollowing },
        { name: 'My Characters', count: unreadMyChar },
        { name: 'Replies', count: unreadReplies },
        { name: 'Messages', count: unreadMessages },
    ] as const;

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">Notifications</h1>
                {hasUnread && activeTab !== 'Messages' && (
                    <button onClick={() => auth?.markNotificationsAsRead()} className="text-sm font-medium text-accent-primary hover:underline">
                        Mark all as read
                    </button>
                )}
            </div>
            
            <div className="mb-6 border-b border-border">
                <nav className="-mb-px flex space-x-2 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`${
                                activeTab === tab.name
                                ? 'border-accent-primary text-accent-primary'
                                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                            } whitespace-nowrap py-4 px-1 sm:px-2 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            {tab.name}
                            {tab.count > 0 && <span className="bg-tertiary text-accent-primary text-xs font-semibold px-2 py-0.5 rounded-full">{tab.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {activeTab === 'Messages' ? (
                    <MessagesTab />
                ) : (
                    // FIX: Removed unused `setView` prop to resolve type error.
                    <NotificationsTab 
                        user={user} 
                        onCharacterClick={onCharacterClick} 
                        category={activeTab}
                        onCreatorClick={onCreatorClick}
                    />
                )}
            </div>
        </div>
    );
};

export default NotificationsView;