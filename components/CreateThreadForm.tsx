
import React, { useState, useContext } from 'react';
import type { AppView, ForumThread, Tag } from '../types';
import { AuthContext } from '../context/AuthContext';

interface CreateThreadFormProps {
  categoryId: string;
  setView: (view: AppView) => void;
}

const CreateThreadForm: React.FC<CreateThreadFormProps> = ({ categoryId, setView }) => {
    const auth = useContext(AuthContext);
    const { currentUser, createThread, forumCategories } = auth || {};
    
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string>('');
    const [error, setError] = useState('');

    const category = forumCategories?.find(c => c.id === categoryId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError('Title and content are required.');
            return;
        }
        if (!currentUser || !createThread) {
            setError('You must be logged in to create a thread.');
            return;
        }

        const newThread: Omit<ForumThread, 'id' | 'createdAt' | 'viewCount' | 'isSilenced'> = {
            categoryId,
            authorId: currentUser.id,
            title: title.trim(),
            tags: tags.split(',').map(t => ({ id: crypto.randomUUID(), name: t.trim(), description: '' })).filter(t => t.name),
            isLocked: false,
            isPinned: false,
        };

        const initialPostContent = content.trim();

        const createdThreadId = await createThread(newThread, initialPostContent);
        setView({ type: 'FORUM_THREAD', threadId: createdThreadId });
    };

    if (!category) {
        return <div className="p-8 text-center text-text-secondary">Category not found.</div>;
    }

    const formFieldClasses = "w-full p-2 bg-tertiary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-secondary text-text-primary";
    const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
            <div className="mb-6">
                <button onClick={() => setView({ type: 'FORUM_CATEGORY', categoryId })} className="text-sm text-text-secondary hover:underline">&larr; Back to {category.name}</button>
                <h1 className="text-3xl font-bold text-text-primary mt-1">Create New Thread</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-secondary p-6 rounded-lg border border-border">
                {error && <p className="text-danger bg-danger/20 p-3 rounded-md">{error}</p>}
                
                <div>
                    <label htmlFor="title" className={labelClasses}>Thread Title *</label>
                    <input 
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={formFieldClasses}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="content" className={labelClasses}>Content *</label>
                    <textarea 
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={`${formFieldClasses} min-h-[200px]`}
                        required
                    />
                    <p className="text-xs text-text-secondary mt-1">Markdown is supported (e.g., *italic*, **bold**, - list item).</p>
                </div>

                <div>
                    <label htmlFor="tags" className={labelClasses}>Tags</label>
                    <input 
                        type="text"
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className={formFieldClasses}
                        placeholder="e.g., fantasy, character-help, sci-fi"
                    />
                    <p className="text-xs text-text-secondary mt-1">Separate tags with commas.</p>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                    <button type="button" onClick={() => setView({ type: 'FORUM_CATEGORY', categoryId })} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors">Post Thread</button>
                </div>
            </form>
        </div>
    );
};

export default CreateThreadForm;
