
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export interface ClosedPosition {
    id: string; // Unique ID for key (e.g. assetId-clearDate)
    assetName: string;
    assetSymbol: string;
    clearDate: Date;
    startDate: Date;
    totalPnL: number;
    roi: number; // Percentage
    avgBuyPrice: number;
    avgSellPrice: number;
    holdingDays: number;
}

interface ClosedPositionsTableProps {
    data: ClosedPosition[];
}

export function ClosedPositionsTable({ data }: ClosedPositionsTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>清仓日期</TableHead>
                        <TableHead>代码</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead className="text-right">总盈亏</TableHead>
                        <TableHead className="text-right">盈亏比</TableHead>
                        <TableHead className="text-right">买入均价</TableHead>
                        <TableHead className="text-right">卖出均价</TableHead>
                        <TableHead className="text-right">持仓天数</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                暂无清仓记录
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{format(item.clearDate, "yyyy-MM-dd")}</TableCell>
                                <TableCell>{item.assetSymbol || '-'}</TableCell>
                                <TableCell className="font-medium">{item.assetName}</TableCell>
                                <TableCell className={`text-right font-medium ${item.totalPnL > 0 ? "text-red-500" : item.totalPnL < 0 ? "text-green-500" : ""}`}>
                                    {item.totalPnL > 0 ? "+" : ""}{item.totalPnL.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-right ${item.roi > 0 ? "text-red-500" : item.roi < 0 ? "text-green-500" : ""}`}>
                                    {(item.roi * 100).toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-right">{item.avgBuyPrice.toFixed(3)}</TableCell>
                                <TableCell className="text-right">{item.avgSellPrice.toFixed(3)}</TableCell>
                                <TableCell className="text-right">{item.holdingDays}天</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
