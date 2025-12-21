import React, { useState, useCallback, useRef, useEffect } from 'react';
import { professionalizeImage } from './services/geminiService';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop';

declare global {
    interface Window {
        JSZip: any;
    }
}

// --- Types ---
type JobStatus = 'queued' | 'processing' | 'success' | 'error';

interface ImageJob {
    id: number;
    file: File;
    originalUrl: string;
    editedUrl: string | null;
    status: JobStatus;
    error: string | null;
}

const PASSPORT_SPECS: Record<string, { name: string; ratio: number; text: string }> = {
    'US': { name: 'USA / India (2x2")', ratio: 1, text: '1:1 square' },
    'EU': { name: 'Schengen / UK (35x45mm)', ratio: 35 / 45, text: '35:45 portrait' },
    'CA': { name: 'Canada (50x70mm)', ratio: 5 / 7, text: '5:7 portrait' },
    'CN': { name: 'China (33x48mm)', ratio: 33 / 48, text: '33:48 portrait' },
    'AU': { name: 'Australia (35x45mm)', ratio: 35 / 45, text: '35:45 portrait' },
};

const SUIT_COLORS: Record<string, string> = {
    'black': 'Black Suit',
    'navy blue': 'Navy Blue Suit',
    'charcoal grey': 'Grey Suit',
    'dark brown': 'Brown Suit',
};


// --- Helper Functions ---
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas is empty'));
            }
        }, 'image/jpeg');
    });
}

// --- Icon Components ---
const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.0522 3.82103L16.9405 5.9525C17.1856 6.54077 17.653 7.00814 18.2413 7.25327L20.3727 8.14157C21.2091 8.4901 21.2091 9.68069 20.3727 10.0292L18.2413 10.9175C17.653 11.1627 17.1856 11.63 16.9405 12.2183L16.0522 14.3498C15.7036 15.1861 14.5131 15.1861 14.1645 14.3498L13.2762 12.2183C13.0311 11.63 12.5637 11.1627 11.9754 10.9175L9.84394 10.0292C9.00755 9.68069 9.00755 8.4901 9.84394 8.14157L11.9754 7.25327C12.5637 7.00814 13.0311 6.54077 13.2762 5.9525L14.1645 3.82103C14.5131 2.98464 15.7036 2.98464 16.0522 3.82103Z" fill="currentColor"/>
    <path opacity="0.5" d="M6.07223 13.7516L6.56574 14.9358C6.7019 15.2626 6.96155 15.5222 7.28834 15.6584L8.47255 16.1519C8.93721 16.3455 8.93721 17.0069 8.47255 17.2006L7.28834 17.6941C6.96155 17.8302 6.7019 18.0899 6.56574 18.4167L6.07223 19.6009C5.8786 20.0655 5.21719 20.0655 5.02356 19.6009L4.53005 18.4167C4.39389 18.0899 4.13425 17.8302 3.80746 17.6941L2.62324 17.2006C2.15859 17.0069 2.15859 16.3455 2.62324 16.1519L3.80746 15.6584C4.13425 15.5222 4.39389 15.2626 4.53005 14.9358L5.02356 13.7516C5.21719 13.287 5.8786 13.287 6.07223 13.7516Z" fill="currentColor"/>
  </svg>
);

