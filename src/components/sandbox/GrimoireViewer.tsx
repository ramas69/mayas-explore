import { useEffect, useRef, useState } from 'react';
import { useSandboxStore } from '../../stores/sandboxStore';
import { VictoryOverlay } from './VictoryOverlay';

export function GrimoireViewer() {
    const { elements, imageToLoad } = useSandboxStore();
    const containerRef = useRef<HTMLDivElement>(null);

    // SVG dimensions (fixed coordinate system)
    const VIEWBOX_WIDTH = 400;
    const VIEWBOX_HEIGHT = 300;

    useEffect(() => {
        if (imageToLoad) {
            // Just ensure the store state is valid, the render handles the URL
            console.log('[GrimoireViewer] Image loaded:', imageToLoad);
        }
    }, [imageToLoad]);

    // Handle Proxy URL for images to bypass CORS if needed
    const getProxyUrl = (url: string) => {
        if (!url) return '';
        // If it's data URI, just use it
        if (url.startsWith('data:')) return url;
        // If it's already a proxy url, leave it
        if (url.includes('/functions/v1/chat')) return url;

        // Construct proxy URL matches the one we added to Edge Function
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        return `${baseUrl}/functions/v1/chat?image_url=${encodeURIComponent(url)}`;
    };

    const proxiedImageUrl = imageToLoad ? getProxyUrl(imageToLoad) : null;
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    // Reset error and blob when URL changes
    useEffect(() => {
        setImgError(false);
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setBlobUrl(null);
        }
    }, [proxiedImageUrl]);

    // Fetch image with Auth header if it's a proxy URL
    useEffect(() => {
        if (!proxiedImageUrl) return;

        // If it's data URI, just use it
        if (proxiedImageUrl.startsWith('data:')) {
            setBlobUrl(proxiedImageUrl);
            return;
        }

        let active = true;
        (async () => {
            try {
                // Determine if we need auth headers
                const isProxy = proxiedImageUrl.includes('/functions/v1/chat');
                const headers: HeadersInit = {};

                if (isProxy) {
                    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
                    if (anonKey) {
                        headers['Authorization'] = `Bearer ${anonKey}`;
                    }
                }

                const res = await fetch(proxiedImageUrl, { headers });
                if (!res.ok) throw new Error(`Failed to load image: ${res.status}`);

                const blob = await res.blob();
                if (active) {
                    const objectUrl = URL.createObjectURL(blob);
                    setBlobUrl(objectUrl);
                }
            } catch (e) {
                console.error('[GrimoireViewer] Fetch error:', e);
                if (active) setImgError(true);
            }
        })();

        return () => {
            active = false;
        };
    }, [proxiedImageUrl]);

    const [bgMode, setBgMode] = useState<'default' | 'white'>('default');

    useEffect(() => {
        console.log('[GrimoireViewer] Render elements:', elements);
    }, [elements]);

    return (
        <div className="flex flex-col h-full min-h-0 stone-card rounded-xl sm:rounded-2xl overflow-hidden relative select-none">
            <VictoryOverlay />

            {/* Controls */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-slate-900/80 p-1 rounded-lg border border-amber-500/20 backdrop-blur-sm">
                <button
                    onClick={() => setBgMode('default')}
                    className={`p-1.5 rounded transition-colors ${bgMode === 'default' ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-amber-100'}`}
                    title="Fond Mystique"
                >
                    🌑
                </button>
                <button
                    onClick={() => setBgMode('white')}
                    className={`p-1.5 rounded transition-colors ${bgMode === 'white' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-amber-100'}`}
                    title="Fond Blanc"
                >
                    ☀️
                </button>
            </div>

            {/* Grille néon (style Maya) - Toujours visible en fond global */}
            <div
                className="absolute inset-0 pointer-events-none z-[1] opacity-20"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(251,191,36,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(251,191,36,0.4) 1px, transparent 1px)
          `,
                    backgroundSize: '24px 24px',
                    backgroundColor: '#0f172a'
                }}
            />

            {/* Main Content Area */}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 relative z-[2] w-full flex items-center justify-center p-4"
            >
                <div
                    className={`relative rounded-lg overflow-hidden transition-colors duration-300 ${bgMode === 'white' ? 'bg-white shadow-xl' : ''}`}
                    style={{
                        width: '100%',
                        maxWidth: '600px',
                        aspectRatio: '4/3'
                    }}
                >
                    {/* Layer 1: Image (if any) */}
                    {blobUrl && !imgError && (
                        <img
                            src={blobUrl}
                            alt="Grimoire content"
                            className="absolute inset-0 w-full h-full object-contain"
                            onError={(e) => {
                                console.error('[GrimoireViewer] Image load error', e);
                                setImgError(true);
                            }}
                        />
                    )}

                    {/* Layer 2: SVG Overlay (Annotations & Schemas) */}
                    <svg
                        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        {elements.map((el: any, idx) => {
                            // Shapes support
                            if (el.type === 'rect') {
                                return (
                                    <rect
                                        key={idx}
                                        x={el.x} y={el.y} width={el.width} height={el.height}
                                        stroke={el.strokeColor || '#fbbf24'}
                                        strokeWidth={el.strokeWidth || 2}
                                        fill={el.backgroundColor || 'transparent'}
                                        opacity={el.opacity !== undefined ? el.opacity / 100 : 1}
                                    />
                                );
                            }
                            if (el.type === 'circle' || el.type === 'ellipse') {
                                return (
                                    <ellipse
                                        key={idx}
                                        cx={el.x + el.width / 2} cy={el.y + el.height / 2} rx={el.width / 2} ry={el.height / 2}
                                        stroke={el.strokeColor || '#fbbf24'}
                                        strokeWidth={el.strokeWidth || 2}
                                        fill={el.backgroundColor || 'transparent'}
                                    />
                                );
                            }
                            if (el.type === 'line' && el.x1 !== undefined) {
                                return (
                                    <line
                                        key={idx}
                                        x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
                                        stroke={el.strokeColor || '#fbbf24'}
                                        strokeWidth={el.strokeWidth || 2}
                                    />
                                );
                            }
                            // Arrow support (simplified: line + head)
                            if (el.type === 'arrow') {
                                // For now, simple line or path if points provided
                                // Assuming points format: [[0,0], [dx,dy]] relative to x,y
                                if (el.points && el.points.length >= 2) {
                                    const pathData = el.points.map((p: any, i: number) =>
                                        `${i === 0 ? 'M' : 'L'} ${el.x + p[0]} ${el.y + p[1]}`
                                    ).join(' ');
                                    return (
                                        <g key={idx}>
                                            <path
                                                d={pathData}
                                                stroke={el.strokeColor || '#ef4444'}
                                                strokeWidth={el.strokeWidth || 2}
                                                fill="none"
                                                markerEnd="url(#arrowhead)"
                                            />
                                        </g>
                                    );
                                }
                            }
                            // Text support
                            if (el.type === 'text') {
                                return (
                                    <text
                                        key={idx}
                                        x={el.x} y={el.y}
                                        fill={el.strokeColor || '#fbbf24'}
                                        fontSize={el.fontSize || 16}
                                        fontFamily="sans-serif"
                                        fontWeight="bold"
                                        dominantBaseline="hanging"
                                        textAnchor="start"
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                        {el.text}
                                    </text>
                                );
                            }
                            // Raw SVG Path (for complex AI shapes if passed as path)
                            if (el.type === 'path') {
                                return (
                                    <path
                                        key={idx}
                                        d={el.d}
                                        stroke={el.strokeColor || '#fbbf24'}
                                        strokeWidth={el.strokeWidth || 2}
                                        fill={el.backgroundColor || 'none'}
                                    />
                                );
                            }

                            return null;
                        })}

                        {/* Definitions for markers */}
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                            </marker>
                        </defs>
                    </svg>
                </div>
            </div>

            <div className="p-2 border-t border-amber-500/20 bg-slate-900/50">
                <div className="flex justify-between text-xs text-amber-100/50">
                    <span>Grimoire — Visualiseur</span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        Connecté
                    </span>
                </div>
            </div>
        </div>
    );
}
