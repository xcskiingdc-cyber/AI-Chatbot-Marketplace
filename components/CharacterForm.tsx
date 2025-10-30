import React, { useState, useEffect } from 'react';
import { Character, LLMModel } from '../types';
import { saveImage } from '../services/dbService';
import { UploadIcon } from './Icons';

interface CharacterFormProps {
  onSave: (character: Omit<Character, 'creatorId'> & { creatorId?: string }) => void;
  onCancel: () => void;
  existingCharacter?: Character;
  isUserAdult?: boolean;
}

const CharacterForm: React.FC<CharacterFormProps> = ({ onSave, onCancel, existingCharacter, isUserAdult = false }) => {
  const [character, setCharacter] = useState(
    existingCharacter || {
      id: crypto.randomUUID(),
      name: '',
      avatarUrl: `https://picsum.photos/seed/${crypto.randomUUID()}/300/400`,
      description: '',
      personality: '',
      story: '',
      situation: '',
      feeling: '',
      appearance: '',
      isNSFW: false,
      model: LLMModel.GEMINI_FLASH,
      greeting: ''
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        
        // Clean up old preview URL if it exists
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        
        // Create a new temporary URL for immediate preview
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCharacterData = { ...character };

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
    }
    
    // Ensure NSFW is false if user is not an adult
    if (!isUserAdult) {
        finalCharacterData.isNSFW = false;
    }

    if (finalCharacterData.name && finalCharacterData.personality && finalCharacterData.greeting && finalCharacterData.description) {
        onSave(finalCharacterData);
    } else {
        alert("Please fill in all required fields: Name, Description, Greeting, and Personality.");
    }
  };

  const formFieldClasses = "w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClasses = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-white">{existingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className={labelClasses}>Name *</label>
          <input type="text" id="name" name="name" value={character.name} onChange={handleChange} className={formFieldClasses} required />
        </div>
        <div>
          <label htmlFor="description" className={labelClasses}>Description *</label>
          <textarea id="description" name="description" value={character.description} onChange={handleChange} className={formFieldClasses} rows={3} required placeholder="A short, public-facing description of the character."></textarea>
        </div>
        <div>
          <label htmlFor="greeting" className={labelClasses}>Greeting *</label>
          <textarea id="greeting" name="greeting" value={character.greeting} onChange={handleChange} className={formFieldClasses} rows={2} required placeholder="The first message the character will send to the user."></textarea>
        </div>
         <div>
          <label className={labelClasses}>Avatar</label>
          <div className="flex items-center gap-4 mt-2">
            <img src={previewUrl || 'https://picsum.photos/seed/placeholder/300/400'} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover bg-gray-700"/>
            <label htmlFor="avatar-upload" className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md inline-flex items-center gap-2">
              <UploadIcon className="w-5 h-5" />
              <span>Upload Image</span>
            </label>
            <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
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
                    <div className={`block w-14 h-8 rounded-full ${character.isNSFW ? 'bg-pink-600' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.isNSFW ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-gray-300 font-medium">
                    NSFW Mode
                  </div>
                </label>
              </div>
            )}
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors">Save Character</button>
        </div>
      </form>
    </div>
  );
};

export default CharacterForm;