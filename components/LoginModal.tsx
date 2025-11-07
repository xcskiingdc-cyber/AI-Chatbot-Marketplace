
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CloseIcon } from './Icons';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLoginView) {
        await auth?.login(username, password);
      } else {
        await auth?.signup(username, password, email);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = () => {
    // This is a mock login
    auth?.loginWithGoogle().then(() => onClose());
  }

  const formFieldClasses = "w-full p-3 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-md relative border border-border">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="p-8">
            <h2 className="text-3xl font-bold text-center text-text-primary mb-2">{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-center text-text-secondary mb-6">{isLoginView ? 'Sign in to continue' : 'Get started with your own characters'}</p>
            
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="username" className={labelClasses}>Username</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={formFieldClasses} required autoComplete="username" />
                </div>
                {!isLoginView && (
                    <div>
                        <label htmlFor="email" className={labelClasses}>Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formFieldClasses} required autoComplete="email" />
                    </div>
                )}
                <div>
                    <label htmlFor="password" className={labelClasses}>Password</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={formFieldClasses} required autoComplete={isLoginView ? "current-password" : "new-password"} />
                </div>
                <button type="submit" className="w-full py-3 bg-accent-primary hover:bg-accent-primary-hover rounded-md transition-colors font-semibold text-white">
                    {isLoginView ? 'Login' : 'Sign Up'}
                </button>
            </form>
            
            <div className="flex items-center my-6">
                <div className="flex-grow bg-border h-px"></div>
                <span className="mx-4 text-text-secondary text-sm">OR</span>
                <div className="flex-grow bg-border h-px"></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full py-3 bg-secondary hover:bg-hover rounded-md transition-colors font-semibold flex items-center justify-center gap-2">
                {/* Basic Google Icon */}
                <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691c-1.242 2.327-1.956 4.96-1.956 7.729s.714 5.402 1.956 7.729l-5.657 5.657C.267 33.64.001 30.354 0 27c0-3.355.267-6.64.803-9.819l5.503 5.51z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-5.657-5.657c-1.889 1.411-4.28 2.262-6.752 2.262c-4.931 0-9.133-2.934-10.74-7.062l-5.657 5.657C8.163 39.05 15.311 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083L48 27v-7z"></path></svg>
                Continue with Google (Mock)
            </button>
            
            <p className="text-center text-sm text-text-secondary mt-6">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-accent-primary hover:text-accent-primary-hover ml-1">
                    {isLoginView ? 'Sign Up' : 'Login'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;