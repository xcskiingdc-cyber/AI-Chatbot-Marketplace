
import React from 'react';
import type { AppView } from '../types';
import { HomeIcon, PlusIcon, MessageIcon } from './Icons';

interface SidebarProps {
  setView: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setView }) => {
  return (
    <div className="w-16 md:w-64 bg-gray-900 text-white p-4 flex flex-col items-center md:items-start border-r border-gray-700">
      <div className="text-pink-500 font-bold text-2xl mb-10 hidden md:block">
        AI.Crush
      </div>
       <div className="text-pink-500 font-bold text-2xl mb-10 md:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      </div>
      <nav className="flex flex-col space-y-4 w-full">
        <button onClick={() => setView({ type: 'HOME' })} className="flex items-center space-x-3 p-2 rounded-md hover:bg-pink-500 hover:bg-opacity-20 transition-colors duration-200">
          <HomeIcon className="h-6 w-6 text-gray-300" />
          <span className="hidden md:inline">Home</span>
        </button>
        <button onClick={() => setView({ type: 'CREATE_CHARACTER' })} className="flex items-center space-x-3 p-2 rounded-md hover:bg-pink-500 hover:bg-opacity-20 transition-colors duration-200">
          <PlusIcon className="h-6 w-6 text-gray-300" />
          <span className="hidden md:inline">Create Character</span>
        </button>
        {/* <button className="flex items-center space-x-3 p-2 rounded-md hover:bg-pink-500 hover:bg-opacity-20 transition-colors duration-200">
          <MessageIcon className="h-6 w-6 text-gray-300" />
          <span className="hidden md:inline">Recent Chats</span>
        </button> */}
      </nav>
    </div>
  );
};

export default Sidebar;
