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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { importTransactions } from '@/app/assets/lib/actions';
import { Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportTransactionsDialogProps {
    portfolioId: string;
}

export default function ImportTransactionsDialog({ portfolioId }: ImportTransactionsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [csvContent, setCsvContent] = useState('');
    const [result, setResult] = useState<{ success: number; fail: number; errors?: string[] } | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as any[][];

            if (jsonData.length === 0) return;

            // 1. Find Header Row using keywords
            // Standards: Date, Code, Name, Type, Price, Quantity
            // Keywords mapping
            const mapKeys = {
                date: ['日期', 'date', '时间', 'time', '成交日期'],
                code: ['代码', 'symbol', 'code', 'ticker', '证券代码'],
                name: ['名称', 'name', 'title', '证券名称', '标的'],
                type: ['方向', 'type', 'side', 'operation', '买卖', '委托类别'],
                price: ['价格', 'price', 'cost', '成交价格', '单价', '成交均价'],
                quantity: ['数量', 'qty', 'quantity', 'amount', '成交数量', '股数'],
                amount: ['金额', 'amount', 'total', '发生金额', '成交金额']
            };

            let headerRowIndex = -1;
            const columnMap: Record<string, number> = {};

            // Scan first 10 rows for a header
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
                const row = jsonData[i].map(c => String(c).toLowerCase().trim());
                let matchCount = 0;
                const currentMap: Record<string, number> = {};

                // Try to match each expected key
                Object.entries(mapKeys).forEach(([key, keywords]) => {
                    const index = row.findIndex(cell => keywords.some(k => cell.includes(k)));
                    if (index !== -1) {
                        currentMap[key] = index;
                        matchCount++;
                    }
                });

                // If we found at least 3 matches, assume this is the header
                if (matchCount >= 3) {
                    headerRowIndex = i;
                    // Assign found indices
                    Object.assign(columnMap, currentMap);
                    break;
                }
            }

            if (headerRowIndex === -1) {
                // Fallback
                console.warn("No header found, assuming standard column order.");
                const stdOrder = ['date', 'code', 'name', 'type', 'price', 'quantity', 'amount'];
                stdOrder.forEach((k, idx) => columnMap[k] = idx);
                headerRowIndex = -1; // Parse all rows
            }

            // 2. Extract Data
            const csvRows: string[] = [];
            const dataRows = jsonData.slice(headerRowIndex + 1);

            dataRows.forEach(row => {
                // If row is empty, skip
                if (row.length === 0 || row.every(c => !c)) return;

                // Extract fields in standard order: Date, Code, Name, Type, Price, Quantity, Amount
                const getValue = (key: string) => {
                    const idx = columnMap[key];
                    if (idx !== undefined && row[idx] !== undefined) {
                        return String(row[idx]).trim().replace(/,/g, ' '); // Remove commas
                    }
                    return '';
                };

                const date = getValue('date');
                const code = getValue('code');
                const name = getValue('name');
                const type = getValue('type');
                const price = getValue('price');
                const qty = getValue('quantity');
                const amount = getValue('amount');

                // Basic validation: must have Date and (Code or Name) and (Price or Qty or amount)
                if (date && (code || name)) {
                    // Always include amount column, even if empty
                    csvRows.push(`${date},${code},${name},${type},${price},${qty},${amount}`);
                }
            });

            if (csvRows.length > 0) {
                setCsvContent(csvRows.join('\n'));
            } else {
                // Nothing parsed?
                alert("未能识别有效数据，请检查表头是否包含：日期、代码、名称、方向、价格、数量");
            }

        } catch (err) {
            console.error("Failed to parse Excel", err);
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    }

    async function handleImport() {
        if (!csvContent.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await importTransactions(portfolioId, csvContent);
            setResult({ success: res.successCount, fail: res.failCount, errors: res.errors });
            if (res.failCount === 0 && res.successCount > 0) {
                // Close after brief delay if perfect
                setTimeout(() => {
                    setOpen(false);
                    setCsvContent('');
                    setResult(null);
                }, 1500);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Upload size={16} />
                    导入交易
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>批量导入交易</DialogTitle>
                    <DialogDescription>
                        请粘贴 CSV 格式的交易数据，或上传 Excel 文件 (.xlsx)。<br />
                        <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">成交日期, 证券代码, 证券名称, 委托类别(买/卖), 成交价格, 成交数量, 发生金额</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-2">
                        <Input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="cursor-pointer"
                        />
                    </div>
                    <Textarea
                        placeholder={`2024-01-01, 00700, 腾讯控股, 买, 300.5, 100\n2024-02-01, 00700, 腾讯控股, 卖, 320.0, 50`}
                        className="font-mono h-[200px] text-sm"
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                    />

                    {result && (
                        <div className={`p-4 rounded-lg flex items-start gap-3 border ${result.fail > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
                            {result.fail > 0 ? <AlertCircle className="h-5 w-5 mt-0.5" /> : <Upload className="h-5 w-5 mt-0.5" />}
                            <div className="flex-1">
                                <h5 className="font-medium mb-1">{result.fail > 0 ? "导入完成，但有错误" : "导入成功"}</h5>
                                <div className="text-sm opacity-90">
                                    成功导入 {result.success} 条，失败 {result.fail} 条。
                                </div>
                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-2 text-xs bg-red-100/50 p-2 rounded max-h-[100px] overflow-y-auto whitespace-pre-wrap font-mono">
                                        <div className="font-semibold mb-1">错误详情（前10条）：</div>
                                        {result.errors.map((err, i) => (
                                            <div key={i}>{err}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={handleImport} disabled={loading || !csvContent.trim()}>
                        {loading ? "处理中..." : "开始导入"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
