

import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import type { Character, User, Comment } from '../types';
import { CloseIcon, ThumbsUpIcon, FlagIcon, EditIcon, DeleteIcon, SaveIcon, CancelIcon } from './Icons';
import Avatar from './Avatar';
import { AuthContext } from '../context/AuthContext';
import ConfirmationModal from './ConfirmationModal';

interface CharacterDetailModalProps {
  character: Character;
  creator: User | null;
  currentUser: User;
  onClose: () => void;
  onStartChat: (characterId: string) => void;
  onLike: (characterId: string) => void;
  onFollow: (userId: string) => void;
  onAddComment: (characterId: string, commentText: string, parentId?: string) => void;
  onReportCharacter: () => void;
  onReportComment: (comment: Comment) => void;
  onCreatorClick: (user: User) => void;
}

const CommentComponent: React.FC<{
    characterId: string;
    comment: Comment;
    onReply: (commentId: string) => void;
    onReport: (comment: Comment) => void;
    onUserClick: (user: User) => void;
}> = ({ characterId, comment, onReply, onReport, onUserClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const auth = useContext(AuthContext);
    const commenter = auth?.findUserById(comment.userId);
    const canModify = auth?.currentUser?.id === comment.userId || auth?.currentUser?.role === 'Admin';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleSaveEdit = () => {
        if (editText.trim() && auth?.editComment) {
            auth.editComment(characterId, comment.id, editText.trim());
            setIsEditing(false);
        }
    };

    const handleConfirmDelete = () => {
        if(auth?.deleteComment) {
            auth.deleteComment(characterId, comment.id);
        }
        setDeleteModalOpen(false);
    };

    return (
     <>
        <div className="flex items-start space-x-3 group">
            <button onClick={() => commenter && onUserClick(commenter)} disabled={!commenter} className="flex-shrink-0 disabled:cursor-default">
                <Avatar imageId={comment.avatarUrl} alt={comment.username} className="w-8 h-8 rounded-full object-cover" />
            </button>
            <div className="flex-1 bg-secondary p-3 rounded-lg">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    <button onClick={() => commenter && onUserClick(commenter)} disabled={!commenter} className="font-semibold text-sm text-text-primary hover:underline disabled:cursor-default disabled:no-underline">{comment.username}</button>
                    <p className="text-xs text-text-secondary">{new Date(comment.timestamp).toLocaleDateString()}</p>
                    {comment.isSilenced && <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded-full">Silenced</span>}
                </div>
                {isEditing ? (
                    <div className="mt-2">
                        <textarea 
                            value={editText} 
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2 bg-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-primary text-text-primary text-sm"
                            rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSaveEdit} className="p-1 text-success hover:opacity-80"><SaveIcon className="w-5 h-5" /></button>
                            <button onClick={() => { setIsEditing(false); setEditText(comment.text); }} className="p-1 text-danger hover:opacity-80"><CancelIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                ) : (
                    <p className={`text-sm mt-1 ${comment.isSilenced ? 'text-text-secondary italic' : 'text-text-primary'}`}>{comment.text}</p>
                )}
                
                {!isEditing && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => onReply(comment.id)} className="text-xs text-accent-primary hover:underline mt-1">Reply</button>
                    </div>
                )}
            </div>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1">
                    &#x22EE;
                </button>
                {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-tertiary rounded-md shadow-lg z-10 border border-border">
                        {canModify && (
                            <>
                                <button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary">
                                    <EditIcon className="w-4 h-4" /> Edit
                                </button>
                                <button onClick={() => { setDeleteModalOpen(true); setIsMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary">
                                    <DeleteIcon className="w-4 h-4" /> Delete
                                </button>
                                <div className="border-t border-border my-1"></div>
                            </>
                        )}
                        <button onClick={() => { onReport(comment); setIsMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-hover hover:text-text-primary">
                            <FlagIcon className="w-4 h-4" /> Report
                        </button>
                    </div>
                )}
            </div>
        </div>
        {isDeleteModalOpen && (
            <ConfirmationModal
                title="Delete Comment?"
                message="Are you sure you want to delete this comment? This action cannot be undone."
                confirmText="Delete"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteModalOpen(false)}
            />
        )}
     </>
    );
};


const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  creator,
  currentUser,
  onClose,
  onStartChat,
  onLike,
  onFollow,
  onAddComment,
  onReportCharacter,
  onReportComment,
  onCreatorClick,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null);
  const COMMENTS_PER_PAGE = 5;
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_PER_PAGE);

  useEffect(() => {
    // Reset visible comments when character changes
    setVisibleCommentsCount(COMMENTS_PER_PAGE);
  }, [character.id]);
  
  const isLiked = character.likes?.includes(currentUser.id);
  const isFollowingCreator = creator && currentUser.profile.following.includes(creator.id);

  const processText = (text: string) => {
    return text
        .replace(/{{char}}/g, character.name)
        .replace(/{{user}}/g, currentUser.profile.name);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(character.id, commentText, replyingTo?.id);
      setCommentText('');
      setReplyingTo(null);
    }
  };

  const handleStartReply = (commentId: string) => {
      const comment = character.comments.find(c => c.id === commentId);
      if (comment) {
        setReplyingTo({ id: comment.id, username: comment.username });
      }
  }
  
  const commentTree = useMemo(() => {
    let comments = character.comments || [];
    if (currentUser.role !== 'Admin') {
        comments = comments.filter(c => !c.isSilenced);
    }

    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    comments.forEach(comment => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach(comment => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
            commentMap.get(comment.parentId)!.replies.push(commentMap.get(comment.id)!);
        } else {
            rootComments.push(commentMap.get(comment.id)!);
        }
    });

    return rootComments;
  }, [character.comments, currentUser.role]);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-4xl h-[90vh] flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-text-primary">{character.name}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            <div className="w-full md:w-1/3 p-6 flex flex-col items-center space-y-4 border-b md:border-b-0 md:border-r border-border md:overflow-y-auto">
                <Avatar imageId={character.avatarUrl} alt={character.name} className="w-48 h-48 rounded-full object-cover ring-4 ring-accent-primary/50 flex-shrink-0" />
                <h3 className="text-2xl font-bold text-center">{character.name}</h3>
                {creator && (
                    <button onClick={() => onCreatorClick(creator)} className="text-center text-sm text-text-secondary hover:opacity-80">
                        <p>Created by</p>
                        <p className="font-semibold text-text-primary underline">{creator.profile.name}</p>
                    </button>
                )}
                <div className="flex items-center space-x-4 pt-4">
                    <button
                        onClick={() => onLike(character.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isLiked ? 'bg-accent-primary text-white' : 'bg-tertiary text-text-primary hover:bg-hover'}`}
                    >
                        <ThumbsUpIcon className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{character.likes?.length || 0}</span>
                    </button>
                    {creator && creator.id !== currentUser.id && (
                        <button
                            onClick={() => onFollow(creator.id)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isFollowingCreator ? 'bg-accent-secondary text-white' : 'bg-tertiary text-text-primary hover:bg-hover'}`}
                        >
                            {isFollowingCreator ? 'Following' : 'Follow'}
                        </button>
                    )}
                    <button onClick={onReportCharacter} className="p-2 rounded-full bg-tertiary text-text-secondary hover:bg-hover hover:text-text-primary transition-colors" title="Report Character">
                        <FlagIcon className="w-5 h-5" />
                    </button>
                </div>
                <button 
                    onClick={() => onStartChat(character.id)}
                    className="w-full mt-auto bg-accent-secondary hover:bg-accent-secondary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors flex-shrink-0"
                >
                    Start Chat
                </button>
            </div>
            
            <div className="flex-1 flex flex-col">
                <div className="p-6 space-y-4 md:overflow-y-auto border-b border-border flex-shrink-0">
                    <div>
                        <h4 className="font-semibold text-accent-primary mb-1">Description</h4>
                        <p className="text-text-primary whitespace-pre-wrap">{processText(character.description)}</p>
                    </div>
                    {character.story && (
                        <div>
                            <h4 className="font-semibold text-accent-primary mb-1">Backstory</h4>
                            <p className="text-text-primary whitespace-pre-wrap">{processText(character.story)}</p>
                        </div>
                    )}
                    {character.categories?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-accent-primary mb-1">Categories</h4>
                            <div className="flex flex-wrap gap-2">
                                {character.categories.map(cat => (
                                    <span key={cat} className="px-2 py-1 bg-tertiary text-xs text-text-secondary rounded-full">{cat}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <h4 className="font-semibold text-accent-primary mb-3 flex-shrink-0">Comments ({character.comments?.length || 0})</h4>
                    <div className="flex-1 overflow-y-auto space-y-4 -mr-2 pr-2">
                        {commentTree.slice(0, visibleCommentsCount).map(comment => (
                            <div key={comment.id}>
                                <CommentComponent characterId={character.id} comment={comment} onReply={handleStartReply} onReport={onReportComment} onUserClick={onCreatorClick}/>
                                {comment.replies.length > 0 && (
                                    <div className="ml-8 mt-3 space-y-3 border-l-2 border-border pl-4">
                                        {comment.replies.map(reply => (
                                            <CommentComponent key={reply.id} characterId={character.id} comment={reply} onReply={handleStartReply} onReport={onReportComment} onUserClick={onCreatorClick}/>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                         {commentTree.length > visibleCommentsCount && (
                            <button 
                                onClick={() => setVisibleCommentsCount(prev => prev + COMMENTS_PER_PAGE)}
                                className="w-full mt-4 py-2 text-sm bg-tertiary hover:bg-hover rounded-md transition-colors"
                            >
                                Load More Comments
                            </button>
                        )}
                         {commentTree.length === 0 && <p className="text-sm text-text-secondary text-center py-4">No comments yet.</p>}
                    </div>
                    <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2 flex-shrink-0">
                        {replyingTo && (
                            <div className="text-sm text-text-secondary bg-secondary px-3 py-1 rounded-md flex justify-between items-center">
                                <span>Replying to @{replyingTo.username}</span>
                                <button type="button" onClick={() => setReplyingTo(null)}><CloseIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 bg-tertiary border border-border rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-accent-primary"
                            />
                            <button type="submit" className="bg-accent-primary hover:bg-accent-primary-hover text-white font-bold py-2 px-4 rounded-lg">Post</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterDetailModal;