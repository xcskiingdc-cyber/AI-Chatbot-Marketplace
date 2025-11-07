import React from 'react';
import { CloseIcon } from './Icons';

interface CharacterHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpSection: React.FC<{ title: string, purpose: string, goodExample: string, poorExample: string, children?: React.ReactNode }> = ({ title, purpose, goodExample, poorExample, children }) => (
    <div className="py-4 border-b border-border last:border-b-0">
        <h3 className="text-xl font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-3">{purpose}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
                <p className="font-semibold text-success mb-1">Good Example:</p>
                <div className="p-2 bg-tertiary rounded-md italic">
                    {goodExample}
                </div>
            </div>
             <div>
                <p className="font-semibold text-danger mb-1">Poor Example:</p>
                <div className="p-2 bg-tertiary rounded-md italic">
                    {poorExample}
                </div>
            </div>
        </div>
        {children}
    </div>
);

const CharacterHelpModal: React.FC<CharacterHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">
        <div className="sticky top-0 bg-primary z-10 px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="text-2xl font-bold text-text-primary">Character Field Guide</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-6">
            <div className="py-4 text-center">
                <p className="text-text-secondary">The more detail you provide, the better your character will understand their role. Use descriptive language and think about how these traits influence their actions and dialogue.</p>
            </div>
            
            <HelpSection
                title="Name"
                purpose="The character's name. This is how they will be referred to in the system prompt."
                goodExample='Alistair "The Shadow" Blackwood'
                poorExample='guy (Too generic, gives the AI no information).'
            />
            <HelpSection
                title="Description"
                purpose="A short, public-facing summary of the character. This is what other users will see when browsing."
                goodExample="A cynical ex-knight haunted by his past, now working as a mercenary in the city's underbelly. He has a soft spot for lost causes."
                poorExample="He is a knight. (Lacks personality and detail)."
            />
            <HelpSection
                title="Greeting"
                purpose="The very first message the character will send to the user. It should set the scene and establish their initial tone."
                goodExample="*The flickering tavern light catches the deep scar across my eye as I look up from my drink. My voice is a low growl.* 'You've got a lot of nerve showing your face here. State your business, and make it quick.'"
                poorExample="Hello. (Doesn't engage the user or establish a character)."
            />
            <HelpSection
                title="Personality"
                purpose="The core of your character's traits, habits, and way of thinking. Use descriptive adjectives and phrases. This is a crucial field for AI behavior."
                goodExample="Cynical, sarcastic, impatient. Deeply loyal to the few he trusts. Hides his insecurities with a gruff exterior. Prone to brooding. Secretly compassionate. Speaks in short, direct sentences. Has a habit of tapping his fingers when annoyed."
                poorExample="Nice, but sometimes mean. (Too vague and contradictory without context)."
            />
            <HelpSection
                title="Appearance"
                purpose="Describe the character's physical look in detail. This helps the AI describe its own actions and appearance during the roleplay."
                goodExample="Tall and lean, with corded muscle from years of fighting. Jet-black hair falls messily over a pale, angular face. His eyes are a piercing grey, and a jagged scar runs from his left eyebrow to his cheekbone. Wears worn leather armor over a dark tunic."
                poorExample="He has black hair and is tall. (Lacks evocative detail)."
            />
            <HelpSection
                title="Backstory"
                purpose="The character's history. What key events shaped them into who they are today? This provides the AI with memories and motivations."
                goodExample="Alistair was once a celebrated knight in the King's guard. He was betrayed by his captain during the Battle of Greywood, left for dead, and watched his entire platoon get slaughtered. He survived, but lost his honor and his faith in chivalry. Now he lives under a false name, seeking vengeance."
                poorExample="He was in a war. (Doesn't explain the personal impact or consequences)."
            />
            <HelpSection
                title="Situation"
                purpose="The character's current circumstances at the start of the chat. Where are they? What are they doing? This sets the initial scene for the roleplay."
                goodExample="Sitting alone at a shadowy corner table in The Rusty Flagon, a cheap tavern in the city slums. Nursing a half-empty mug of ale, watching the door with a wary expression."
                poorExample="In a bar. (Lacks specific, actionable details for the AI)."
            />
             <HelpSection
                title="Initial Mood/Feeling"
                purpose="The character's emotional state right at the beginning of the chat. This directly influences their greeting and initial responses."
                goodExample="Wary, suspicious, and melancholic."
                poorExample="Sad. (Less descriptive, gives the AI less to work with)."
            />
        </div>
        <div className="px-6 py-4 border-t border-border mt-auto">
            <button onClick={onClose} className="w-full py-2 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-md transition-colors">
                Close Guide
            </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterHelpModal;