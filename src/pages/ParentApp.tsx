import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ParticleEffects } from '../components/ParticleEffects';
import { ParentDashboard } from '../components/dashboard/ParentDashboard';
import { ParentConfig } from '../pages/ParentConfig';
import { ParentProgramme } from '../components/programme/ParentProgramme';
import { ParentProfileEditor } from '../components/profile/ParentProfileEditor';
import { LayoutDashboard, Settings, BookOpen, User, X, LogOut, Menu } from 'lucide-react';

type ParentTab = 'dashboard' | 'config' | 'programme' | 'profil';
const PARENT_TABS: ParentTab[] = ['dashboard', 'config', 'programme', 'profil'];

export function ParentApp() {
    const navigate = useNavigate();
    const { tab } = useParams<{ tab: string }>();
    const activeTab: ParentTab = PARENT_TABS.includes(tab as ParentTab) ? (tab as ParentTab) : 'dashboard';
    const { signOut } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const parentTabs = [
        { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'config' as const, label: 'Configuration', icon: Settings },
        { id: 'programme' as const, label: 'Programme', icon: BookOpen },
        { id: 'profil' as const, label: 'Mon profil', icon: User },
    ];

    const closeSidebar = () => setSidebarOpen(false);
    const selectTab = (id: ParentTab) => {
        navigate(`/parent/${id}`);
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen flex">
            <ParticleEffects />

            {/* Overlay mobile (clic ferme le sidebar) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar latéral - burger sur mobile, toujours visible sur desktop */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-amber-500/20 flex flex-col transform transition-transform duration-300 ease-out
          lg:static lg:translate-x-0 lg:bg-slate-900/80
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-4 flex items-center justify-between lg:justify-start border-b border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg rotate-45 shrink-0">
                            <LayoutDashboard className="w-6 h-6 text-slate-900 -rotate-45" />
                        </div>
                        <span className="font-['Cinzel_Decorative'] text-lg font-bold text-amber-400 truncate">
                            Parent
                        </span>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="lg:hidden p-2 text-amber-100/60 hover:text-amber-400 rounded-lg"
                        aria-label="Fermer le menu"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {parentTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => selectTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : 'text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-amber-500/20">
                    <button
                        onClick={async () => {
                            await signOut();
                            navigate('/auth', { replace: true });
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-amber-100/60 hover:bg-amber-500/10 hover:text-amber-400 transition-all"
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span className="font-medium">Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Zone principale */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header compact (burger sur mobile + titre) */}
                <header className="nav-glass py-3 px-4 lg:px-6 flex items-center gap-3 shrink-0 z-30">
                    <button
                        onClick={() => setSidebarOpen((o) => !o)}
                        className="lg:hidden p-2 text-amber-100/60 hover:text-amber-400 rounded-lg shrink-0"
                        aria-label="Ouvrir le menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="font-['Cinzel_Decorative'] text-lg lg:text-xl font-bold text-amber-400 truncate">
                        {activeTab === 'dashboard' && 'Tableau de bord'}
                        {activeTab === 'config' && 'Configuration'}
                        {activeTab === 'programme' && 'Programme'}
                        {activeTab === 'profil' && 'Mon profil'}
                    </h1>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    {activeTab === 'dashboard' && <ParentDashboard onNavigateToConfig={() => selectTab('config')} />}
                    {activeTab === 'config' && <ParentConfig />}
                    {activeTab === 'programme' && <ParentProgramme />}
                    {activeTab === 'profil' && <ParentProfileEditor />}
                </main>
            </div>
        </div>
    );
}
