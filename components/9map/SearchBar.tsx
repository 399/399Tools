import { Search } from 'lucide-react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
    return (
        <div className="absolute top-4 left-4 right-4 z-10">
            <div className="relative bg-white/80 backdrop-blur-md rounded-card shadow-soft-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 stroke-[1.5px]" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-4 rounded-card border-none focus:ring-2 focus:ring-apricot/50 bg-transparent placeholder:text-gray-400 text-gray-700"
                    placeholder="搜索地点..."
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}