const AppLogo = () => (
    <div className="relative w-9 h-9 flex items-center justify-center">
         {/* Subtle Glow */}
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-40 blur-[2px]"></div>
         
         {/* Card Shape */}
         <div className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
             {/* User Icon */}
             <svg className="w-5 h-5 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
             </svg>
             
             {/* Sparkle Accent */}
             <div className="absolute -top-1.5 -right-1.5 transform rotate-12">
                 <svg className="w-4 h-4 text-white fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" viewBox="0 0 24 24">
                     <path d="M12 0L14.595 9.405L24 12L14.595 14.595L12 24L9.405 14.595L0 12L9.405 9.405L12 0Z" />
                 </svg>
             </div>
         </div>
    </div>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const CropIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 01.382-.632l3.285-3.832a2.25 2.25 0 011.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0021.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 002.25 2.25z" />
    </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const Spinner = () => (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- UI Components ---

const ComparisonSlider = ({ original, edited }: { original: string, edited: string }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(pos);
    };

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full overflow-hidden select-none touch-none"
            onMouseMove={handleMove}
            onTouchMove={handleMove}
        >
            {/* Original (Bottom) */}
            <img src={original} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
            
            {/* Output (Top with clip) */}
            <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
                <img src={edited} alt="Output" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* Neon Slider Line */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-[#d4ff00] shadow-[0_0_15px_rgba(212,255,0,0.8)] z-10 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
            >
                {/* Neon Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-10 bg-[#d4ff00] rounded-full border-2 border-black/80 shadow-[0_0_10px_rgba(212,255,0,0.6)]">
                    <div className="absolute top-1/4 bottom-1/4 left-1/2 -translate-x-0.5 w-0.5 bg-black/40 rounded-full"></div>
                </div>
            </div>

            {/* Labels */}
            <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/70 uppercase tracking-widest pointer-events-none">
                Original
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#d4ff00] uppercase tracking-widest pointer-events-none">
                Output
            </div>
        </div>
    );
};

const Header = () => (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <AppLogo />
                <h1 className="font-display font-bold text-xl tracking-tight">PassportAI</h1>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
                 <span className="text-white">Studio Mode</span>
                 <span className="hover:text-white transition-colors cursor-not-allowed">Batch Edit</span>
                 <span className="hover:text-white transition-colors cursor-not-allowed">Pricing</span>
            </nav>
            <div className="w-8 md:w-auto"></div>
        </div>
    </header>
);

const PreviewOverlay = ({ job }: { job: ImageJob | null }) => {
    if (!job || !job.editedUrl) return null;

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"></div>
            <div className="relative z-10 animate-fade-in-scale">
                 <img 
                    src={job.editedUrl} 
                    alt="Preview" 
                    className="max-h-[85vh] max-w-[90vw] w-auto h-auto rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                     <span className="text-white text-xs font-medium tracking-wide">Studio Preview</span>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-scale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

interface CropModalProps {
    isOpen: boolean;
    imageUrl: string;
    aspectRatio: number;
    onClose: () => void;
    onSave: (croppedBlob: Blob) => void;
}

const CropModal: React.FC<CropModalProps> = ({ isOpen, imageUrl, aspectRatio, onClose, onSave }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (croppedAreaPixels) {
            try {
                const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
                onSave(croppedBlob);
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh] md:h-[600px]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surfaceHighlight">
                    <h3 className="font-semibold">Adjust Crop</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
                <div className="relative flex-1 bg-black">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        classes={{ containerClassName: 'h-full' }}
                    />
                </div>
                <div className="p-4 bg-surfaceHighlight border-t border-white/10 flex items-center gap-4">
                     <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-400">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer hover:bg-white/30 accent-indigo-500"
                        />
                     </div>
                     <div className="flex gap-2">
                         <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">Cancel</button>
                         <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <CheckIcon className="w-4 h-4" /> Save Crop
                         </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

interface ImageCardProps {
    job: ImageJob;
    onRegenerate: (jobId: number) => void;
    onDownload: (job: ImageJob) => void;
    onHoverStart: (job: ImageJob) => void;
    onHoverEnd: () => void;
    onCrop: (job: ImageJob) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ job, onRegenerate, onDownload, onHoverStart, onHoverEnd, onCrop }) => {
    return (
        <div className="group relative bg-surface hover:bg-surfaceHighlight transition-all duration-300 rounded-3xl overflow-hidden border border-white/5 hover:border-white/10 shadow-xl shadow-black/20">
            {/* Main Image Display */}
            <div 
                className={`relative aspect-[4/5] w-full overflow-hidden bg-black/40 ${job.status === 'success' ? 'cursor-zoom-in' : ''}`}
                onMouseEnter={() => { if (job.status === 'success') onHoverStart(job); }}
                onMouseLeave={onHoverEnd}
            >
                 {/* Success: Comparison Slider */}
                {job.status === 'success' && job.editedUrl ? (
                    <ComparisonSlider original={job.originalUrl} edited={job.editedUrl} />
                ) : (
                    /* Default: Show original with effects */
                    <div className="absolute inset-0 transition-opacity duration-700">
                        <img src={job.originalUrl} alt="Original" className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-500" />
                    </div>
                )}

                 {/* Status Overlays */}
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20">
                    {job.status === 'processing' && (
                        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center gap-3 border border-white/10 animate-pulse">
                            <Spinner />
                            <span className="text-xs font-medium tracking-wide">GENERATING</span>
                        </div>
                    )}
                    {job.status === 'queued' && (
                         <div className="bg-black/60 backdrop-blur-md rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            <span className="text-xs font-medium">QUEUED</span>
                         </div>
                    )}
                    {job.status === 'error' && (
                        <div className="bg-red-500/10 backdrop-blur-md rounded-2xl p-4 text-center border border-red-500/20 max-w-[80%]">
                             <p className="text-xs text-red-200 font-medium mb-2">GENERATION FAILED</p>
                             <p className="text-[10px] text-red-200/70 line-clamp-2">{job.error}</p>
                        </div>
                    )}
                </div>

                {/* Badge */}
                {job.status === 'success' && (
                    <div className="absolute top-3 right-3 pointer-events-none z-30">
                         <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Studio Ready
                        </div>
                    </div>
                )}

                {/* Manual Crop Button (Only when Queued) */}
                 {job.status === 'queued' && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onCrop(job); }}
                        className="absolute bottom-3 right-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white p-2 rounded-full transition-all pointer-events-auto"
                        title="Adjust Crop"
                    >
                        <CropIcon className="w-4 h-4" />
                    </button>
                 )}
            </div>

            {/* Controls */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-white truncate">{job.file.name}</p>
                    <p className="text-xs text-gray-500">{job.status === 'success' ? 'Slide to Compare' : job.status === 'queued' ? 'Ready to Generate' : 'Processing...'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => onRegenerate(job.id)} 
                        disabled={job.status === 'processing' || job.status === 'queued'}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <RefreshIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onDownload(job)}
                        disabled={job.status !== 'success'} 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-black hover:bg-gray-200 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [jobs, setJobs] = useState<ImageJob[]>([]);
    const [selectedStandard, setSelectedStandard] = useState<string>('US');
    const [selectedSuitColor, setSelectedSuitColor] = useState<string>('black');
    const [lightingDescription, setLightingDescription] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [hoveredJob, setHoveredJob] = useState<ImageJob | null>(null);
    
    // Crop Modal State
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [jobToCrop, setJobToCrop] = useState<ImageJob | null>(null);

    const jobCounter = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgRef1 = useRef<HTMLDivElement>(null);
    const bgRef2 = useRef<HTMLDivElement>(null);

    // Parallax scrolling effect
    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            if (bgRef1.current) bgRef1.current.style.transform = `translateY(${y * 0.15}px)`;
            if (bgRef2.current) bgRef2.current.style.transform = `translateY(${-y * 0.15}px)`;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newJobs: ImageJob[] = Array.from(files).map((file: File) => ({
            id: jobCounter.current++,
            file,
            originalUrl: URL.createObjectURL(file),
            editedUrl: null,
            status: 'queued',
            error: null,
        }));
        setJobs(prev => [...prev, ...newJobs]);
        if (event.target) { event.target.value = ""; }
    };
    
    const updateJob = useCallback((id: number, updates: Partial<ImageJob>) => {
        setJobs(prev => prev.map(job => job.id === id ? { ...job, ...updates } : job));
    }, []);

    // Manual Process Trigger
    const handleGenerateAll = async () => {
        const jobsToProcess = jobs.filter(j => j.status === 'queued');
        if (jobsToProcess.length === 0) return;

        setIsProcessing(true);
        const spec = PASSPORT_SPECS[selectedStandard];
        
        for (const job of jobsToProcess) {
            updateJob(job.id, { status: 'processing', error: null });
            try {
                const base64Data = await professionalizeImage(job.file, spec.text, selectedSuitColor, lightingDescription);
                const imageUrl = `data:image/png;base64,${base64Data}`;
                updateJob(job.id, { status: 'success', editedUrl: imageUrl, error: null });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Processing failed";
                updateJob(job.id, { status: 'error', error: errorMessage });
            }
             await delay(1000);
        }
        setIsProcessing(false);
    };

    const handleRegenerate = (jobId: number) => { updateJob(jobId, { status: 'queued', editedUrl: null, error: null }); };

    const handleDownload = (job: ImageJob) => {
        if (job.editedUrl) {
            const a = document.createElement('a');
            a.href = job.editedUrl; a.download = `professional_${job.file.name}`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }
    };
    
    const handleDownloadAll = async () => {
        const successfulJobs = jobs.filter(j => j.status === 'success' && j.editedUrl);
        if (successfulJobs.length === 0) return;

        const zip = new window.JSZip();
        await Promise.all(successfulJobs.map(async (job) => {
            if (job.editedUrl) {
                const response = await fetch(job.editedUrl);
                const blob = await response.blob();
                zip.file(`professional_${job.file.name}`, blob);
            }
        }));

        zip.generateAsync({ type: "blob" }).then((content: Blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content); link.download = "passport_photos.zip";
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        });
    };

    const handleClearAll = () => { jobs.forEach(job => URL.revokeObjectURL(job.originalUrl)); setJobs([]); };
    const handleUploadClick = () => { fileInputRef.current?.click(); };

    // Crop Handlers
    const openCropModal = (job: ImageJob) => {
        setJobToCrop(job);
        setCropModalOpen(true);
    };
    const closeCropModal = () => {
        setCropModalOpen(false);
        setJobToCrop(null);
    };
    const saveCrop = (croppedBlob: Blob) => {
        if (jobToCrop) {
            const newFile = new File([croppedBlob], jobToCrop.file.name, { type: 'image/jpeg' });
            const newUrl = URL.createObjectURL(newFile);
            
            // Revoke old URL to avoid memory leaks if it wasn't the original
            // Note: In a real app we'd want to track which URLs we created
            
            updateJob(jobToCrop.id, {
                file: newFile,
                originalUrl: newUrl
            });
        }
        closeCropModal();
    };

    const successfulJobsCount = jobs.filter(j => j.status === 'success').length;
    const queuedJobsCount = jobs.filter(j => j.status === 'queued').length;
    
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            <div ref={bgRef1} className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none z-0 will-change-transform"></div>
            <div ref={bgRef2} className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 blur-[120px] rounded-full pointer-events-none z-0 will-change-transform"></div>

            <Header />
            <PreviewOverlay job={hoveredJob} />
            
            {/* Crop Modal */}
            {jobToCrop && (
                <CropModal 
                    isOpen={cropModalOpen}
                    imageUrl={jobToCrop.originalUrl}
                    aspectRatio={PASSPORT_SPECS[selectedStandard].ratio}
                    onClose={closeCropModal}
                    onSave={saveCrop}
                />
            )}

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-10">
                
                {/* Hero Section */}
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-6 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span>Powered by Gemini 2.0</span>
                    </div>
                    <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                        Studio Quality <br/> in Seconds.
                    </h2>
                    <p className="text-lg text-gray-400 leading-relaxed mb-8">
                        Upload casual selfies, crop to standard, and let AI transform them into professional passport-ready headshots.
                    </p>
                    
                    {/* Controls Bar */}
                    <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-3 flex flex-col md:flex-row items-center gap-3 shadow-2xl shadow-black/40">
                         <div className="relative w-full md:w-auto flex-1 group">
                            <select 
                                value={selectedStandard} 
                                onChange={(e) => setSelectedStandard(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 text-white rounded-full px-5 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer hover:bg-black/30"
                            >
                                {Object.entries(PASSPORT_SPECS).map(([key, value]) => (<option key={key} value={key}>{value.name}</option>))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                        </div>

                        <div className="relative w-full md:w-auto flex-1 group">
                             <select 
                                value={selectedSuitColor} 
                                onChange={(e) => setSelectedSuitColor(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 text-white rounded-full px-5 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer hover:bg-black/30"
                            >
                                {Object.entries(SUIT_COLORS).map(([key, value]) => (<option key={key} value={key}>{value}</option>))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                            </div>
                        </div>

                         <div className="relative w-full md:w-auto flex-1 group">
                            <input
                                type="text"
                                value={lightingDescription}
                                onChange={(e) => setLightingDescription(e.target.value)}
                                placeholder="Lighting / Notes (Optional)"
                                className="w-full bg-black/20 border border-white/5 text-white rounded-full px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all hover:bg-black/30 placeholder-gray-500"
                            />
                        </div>

                        {queuedJobsCount > 0 ? (
                            <button 
                                onClick={handleGenerateAll}
                                disabled={isProcessing}
                                className="w-full md:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? <><Spinner /> Processing...</> : <><SparklesIcon className="w-5 h-5" /> Generate Photos</>}
                            </button>
                        ) : (
                            <button 
                                onClick={handleUploadClick} 
                                className="w-full md:w-auto px-8 py-3.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            >
                                <PlusIcon className="w-5 h-5" /> Upload Photos
                            </button>
                        )}
                    </div>
                     <input type="file" multiple accept="image/jpeg, image/png, image/webp" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                </div>

                {/* Processing State / Results Grid */}
                {jobs.length > 0 && (
                    <div className="animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                             <h3 className="text-xl font-display font-semibold">Your Studio</h3>
                             <div className="flex gap-2">
                                 {successfulJobsCount > 0 && (
                                    <button onClick={handleDownloadAll} className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium transition-colors flex items-center gap-2">
                                        <DownloadIcon className="w-4 h-4"/> Save All
                                    </button>
                                 )}
                                <button onClick={handleClearAll} className="px-4 py-2 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-sm font-medium transition-colors text-gray-400 hover:text-red-400 flex items-center gap-2">
                                    <TrashIcon className="w-4 h-4"/> Clear
                                </button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {jobs.map(job => (
                                <ImageCard 
                                    key={job.id} 
                                    job={job} 
                                    onRegenerate={handleRegenerate} 
                                    onDownload={handleDownload}
                                    onHoverStart={setHoveredJob}
                                    onHoverEnd={() => setHoveredJob(null)}
                                    onCrop={openCropModal}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .animate-fade-in-up { animation: fade-in-up 0.7s ease-out forwards; }
            `}</style>
        </div>
    );
};
export default App;