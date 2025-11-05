

import React, { useState, useMemo, useContext, useEffect } from 'react';
import type { AppView, ForumThread, ForumPost } from '../types';
import { AuthContext } from '../context/AuthContext';
import Post from './Post';
import { LockIcon, PinIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface ThreadViewProps {
  threadId: string;
  setView: (view: AppView) => void;
  onReportPost: (post: ForumPost) => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ threadId, setView, onReportPost }) => {
    const auth = useContext(AuthContext);
    const { 
        forumThreads = [], 
        getPostsForThread, 
        forumCategories = [],
        currentUser,
        createPost,
        togglePostVote,
        togglePinThread,
        toggleLockThread,
        deletePost,
        editPost,
        silencePost,
        silenceThread,
        deleteThread,
    } = auth || {};

    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    
    const thread = useMemo(() => forumThreads.find(t => t.id === threadId), [forumThreads, threadId]);
    const posts = useMemo(() => getPostsForThread?.(threadId)?.filter(p => !p.isSilenced || (currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role))) || [], [getPostsForThread, threadId, currentUser]);
    const category = useMemo(() => forumCategories.find(c => c.id === thread?.categoryId), [forumCategories, thread]);
    const originalPost = useMemo(() => posts[0], [posts]);
    const replies = useMemo(() => posts.slice(1), [posts]);
    
    useEffect(() => {
        // Here you would typically increment view count on the backend
        // For this demo, we'll just log it.
        console.log(`Viewing thread ${threadId}`);
    }, [threadId]);

    const handleReplySubmit = async () => {
        if (!replyContent.trim() || !currentUser || !createPost || !thread) return;

        setIsSubmitting(true);
        
        const newPost: Omit<ForumPost, 'id' | 'createdAt' | 'isEdited' | 'isSilenced'> = {
            threadId: thread.id,
            authorId: currentUser.id,
            isCharacterPost: false,
            content: replyContent.trim(),
            upvotes: [],
            downvotes: [],
        };
        
        await createPost(newPost);
        setReplyContent('');
        setIsSubmitting(false);
    };

    const handleConfirmDelete = () => {
        if (thread && category) {
            deleteThread?.(thread.id);
            setView({ type: 'FORUM_CATEGORY', categoryId: category.id });
        }
        setDeleteModalOpen(false);
    };


    if (!thread || !category) {
        return <div className="p-8 text-center text-text-secondary">Thread not found. <button onClick={() => setView({type: 'FORUM_HOME'})} className="text-accent-primary underline">Return to Forums</button></div>;
    }
    
    if (thread.isSilenced && !(currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role))) {
        return <div className="p-8 text-center text-text-secondary">This thread is currently under review and not visible.</div>;
    }

    const canReply = currentUser && !thread.isLocked;
    const canModerate = currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role);
    
    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
            <div className="mb-6">
                <button onClick={() => setView({ type: 'FORUM_CATEGORY', categoryId: category.id })} className="text-sm text-text-secondary hover:underline">&larr; Back to {category.name}</button>
                <div className="flex items-start gap-3 mt-1">
                    {thread.isLocked && <LockIcon className="w-6 h-6 text-text-secondary flex-shrink-0 mt-1" title="Locked"/>}
                    {thread.isSilenced && <span className="text-xs mt-2 font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Silenced</span>}
                    <h1 className="text-3xl font-bold text-text-primary">{thread.title}</h1>
                </div>
            </div>

            {canModerate && (
                <div className="flex flex-wrap items-center gap-4 p-3 bg-tertiary rounded-lg mb-6 border border-border">
                    <p className="text-sm font-bold">Mod Actions:</p>
                    <button onClick={() => togglePinThread?.(thread.id)} className="flex items-center gap-2 text-sm text-accent-secondary hover:underline">
                        <PinIcon className="w-4 h-4" /> {thread.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => toggleLockThread?.(thread.id)} className="flex items-center gap-2 text-sm text-text-secondary hover:underline">
                        <LockIcon className="w-4 h-4" /> {thread.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button onClick={() => silenceThread?.(thread.id, !thread.isSilenced)} className="text-sm text-yellow-400 hover:underline">{thread.isSilenced ? 'Unsilence Thread' : 'Silence Thread'}</button>
                    <button onClick={() => setDeleteModalOpen(true)} className="text-sm text-danger hover:underline">Delete Thread</button>
                </div>
            )}
            
            <div className="space-y-6">
                {originalPost && <Post post={originalPost} isOP={true} onVote={togglePostVote} onReport={onReportPost} onDelete={deletePost} onEdit={editPost} onSilence={silencePost} />}
                
                {replies.length > 0 && (
                    <div className="border-t border-border pt-6 space-y-6">
                        {replies.map(post => <Post key={post.id} post={post} onVote={togglePostVote} onReport={onReportPost} onDelete={deletePost} onEdit={editPost} onSilence={silencePost}/>)}
                    </div>
                )}
            </div>

            {canReply ? (
                <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-xl font-bold mb-4">Post a Reply</h3>
                    <div className="bg-secondary p-4 rounded-lg border border-border">
                        <textarea 
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="w-full p-2 bg-tertiary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-secondary text-text-primary min-h-[120px]"
                            placeholder="Write your reply here... Markdown is supported."
                            disabled={isSubmitting}
                        />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleReplySubmit}
                                disabled={!replyContent.trim() || isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors disabled:bg-tertiary disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Posting...' : 'Post Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="mt-8 pt-6 border-t border-border text-center text-text-secondary p-4 bg-secondary rounded-lg">
                    {thread.isLocked ? "This thread is locked. No new replies can be posted." : "You must be logged in to reply."}
                 </div>
            )}
            {isDeleteModalOpen && (
                <ConfirmationModal
                    title="Delete Thread?"
                    message="Are you sure you want to permanently delete this thread and all its posts? This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteModalOpen(false)}
                />
            )}
        </div>
    );
};

export default ThreadView;