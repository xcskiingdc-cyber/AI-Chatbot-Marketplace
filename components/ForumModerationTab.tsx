
import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Character, User, Report, ForumCategory, ForumThread } from '../types';
import CategoryEditModal from './CategoryEditModal';
import ConfirmationModal from './ConfirmationModal';
import { PlusIcon, PinIcon, LockIcon, EditIcon, DeleteIcon } from './Icons';
import Avatar from './Avatar';


const ForumModerationTab: React.FC<{
    setSelectedCharacter: (character: Character) => void;
    setSelectedCreator: (user: User) => void;
}> = ({ setSelectedCharacter, setSelectedCreator }) => {
    const [activeTab, setActiveTab] = useState('categories');

    const tabs = [
        { id: 'categories', label: 'Categories' },
        { id: 'threads', label: 'Threads' },
        { id: 'reports', label: 'Reported Content' },
    ];

    return (
        <div className="space-y-6">
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                ? 'border-accent-secondary text-accent-secondary'
                                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-600'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {activeTab === 'categories' && <CategoryManagement />}
                {activeTab === 'threads' && <ThreadManagement />}
                {activeTab === 'reports' && <ReportedContent />}
            </div>
        </div>
    );
};

const CategoryManagement: React.FC = () => {
    const auth = useContext(AuthContext);
    const { forumCategories = [], createCategory, updateCategory, deleteCategory } = auth || {};
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<ForumCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<ForumCategory | null>(null);

    const hierarchicalCategories = useMemo(() => {
        const categoriesMap = new Map<string, ForumCategory & { subcategories: ForumCategory[] }>();
        const rootCategories: (ForumCategory & { subcategories: ForumCategory[] })[] = [];
        forumCategories.forEach(cat => categoriesMap.set(cat.id, { ...cat, subcategories: [] }));
        forumCategories.forEach(cat => {
            if (cat.parentId && categoriesMap.has(cat.parentId)) {
                categoriesMap.get(cat.parentId)!.subcategories.push(categoriesMap.get(cat.id)!);
            } else {
                rootCategories.push(categoriesMap.get(cat.id)!);
            }
        });
        return rootCategories;
    }, [forumCategories]);
    
    const handleSave = async (categoryData: Omit<ForumCategory, 'id'>) => {
        try {
            if (categoryToEdit) {
                await updateCategory?.(categoryToEdit.id, categoryData);
            } else {
                await createCategory?.(categoryData);
            }
            setIsModalOpen(false);
            setCategoryToEdit(null);
        } catch (error: any) {
            console.error("Failed to save category:", error);
            alert(`Error saving category: ${error.message || JSON.stringify(error)}`);
        }
    };
    
    const handleConfirmDelete = async () => {
        try {
            if (categoryToDelete) {
                await deleteCategory?.(categoryToDelete.id);
            }
            setCategoryToDelete(null);
        } catch (error: any) {
            console.error("Failed to delete category:", error);
            alert(`Error deleting category: ${error.message || JSON.stringify(error)}`);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Manage Categories</h3>
                <button onClick={() => { setCategoryToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-accent-secondary text-white rounded-md text-sm hover:bg-accent-secondary-hover">
                    <PlusIcon className="w-4 h-4" /> Add Category
                </button>
            </div>
            <div className="bg-primary border border-border rounded-lg">
                {hierarchicalCategories.map(cat => (
                    <div key={cat.id} className="border-b border-border last:border-b-0">
                        <div className="flex items-center p-3">
                            <div className="flex-1">
                                <p className="font-semibold">{cat.name}</p>
                                <p className="text-xs text-text-secondary">{cat.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCategoryToEdit(cat); setIsModalOpen(true); }} className="text-sm text-accent-secondary hover:underline">Edit</button>
                                <button onClick={() => setCategoryToDelete(cat)} className="text-sm text-danger hover:underline">Delete</button>
                            </div>
                        </div>
                        {cat.subcategories.map(sub => (
                            <div key={sub.id} className="flex items-center p-3 pl-10 bg-tertiary/30 border-t border-border">
                                <div className="flex-1">
                                    <p className="font-semibold">{sub.name}</p>
                                    <p className="text-xs text-text-secondary">{sub.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setCategoryToEdit(sub); setIsModalOpen(true); }} className="text-sm text-accent-secondary hover:underline">Edit</button>
                                    <button onClick={() => setCategoryToDelete(sub)} className="text-sm text-danger hover:underline">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {isModalOpen && (
                <CategoryEditModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    existingCategory={categoryToEdit}
                    allCategories={forumCategories}
                />
            )}
            {categoryToDelete && (
                <ConfirmationModal
                    title="Delete Category?"
                    message={`Are you sure you want to delete "${categoryToDelete.name}"? All threads and subcategories will be moved to a fallback category.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setCategoryToDelete(null)}
                />
            )}
        </div>
    );
};

const ThreadManagement: React.FC = () => {
    const auth = useContext(AuthContext);
    const { forumThreads = [], forumCategories = [], moveThread, togglePinThread, toggleLockThread, silenceThread, deleteThread } = auth || {};
    const [searchTerm, setSearchTerm] = useState('');
    const [threadToMove, setThreadToMove] = useState<ForumThread | null>(null);
    const [threadToDelete, setThreadToDelete] = useState<ForumThread | null>(null);

    const filteredThreads = useMemo(() => {
        return forumThreads.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [forumThreads, searchTerm]);

    const handleMoveThread = (newCategoryId: string) => {
        if(threadToMove && newCategoryId) {
            moveThread?.(threadToMove.id, newCategoryId);
        }
        setThreadToMove(null);
    }
    
    const handleConfirmDelete = () => {
        if (threadToDelete) {
            deleteThread?.(threadToDelete.id);
        }
        setThreadToDelete(null);
    };

    return (
        <div>
            <input 
                type="text"
                placeholder="Search all threads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-primary border border-border rounded-md py-2 px-3 mb-4"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-primary">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Thread</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Category</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredThreads.map(thread => {
                            const category = forumCategories.find(c => c.id === thread.categoryId);
                            return (
                                <tr key={thread.id}>
                                    <td className="px-4 py-3">{thread.title}</td>
                                    <td className="px-4 py-3 text-sm text-text-secondary">{category?.name}</td>
                                    <td className="px-4 py-3 text-sm space-x-3 whitespace-nowrap">
                                        <button onClick={() => setThreadToMove(thread)} className="text-accent-secondary hover:underline">Move</button>
                                        <button onClick={() => togglePinThread?.(thread.id)} className="text-accent-secondary hover:underline">{thread.isPinned ? 'Unpin' : 'Pin'}</button>
                                        <button onClick={() => toggleLockThread?.(thread.id)} className="hover:underline">{thread.isLocked ? 'Unlock' : 'Lock'}</button>
                                        <button onClick={() => silenceThread?.(thread.id, !thread.isSilenced)} className="text-yellow-400 hover:underline">{thread.isSilenced ? 'Unsilence' : 'Silence'}</button>
                                        <button onClick={() => setThreadToDelete(thread)} className="text-danger hover:underline">Delete</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {threadToMove && (
                 <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-primary rounded-lg shadow-xl w-full max-w-sm border border-border p-6">
                        <h3 className="text-lg font-bold mb-4">Move Thread</h3>
                        <p className="text-sm text-text-secondary mb-1">Move "{threadToMove.title}" to:</p>
                        <select
                            onChange={(e) => handleMoveThread(e.target.value)}
                            defaultValue=""
                            className="w-full p-2 bg-secondary border border-border rounded-md"
                        >
                            <option value="" disabled>Select a category...</option>
                            {forumCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setThreadToMove(null)} className="w-full mt-4 py-2 bg-tertiary rounded-md">Cancel</button>
                    </div>
                </div>
            )}
             {threadToDelete && (
                <ConfirmationModal
                    title="Delete Thread?"
                    message={`Are you sure you want to permanently delete "${threadToDelete.title}" and all its posts? This action cannot be undone.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setThreadToDelete(null)}
                />
            )}
        </div>
    );
};

const ReportedContent: React.FC = () => {
    const auth = useContext(AuthContext);
    const { reports = [], findUserById } = auth || {};

    const forumReports = useMemo(() => {
        return reports.filter(r => r.entityType === 'forumPost' || r.entityType === 'forumThread');
    }, [reports]);

    return (
        <div>
            {forumReports.length === 0 ? (
                <p className="text-center text-text-secondary py-8">No forum content has been reported.</p>
            ) : (
                <div className="space-y-4">
                    {forumReports.map(report => (
                        <div key={report.id} className="bg-primary border border-border p-4 rounded-lg">
                             <h3 className="font-bold text-accent-primary capitalize">{report.reason} ({report.entityType})</h3>
                             <p className="text-sm text-text-secondary mt-1">Reported by: {findUserById?.(report.reporterId)?.profile.name || 'Unknown'}</p>
                             <div className="my-2 p-2 bg-tertiary rounded text-sm font-mono">
                                {report.contentSnapshot && <p>"{report.contentSnapshot}"</p>}
                             </div>
                             {/* Add actions later like 'Go to post' */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ForumModerationTab;
