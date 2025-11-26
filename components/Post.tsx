
import React, { useState, useContext } from 'react';
import type { ForumPost, User, Character } from '../types';
import { AuthContext } from '../context/AuthContext';
import { ThumbsUpIcon, ThumbsDownIcon, FlagIcon, EditIcon, DeleteIcon, SaveIcon, CancelIcon } from './Icons';
import Avatar from './Avatar';
import ConfirmationModal from './ConfirmationModal';

// A simple markdown parser, in a real app you'd use a more robust library like 'marked' or 'react-markdown'
const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return <div dangerouslySetInnerHTML={{ __html: formattedText.replace(/\n/g, '<br />') }} />;
};

interface PostProps {
  post: ForumPost;
  isOP?: boolean;
  onVote: (postId: string, voteType: 'up' | 'down') => void;
  onReport: (post: ForumPost) => void;
  onDelete: (postId: string) => void;
  onEdit: (postId: string, newContent: string) => Promise<void>;
  onSilence?: (postId: string, isSilenced: boolean) => void;
}

const Post: React.FC<PostProps> = ({ post, isOP = false, onVote, onReport, onDelete, onEdit, onSilence }) => {
    const auth = useContext(AuthContext);
    const { currentUser, findUserById, characters = [] } = auth || {};

    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const author: User | Character | null = post.isCharacterPost 
        ? characters.find(c => c.id === post.authorId) || null
        : findUserById?.(post.authorId) || null;

    if (!author) return null; // Or render a placeholder for deleted user

    const authorProfile = post.isCharacterPost 
        ? { name: (author as Character).name, avatarUrl: (author as Character).avatarUrl, bio: (author as Character).description }
        : { name: (author as User).profile.name, avatarUrl: (author as User).profile.avatarUrl, bio: (author as User).profile.bio };

    const canModify = currentUser && (currentUser.id === post.authorId || ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role));
    const canModerate = currentUser && ['Admin', 'Assistant Admin', 'Moderator'].includes(currentUser.role);
    
    const userVote = currentUser ? (post.upvotes.includes(currentUser.id) ? 'up' : (post.downvotes.includes(currentUser.id) ? 'down' : null)) : null;

    const handleSaveEdit = async () => {
        if (editContent.trim() !== post.content) {
            await onEdit(post.id, editContent.trim());
        }
        setIsEditing(false);
    }

    return (
        <div id={`post-${post.id}`} className={`flex flex-col sm:flex-row gap-4 p-4 rounded-lg ${isOP ? 'bg-secondary border-2 border-accent-secondary/30' : 'bg-secondary/50'}`}>
            {/* Author Info Panel */}
            <div className="flex-shrink-0 w-full sm:w-40 text-center sm:text-left flex sm:flex-col items-center sm:items-start gap-4 sm:gap-2 border-b sm:border-b-0 sm:border-r border-border pb-4 sm:pb-0 sm:pr-4">
                <Avatar imageId={authorProfile.avatarUrl} alt={authorProfile.name} className="w-16 h-16 rounded-full object-cover" />
                <div>
                    <p className="font-bold text-text-primary">{authorProfile.name}</p>
                    {post.isCharacterPost && <p className="text-xs text-accent-secondary italic">AI Character</p>}
                    <p className="text-xs text-text-secondary mt-1">{isOP ? 'Original Poster' : 'Member'}</p>
                </div>
            </div>

            {/* Post Content Panel */}
            <div className="flex-1">
                <div className="flex justify-between items-center text-xs text-text-secondary mb-4">
                    <span>{new Date(post.createdAt).toLocaleTimeString()} {new Date(post.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                        {post.isEdited && <span>(Edited)</span>}
                        {post.isSilenced && <span className="font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Silenced</span>}
                    </div>
                </div>

                {isEditing ? (
                    <div>
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full p-2 bg-tertiary border border-border rounded-md min-h-[150px]"
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSaveEdit} className="px-3 py-1 bg-success text-white rounded text-sm">Save</button>
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-tertiary rounded text-sm">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none text-text-primary">
                        <SimpleMarkdown text={post.content} />
                    </div>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onVote(post.id, 'up')}
                            disabled={!currentUser}
                            className={`flex items-center gap-1 p-1 rounded-md transition-colors ${userVote === 'up' ? 'text-success' : 'text-text-secondary hover:bg-hover'}`}
                        >
                            <ThumbsUpIcon className="w-5 h-5" />
                            <span className="text-sm">{post.upvotes.length}</span>
                        </button>
                         <button 
                            onClick={() => onVote(post.id, 'down')}
                            disabled={!currentUser}
                            className={`flex items-center gap-1 p-1 rounded-md transition-colors ${userVote === 'down' ? 'text-danger' : 'text-text-secondary hover:bg-hover'}`}
                        >
                            <ThumbsDownIcon className="w-5 h-5" />
                            <span className="text-sm">{post.downvotes.length}</span>
                        </button>
                    </div>
                     <div className="flex items-center gap-2 text-sm text-text-secondary">
                        {canModify && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="hover:underline">Edit</button>
                                <span>&middot;</span>
                                <button onClick={() => setShowDeleteConfirm(true)} className="hover:underline text-danger">Delete</button>
                                <span>&middot;</span>
                            </>
                        )}
                         {canModerate && onSilence && (
                            <>
                                <button onClick={() => onSilence(post.id, !post.isSilenced)} className="hover:underline text-yellow-400">{post.isSilenced ? 'Unsilence' : 'Silence'}</button>
                                <span>&middot;</span>
                            </>
                         )}
                        <button onClick={() => onReport(post)} className="hover:underline">Report</button>
                    </div>
                </div>
            </div>
            {showDeleteConfirm && (
                <ConfirmationModal
                    title="Delete Post?"
                    message="Are you sure you want to delete this post? This action cannot be undone."
                    confirmText="Delete"
                    onConfirm={() => { onDelete(post.id); setShowDeleteConfirm(false); }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </div>
    );
};

export default Post;
