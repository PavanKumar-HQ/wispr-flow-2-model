import React, { useState } from 'react';
import { Code, Check } from 'lucide-react';
import { safeInvoke } from '../lib/ipc';

interface DeveloperCasingBarProps {
  text: string;
  onApply: (transformedText: string) => void;
  className?: string;
  autoPaste?: boolean;
}

export const DeveloperCasingBar: React.FC<DeveloperCasingBarProps> = ({
  text,
  onApply,
  className = '',
  autoPaste = true,
}) => {
  const [activeFormat, setActiveFormat] = useState<string | null>(null);

  if (!text || !text.trim()) {
    return null;
  }

  const cleanWords = (str: string): string[] => {
    return str
      .replace(/[`"'.,!?;:(){}\[\]]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };

  const transform = (type: string): string => {
    const words = cleanWords(text);
    if (words.length === 0) return text;

    switch (type) {
      case 'camel': {
        const first = words[0].toLowerCase();
        const rest = words
          .slice(1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
        return first + rest;
      }
      case 'snake': {
        return words.map((w) => w.toLowerCase()).join('_');
      }
      case 'kebab': {
        return words.map((w) => w.toLowerCase()).join('-');
      }
      case 'constant': {
        return words.map((w) => w.toUpperCase()).join('_');
      }
      case 'pascal': {
        return words
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
      }
      case 'inline_code': {
        return `\`${text.trim()}\``;
      }
      case 'code_block': {
        return `\`\`\`\n${text.trim()}\n\`\`\``;
      }
      default:
        return text;
    }
  };

  const handleSelect = async (type: string, label: string) => {
    const transformed = transform(type);
    setActiveFormat(label);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(transformed);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }

    if (autoPaste) {
      try {
        await safeInvoke('insert_into_selected_field', { id: 0, text: transformed });
      } catch (err) {
        console.warn('Auto paste failed:', err);
      }
    }

    onApply(transformed);
    setTimeout(() => {
      setActiveFormat(null);
    }, 2000);
  };

  const formats = [
    { id: 'camel', label: 'camelCase', example: 'myVar' },
    { id: 'snake', label: 'snake_case', example: 'my_var' },
    { id: 'kebab', label: 'kebab-case', example: 'my-var' },
    { id: 'constant', label: 'CONSTANT', example: 'MY_VAR' },
    { id: 'pascal', label: 'PascalCase', example: 'MyVar' },
    { id: 'inline_code', label: '`code`', example: '`var`' },
  ];

  return (
    <div className={`flex items-center flex-wrap gap-1 pt-1 ${className}`}>
      <span className="text-[10px] font-mono font-bold text-darkTeal/80 flex items-center gap-1 bg-darkTeal/5 border border-darkTeal/15 px-1.5 py-0.5 rounded-md shrink-0">
        <Code className="w-3 h-3 text-darkTeal" />
        <span>Dev Casing:</span>
      </span>

      {formats.map((fmt) => {
        const isSelected = activeFormat === fmt.label;
        return (
          <button
            key={fmt.id}
            type="button"
            onClick={() => handleSelect(fmt.id, fmt.label)}
            className={`tactile-btn tactile-btn-xs font-mono font-bold flex items-center gap-1 shrink-0 ${
              isSelected
                ? 'tactile-btn-primary'
                : 'tactile-btn-surface'
            }`}
            title={`Format as ${fmt.label} and paste into active app`}
          >
            {isSelected ? (
              <>
                <Check className="w-2.5 h-2.5 text-amber" />
                <span>{fmt.label} (Pasted!)</span>
              </>
            ) : (
              <span>{fmt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

