import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Assets - NAS Tool Station',
    description: '个人资产管理与追踪工具',
};

export default function AssetsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="assets-tool-root">
            {children}
        </div>
    );
}
