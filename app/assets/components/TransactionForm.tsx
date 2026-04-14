'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createTransaction } from '@/app/assets/lib/actions';
import { Plus, Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TransactionFormProps {
    portfolioId: string;
    uniqueAssets: { symbol: string | null; name: string }[];
}

export default function TransactionForm({ portfolioId, uniqueAssets }: TransactionFormProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assetOpen, setAssetOpen] = useState(false);
    const [showSymbolInput, setShowSymbolInput] = useState(false);

    // Form states
    const [type, setType] = useState<'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST'>('BUY');
    const [symbol, setSymbol] = useState('');
    const [name, setName] = useState('');
    const [price, setPrice] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [date, setDate] = useState<Date>(new Date()); // Using Date object
    const [searchTerm, setSearchTerm] = useState('');

    const isIncome = type === 'DIVIDEND' || type === 'INTEREST';
    const amount = isIncome
        ? parseFloat(price || '0').toFixed(2)
        : (parseFloat(price || '0') * parseFloat(quantity || '0')).toFixed(2);

    function handleSelectExisting(asset: { symbol: string | null; name: string }) {
        setSymbol(asset.symbol || '');
        setName(asset.name);
        setShowSymbolInput(false);
        setAssetOpen(false);
        setSearchTerm(asset.name); // Set display value
    }

    function handleSelectNew(term: string) {
        setName(term);
        setSymbol('');
        setShowSymbolInput(true);
        setAssetOpen(false);
        setSearchTerm(term);
        // Ideally focus the symbol input here, but React state update might delay render
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);

        const parsedPrice = parseFloat(price);
        const parsedQty = parseFloat(quantity);

        const data = {
            portfolioId,
            symbol: symbol.toUpperCase(),
            name: name || symbol.toUpperCase(),
            type,
            // For Income: Treat "Price" input as total Amount. Qty is 0.
            // For Trade: Price is Unit Price.
            price: isIncome ? 0 : parsedPrice,
            quantity: isIncome ? 0 : parsedQty,
            amount: isIncome ? parsedPrice : (parsedPrice * parsedQty),
            date: date,
        };

        try {
            await createTransaction(data);
            setOpen(false);
            // Reset form
            setPrice('');
            setQuantity('');
            setSymbol('');
            setName('');
            setSearchTerm('');
            setShowSymbolInput(false);
            setDate(new Date());
            setType('BUY');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                    <Plus size={18} />
                    记一笔
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>记一笔交易</DialogTitle>
                        <DialogDescription>
                            搜索现有标的或直接回车创建新标的。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">委托类别</Label>
                            <RadioGroup value={type} onValueChange={(v) => {
                                setType(v as 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST');
                                if (v === 'DIVIDEND' || v === 'INTEREST') {
                                    setQuantity('0');
                                } else {
                                    setQuantity(''); // Reset for standard trade
                                }
                            }} className="flex gap-4 col-span-3 flex-wrap">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="BUY" id="buy" />
                                    <Label htmlFor="buy" className="text-green-600 font-bold cursor-pointer">买入</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="SELL" id="sell" />
                                    <Label htmlFor="sell" className="text-red-600 font-bold cursor-pointer">卖出</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="INTEREST" id="interest" />
                                    <Label htmlFor="interest" className="text-blue-600 font-bold cursor-pointer">派息</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="DIVIDEND" id="dividend" />
                                    <Label htmlFor="dividend" className="text-orange-600 font-bold cursor-pointer">红利</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">证券代码</Label>
                            <div className="col-span-3">
                                <Popover open={assetOpen} onOpenChange={setAssetOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={assetOpen}
                                            className="w-full justify-between"
                                        >
                                            {searchTerm || (name ? (symbol ? `${symbol} ${name}` : name) : "搜索或新建...")}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="搜索代码或名称..."
                                                value={searchTerm}
                                                onValueChange={setSearchTerm}
                                            />
                                            <CommandList>
                                                {/* Always show "Create" option if there is input */}
                                                {searchTerm && (
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value={searchTerm + " (new)"}
                                                            onSelect={() => handleSelectNew(searchTerm)}
                                                            className="cursor-pointer bg-zinc-50 dark:bg-zinc-900 mb-1"
                                                        >
                                                            <div className="flex items-center w-full">
                                                                <span className="flex-1">使用 &quot;<span className="font-bold text-primary">{searchTerm}</span>&quot; 作为名称创建</span>
                                                                <div className="text-xs text-muted-foreground bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded">↵ 回车</div>
                                                            </div>
                                                        </CommandItem>
                                                    </CommandGroup>
                                                )}

                                                <CommandGroup heading="已有标的">
                                                    {uniqueAssets
                                                        .filter(asset => {
                                                            if (!searchTerm) return true;
                                                            const term = searchTerm.toLowerCase();
                                                            return (asset.name?.toLowerCase().includes(term) ||
                                                                asset.symbol?.toLowerCase().includes(term));
                                                        })
                                                        .map((asset, idx) => (
                                                            <CommandItem
                                                                key={`${asset.symbol}-${idx}`}
                                                                value={`${asset.symbol} ${asset.name}`}
                                                                onSelect={() => handleSelectExisting(asset)}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        (name === asset.name && symbol === asset.symbol) ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <span className="font-mono font-bold mr-2">{asset.symbol}</span> {asset.name}
                                                            </CommandItem>
                                                        ))}
                                                    {uniqueAssets.filter(asset => {
                                                        if (!searchTerm) return true;
                                                        const term = searchTerm.toLowerCase();
                                                        return (asset.name?.toLowerCase().includes(term) ||
                                                            asset.symbol?.toLowerCase().includes(term));
                                                    }).length === 0 && !searchTerm && (
                                                            <div className="p-4 text-sm text-center text-muted-foreground">
                                                                输入名称或代码开始搜索...
                                                            </div>
                                                        )}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Conditionally reveal Symbol input */}
                        {showSymbolInput && (
                            <div className="grid grid-cols-4 items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="symbol-input" className="text-right text-primary font-medium">输入代码</Label>
                                <Input
                                    id="symbol-input"
                                    value={symbol}
                                    onChange={(e) => setSymbol(e.target.value)}
                                    className="col-span-3"
                                    placeholder="例如 00700"
                                    autoFocus
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">
                                成交价格
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.001"
                                className="col-span-3"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                成交数量
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="1"
                                className="col-span-3"
                                value={quantity}
                                onChange={(e) => {
                                    // Parse integer only
                                    const val = e.target.value;
                                    if (val === '' || /^\d+$/.test(val)) {
                                        setQuantity(val);
                                    }
                                }}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">
                                发生金额
                            </Label>
                            <div className="col-span-3 font-mono text-lg font-medium">
                                {amount}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">
                                成交日期
                            </Label>
                            <div className="col-span-3">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: zhCN }) : <span>选择日期</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d) => d && setDate(d)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "提交中..." : "确认提交"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
