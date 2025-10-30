import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { CloseIcon, UploadIcon, DeleteIcon } from './Icons';
import { saveImage } from '../services/dbService';

interface ProfileEditModalProps {
  userProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onCancel: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ userProfile, onSave, onCancel }) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userProfile.avatarUrl);

  useEffect(() => {
    // Cleanup object URLs to prevent memory leaks
    return () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
    };
  }, [previewUrl]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({...prev, gender: e.target.value as UserProfile['gender']}));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleRemoveAvatar = () => {
      setSelectedFile(null);
      if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null); // This will show the placeholder
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalProfileData = { ...profile };

    if (selectedFile) {
        try {
            const imageId = crypto.randomUUID();
            await saveImage(imageId, selectedFile);
            finalProfileData.avatarUrl = imageId;
        } catch (error) {
            console.error("Failed to save profile image:", error);
            alert("Error saving profile picture. Please try again.");
            return;
        }
    } else if (previewUrl === null) {
      // Avatar was removed
      finalProfileData.avatarUrl = `https://i.pravatar.cc/150?u=${profile.name}`;
    }
    onSave(finalProfileData);
  };
  
  const formFieldClasses = "w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-200";
  const labelClasses = "block text-sm font-medium text-pink-400 mb-2";
  const defaultAvatar = `https://i.pravatar.cc/150?u=${profile.name}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-gray-700">
        <div className="sticky top-0 bg-gray-900 z-10 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
            <button onClick={onCancel} className="text-gray-500 hover:text-white">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
                <label className={labelClasses}>Avatar</label>
                <div className="flex items-center space-x-4">
                    <img src={previewUrl || defaultAvatar} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-gray-700"/>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="profile-avatar-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
                            <UploadIcon className="w-5 h-5" />
                            <span>Change</span>
                        </label>
                        <input id="profile-avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button type="button" onClick={handleRemoveAvatar} className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
                            <DeleteIcon className="w-5 h-5" />
                            <span>Remove</span>
                        </button>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="name" className={labelClasses}>User Name *</label>
                <input type="text" id="name" name="name" value={profile.name} onChange={handleChange} className={formFieldClasses} required />
                <p className="text-xs text-gray-500 mt-1">This represents you as the character's creator.</p>
            </div>
            
            <div>
                <label className={labelClasses}>Gender</label>
                <div className="flex items-center space-x-6 text-gray-300">
                    <label className="flex items-center"><input type="radio" name="gender" value="male" checked={profile.gender === 'male'} onChange={handleGenderChange} className="form-radio text-pink-500 bg-gray-700" /> <span className="ml-2">Male</span></label>
                    <label className="flex items-center"><input type="radio" name="gender" value="female" checked={profile.gender === 'female'} onChange={handleGenderChange} className="form-radio text-pink-500 bg-gray-700"/> <span className="ml-2">Female</span></label>
                    <label className="flex items-center"><input type="radio" name="gender" value="non-binary" checked={profile.gender === 'non-binary'} onChange={handleGenderChange} className="form-radio text-pink-500 bg-gray-700"/> <span className="ml-2">Non-binary</span></label>
                </div>
                 <p className="text-xs text-gray-500 mt-1">Only you can see this.</p>
            </div>

            <div>
                <label htmlFor="birthday" className={labelClasses}>Birthday</label>
                <input type="date" id="birthday" name="birthday" value={profile.birthday} onChange={handleChange} className={formFieldClasses} />
                <p className="text-xs text-gray-500 mt-1">Only you can see this, will help with recommendations.</p>
            </div>

             <div>
                <label htmlFor="bio" className={labelClasses}>Bio</label>
                <textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} className={formFieldClasses} rows={3}></textarea>
            </div>

            <div className="pt-4 flex justify-end">
                 <button type="submit" className="px-8 py-3 bg-pink-600 hover:bg-pink-500 rounded-md transition-colors font-semibold">Save</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;