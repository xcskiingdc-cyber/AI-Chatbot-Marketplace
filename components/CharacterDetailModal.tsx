
import React, { useState, useMemo } from 'react';
import type { Character, User, Comment } from '../types';
import { CloseIcon, ThumbsUpIcon } from './Icons';
import Avatar from './Avatar';

interface CharacterDetailModalProps {
  character: Character;
  creator: User | null;
  currentUser: User;
  onClose: () => void;
  onStartChat: (characterId: string) => void;
  onLike: (characterId: string) => void;
  onFollow: (userId: string) => void;
  onAddComment: (characterId: string, commentText: string, parentId?: string) => void;
}

const CommentComponent: React.FC<{
    comment: Comment;
    onReply: (commentId: string) => void;
}> = ({ comment, onReply }) => (
     <div className="flex items-start space-x-3">
        <Avatar imageId={comment.avatarUrl} alt={comment.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        <div className="flex-1 bg-secondary p-3 rounded-lg">
            <div className="flex items-baseline space-x-2">
                <p className="font-semibold text-sm text-text-primary">{comment.username}</p>
                <p className="text-xs text-text-secondary">{new Date(comment.timestamp).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-text-primary mt-1">{comment.text}</p>
            <button onClick={() => onReply(comment.id)} className="text-xs text-accent-primary hover:underline mt-1">Reply</button>
        </div>
    </div>
);


const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({
  character,
  creator,
  currentUser,
  onClose,
  onStartChat,
  onLike,
  onFollow,
  onAddComment
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null);
  
  const isLiked = character.likes?.includes(currentUser.id);
  const isFollowingCreator = creator && currentUser.profile.following.includes(creator.id);

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
    const comments = character.comments || [];
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
  }, [character.comments]);

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-text-primary">{character.name}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/3 p-6 flex flex-col items-center space-y-4 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
                <Avatar imageId={character.avatarUrl} alt={character.name} className="w-48 h-48 rounded-full object-cover ring-4 ring-accent-primary/50 flex-shrink-0" />
                <h3 className="text-2xl font-bold text-center">{character.name}</h3>
                {creator && (
                    <div className="text-center text-sm text-text-secondary">
                        <p>Created by</p>
                        <p className="font-semibold text-text-primary">{creator.profile.name}</p>
                    </div>
                )}
                <div className="flex items-center space-x-4 pt-4">
                    <button
                        onClick={() => onLike(character.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${isLiked ? 'bg-accent-primary text-white' : 'bg-tertiary text-text-primary hover:bg-hover'}`}
                    >
                        <ThumbsUpIcon className="w-5 h-5" />
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
                </div>
                <button 
                    onClick={() => onStartChat(character.id)}
                    className="w-full mt-auto bg-accent-secondary hover:bg-accent-secondary-hover text-white font-bold py-3 px-4 rounded-lg transition-colors flex-shrink-0"
                >
                    Start Chat
                </button>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto border-b border-border flex-shrink-0">
                    <div>
                        <h4 className="font-semibold text-accent-primary mb-1">Description</h4>
                        <p className="text-text-primary whitespace-pre-wrap">{character.description}</p>
                    </div>
                    {character.story && (
                        <div>
                            <h4 className="font-semibold text-accent-primary mb-1">Backstory</h4>
                            <p className="text-text-primary whitespace-pre-wrap">{character.story}</p>
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
                <div className="p-6 flex-1 flex flex-col overflow-hidden">
                    <h4 className="font-semibold text-accent-primary mb-3 flex-shrink-0">Comments ({character.comments?.length || 0})</h4>
                    <div className="flex-1 overflow-y-auto space-y-4 -mr-2 pr-2">
                        {commentTree.map(comment => (
                            <div key={comment.id}>
                                <CommentComponent comment={comment} onReply={handleStartReply} />
                                {comment.replies.length > 0 && (
                                    <div className="ml-8 mt-3 space-y-3 border-l-2 border-border pl-4">
                                        {comment.replies.map(reply => (
                                            <CommentComponent key={reply.id} comment={reply} onReply={handleStartReply} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                         {!character.comments?.length && <p className="text-sm text-text-secondary text-center py-4">No comments yet.</p>}
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