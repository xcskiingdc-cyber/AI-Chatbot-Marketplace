
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Character, CharacterStat, StatRule, ApiConnection } from '../types';
import { UploadIcon, DeleteIcon, QuestionMarkCircleIcon, SpinnerIcon, RefreshIcon, CloseIcon, PlusIcon } from './Icons';
import { AuthContext } from '../context/AuthContext';
import CharacterHelpModal from './CharacterHelpModal';
import { generateCharacterImage } from '../services/aiService';

const DEFAULT_CHARACTER_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0xMiAyQzkuMjQzIDIgNyA0LjI0MyA3IDdzMi4yNDMgNSA1IDUgNS0yLjI0MyA1LTUtMi4yNDMtNS01LT V6bTAgMTBjLTMuODYgMC03IDMuMTQtNyA3aDE0YzAtMy44Ni0zLjE0LTctNy03eiIgZmlsbD0iIzI0MjIyMSIvPjwvc3ZnPg==';

declare let Cropper: any;

interface CharacterFormProps {
  onSave: (character: Omit<Character, 'creatorId'> & { creatorId?: string }, avatarFile: File | null) => Promise<void>;
  onCancel: () => void;
  existingCharacter?: Character;
  isUserAdult?: boolean;
}

const categories = ["Fantasy", "Sci-Fi", "Romance", "Horror", "Adventure", "Mystery", "Anime", "Historical"];


