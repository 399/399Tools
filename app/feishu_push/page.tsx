'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: number;
  original: string;
  shopName: string;
  address: string;
  type: string;
  recommended_dishes: string;
  avoid_dishes: string;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
  msg: string;
  location?: string;
  error?: string;
}

export default function Home() {
  const [formData, setFormData] = useState({
    shopName: '',
    address: '',
    type: '',
    recommended_dishes: '',
    avoid_dishes: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [AMap, setAMap] = useState<any>(null);

  const [duplicateInfo, setDuplicateInfo] = useState<any>(null);

  useEffect(() => {
    // Configure Amap Security Code
    (window as any)._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE,
    };

    import('@amap/amap-jsapi-loader').then((AMapLoader) => {
      AMapLoader.load({
        key: process.env.NEXT_PUBLIC_AMAP_KEY || '', // Web JSAPI Key
        version: '2.0',
        plugins: ['AMap.Geocoder'],
      })
        .then((AMap) => {
          setAMap(AMap);
        })
        .catch((e) => {
          console.error('AMap load failed', e);
        });
    });
  }, []);

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchInput, setBatchInput] = useState('');
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchStatus, setBatchStatus] = useState<'idle' | 'processing' | 'completed'>('idle');

  // ... (useEffect for AMap remains same)

  // Helper: Geocode Address with Cleaning and City Extraction
  const geocodeAddress = async (rawAddress: string) => {
    if (!AMap || !rawAddress) throw new Error('地图组件未加载或地址为空');

    // 1. Clean address: Aggressively take everything before the first bracket
    const cleanAddress = rawAddress.split(/[\(（]/)[0].trim();

    // 2. Extract city (Do not default to Shanghai, let AMap decide if unknown)
    const cityMatch = cleanAddress.match(/^(.*?市)/);
    const city = cityMatch ? cityMatch[0] : undefined;

    console.log(`[Geocode] Final: "${cleanAddress}", City: "${city || 'None'}" (Original: "${rawAddress}")`);

    const geocoder = new AMap.Geocoder({ city });

    return new Promise<string>((resolve, reject) => {
      // Timeout protection (10 seconds)
      const timer = setTimeout(() => {
        console.warn(`[Geocode Timeout] Address: ${cleanAddress}`);
        reject(new Error('地理编码超时'));
      }, 10000);

      geocoder.getLocation(cleanAddress, (status: string, result: any) => {
        clearTimeout(timer);
        if (status === 'complete' && result.geocodes.length) {
          const lnglat = result.geocodes[0].location;
          resolve(`${lnglat.lng},${lnglat.lat}`);
        } else {
          console.warn(`[Geocode Failed] Status: ${status}, Address: ${cleanAddress}`);
          reject(new Error('地址解析失败'));
        }
      });
    });
  };

  // Core processing function (decoupled from UI state)
  const processItem = async (item: any, forceUpdate = false, recordId = '') => {
    let location = '';
    try {
      // 1. Geocode
      if (item.address) {
        try {
          location = await geocodeAddress(item.address);
        } catch (geoError: any) {
          console.warn('Geocoding failed for:', item.address, geoError);
          throw new Error(geoError.message || '地址解析失败');
        }
      }

      // 2. Submit
      const res = await fetch('/feishu_push/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: item.shopName,
          address: item.address,
          type: item.type,
          recommended_dishes: item.recommended_dishes,
          avoid_dishes: item.avoid_dishes,
          location,
          forceUpdate,
          recordId
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      return data; // Returns { success: true, duplicate: boolean, ... }
    } catch (error: any) {
      throw error;
    }
  };

  // Single submission handler
  const submitData = async (forceUpdate = false, recordId = '') => {
    setStatus('submitting');
    setMessage('');
    setDuplicateInfo(null);

    try {
      const data = await processItem(formData, forceUpdate, recordId);

      if (data.duplicate) {
        setStatus('idle');
        setDuplicateInfo(data);
        return;
      }

      setStatus('success');
      setMessage(forceUpdate ? '更新成功！' : '提交成功！');
      setFormData({ shopName: '', address: '', type: '', recommended_dishes: '', avoid_dishes: '' });
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || '发生错误，请重试');
    }
  };

  // Batch submission handler
  const handleBatchSubmit = async () => {
    if (!batchInput.trim()) return;

    setBatchStatus('processing');
    setBatchResults([]);

    // Parse input: "Name | Type | Address | Recommended | Avoid" per line
    const lines = batchInput.split('\n').filter(line => line.trim());
    const allTasks: Task[] = lines.map((line, index) => {
      const parts = line.split('|').map(s => s.trim());
      const shopName = parts[0] || '';
      const type = parts[1] || '';
      const address = parts[2] || '';
      const recommended_dishes = parts[3] || '';
      const avoid_dishes = parts[4] || '';

      return {
        id: index,
        original: line,
        shopName,
        address,
        type,
        recommended_dishes,
        avoid_dishes,
        status: 'pending',
        msg: ''
      };
    });

    setBatchResults(allTasks);

    // Batch size 100
    const BATCH_SIZE = 100;
    const batches = [];
    for (let i = 0; i < allTasks.length; i += BATCH_SIZE) {
      batches.push(allTasks.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Update status to processing for this batch
      setBatchResults(prev => {
        const next = [...prev];
        batch.forEach(task => {
          next[task.id] = { ...next[task.id], status: 'processing' };
        });
        return next;
      });

      try {
        // 1. Geocode with concurrency limit (1 at a time) to avoid AMap rate limit (Strict Serial)
        const GEO_CONCURRENCY = 1;
        const geocodedItems: Task[] = [];

        for (let j = 0; j < batch.length; j += GEO_CONCURRENCY) {
          const chunk = batch.slice(j, j + GEO_CONCURRENCY);

          const chunkResults = await Promise.all(chunk.map(async (task) => {
            if (!task.shopName || !task.address) {
              return { ...task, error: '格式错误', status: 'error' as const };
            }

            if (AMap && task.address) {
              try {
                const location = await geocodeAddress(task.address);
                return { ...task, location };
              } catch (e: any) {
                return { ...task, error: e.message || '地址解析失败', status: 'error' as const };
              }
            }
            return { ...task, error: '地图组件未加载', status: 'error' as const };
          }));

          geocodedItems.push(...chunkResults);

          // Delay between geocoding chunks
          if (j + GEO_CONCURRENCY < batch.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // Filter out items that failed geocoding (mark them as error in UI)
        const validItems: Task[] = [];
        const failedItems: Task[] = [];

        geocodedItems.forEach(item => {
          if (item.error) {
            failedItems.push(item);
          } else {
            validItems.push(item);
          }
        });

        // Update failed items status
        if (failedItems.length > 0) {
          setBatchResults(prev => {
            const next = [...prev];
            failedItems.forEach(item => {
              next[item.id] = { ...next[item.id], status: 'error', msg: item.error };
            });
            return next;
          });
        }

        // 2. Send valid items to backend batch API
        if (validItems.length > 0) {
          const res = await fetch('/feishu_push/api/submit/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: validItems }),
          });
          const data = await res.json();

          if (data.success && data.results) {
            setBatchResults(prev => {
              const next = [...prev];
              data.results.forEach((result: any, idx: number) => {
                // result.item is the original item sent, which has the id
                const originalId = result.item.id;
                if (result.status === 'success') {
                  next[originalId] = { ...next[originalId], status: 'success', msg: '成功' };
                } else if (result.status === 'skipped') {
                  next[originalId] = { ...next[originalId], status: 'skipped', msg: '重复 (已跳过)' };
                } else {
                  next[originalId] = { ...next[originalId], status: 'error', msg: result.message || '失败' };
                }
              });
              return next;
            });
          } else {
            throw new Error(data.error || '批量提交失败');
          }
        }

      } catch (err: any) {
        setBatchResults(prev => {
          const next = [...prev];
          batch.forEach(task => {
            // Only update if still processing
            if (next[task.id].status === 'processing') {
              next[task.id] = { ...next[task.id], status: 'error', msg: err.message };
            }
          });
          return next;
        });
      }

      // Delay 500ms between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setBatchStatus('completed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitData(false);
  };

  const handleOverwrite = () => {
    if (duplicateInfo && duplicateInfo.existingRecord) {
      submitData(true, duplicateInfo.existingRecord.record_id);
    }
  };

  const handleSkip = () => {
    setDuplicateInfo(null);
    setMessage('已跳过录入');
    setStatus('idle');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 space-y-6 relative">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">9map信息登记助手</h1>

          {/* Mode Switcher */}
          <div className="flex justify-center mt-4 space-x-4">
            <button
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'single' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              单条录入
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'batch' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              批量录入
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ... Existing Single Form Inputs ... */}
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
                  店铺名称
                </label>
                <input
                  type="text"
                  id="shopName"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                  placeholder="请输入店铺名称"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  详细地址
                </label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 resize-none"
                  placeholder="请输入详细地址"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  类型
                </label>
                <input
                  type="text"
                  id="type"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                  placeholder="例如：餐饮、零售、服务"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recommended_dishes" className="block text-sm font-medium text-gray-700 mb-1">
                    推荐菜 (选填)
                  </label>
                  <input
                    type="text"
                    id="recommended_dishes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                    placeholder="好吃的菜"
                    value={formData.recommended_dishes}
                    onChange={(e) => setFormData({ ...formData, recommended_dishes: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="avoid_dishes" className="block text-sm font-medium text-gray-700 mb-1">
                    避雷菜 (选填)
                  </label>
                  <input
                    type="text"
                    id="avoid_dishes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900"
                    placeholder="难吃的菜"
                    value={formData.avoid_dishes}
                    onChange={(e) => setFormData({ ...formData, avoid_dishes: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all transform active:scale-[0.98] ${status === 'submitting'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
              >
                {status === 'submitting' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    提交中...
                  </span>
                ) : (
                  '提交登记'
                )}
              </button>
            </form>

            {message && (
              <div
                className={`p-4 rounded-lg text-sm ${status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
              >
                {message}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-bold mb-1">使用说明：</p>
              <p>每行一条数据，使用竖线分隔：<span className="font-mono bg-blue-100 px-1 rounded">店名 | 分类 | 地址 | 推荐菜 | 避雷菜</span></p>
              <p className="mt-1 text-xs opacity-75">示例：老王家常菜 | 中餐 | 上海市徐汇区天钥桥路580号 | | 没熟的米饭</p>
            </div>

            <textarea
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 font-mono text-sm"
              placeholder={`泰太太 (博荟广场店) | 东南亚菜 | 黄浦区中山南一路 788 号 | 芒果糯米饭 | \n星巴克 (新天地店) | 咖啡 | 黄浦区太仓路 181 号 | 拿铁 | 美式`}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              disabled={batchStatus === 'processing'}
            />

            <button
              onClick={handleBatchSubmit}
              disabled={batchStatus === 'processing' || !batchInput.trim()}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all transform active:scale-[0.98] ${batchStatus === 'processing' || !batchInput.trim()
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
            >
              {batchStatus === 'processing' ? '正在批量处理...' : '开始批量录入'}
            </button>

            {/* Batch Results */}
            {batchResults.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">处理结果 ({batchResults.filter(r => r.status === 'success').length}/{batchResults.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {batchResults.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="font-medium text-gray-900 truncate">{task.shopName || '未知店铺'}</p>
                        <p className="text-gray-500 truncate text-xs">{task.address || task.original}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {task.status === 'pending' && <span className="text-gray-400">等待中</span>}
                        {task.status === 'processing' && <span className="text-blue-600 animate-pulse">处理中...</span>}
                        {task.status === 'success' && <span className="text-green-600 font-medium">成功</span>}
                        {task.status === 'skipped' && <span className="text-orange-500 font-medium">已跳过</span>}
                        {task.status === 'error' && <span className="text-red-600 font-medium">{task.msg}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Duplicate Confirmation Modal (Only for Single Mode) */}
        {duplicateInfo && mode === 'single' && (
          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center p-4 z-10 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl transform scale-100 transition-all">
              <h3 className="text-lg font-bold text-gray-900 mb-2">发现重复记录</h3>
              <p className="text-gray-600 mb-6 text-sm">
                {duplicateInfo.message}
                <br />
                是否覆盖已有信息？
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  跳过
                </button>
                <button
                  onClick={handleOverwrite}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  覆盖更新
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
