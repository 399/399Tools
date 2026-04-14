'use client';

import { useState, useMemo, useTransition } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, subMonths, startOfYear, isAfter, isBefore } from 'date-fns';
import { zhCN } from "date-fns/locale";
import { deleteTransaction } from '@/app/assets/lib/actions';
import TransactionForm from './TransactionForm';
import ImportTransactionsDialog from './ImportTransactionsDialog';
import RegularDashboard from './RegularDashboard';
import { ClosedPositionsTable } from './ClosedPositionsTable';
import { calculateClosedPositions } from './ClosedPositionsLogic';
import { ArrowUpDown, Trash2, ArrowUp, ArrowDown, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface RegularPortfolioViewProps {
    portfolioId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
    uniqueAssets: { symbol: string | null; name: string }[];
}

type SortKey = 'date' | 'asset' | 'amount';
type SortDir = 'asc' | 'desc';
type ViewTab = 'record' | 'closed';
type DateFilterType = 'ALL' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'THIS_YEAR' | 'CUSTOM';

export default function RegularPortfolioView({ portfolioId, transactions, uniqueAssets }: RegularPortfolioViewProps) {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<ViewTab>('record');

    // Filters - Separate state for each tab
    const [recordSearchQuery, setRecordSearchQuery] = useState('');
    const [recordDateFilter, setRecordDateFilter] = useState<DateFilterType>('ALL');
    const [recordCustomDate, setRecordCustomDate] = useState<DateRange | undefined>();
    const [recordOpenCombobox, setRecordOpenCombobox] = useState(false);

    const [closedSearchQuery, setClosedSearchQuery] = useState('');
    const [closedDateFilter, setClosedDateFilter] = useState<DateFilterType>('ALL');
    const [closedCustomDate, setClosedCustomDate] = useState<DateRange | undefined>();
    const [closedOpenCombobox, setClosedOpenCombobox] = useState(false);

    // Helpers to get current active filters
    const searchQuery = activeTab === 'record' ? recordSearchQuery : closedSearchQuery;
    const setSearchQuery = activeTab === 'record' ? setRecordSearchQuery : setClosedSearchQuery;

    const dateFilter = activeTab === 'record' ? recordDateFilter : closedDateFilter;
    const setDateFilter = activeTab === 'record' ? setRecordDateFilter : setClosedDateFilter;

    const customDate = activeTab === 'record' ? recordCustomDate : closedCustomDate;
    const setCustomDate = activeTab === 'record' ? setRecordCustomDate : setClosedCustomDate;

    const openCombobox = activeTab === 'record' ? recordOpenCombobox : closedOpenCombobox;
    const setOpenCombobox = activeTab === 'record' ? setRecordOpenCombobox : setClosedOpenCombobox;


    // Sort
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // 1. Calculate Closed Positions (Global, from ALL transactions)
    // We calculate first, then filter, because "Closed" round might depend on older transactions not in current date filter?
    // Actually, usually you want to see "Positions Closed within Date Range".
    // So we calculate ALL closed positions, then filter them by clearDate.
    // For Transactions view, we filter transactions by date directly.

    const allClosedPositions = useMemo(() => {
        return calculateClosedPositions(transactions);
    }, [transactions]);

    // 2. Filter Logic Helper
    // We need to pass the specific filters to check function now, or make it pure
    const checkDate = (date: Date, filterType: DateFilterType, cDate: DateRange | undefined) => {
        const now = new Date();
        switch (filterType) {
            case 'THIS_MONTH':
                return isAfter(date, startOfMonth(now));
            case 'LAST_3_MONTHS':
                return isAfter(date, subMonths(now, 3));
            case 'LAST_6_MONTHS':
                return isAfter(date, subMonths(now, 6));
            case 'THIS_YEAR':
                return isAfter(date, startOfYear(now));
            case 'CUSTOM':
                if (cDate?.from && isBefore(date, cDate.from)) return false;
                if (cDate?.to) {
                    const end = new Date(cDate.to);
                    end.setHours(23, 59, 59, 999);
                    return isBefore(date, end);
                }
                return true;
            case 'ALL':
            default:
                return true;
        }
    };

    const checkSearch = (symbol: string | null, name: string, query: string) => {
        if (!query) return true;
        // SearchQuery is now "SYMBOL NAME" from the combobox value
        // We can just check if the combined string contains our asset's info
        // Or since we selecting from uniqueAssets, we can try strict match?
        // But uniqueAssets might have slightly different name if multiple?
        // Let's split query or just check inclusion.
        // Actually, the value set is `asset.symbol + " " + asset.name`.
        // So we can check if searchQuery includes the symbol.
        const q = query.toLowerCase();
        return (symbol && q.includes(symbol.toLowerCase())) || (name && q.includes(name.toLowerCase()));
    };

    // 3. Filtered Lists - Use specific states
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchDate = checkDate(new Date(tx.date), recordDateFilter, recordCustomDate);
            const matchSearch = checkSearch(tx.assetSymbol, tx.assetName, recordSearchQuery);
            return matchDate && matchSearch;
        });
    }, [transactions, recordDateFilter, recordCustomDate, recordSearchQuery]);

    const filteredClosedPositions = useMemo(() => {
        return allClosedPositions.filter(cp => {
            const matchDate = checkDate(cp.clearDate, closedDateFilter, closedCustomDate);
            const matchSearch = checkSearch(cp.assetSymbol, cp.assetName, closedSearchQuery);
            return matchDate && matchSearch;
        });
    }, [allClosedPositions, closedDateFilter, closedCustomDate, closedSearchQuery]);


    // 4. Sorting for Transactions
    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            let res = 0;
            switch (sortKey) {
                case 'date':
                    res = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'amount':
                    res = a.amount - b.amount;
                    break;
                case 'asset':
                    const nameA = (a.assetName || '') + (a.assetSymbol || '');
                    const nameB = (b.assetName || '') + (b.assetSymbol || '');
                    res = nameA.localeCompare(nameB);
                    break;
            }
            return sortDir === 'asc' ? res : -res;
        });
    }, [filteredTransactions, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'date' || key === 'amount' ? 'desc' : 'asc');
        }
    };

    const handleDelete = (txId: string) => {
        if (confirm('确认删除这条交易记录吗？')) {
            startTransition(async () => {
                await deleteTransaction(txId, portfolioId);
            });
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        return sortDir === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    return (
        <div className="space-y-6">
            <RegularDashboard transactions={transactions} />

            <div className="space-y-4">
                {/* Controls Area */}
                <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border shadow-sm">
                    {/* Top Row: Tabs and Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        {/* Custom Tabs */}
                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            <button
                                onClick={() => setActiveTab('record')}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === 'record'
                                        ? "bg-white dark:bg-zinc-950 shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                交易记录
                            </button>
                            <button
                                onClick={() => setActiveTab('closed')}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                    activeTab === 'closed'
                                        ? "bg-white dark:bg-zinc-950 shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                已清仓
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <ImportTransactionsDialog portfolioId={portfolioId} />
                            <TransactionForm portfolioId={portfolioId} uniqueAssets={uniqueAssets} />
                        </div>
                    </div>

                    {/* Bottom Row: Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-xs">
                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCombobox}
                                        className="w-[200px] justify-between"
                                    >
                                        {searchQuery
                                            ? uniqueAssets.find((asset) => (asset.symbol + " " + asset.name) === searchQuery)?.name || searchQuery
                                            : "搜索代码或名称..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="搜索标的..." />
                                        <CommandList>
                                            <CommandEmpty>未找到标的。</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    value="ALL_ASSETS_RESET_KEY"
                                                    onSelect={() => {
                                                        setSearchQuery("");
                                                        setOpenCombobox(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            searchQuery === "" ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    全部标的
                                                </CommandItem>
                                                {uniqueAssets.map((asset) => {
                                                    const value = asset.symbol + " " + asset.name;
                                                    return (
                                                        <CommandItem
                                                            key={asset.symbol + asset.name}
                                                            value={value}
                                                            onSelect={(currentValue) => {
                                                                setSearchQuery(currentValue === searchQuery ? "" : currentValue);
                                                                setOpenCombobox(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    searchQuery === value ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <span className="font-mono mr-2">{asset.symbol}</span>
                                                            {asset.name}
                                                        </CommandItem>
                                                    )
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Select value={dateFilter} onValueChange={(v: DateFilterType) => setDateFilter(v)}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="成交时间" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">全部时间</SelectItem>
                                <SelectItem value="THIS_MONTH">本月</SelectItem>
                                <SelectItem value="LAST_3_MONTHS">近三月</SelectItem>
                                <SelectItem value="LAST_6_MONTHS">近半年</SelectItem>
                                <SelectItem value="THIS_YEAR">今年</SelectItem>
                                <SelectItem value="CUSTOM">自定义</SelectItem>
                            </SelectContent>
                        </Select>

                        {dateFilter === 'CUSTOM' && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-[260px] justify-start text-left font-normal",
                                                !customDate?.from && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {customDate?.from ? (
                                                customDate.to ? (
                                                    <>
                                                        {format(customDate.from, "LLL dd, y", { locale: zhCN })} -{" "}
                                                        {format(customDate.to, "LLL dd, y", { locale: zhCN })}
                                                    </>
                                                ) : (
                                                    format(customDate.from, "LLL dd, y", { locale: zhCN })
                                                )
                                            ) : (
                                                <span>选择日期范围</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={customDate?.from}
                                            selected={customDate}
                                            onSelect={setCustomDate}
                                            numberOfMonths={2}
                                            locale={zhCN}
                                            captionLayout="dropdown"
                                            fromYear={2015}
                                            toYear={new Date().getFullYear() + 1}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        <div className="flex items-center text-sm text-muted-foreground ml-auto">
                            {activeTab === 'record'
                                ? `共 ${filteredTransactions.length} 笔交易`
                                : `共 ${filteredClosedPositions.length} 笔清仓记录`
                            }
                        </div>
                    </div>
                </div>

                {/* Content View */}
                {activeTab === 'record' ? (
                    <div className="border rounded-md bg-white dark:bg-zinc-950">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('date')}>
                                        <div className="flex items-center">成交时间 <SortIcon column="date" /></div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('asset')}>
                                        <div className="flex items-center">标的 <SortIcon column="asset" /></div>
                                    </TableHead>
                                    <TableHead>类别</TableHead>
                                    <TableHead className="text-right">价格</TableHead>
                                    <TableHead className="text-right">数量</TableHead>
                                    <TableHead className="text-right cursor-pointer hover:bg-zinc-50" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end">发生金额 <SortIcon column="amount" /></div>
                                    </TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            暂无符合条件的交易。
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedTransactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {format(new Date(tx.date), 'yyyy-MM-dd HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{tx.assetName}</div>
                                                <div className="text-xs text-muted-foreground">{tx.assetSymbol}</div>
                                            </TableCell>
                                            <TableCell>
                                                {tx.type === 'BUY' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">买入</Badge>}
                                                {tx.type === 'SELL' && <Badge variant="destructive">卖出</Badge>}
                                                {tx.type === 'INTEREST' && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">派息</Badge>}
                                                {tx.type === 'DIVIDEND' && <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">红利</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(tx.type === 'DIVIDEND' || tx.type === 'INTEREST') ? '-' : tx.price.toFixed(3)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(tx.type === 'DIVIDEND' || tx.type === 'INTEREST') ? '-' : tx.quantity.toFixed(0)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                {tx.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                                    onClick={() => handleDelete(tx.id)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-950">
                        <ClosedPositionsTable data={filteredClosedPositions} />
                    </div>
                )}
            </div>
        </div>
    );
}
