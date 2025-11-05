
import React, { useState, useEffect } from 'react';
import { ForumCategory } from '../types';
import { CloseIcon } from './Icons';

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: Omit<ForumCategory, 'id'>) => void;
  existingCategory?: ForumCategory | null;
  allCategories: ForumCategory[];
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ isOpen, onClose, onSave, existingCategory, allCategories }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (existingCategory) {
      setName(existingCategory.name);
      setDescription(existingCategory.description);
      setParentId(existingCategory.parentId || null);
      setIsLocked(existingCategory.isLocked);
    } else {
      setName('');
      setDescription('');
      setParentId(null);
      setIsLocked(false);
    }
  }, [existingCategory, isOpen]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      parentId: parentId || null,
      isLocked,
    });
  };

  const possibleParents = allCategories.filter(c => !c.parentId && c.id !== existingCategory?.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-lg relative border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">{existingCategory ? 'Edit Category' : 'Create Category'}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">Name</label>
            <input 
              id="name" 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-secondary border border-border rounded p-2"
              required 
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
            <textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full bg-secondary border border-border rounded p-2"
              rows={3}
              required
            />
          </div>
          <div>
            <label htmlFor="parentId" className="block text-sm font-medium mb-1">Parent Category (optional)</label>
            <select
              id="parentId"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full bg-secondary border border-border rounded p-2"
            >
              <option value="">None (Top-level)</option>
              {possibleParents.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center">
            <input 
                id="isLocked" 
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-accent-primary focus:ring-accent-secondary"
            />
            <label htmlFor="isLocked" className="ml-2 block text-sm">Lock category (users cannot create new threads)</label>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md">Save Category</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryEditModal;
