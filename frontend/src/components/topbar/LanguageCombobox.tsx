import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { iso6392 } from 'iso-639-2';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const LanguageCombobox = ({
    onSelect,
    selected,
    open,
    onOpenChange,
}: {
    onSelect: (code: string) => void;
    selected: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) => {
    const { t } = useTranslation('sidebar');
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                    {iso6392.find((l) => l.iso6392T === selected || l.iso6392B === selected)
                        ? `${iso6392.find((l) => l.iso6392T === selected || l.iso6392B === selected)!.name} (${selected})`
                        : t('select_language')}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-70 max-w-full p-0">
                <Command>
                    <CommandInput placeholder="Search language..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>No language found.</CommandEmpty>
                        <CommandGroup>
                            {iso6392
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((lang) => {
                                    const code = lang.iso6392T || lang.iso6392B;
                                    return (
                                        <CommandItem
                                            key={code}
                                            value={lang.name}
                                            onSelect={() => onSelect(code)}
                                        >
                                            {lang.name} ({code})
                                            <Check
                                                className={cn(
                                                    'ml-auto',
                                                    selected === code ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                        </CommandItem>
                                    );
                                })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default LanguageCombobox;
