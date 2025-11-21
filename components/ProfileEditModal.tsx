
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { CloseIcon, UploadIcon, DeleteIcon, CropIcon } from './Icons';

declare let Cropper: any;

interface ProfileEditModalProps {
  userProfile: UserProfile;
  onSave: (profile: UserProfile, avatarFile: File | null) => void;
  onCancel: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ userProfile, onSave, onCancel }) => {
  const [profile, setProfile] = useState<UserProfile>(userProfile);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(userProfile.avatarUrl);
  
  // Cropper state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);
  const cropperInstanceRef = useRef<any>(null);

  useEffect(() => {
    return () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
    };
  }, [previewUrl]);
  
  useEffect(() => {
    if (isCropperOpen && cropperImageRef.current && imageToCrop) {
      const cropper = new Cropper(cropperImageRef.current, {
        aspectRatio: 1, // Square for profile
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 0.9,
      });
      cropperInstanceRef.current = cropper;
    }
    return () => {
      if (cropperInstanceRef.current) {
        cropperInstanceRef.current.destroy();
        cropperInstanceRef.current = null;
      }
    };
  }, [isCropperOpen, imageToCrop]);


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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleReCrop = () => {
      if (previewUrl) {
          setImageToCrop(previewUrl);
          setIsCropperOpen(true);
      }
  };

  const handleCropSave = () => {
    if (cropperInstanceRef.current) {
      cropperInstanceRef.current.getCroppedCanvas().toBlob((blob: Blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.png', { type: 'image/png' });
          setSelectedFile(file);
          if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl(URL.createObjectURL(file));
          setIsCropperOpen(false);
          setImageToCrop(null);
        }
      }, 'image/png');
    }
  };
  
  const handleRemoveAvatar = () => {
      setSelectedFile(null);
      if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null); 
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalProfileData = { ...profile };

    if (previewUrl === null) {
      finalProfileData.avatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name}`;
    }
    
    onSave(finalProfileData, selectedFile);
  };
  
  const formFieldClasses = "w-full p-2 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-2";
  const defaultAvatar = `https://api.dicebear.com/8.x/initials/svg?seed=${profile.name}`;

  const ImageCropperModal = (
     <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary">Crop Avatar</h2>
          <button onClick={() => setIsCropperOpen(false)} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-hidden">
          <div className="w-full h-full bg-tertiary">
            <img ref={cropperImageRef} src={imageToCrop || ''} crossOrigin="anonymous" alt="Source" style={{ display: 'block', maxWidth: '100%' }} />
          </div>
        </div>
        <div className="p-4 bg-secondary/50 border-t border-border flex justify-end gap-4">
          <button type="button" onClick={() => setIsCropperOpen(false)} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button type="button" onClick={handleCropSave} className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors">Save</button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-border">
        <div className="sticky top-0 bg-primary z-10 px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="text-2xl font-bold text-text-primary">Edit Profile</h2>
            <button onClick={onCancel} className="text-text-secondary hover:text-text-primary">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
                <label className={labelClasses}>Avatar</label>
                <div className="flex items-center space-x-4">
                    <img src={previewUrl || defaultAvatar} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-border"/>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="profile-avatar-upload" className="cursor-pointer bg-tertiary hover:bg-hover text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
                            <UploadIcon className="w-5 h-5" />
                            <span>Change</span>
                        </label>
                        <input id="profile-avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        
                        {previewUrl && (
                            <button type="button" onClick={handleReCrop} className="bg-tertiary hover:bg-hover text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
                                <CropIcon className="w-5 h-5" />
                                <span>Crop</span>
                            </button>
                        )}

                        <button type="button" onClick={handleRemoveAvatar} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
                            <DeleteIcon className="w-5 h-5" />
                            <span>Remove</span>
                        </button>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="name" className={labelClasses}>User Name *</label>
                <input type="text" id="name" name="name" value={profile.name} onChange={handleChange} className={formFieldClasses} required />
                <p className="text-xs text-text-secondary mt-1">This represents you as the character's creator.</p>
            </div>
            <div>
                <label className={labelClasses}>Gender</label>
                <div className="flex items-center space-x-6 text-text-primary">
                    <label className="flex items-center"><input type="radio" name="gender" value="male" checked={profile.gender === 'male'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-secondary" /> <span className="ml-2">Male</span></label>
                    <label className="flex items-center"><input type="radio" name="gender" value="female" checked={profile.gender === 'female'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-secondary"/> <span className="ml-2">Female</span></label>
                    <label className="flex items-center"><input type="radio" name="gender" value="non-binary" checked={profile.gender === 'non-binary'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-secondary"/> <span className="ml-2">Non-binary</span></label>
                </div>
                 <p className="text-xs text-text-secondary mt-1">Only you can see this.</p>
            </div>

            <div>
                <label htmlFor="birthday" className={labelClasses}>Birthday</label>
                <input type="date" id="birthday" name="birthday" value={profile.birthday} onChange={handleChange} className={formFieldClasses} />
                <p className="text-xs text-text-secondary mt-1">Only you can see this, will help with recommendations.</p>
            </div>

             <div>
                <label htmlFor="bio" className={labelClasses}>Bio</label>
                <textarea id="bio" name="bio" value={profile.bio} onChange={handleChange} className={formFieldClasses} rows={3}></textarea>
            </div>

            <div className="pt-4 flex justify-end">
                 <button type="submit" className="px-8 py-3 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-md transition-colors font-semibold">Save</button>
            </div>
        </form>
      </div>
    </div>
    {isCropperOpen && ImageCropperModal}
    </>
  );
};

export default ProfileEditModal;
