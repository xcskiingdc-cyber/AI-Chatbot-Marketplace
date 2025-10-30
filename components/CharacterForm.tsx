
import React, { useState, useEffect, useContext } from 'react';
import { Character, LLMModel } from '../types';
import { saveImage } from '../services/dbService';
import { UploadIcon, DeleteIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';

interface CharacterFormProps {
  onSave: (character: Omit<Character, 'creatorId'> & { creatorId?: string }) => void;
  onCancel: () => void;
  existingCharacter?: Character;
  isUserAdult?: boolean;
}

const categories = ["Fantasy", "Sci-Fi", "Romance", "Horror", "Adventure", "Mystery", "Anime", "Historical"];


const CharacterForm: React.FC<CharacterFormProps> = ({ onSave, onCancel, existingCharacter, isUserAdult = false }) => {
  const auth = useContext(AuthContext);
  const [character, setCharacter] = useState<Omit<Character, 'creatorId' | 'isSilencedByAdmin'>>(
    existingCharacter || {
      id: crypto.randomUUID(),
      name: '',
      avatarUrl: '',
      gender: 'unspecified',
      description: '',
      personality: '',
      story: '',
      situation: '',
      feeling: '',
      appearance: '',
      isNSFW: false,
      model: LLMModel.GEMINI_FLASH,
      greeting: '',
      isPublic: true,
      categories: [],
      likes: [],
      comments: [],
    }
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingCharacter?.avatarUrl || null);

  useEffect(() => {
      // Cleanup object URLs to prevent memory leaks
      return () => {
          if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
          }
      };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setCharacter({ ...character, [name]: checked });
    } else {
        setCharacter({ ...character, [name]: value });
    }
  };
  
  const handleGenderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCharacter(prev => ({...prev, gender: e.target.value as Character['gender']}));
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setCharacter(prev => {
        const newCategories = checked
            ? [...prev.categories, value]
            : prev.categories.filter(c => c !== value);
        return { ...prev, categories: newCategories };
    });
  };

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
    
    let finalCharacterData: any = { ...character, isSilencedByAdmin: existingCharacter?.isSilencedByAdmin || false };

    if (selectedFile) {
        try {
            const imageId = crypto.randomUUID();
            await saveImage(imageId, selectedFile);
            finalCharacterData.avatarUrl = imageId;
        } catch (error) {
            console.error("Failed to save image:", error);
            alert("Error saving character avatar. Please try again.");
            return;
        }
    } else if (previewUrl === null) {
        // Avatar was removed, use a default
        finalCharacterData.avatarUrl = `https://picsum.photos/seed/${character.id}/400`;
    }
    
    if (!isUserAdult) {
        finalCharacterData.isNSFW = false;
    }
    
    if (auth?.currentUser?.isSilenced && finalCharacterData.isPublic) {
        alert("Your account has been silenced. You can only create private characters.");
        finalCharacterData.isPublic = false;
    }

    if (finalCharacterData.name && finalCharacterData.personality && finalCharacterData.greeting && finalCharacterData.description) {
        onSave(finalCharacterData);
    } else {
        alert("Please fill in all required fields: Name, Description, Greeting, and Personality.");
    }
  };

  const formFieldClasses = "w-full p-2 bg-[--bg-tertiary] border border-[--border-color] rounded-md focus:outline-none focus:ring-2 focus:ring-[--accent-secondary] text-[--text-primary]";
  const labelClasses = "block text-sm font-medium text-[--text-secondary] mb-1";
  const defaultAvatar = `https://picsum.photos/seed/${character.id}/400`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="bg-[--bg-secondary] p-4 rounded-lg mb-6 border border-[--border-color]">
        <p className="text-sm text-[--text-secondary]">
            Fields such as Personality, Appearance, Backstory, Situation, and Mood are all context data for your character/story. The more information that is put into these fields, the more accurately your character/story will act to how you want it. It's recommended to keep it below 1-2k characters per field.
        </p>
      </div>
      <h2 className="text-3xl font-bold mb-6 text-[--text-primary]">{existingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <label className={labelClasses}>Avatar</label>
                <div className="mt-2 flex flex-col items-center gap-4">
                    <img src={previewUrl || defaultAvatar} alt="Avatar Preview" className="w-48 h-48 rounded-lg object-cover bg-[--bg-tertiary]"/>
                    <div className="flex items-center gap-2">
                        <label htmlFor="avatar-upload" className="cursor-pointer bg-[--bg-tertiary] hover:bg-[--bg-hover] text-[--text-primary] font-bold py-2 px-4 rounded-md inline-flex items-center gap-2 text-sm">
                            <UploadIcon className="w-4 h-4" />
                            <span>Upload</span>
                        </label>
                        <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button type="button" onClick={handleRemoveAvatar} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2 text-sm">
                            <DeleteIcon className="w-4 h-4" />
                            <span>Remove</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="md:col-span-2 space-y-6">
                <div>
                  <label htmlFor="name" className={labelClasses}>Name *</label>
                  <input type="text" id="name" name="name" value={character.name} onChange={handleChange} className={formFieldClasses} required />
                </div>
                 <div>
                    <label className={labelClasses}>Gender</label>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[--text-primary]">
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="male" checked={character.gender === 'male'} onChange={handleGenderChange} className="form-radio text-[--accent-primary] bg-[--bg-tertiary]" /> <span className="ml-2">Male</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="female" checked={character.gender === 'female'} onChange={handleGenderChange} className="form-radio text-[--accent-primary] bg-[--bg-tertiary]"/> <span className="ml-2">Female</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="non-binary" checked={character.gender === 'non-binary'} onChange={handleGenderChange} className="form-radio text-[--accent-primary] bg-[--bg-tertiary]"/> <span className="ml-2">Non-binary</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="unspecified" checked={character.gender === 'unspecified'} onChange={handleGenderChange} className="form-radio text-[--accent-primary] bg-[--bg-tertiary]"/> <span className="ml-2">Unspecified</span></label>
                    </div>
                </div>
                <div>
                  <label htmlFor="description" className={labelClasses}>Description *</label>
                  <textarea id="description" name="description" value={character.description} onChange={handleChange} className={formFieldClasses} rows={3} required placeholder="A short, public-facing description of the character."></textarea>
                </div>
                <div>
                  <label htmlFor="greeting" className={labelClasses}>Greeting *</label>
                  <textarea id="greeting" name="greeting" value={character.greeting} onChange={handleChange} className={formFieldClasses} rows={2} required placeholder="The first message the character will send to the user."></textarea>
                </div>
            </div>
        </div>
        <div>
          <label htmlFor="personality" className={labelClasses}>Personality *</label>
          <textarea id="personality" name="personality" value={character.personality} onChange={handleChange} className={formFieldClasses} rows={3} required></textarea>
        </div>
        <div>
            <label htmlFor="appearance" className={labelClasses}>Appearance</label>
            <textarea id="appearance" name="appearance" value={character.appearance} onChange={handleChange} className={formFieldClasses} rows={3} placeholder="Describe the character's physical appearance."></textarea>
        </div>
        <div>
          <label htmlFor="story" className={labelClasses}>Backstory</label>
          <textarea id="story" name="story" value={character.story} onChange={handleChange} className={formFieldClasses} rows={4}></textarea>
        </div>
        <div>
          <label htmlFor="situation" className={labelClasses}>Situation</label>
          <textarea id="situation" name="situation" value={character.situation} onChange={handleChange} className={formFieldClasses} rows={2} placeholder="The current scenario or setting."></textarea>
        </div>
        <div>
          <label htmlFor="feeling" className={labelClasses}>Initial Mood/Feeling</label>
          <input type="text" id="feeling" name="feeling" value={character.feeling} onChange={handleChange} className={formFieldClasses} />
        </div>
        
        <div>
            <label className={labelClasses}>Categories</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {categories.map(category => (
                    <label key={category} className="flex items-center space-x-2 text-[--text-primary]">
                        <input
                            type="checkbox"
                            value={category}
                            checked={character.categories.includes(category)}
                            onChange={handleCategoryChange}
                            className="form-checkbox h-5 w-5 text-[--accent-primary] bg-[--bg-tertiary] border-[--border-color] rounded focus:ring-[--accent-primary]"
                        />
                        <span>{category}</span>
                    </label>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="model" className={labelClasses}>AI Model</label>
              <select id="model" name="model" value={character.model} onChange={handleChange} className={formFieldClasses}>
                <option value={LLMModel.GEMINI_FLASH}>Gemini 2.5 Flash</option>
                <option value={LLMModel.GEMINI_PRO}>Gemini 2.5 Pro</option>
              </select>
            </div>
            {isUserAdult && (
              <div className="flex items-center justify-center pt-6">
                <label htmlFor="isNSFW" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" id="isNSFW" name="isNSFW" checked={character.isNSFW} onChange={handleChange} className="sr-only" />
                    <div className={`block w-14 h-8 rounded-full ${character.isNSFW ? 'bg-[--accent-primary]' : 'bg-[--bg-tertiary]'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.isNSFW ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-[--text-primary] font-medium">
                    NSFW Mode
                  </div>
                </label>
              </div>
            )}
        </div>

        <div className="flex items-center justify-start pt-6">
          <label htmlFor="isPublic" className="flex items-center cursor-pointer">
            <div className="relative">
              <input type="checkbox" id="isPublic" name="isPublic" checked={character.isPublic} onChange={handleChange} className="sr-only" disabled={auth?.currentUser?.isSilenced}/>
              <div className={`block w-14 h-8 rounded-full ${character.isPublic ? 'bg-[--success]' : 'bg-[--bg-tertiary]'} ${auth?.currentUser?.isSilenced ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.isPublic ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <div className="ml-3 text-[--text-primary] font-medium">
              {character.isPublic ? 'Public Character' : 'Private Character'}
              <p className="text-xs text-[--text-secondary]">{character.isPublic ? 'Visible to everyone on the home page.' : 'Only visible to you on your profile.'}</p>
              {auth?.currentUser?.isSilenced && <p className="text-xs text-yellow-400">You cannot create public characters because your account is silenced.</p>}
            </div>
          </label>
        </div>


        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 bg-[--bg-tertiary] hover:bg-[--bg-hover] rounded-md transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-[--accent-secondary] hover:bg-[--accent-secondary-hover] text-white rounded-md transition-colors">Save Character</button>
        </div>
      </form>
    </div>
  );
};

export default CharacterForm;