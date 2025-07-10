document.addEventListener('DOMContentLoaded', function() {
    // ... 其他不变代码 ...

    // 发现可用的股票数据文件
    async function discoverAvailableStocks() {
        try {
            // 在实际部署中，这里应该从服务器API获取文件列表
            // 这里我们模拟一个文件列表
            const simulatedFiles = [
                'W_01270_balance_sheet_年度.csv',
                'W_01270_cash_flow_年度.csv',
                'W_01270_income_statement_年度.csv',
                '美团-W_03690_balance_sheet_年度.csv',
                '美团-W_03690_cash_flow_年度.csv',
                '美团-W_03690_income_statement_年度.csv'
            ];
            
            // 解析文件名，提取股票代码和名称
            const stockMap = {};
            
            simulatedFiles.forEach(filename => {
                // 解析文件名格式： [名称-]W_股票代码_报表类型_年度.csv
                const match = filename.match(/^(?:([^-]+)-)?W_(\d+)_(balance_sheet|cash_flow|income_statement)_年度\.csv$/);
                if (match) {
                    const stockName = match[1] || '';
                    const stockCode = match[2];
                    const reportType = match[3];
                    
                    if (!stockMap[stockCode]) {
                        stockMap[stockCode] = {
                            code: stockCode,
                            name: stockName,
                            hasBalanceSheet: false,
                            hasCashFlow: false,
                            hasIncomeStatement: false
                        };
                    }
                    
                    if (reportType === 'balance_sheet') stockMap[stockCode].hasBalanceSheet = true;
                    if (reportType === 'cash_flow') stockMap[stockCode].hasCashFlow = true;
                    if (reportType === 'income_statement') stockMap[stockCode].hasIncomeStatement = true;
                }
            });
            
            // 只保留有三种报表完整的股票
            availableStocks = Object.values(stockMap).filter(stock => 
                stock.hasBalanceSheet && stock.hasCashFlow && stock.hasIncomeStatement
            );
            
            // 填充股票选择下拉框
            stockSelect.innerHTML = '<option value="">-- 请选择 --</option>';
            availableStocks.forEach(stock => {
                const option = document.createElement('option');
                option.value = stock.code;
                option.textContent = stock.name ? `${stock.name} (${stock.code})` : stock.code;
                stockSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('发现可用股票失败:', error);
        }
    }

    // 加载财务数据
    async function loadFinancialData(stockCode) {
        try {
            // 显示加载状态
            stockInfo.textContent = `正在加载 ${stockCode} 的财务数据...`;
            
            // 获取股票名称（如果有）
            const stockName = availableStocks.find(s => s.code === stockCode)?.name || '';
            
            // 构建文件名
            const prefix = stockName ? `${stockName}-W_${stockCode}` : `W_${stockCode}`;
            
            // 加载三种报表
            const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
                loadCSVData(`${prefix}_balance_sheet_年度.csv`),
                loadCSVData(`${prefix}_income_statement_年度.csv`),
                loadCSVData(`${prefix}_cash_flow_年度.csv`)
            ]);
            
            // 处理数据
            financialData[stockCode] = {
                balance_sheet: processData(balanceSheet),
                income_statement: processData(incomeStatement),
                cash_flow: processData(cashFlow),
                name: stockName
            };
            
            // 更新UI
            updateDisplay(stockCode);
            stockInfo.textContent = `当前查看: ${stockName || ''} ${stockCode}`;
            
            // 启用聊天功能
            chatInput.disabled = false;
            sendBtn.disabled = false;
            
        } catch (error) {
            console.error('加载财务数据失败:', error);
            stockInfo.textContent = `加载 ${stockCode} 数据失败: ${error.message}`;
        }
    }

    // 从CSV文件加载数据
    async function loadCSVData(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`文件 ${filename} 不存在`);
            }
            
            // 尝试不同编码
            let csvText;
            try {
                csvText = await response.text();
            } catch (e) {
                // 如果UTF-8失败，尝试GBK解码
                const buffer = await response.arrayBuffer();
                const decoder = new TextDecoder('gbk');
                csvText = decoder.decode(buffer);
            }
            
            return parseCSV(csvText);
        } catch (error) {
            console.error(`加载CSV文件 ${filename} 失败:`, error);
            throw error;
        }
    }

    // 解析CSV数据
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];
        
        // 处理可能的BOM字符
        const firstLine = lines[0];
        let headers = firstLine.split(',');
        if (headers[0].charCodeAt(0) === 0xFEFF) {
            headers[0] = headers[0].substring(1);
        }
        headers = headers.map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] ? values[i].trim() : '';
            });
            return row;
        });
    }

    // 处理原始数据
    function processData(rawData) {
        if (!rawData || rawData.length === 0) return [];
        
        // 提取所有年份
        const years = [...new Set(rawData.map(item => {
            if (!item.REPORT_DATE) return null;
            const dateStr = item.REPORT_DATE;
            let year;
            
            // 尝试不同日期格式
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                year = new Date(dateStr).getFullYear();
            } else if (dateStr.match(/^\d{4}$/)) {
                year = parseInt(dateStr);
            } else if (dateStr.match(/^\d{4}年$/)) {
                year = parseInt(dateStr);
            } else {
                console.warn('未知的日期格式:', dateStr);
                return null;
            }
            
            return year;
        }).filter(y => y !== null))].sort();
        
        // 按项目名称分组
        const items = {};
        rawData.forEach(row => {
            if (!row.STD_ITEM_NAME || !row.REPORT_DATE || !row.AMOUNT) return;
            
            let year;
            const dateStr = row.REPORT_DATE;
            
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                year = new Date(dateStr).getFullYear();
            } else if (dateStr.match(/^\d{4}$/)) {
                year = parseInt(dateStr);
            } else if (dateStr.match(/^\d{4}年$/)) {
                year = parseInt(dateStr);
            } else {
                console.warn('未知的日期格式:', dateStr);
                return;
            }
            
            const amount = parseFloat(row.AMOUNT.replace(/,/g, '')) || 0;
            
            if (!items[row.STD_ITEM_NAME]) {
                items[row.STD_ITEM_NAME] = {
                    STD_ITEM_NAME: row.STD_ITEM_NAME
                };
            }
            
            items[row.STD_ITEM_NAME][year] = amount.toLocaleString('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        });
        
        return Object.values(items);
    }

    // ... 其他不变代码 ...
});