const CharacterForm: React.FC<CharacterFormProps> = ({ onSave, onCancel, existingCharacter, isUserAdult = false }) => {
  const auth = useContext(AuthContext);
  const { apiConnections = [], findConnectionForModel, findConnectionForTool } = auth || {};

  const getDefaultModel = () => {
    // Prioritize gemini-2.5-flash if available in any active connection
    const geminiFlashModel = apiConnections
      .filter(c => c.isActive)
      .flatMap(c => c.models)
      .find(m => m === 'gemini-2.5-flash');

    if (geminiFlashModel) {
      return geminiFlashModel;
    }
    
    // Fallback to the first available model from an active connection
    for (const conn of apiConnections) {
        if (conn.isActive && conn.models.length > 0) {
            const firstChatModel = conn.models.find(m => !m.includes('tts') && !m.includes('imagen'));
            if (firstChatModel) {
                return firstChatModel;
            }
        }
    }

    return '';
  };
  
  const modelExists = (modelName: string) => apiConnections.some(c => c.models.includes(modelName));

  const [character, setCharacter] = useState(
    existingCharacter
      ? {
          ...existingCharacter,
          model: modelExists(existingCharacter.model) ? existingCharacter.model : getDefaultModel()
        }
      : {
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
          isBeyondTheHaven: false,
          model: getDefaultModel(),
          greeting: '',
          isPublic: true,
          categories: [],
          likes: [],
          comments: [],
          stats: [],
          statsVisible: true,
        }
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingCharacter?.avatarUrl || null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null); // Store base64 string
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [artStyle, setArtStyle] = useState('no-preference');
  const [colorPalette, setColorPalette] = useState('no-preference');
  const [styleKeywords, setStyleKeywords] = useState('');

  // Cropper state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cropperImageRef = useRef<HTMLImageElement>(null);
  const cropperInstanceRef = useRef<any>(null);
  

  useEffect(() => {
      // Cleanup object URLs to prevent memory leaks
      return () => {
          if (previewUrl && previewUrl.startsWith('blob:')) {
              URL.revokeObjectURL(previewUrl);
          }
      };
  }, [previewUrl]);
  
   useEffect(() => {
    if (isCropperOpen && cropperImageRef.current && imageToCrop) {
      const cropper = new Cropper(cropperImageRef.current, {
        aspectRatio: 9 / 16,
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
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
      setPreviewUrl(null); // This will show the placeholder
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!character.name || !character.personality || !character.greeting || !character.description) {
        alert("Please fill in all required fields: Name, Description, Greeting, and Personality.");
        return;
    }

    setIsSaving(true);
    
    let finalCharacterData: any = { ...character, isSilencedByAdmin: existingCharacter?.isSilencedByAdmin || false };

    // The logic to save the image and set the avatarUrl is now handled in AuthContext.
    // We just pass the selectedFile to the onSave handler.
    if (previewUrl === null) { // This means the user removed the avatar
        finalCharacterData.avatarUrl = DEFAULT_CHARACTER_AVATAR;
    }
    
    if (!isUserAdult) {
        finalCharacterData.isBeyondTheHaven = false;
    }
    
    if (auth?.currentUser?.isSilenced && finalCharacterData.isPublic) {
        alert("Your account has been silenced. You can only create private characters.");
        finalCharacterData.isPublic = false;
    }

    try {
        await onSave(finalCharacterData, selectedFile);
    } catch (err) {
        console.error("Error during character save:", err);
        alert("An error occurred while saving the character. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const constructImagePrompt = (): string => {
    let prompt = `Generate a vertical portrait (9:16 aspect ratio) of a fictional character. The style should be dramatic and evocative, suitable for a story. Do not include any text, watermarks, or signatures in the image.\n\n`;
    
    // Character details
    prompt += `**Character Name:** ${character.name || 'Unnamed'}\n`;
    prompt += `**Gender:** ${character.gender || 'unspecified'}\n`;
    prompt += `**Appearance:** ${character.appearance || 'No specific appearance.'}\n`;
    if (character.feeling) {
        prompt += `**Current Mood:** ${character.feeling}\n`;
    }
    
    // Scene and context
    if (character.situation) {
        prompt += `**Current Situation & Environment:** ${character.situation}\n`;
    }
    if (character.personality) {
        prompt += `**Key Personality Traits:** ${character.personality}\n`;
    }

    // Style guidance section
    prompt += `\n**Artistic Style Guidance:**\n`
    if (artStyle !== 'no-preference') {
        prompt += `**Art Style:** ${artStyle.replace(/-/g, ' ')}\n`;
    }
    if (colorPalette !== 'no-preference') {
        prompt += `**Color Palette:** ${colorPalette.replace(/-/g, ' ')}\n`;
    }
    if (character.categories.length > 0) {
        prompt += `**Genre/Theme:** ${character.categories.join(', ')}\n`;
    }
    if (styleKeywords.trim()) {
        prompt += `**Additional Keywords:** ${styleKeywords.trim()}\n`;
    }

    return prompt;
  };

  const handleGenerateImage = async () => {
    const imageConnection = findConnectionForTool ? findConnectionForTool('imageGeneration') : null;

    if (!imageConnection) {
        setGenerationError("Image Generation tool is not configured. Please ask an administrator to set it up in the AI API Settings.");
        return;
    }

    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setGenerationError(null);
    try {
        const prompt = constructImagePrompt();
        const imageBase64 = await generateCharacterImage(prompt, imageConnection); 
        if (imageBase64) {
            setGeneratedImage(imageBase64);
        } else {
            setGenerationError("Failed to generate image. The model returned no data.");
        }
    } catch (error) {
        console.error("Image generation failed:", error);
        let errorMessage = "An error occurred during image generation. Please try again.";
        if (error instanceof Error) {
            if (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED")) {
                errorMessage = "Image generation quota exceeded. Please check your plan and billing details.";
            } else if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
                errorMessage = "Image generation failed to connect to the API server. This could be due to a network issue, a CORS configuration problem on the server, or the server being offline. Please check the API connection settings and ensure the server is accessible.";
            } else {
                errorMessage = error.message;
            }
        }
        setGenerationError(errorMessage);
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const handleUseGeneratedImage = () => {
    if (generatedImage) {
        const dataUrl = `data:image/png;base64,${generatedImage}`;
        setImageToCrop(dataUrl);
        setIsCropperOpen(true);
        setGeneratedImage(null); // Clear the generated image preview
    }
  };

  const HelpButton = () => (
      <button type="button" onClick={() => setIsHelpModalOpen(true)} className="text-text-secondary hover:text-text-primary ml-2">
          <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>
  );
  
  // --- Stat System Handlers ---

  const handleStatChange = (statIndex: number, field: keyof CharacterStat, value: any) => {
    const newStats = [...character.stats];
    (newStats[statIndex] as any)[field] = value;
    setCharacter(prev => ({ ...prev, stats: newStats }));
  };

  const addStat = () => {
    const newStat: CharacterStat = {
      id: crypto.randomUUID(),
      name: 'New Stat',
      initialValue: 50,
      min: 0,
      max: 100,
      behaviorDescription: '',
      increaseRules: [],
      decreaseRules: [],
    };
    setCharacter(prev => ({ ...prev, stats: [...prev.stats, newStat] }));
  };

  const removeStat = (statIndex: number) => {
    setCharacter(prev => ({ ...prev, stats: prev.stats.filter((_, i) => i !== statIndex) }));
  };

  const handleRuleChange = (statIndex: number, ruleType: 'increase' | 'decrease', ruleIndex: number, field: keyof StatRule, value: any) => {
    const newStats = [...character.stats];
    const rules = ruleType === 'increase' ? newStats[statIndex].increaseRules : newStats[statIndex].decreaseRules;
    (rules[ruleIndex] as any)[field] = value;
    setCharacter(prev => ({ ...prev, stats: newStats }));
  };

  const addRule = (statIndex: number, ruleType: 'increase' | 'decrease') => {
    const newRule: StatRule = { id: crypto.randomUUID(), description: '', value: 5 };
    const newStats = [...character.stats];
    if (ruleType === 'increase') {
      newStats[statIndex].increaseRules.push(newRule);
    } else {
      newStats[statIndex].decreaseRules.push(newRule);
    }
    setCharacter(prev => ({ ...prev, stats: newStats }));
  };

  const removeRule = (statIndex: number, ruleType: 'increase' | 'decrease', ruleIndex: number) => {
    const newStats = [...character.stats];
    if (ruleType === 'increase') {
      newStats[statIndex].increaseRules = newStats[statIndex].increaseRules.filter((_, i) => i !== ruleIndex);
    } else {
      newStats[statIndex].decreaseRules = newStats[statIndex].decreaseRules.filter((_, i) => i !== ruleIndex);
    }
    setCharacter(prev => ({ ...prev, stats: newStats }));
  };
  

  const formFieldClasses = "w-full p-2 bg-tertiary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-secondary text-text-primary transition-shadow duration-200 focus:shadow-inner focus:bg-primary";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";
  const defaultAvatar = DEFAULT_CHARACTER_AVATAR;

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
            <img ref={cropperImageRef} src={imageToCrop || ''} alt="Source" style={{ display: 'block', maxWidth: '100%' }} />
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
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="bg-secondary p-4 rounded-lg mb-6 border border-border flex justify-between items-center">
        <p className="text-sm text-text-secondary">
            The more information you provide, the better your character will be. It's recommended to keep it below 1-2k characters per field.
        </p>
        <button onClick={() => setIsHelpModalOpen(true)} className="flex-shrink-0 ml-4 px-4 py-2 bg-tertiary hover:bg-hover rounded-md text-sm font-semibold flex items-center gap-2">
            <QuestionMarkCircleIcon className="w-5 h-5"/>
            Field Guide
        </button>
      </div>
      <h2 className="text-3xl font-bold mb-6 text-text-primary">{existingCharacter ? 'Edit Character' : 'Create New Character'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <label className={labelClasses}>Avatar</label>
                <div className="mt-2 flex flex-col items-center gap-4">
                    <img src={previewUrl || defaultAvatar} alt="Avatar Preview" className="w-48 h-[267px] rounded-lg object-cover bg-tertiary"/>
                    <div className="flex items-center gap-2">
                        <label htmlFor="avatar-upload" className="cursor-pointer bg-tertiary hover:bg-hover text-text-primary font-bold py-2 px-4 rounded-md inline-flex items-center gap-2 text-sm">
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
                  <label htmlFor="name" className={`${labelClasses} flex items-center`}>Name * <HelpButton /></label>
                  <input type="text" id="name" name="name" value={character.name} onChange={handleChange} className={formFieldClasses} required />
                </div>
                 <div>
                    <label className={labelClasses}>Gender</label>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-primary">
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="male" checked={character.gender === 'male'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-tertiary" /> <span className="ml-2">Male</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="female" checked={character.gender === 'female'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-tertiary"/> <span className="ml-2">Female</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="non-binary" checked={character.gender === 'non-binary'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-tertiary"/> <span className="ml-2">Non-binary</span></label>
                        <label className="flex items-center"><input type="radio" name="gender-radio" value="unspecified" checked={character.gender === 'unspecified'} onChange={handleGenderChange} className="form-radio text-accent-primary bg-tertiary"/> <span className="ml-2">Unspecified</span></label>
                    </div>
                </div>
                <div>
                  <label htmlFor="description" className={`${labelClasses} flex items-center`}>Description * <HelpButton /></label>
                  <textarea id="description" name="description" value={character.description} onChange={handleChange} className={formFieldClasses} rows={3} required placeholder="A short, public-facing description of the character."></textarea>
                </div>
                <div>
                  <label htmlFor="greeting" className={`${labelClasses} flex items-center`}>Greeting * <HelpButton /></label>
                  <textarea id="greeting" name="greeting" value={character.greeting} onChange={handleChange} className={formFieldClasses} rows={2} required placeholder="The first message the character will send to the user."></textarea>
                </div>
            </div>
        </div>
        <div>
          <label htmlFor="personality" className={`${labelClasses} flex items-center`}>Personality * <HelpButton /></label>
          <textarea id="personality" name="personality" value={character.personality} onChange={handleChange} className={formFieldClasses} rows={3} required></textarea>
        </div>
        <div>
            <label htmlFor="appearance" className={`${labelClasses} flex items-center`}>Appearance <HelpButton /></label>
            <textarea id="appearance" name="appearance" value={character.appearance} onChange={handleChange} className={formFieldClasses} rows={3} placeholder="Describe the character's physical appearance."></textarea>
        </div>

        <div>
          <label htmlFor="story" className={`${labelClasses} flex items-center`}>Backstory <HelpButton /></label>
          <textarea id="story" name="story" value={character.story} onChange={handleChange} className={formFieldClasses} rows={4}></textarea>
        </div>
        <div>
          <label htmlFor="situation" className={`${labelClasses} flex items-center`}>Situation <HelpButton /></label>
          <textarea id="situation" name="situation" value={character.situation} onChange={handleChange} className={formFieldClasses} rows={2} placeholder="The current scenario or setting."></textarea>
        </div>
        <div>
          <label htmlFor="feeling" className={`${labelClasses} flex items-center`}>Initial Mood/Feeling <HelpButton /></label>
          <input type="text" id="feeling" name="feeling" value={character.feeling} onChange={handleChange} className={formFieldClasses} />
        </div>
        
        <div>
            <label className={labelClasses}>Categories</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {categories.map(category => (
                    <label key={category} className="flex items-center space-x-2 text-text-primary">
                        <input
                            type="checkbox"
                            value={category}
                            checked={character.categories.includes(category)}
                            onChange={handleCategoryChange}
                            className="form-checkbox h-5 w-5 text-accent-primary bg-tertiary border-border rounded focus:ring-accent-primary"
                        />
                        <span>{category}</span>
                    </label>
                ))}
            </div>
        </div>
        
        <details open={!!existingCharacter?.stats?.length} className="p-4 bg-tertiary rounded-lg border border-border group">
          <summary className="text-md font-semibold text-text-primary cursor-pointer list-none flex justify-between items-center">
            Advanced Stat System
            <span className="text-xs text-text-secondary group-open:rotate-180 transition-transform">&#9660;</span>
          </summary>
          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <label htmlFor="statsVisible" className="font-medium text-text-primary">
                Stats Visible to User
                <p className="text-xs text-text-secondary">If enabled, stat changes will be shown to the user after your replies.</p>
              </label>
              <div className="relative cursor-pointer" onClick={() => setCharacter(prev => ({...prev, statsVisible: !prev.statsVisible}))}>
                <input type="checkbox" id="statsVisible" name="statsVisible" checked={character.statsVisible} readOnly className="sr-only" />
                <div className={`block w-14 h-8 rounded-full ${character.statsVisible ? 'bg-accent-primary' : 'bg-secondary'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.statsVisible ? 'transform translate-x-6' : ''}`}></div>
              </div>
            </div>
            
            {character.stats.map((stat, statIndex) => (
              <div key={stat.id} className="p-4 bg-primary border border-border rounded-lg space-y-4">
                <div className="flex justify-between items-start">
                  <input 
                    type="text" 
                    value={stat.name}
                    onChange={(e) => handleStatChange(statIndex, 'name', e.target.value)}
                    className="text-lg font-bold bg-transparent border-b border-border focus:outline-none focus:border-accent-primary"
                  />
                  <button type="button" onClick={() => removeStat(statIndex)} className="text-danger hover:opacity-80"><DeleteIcon className="w-5 h-5"/></button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className={labelClasses}>Initial</label>
                    <input type="number" value={stat.initialValue} onChange={(e) => handleStatChange(statIndex, 'initialValue', parseInt(e.target.value))} className={formFieldClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Min</label>
                    <input type="number" value={stat.min} onChange={(e) => handleStatChange(statIndex, 'min', parseInt(e.target.value))} className={formFieldClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Max</label>
                    <input type="number" value={stat.max} onChange={(e) => handleStatChange(statIndex, 'max', parseInt(e.target.value))} className={formFieldClasses} />
                  </div>
                </div>
                 <div>
                    <label className={labelClasses}>Behavior Description</label>
                    <textarea value={stat.behaviorDescription} onChange={(e) => handleStatChange(statIndex, 'behaviorDescription', e.target.value)} className={formFieldClasses} rows={2} placeholder="e.g., High trust means I share secrets. Low trust makes me suspicious." />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-success">Increase Rules</h4>
                    {stat.increaseRules.map((rule, ruleIndex) => (
                      <div key={rule.id} className="flex items-center gap-2">
                        <input type="text" value={rule.description} onChange={e => handleRuleChange(statIndex, 'increase', ruleIndex, 'description', e.target.value)} placeholder="When user..." className="flex-1 bg-secondary border border-border p-1 rounded text-sm"/>
                        <input type="number" value={rule.value} onChange={e => handleRuleChange(statIndex, 'increase', ruleIndex, 'value', parseInt(e.target.value))} className="w-16 bg-secondary border border-border p-1 rounded text-sm"/>
                        <button type="button" onClick={() => removeRule(statIndex, 'increase', ruleIndex)} className="text-danger p-1"><CloseIcon className="w-4 h-4"/></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addRule(statIndex, 'increase')} className="text-xs flex items-center gap-1 text-success hover:underline"><PlusIcon className="w-3 h-3"/> Add Rule</button>
                  </div>
                   <div className="space-y-2">
                    <h4 className="font-semibold text-danger">Decrease Rules</h4>
                    {stat.decreaseRules.map((rule, ruleIndex) => (
                      <div key={rule.id} className="flex items-center gap-2">
                        <input type="text" value={rule.description} onChange={e => handleRuleChange(statIndex, 'decrease', ruleIndex, 'description', e.target.value)} placeholder="When user..." className="flex-1 bg-secondary border border-border p-1 rounded text-sm"/>
                        <input type="number" value={rule.value} onChange={e => handleRuleChange(statIndex, 'decrease', ruleIndex, 'value', parseInt(e.target.value))} className="w-16 bg-secondary border border-border p-1 rounded text-sm"/>
                        <button type="button" onClick={() => removeRule(statIndex, 'decrease', ruleIndex)} className="text-danger p-1"><CloseIcon className="w-4 h-4"/></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addRule(statIndex, 'decrease')} className="text-xs flex items-center gap-1 text-danger hover:underline"><PlusIcon className="w-3 h-3"/> Add Rule</button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addStat} className="w-full mt-4 py-2 text-sm bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md">Add New Stat</button>
          </div>
        </details>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="model" className={labelClasses}>AI Model</label>
              <select id="model" name="model" value={character.model} onChange={handleChange} className={formFieldClasses}>
                {apiConnections.map(conn => (
                  <optgroup key={conn.id} label={`${conn.name} (${conn.provider})`}>
                    {conn.models.filter(m => !m.includes('tts')).map(modelName => (
                      <option key={modelName} value={modelName}>{modelName}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {isUserAdult && (
              <div className="flex items-center justify-center pt-6">
                <label htmlFor="isBeyondTheHaven" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" id="isBeyondTheHaven" name="isBeyondTheHaven" checked={character.isBeyondTheHaven} onChange={handleChange} className="sr-only" />
                    <div className={`block w-14 h-8 rounded-full ${character.isBeyondTheHaven ? 'bg-accent-primary' : 'bg-tertiary'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.isBeyondTheHaven ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-text-primary font-medium">
                    Beyond the Haven Mode
                  </div>
                </label>
              </div>
            )}
        </div>

        <div className="flex items-center justify-start pt-6">
          <label htmlFor="isPublic" className="flex items-center cursor-pointer">
            <div className="relative">
              <input type="checkbox" id="isPublic" name="isPublic" checked={character.isPublic} onChange={handleChange} className="sr-only" disabled={auth?.currentUser?.isSilenced}/>
              <div className={`block w-14 h-8 rounded-full ${character.isPublic ? 'bg-success' : 'bg-tertiary'} ${auth?.currentUser?.isSilenced ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${character.isPublic ? 'transform translate-x-6' : ''}`}></div>
            </div>
            <div className="ml-3 text-text-primary font-medium">
              {character.isPublic ? 'Public Character' : 'Private Character'}
              <p className="text-xs text-text-secondary">{character.isPublic ? 'Visible to everyone on the home page.' : 'Only visible to you on your profile.'}</p>
              {auth?.currentUser?.isSilenced && <p className="text-xs text-yellow-400">You cannot create public characters because your account is silenced.</p>}
            </div>
          </label>
        </div>

        <div className="p-4 bg-tertiary rounded-lg border border-border">
            <h4 className="text-md font-semibold mb-2 text-text-primary">AI Character Image</h4>
            <p className="text-xs text-text-secondary mb-4">Use the character details you've entered to generate a unique portrait with AI. The 'Appearance' field is the most important for this feature.</p>
            
            <div className="space-y-4 mb-4">
                <h5 className="text-sm font-semibold text-text-primary">Art Style Options</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="artStyle" className="text-sm font-medium text-text-secondary">Art Style</label>
                        <select
                            id="artStyle"
                            value={artStyle}
                            onChange={(e) => setArtStyle(e.target.value)}
                            className="w-full mt-1 p-2 bg-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        >
                            <option value="no-preference">No Preference</option>
                            <option value="photorealistic">Photorealistic</option>
                            <option value="anime-manga">Anime/Manga</option>
                            <option value="fantasy-art">Fantasy Art (Digital Painting)</option>
                            <option value="comic-book">Comic Book</option>
                            <option value="pixar-style">Pixar Style</option>
                            <option value="watercolor">Watercolor</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="colorPalette" className="text-sm font-medium text-text-secondary">Color Palette</label>
                        <select
                            id="colorPalette"
                            value={colorPalette}
                            onChange={(e) => setColorPalette(e.target.value)}
                            className="w-full mt-1 p-2 bg-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
                        >
                            <option value="no-preference">No Preference</option>
                            <option value="vibrant-saturated">Vibrant & Saturated</option>
                            <option value="dark-muted">Dark & Muted</option>
                            <option value="pastel">Pastel</option>
                            <option value="monochromatic">Monochromatic</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="styleKeywords" className="text-sm font-medium text-text-secondary">Additional Style Keywords</label>
                    <input
                        type="text"
                        id="styleKeywords"
                        value={styleKeywords}
                        onChange={(e) => setStyleKeywords(e.target.value)}
                        placeholder="e.g., cyberpunk, art nouveau, cinematic lighting"
                        className="w-full mt-1 p-2 bg-primary border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !character.appearance.trim() || !findConnectionForTool || !findConnectionForTool('imageGeneration')}
                className="w-full px-4 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors font-semibold disabled:bg-hover disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isGeneratingImage ? (
                    <>
                        <SpinnerIcon className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                    </>
                ) : (
                    'Generate Character Image'
                )}
            </button>
            {(!findConnectionForTool || !findConnectionForTool('imageGeneration')) && (
                <p className="text-xs text-yellow-400 text-center mt-2">Image generation is disabled. No connection is configured for this tool in AI API Settings.</p>
            )}
            
            {generationError && (
                <div className="mt-4 p-3 bg-danger/20 text-danger rounded-md text-sm">
                    {generationError}
                </div>
            )}

            {generatedImage && (
                <div className="mt-4 flex flex-col items-center gap-4">
                    <img 
                        src={`data:image/png;base64,${generatedImage}`}
                        alt="Generated character portrait"
                        className="rounded-lg border-2 border-border max-h-96"
                    />
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImage}
                            className="px-4 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors text-sm font-semibold flex items-center gap-2"
                        >
                            <RefreshIcon className="w-4 h-4" />
                            Retry
                        </button>
                        <button
                            type="button"
                            onClick={handleUseGeneratedImage}
                            className="px-4 py-2 bg-success hover:opacity-90 text-white rounded-md transition-colors text-sm font-semibold"
                        >
                            Use as Avatar
                        </button>
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 bg-tertiary hover:bg-hover rounded-md transition-colors">Cancel</button>
          <button type="submit" className="px-6 py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors flex items-center gap-2 disabled:bg-hover" disabled={isSaving}>
            {isSaving ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin"/>
                <span>Saving...</span>
              </>
            ) : (
              'Save Character'
            )}
          </button>
        </div>
      </form>
    </div>
    {isCropperOpen && ImageCropperModal}
    <CharacterHelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </>
  );
};

export default CharacterForm;
