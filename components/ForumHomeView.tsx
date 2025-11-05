

import React, { useMemo, useContext, useState } from 'react';
import type { AppView, ForumCategory, ForumThread } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ChatBubbleIcon } from './Icons';

interface ForumHomeViewProps {
  setView: (view: AppView) => void;
}

const ForumHomeView: React.FC<ForumHomeViewProps> = ({ setView }) => {
    const auth = useContext(AuthContext);
    const { forumCategories = [], forumThreads = [], getPostsForThread } = auth || {};
    const [searchTerm, setSearchTerm] = useState('');

    const categoryStats = useMemo(() => {
        const stats: Record<string, { threadCount: number; postCount: number }> = {};
        forumCategories.forEach(cat => {
            const threadsInCategory = forumThreads.filter(t => t.categoryId === cat.id);
            const threadCount = threadsInCategory.length;
            const postCount = threadsInCategory.reduce((acc, thread) => {
                return acc + (getPostsForThread?.(thread.id)?.length || 0);
            }, 0);
            stats[cat.id] = { threadCount, postCount };
        });
        return stats;
    }, [forumCategories, forumThreads, getPostsForThread]);

    const hierarchicalCategories = useMemo(() => {
        const categoriesMap = new Map<string, ForumCategory & { subcategories: ForumCategory[] }>();
        const rootCategories: (ForumCategory & { subcategories: ForumCategory[] })[] = [];

        forumCategories.forEach(cat => {
            categoriesMap.set(cat.id, { ...cat, subcategories: [] });
        });

        forumCategories.forEach(cat => {
            if (cat.parentId && categoriesMap.has(cat.parentId)) {
                categoriesMap.get(cat.parentId)!.subcategories.push(categoriesMap.get(cat.id)!);
            } else {
                rootCategories.push(categoriesMap.get(cat.id)!);
            }
        });

        return rootCategories;
    }, [forumCategories]);
    
    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerSearchTerm = searchTerm.toLowerCase();
        return forumThreads.filter(thread => thread.title.toLowerCase().includes(lowerSearchTerm));
    }, [searchTerm, forumThreads]);

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Forums</h1>
                <div className="relative w-full md:w-80">
                    <input 
                        type="text"
                        placeholder="Search all threads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-text-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                </div>
            </div>

            {searchTerm.trim() ? (
                 <div>
                    <h2 className="text-2xl font-bold mb-4">Search Results ({searchResults.length})</h2>
                    {searchResults.length > 0 ? (
                        <div className="bg-secondary rounded-lg border border-border divide-y divide-border">
                            {searchResults.map(thread => (
                                <button key={thread.id} onClick={() => setView({ type: 'FORUM_THREAD', threadId: thread.id })} className="w-full text-left p-4 hover:bg-hover">
                                    <p className="font-semibold text-text-primary">{thread.title}</p>
                                    <p className="text-xs text-text-secondary">in {forumCategories.find(c => c.id === thread.categoryId)?.name || 'Unknown Category'}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-text-secondary text-center py-8">No threads found matching your search.</p>
                    )}
                </div>
            ) : hierarchicalCategories.length === 0 ? (
                <div className="text-center py-16 text-text-secondary">
                    <ChatBubbleIcon className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl">The forums are quiet...</h2>
                    <p>No categories have been set up by the administrators yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {hierarchicalCategories.map(category => {
                        const stats = categoryStats[category.id] || { threadCount: 0, postCount: 0 };
                        return (
                            <div key={category.id} className="bg-secondary p-6 rounded-lg border border-border flex flex-col">
                                <button 
                                    onClick={() => setView({ type: 'FORUM_CATEGORY', categoryId: category.id })}
                                    className="text-xl text-left font-bold text-text-primary hover:text-accent-primary mb-2"
                                >
                                    {category.name}
                                </button>
                                <p className="text-sm text-text-secondary flex-grow">{category.description}</p>

                                {category.subcategories.length > 0 && (
                                    <div className="mt-4 border-t border-border pt-4 space-y-2">
                                        {category.subcategories.map(sub => (
                                             <button 
                                                key={sub.id}
                                                onClick={() => setView({ type: 'FORUM_CATEGORY', categoryId: sub.id })}
                                                className="block text-sm text-left font-medium text-text-secondary hover:text-text-primary"
                                            >
                                                {sub.name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center space-x-8 mt-6 border-t border-border pt-4">
                                    <div>
                                        <p className="font-bold text-xl text-text-primary">{stats.threadCount}</p>
                                        <p className="text-xs text-text-secondary">Threads</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-xl text-text-primary">{stats.postCount}</p>
                                        <p className="text-xs text-text-secondary">Posts</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ForumHomeView;