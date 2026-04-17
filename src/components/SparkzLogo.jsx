export default function SparkzLogo({ size = 'md', variant = 'dark', iconOnly = false }) {
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const svgSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const textColor = variant === 'light' ? 'text-white' : 'text-[#1e1b4b]';

  return (
    <div className={`flex items-center gap-2.5 ${iconOnly ? 'justify-center' : ''}`}>
      <div className={`${iconSize} bg-[#e6c33a] rounded-xl flex items-center justify-center flex-shrink-0`}>
        <svg className={svgSize} viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4 14h7l-1 8 10-12h-7l1-8z" fill="#1e1b4b" />
        </svg>
      </div>
      {!iconOnly && (
        <span className={`font-bold ${textSize} ${textColor} tracking-tight`}>Sparkz</span>
      )}
    </div>
  );
}
