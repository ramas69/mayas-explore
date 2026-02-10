import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuthStore } from './stores/authStore';
import { Navigation } from './sections/Navigation';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Method } from './sections/Method';
import { Subjects } from './sections/Subjects';
import { Features } from './sections/Features';
import { Testimonials } from './sections/Testimonials';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';
import { NotFound } from './pages/NotFound';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Toaster } from 'sonner';
import './App.css';

// Lazy load pages
const StudentApp = lazy(() => import('./pages/StudentApp').then(module => ({ default: module.StudentApp })));
const ParentApp = lazy(() => import('./pages/ParentApp').then(module => ({ default: module.ParentApp })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(module => ({ default: module.SuperAdminDashboard })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(module => ({ default: module.AuthCallback })));

gsap.registerPlugin(ScrollTrigger);

// Redirection selon le rôle de l'utilisateur
function getRedirectForRole(role: string): string {
  switch (role) {
    case 'super_admin': return '/admin';
    case 'parent': return '/parent/dashboard';
    case 'enfant': return '/app/map';
    default: return '/auth';
  }
}

// Landing Page Component (Keep unrelated sections static for LCP, but could be lazy loaded too if needed)
function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Utilisateur connecté : redirection vers son espace
  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  return (
    <>
      <Navigation />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Method />
        <Subjects />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}



// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

// Main App Component
function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();

    // Configure GSAP
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.refresh();

    // Handle reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.globalTimeline.timeScale(0);
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-amber-100/60">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors theme="dark" />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/app" element={<Navigate to="/app/map" replace />} />
          <Route
            path="/app/:tab"
            element={
              <ProtectedRoute allowedRoles={['enfant']}>
                <StudentApp />
              </ProtectedRoute>
            }
          />
          <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
          <Route
            path="/parent/:tab"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
