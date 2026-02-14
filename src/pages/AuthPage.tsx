import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ParticleEffects } from '../components/ParticleEffects';

// Redirection selon le rôle de l'utilisateur
function getRedirectForRole(role: string): string {
    switch (role) {
        case 'super_admin': return '/admin';
        case 'parent': return '/parent/dashboard';
        case 'enfant': return '/app/map';
        default: return '/auth';
    }
}

export function AuthPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const mode = searchParams.get('mode');
    const [isLogin, setIsLogin] = useState(mode !== 'inscription');

    // Selectors: Only re-render when these specific values change
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Sync with URL when mode changes
    useEffect(() => {
        setIsLogin(mode !== 'inscription');
    }, [mode]);

    console.log('AuthPage render:', { isAuthenticated, userRole: user?.role, mode, isLogin });

    const handleToggleMode = useCallback((toLogin: boolean) => {
        navigate(toLogin ? '/auth' : '/auth?mode=inscription', { replace: true });
        setIsLogin(toLogin);
    }, [navigate]);

    if (isAuthenticated && user) {
        console.log('AuthPage: Redirecting user based on role', user.role);
        return <Navigate to={getRedirectForRole(user.role)} replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <ParticleEffects />
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/hero-bg.jpg"
                    alt="Temple Maya"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-transparent to-slate-900/70" />
            </div>
            {/* God Rays */}
            <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent transform -rotate-12 blur-3xl" />
                <div className="absolute top-0 left-1/2 w-24 h-full bg-gradient-to-b from-amber-300/10 via-transparent to-transparent transform rotate-6 blur-3xl" />
                <div className="absolute top-0 right-1/3 w-40 h-full bg-gradient-to-b from-amber-500/10 via-transparent to-transparent transform -rotate-6 blur-3xl" />
            </div>
            {/* Light Spot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[80px] pointer-events-none z-[2]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-300/15 rounded-full blur-[60px] animate-pulse pointer-events-none z-[2]" />
            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                {isLogin ? (
                    <LoginForm onToggleMode={() => handleToggleMode(false)} />
                ) : (
                    <RegisterForm onToggleMode={() => handleToggleMode(true)} />
                )}
            </div>
        </div>
    );
}
