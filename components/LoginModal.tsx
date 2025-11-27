
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CloseIcon, SpinnerIcon } from './Icons';
import Logo from './Logo';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const auth = useContext(AuthContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      if (isLoginView) {
        await auth?.login(email, password);
        onClose();
      } else {
        await auth?.signup(username, password, email);
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formFieldClasses = "w-full p-3 bg-secondary border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-primary";
  const labelClasses = "block text-sm font-medium text-text-secondary mb-1";

  if (signupSuccess) {
    return (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
        <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-md relative border border-border p-8 text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
            <CloseIcon className="w-6 h-6" />
          </button>
          <div className="flex justify-center mb-6">
            <Logo className="h-14 w-auto" textColor="#E0DCD9" logoUrl={auth?.siteLogo} />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-4">Verification Sent</h2>
          <p className="text-text-secondary mb-6">
            Please check your email <strong>{email}</strong> for a verification link.
          </p>
          <div className="p-4 bg-tertiary/50 rounded-md border border-border mb-6">
            <p className="text-sm text-text-primary">After verification, come back to this page to log in.</p>
          </div>
          <button 
            onClick={() => { setSignupSuccess(false); setIsLoginView(true); }}
            className="w-full py-3 bg-accent-primary hover:bg-accent-primary-hover rounded-md transition-colors font-semibold text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-40 p-4">
      <div className="bg-gradient-to-b from-primary to-secondary rounded-lg shadow-soft-lg w-full max-w-md relative border border-border">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
          <CloseIcon className="w-6 h-6" />
        </button>
        <div className="p-8">
            <div className="flex justify-center mb-6">
                <Logo className="h-14 w-auto" textColor="#E0DCD9" logoUrl={auth?.siteLogo} />
            </div>
            <h2 className="text-3xl font-bold text-center text-text-primary mb-2">{isLoginView ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-center text-text-secondary mb-6">{isLoginView ? 'Sign in to continue your story' : 'Get started with your own characters'}</p>
            
            {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLoginView && (
                    <div>
                        <label htmlFor="email" className={labelClasses}>Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formFieldClasses} required autoComplete="email" />
                    </div>
                )}

                {!isLoginView && (
                    <>
                        <div>
                            <label htmlFor="username" className={labelClasses}>Username</label>
                            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={formFieldClasses} required autoComplete="username" />
                        </div>
                        <div>
                            <label htmlFor="email" className={labelClasses}>Email</label>
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className={formFieldClasses} required autoComplete="email" />
                        </div>
                    </>
                )}

                <div>
                    <label htmlFor="password" className={labelClasses}>Password</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className={formFieldClasses} required autoComplete={isLoginView ? "current-password" : "new-password"} />
                </div>
                <button type="submit" className="w-full py-3 bg-accent-primary hover:bg-accent-primary-hover rounded-md transition-colors font-semibold text-white flex items-center justify-center gap-2" disabled={isProcessing}>
                    {isProcessing ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        isLoginView ? 'Login with Email' : 'Sign Up with Email'
                    )}
                </button>
            </form>
            
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
