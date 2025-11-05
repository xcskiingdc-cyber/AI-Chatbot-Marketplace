

import React, { useMemo, useContext, useState } from 'react';
import type { AppView } from '../types';
import { AuthContext } from '../context/AuthContext';
import { PinIcon, LockIcon, PlusIcon } from './Icons';
import Avatar from './Avatar';

interface CategoryViewProps {
  categoryId: string;
  setView: (view: AppView) => void;
}

const CategoryView: React.FC<CategoryViewProps> = ({ categoryId, setView }) => {
    const auth = useContext(AuthContext);
    const { forumCategories = [], forumThreads = [], getPostsForThread, findUserById, currentUser } = auth || {};
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('highestRated');

    const category = useMemo(() => forumCategories.find(c => c.id === categoryId), [forumCategories, categoryId]);

    const threadsInCategory = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const threads = forumThreads
            .filter(t => {
                if (t.categoryId !== categoryId) return false;
                if (t.isSilenced) {
                    // Only show silenced threads to mods/admins
                    return currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role);
                }
                return true;
            })
            .filter(t => !searchTerm.trim() || t.title.toLowerCase().includes(lowerSearchTerm))
            .map(thread => {
                const posts = getPostsForThread?.(thread.id) || [];
                const lastPost = posts.length > 0 ? [...posts].sort((a,b) => b.createdAt - a.createdAt)[0] : null;
                const originalPost = posts[0];
                const rating = originalPost ? originalPost.upvotes.length - originalPost.downvotes.length : 0;
                return { ...thread, postCount: posts.length, lastPost, rating };
            })
            .sort((a, b) => {
                if (a.isPinned !== b.isPinned) {
                    return b.isPinned ? 1 : -1;
                }
                switch (sortOrder) {
                    case 'highestRated':
                        return b.rating - a.rating;
                    case 'lowestRated':
                        return a.rating - b.rating;
                    case 'newest':
                        return b.createdAt - a.createdAt;
                    case 'oldest':
                        return a.createdAt - b.createdAt;
                    case 'mostReplies':
                        return b.postCount - a.postCount;
                    default:
                        return (b.lastPost?.createdAt || b.createdAt) - (a.lastPost?.createdAt || a.createdAt);
                }
            });

        return threads;
    }, [forumThreads, categoryId, getPostsForThread, searchTerm, sortOrder, currentUser]);

    if (!category) {
        return <div className="p-8 text-center text-text-secondary">Category not found. <button onClick={() => setView({type: 'FORUM_HOME'})} className="text-accent-primary underline">Return to Forums</button></div>;
    }

    const canCreateThread = currentUser && !category.isLocked;

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <button onClick={() => setView({type: 'FORUM_HOME'})} className="text-sm text-text-secondary hover:underline">&larr; Back to Forums</button>
                    <h1 className="text-3xl font-bold text-text-primary mt-1">{category.name}</h1>
                    <p className="text-text-secondary">{category.description}</p>
                </div>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                         <input 
                            type="text"
                            placeholder="Search this category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-secondary border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-secondary border border-border rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    >
                        <option value="highestRated">Highest Rated</option>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="mostReplies">Most Replies</option>
                        <option value="lowestRated">Lowest Rated</option>
                    </select>
                    {canCreateThread && (
                        <button 
                            onClick={() => setView({ type: 'CREATE_THREAD', categoryId })}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>New Thread</span>
                        </button>
                    )}
                 </div>
            </div>
            
            <div className="space-y-3">
                {threadsInCategory.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary bg-secondary rounded-lg border border-border">
                        <p>No threads found.</p>
                        {searchTerm && <p>Try adjusting your search term.</p>}
                        {!searchTerm && canCreateThread && <p>Why not be the first to start a conversation?</p>}
                    </div>
                ) : (
                    threadsInCategory.map(thread => {
                        const author = findUserById?.(thread.authorId);
                        const lastPostAuthor = thread.lastPost ? findUserById?.(thread.lastPost.authorId) : null;

                        return (
                            <div key={thread.id} className="bg-secondary rounded-lg border border-border hover:border-border-hover transition-colors flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {thread.isPinned && <PinIcon className="w-5 h-5 text-accent-secondary flex-shrink-0" title="Pinned"/>}
                                        {thread.isLocked && <LockIcon className="w-5 h-5 text-text-secondary flex-shrink-0" title="Locked"/>}
                                        {thread.isSilenced && <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Silenced</span>}
                                        <button onClick={() => setView({ type: 'FORUM_THREAD', threadId: thread.id })} className="font-bold text-lg text-text-primary hover:text-accent-primary text-left">{thread.title}</button>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1">
                                        by <button disabled={!author} onClick={() => author && setView({ type: 'PROFILE' /* TODO: Creator profile view */ })} className="font-medium hover:underline disabled:no-underline disabled:cursor-default">{author?.profile.name || 'Unknown'}</button> on {new Date(thread.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="w-full md:w-48 flex md:justify-center items-center text-sm text-text-secondary gap-6">
                                    <div className="text-center"><p className="font-semibold text-text-primary">{thread.postCount > 0 ? thread.postCount - 1 : 0}</p><p>Replies</p></div>
                                    <div className="text-center"><p className="font-semibold text-text-primary">{thread.viewCount}</p><p>Views</p></div>
                                </div>
                                <div className="w-full md:w-48 text-left md:text-right text-sm">
                                    {thread.lastPost && lastPostAuthor ? (
                                        <div className="flex items-center justify-start md:justify-end gap-2">
                                            <div className="text-right">
                                                <p className="text-text-primary truncate">by <button className="hover:underline" disabled>{lastPostAuthor.profile.name}</button></p>
                                                <p className="text-xs text-text-secondary">{new Date(thread.lastPost.createdAt).toLocaleString()}</p>
                                            </div>
                                            <Avatar imageId={lastPostAuthor.profile.avatarUrl} alt={lastPostAuthor.profile.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-secondary">No replies yet.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CategoryView;