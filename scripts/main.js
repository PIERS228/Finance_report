
// 主應用程序
document.addEventListener('DOMContentLoaded', function() {
    // 初始化變量
    let financialData = {};
    let availableStocks = [];
    
    // DOM元素
    const stockSelect = document.getElementById('stock-select');
    const stockInfo = document.getElementById('stock-info');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    
    // 初始化應用
    initApp();
    
    // 初始化應用程序
    function initApp() {
        discoverAvailableStocks();
        setupEventListeners();
    }
    
    // 發現可用的股票數據文件
    function discoverAvailableStocks() {
        // 這裡我們假設文件名格式為: [股票代碼]_[報表類型].csv
        // 例如: 000001_balance_sheet.csv
        
        // 在實際應用中，這裡應該從服務器獲取文件列表
        // 為了演示，我們假設已經知道有以下文件:
        availableStocks = ['000001', '000002']; // 替換為您實際的股票代碼
        
        // 填充股票選擇下拉框
        availableStocks.forEach(stock => {
            const option = document.createElement('option');
            option.value = stock;
            option.textContent = stock;
            stockSelect.appendChild(option);
        });
    }
    
    // 設置事件監聽器
    function setupEventListeners() {
        // 股票選擇變化
        stockSelect.addEventListener('change', function() {
            const stockCode = this.value;
            if (stockCode) {
                loadFinancialData(stockCode);
            }
        });
        
        // 標籤頁切換
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const tabId = this.getAttribute('data-tab');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // 聊天功能
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // 加載財務數據
    async function loadFinancialData(stockCode) {
        try {
            // 顯示加載狀態
            stockInfo.textContent = `正在加載 ${stockCode} 的財務數據...`;
            
            // 加載三種報表
            const [balanceSheet, incomeStatement, cashFlow] = await Promise.all([
                loadCSVData(`${stockCode}_balance_sheet.csv`),
                loadCSVData(`${stockCode}_income_statement.csv`),
                loadCSVData(`${stockCode}_cash_flow.csv`)
            ]);
            
            // 處理數據
            financialData[stockCode] = {
                balance_sheet: processData(balanceSheet),
                income_statement: processData(incomeStatement),
                cash_flow: processData(cashFlow)
            };
            
            // 更新UI
            updateDisplay(stockCode);
            stockInfo.textContent = `當前查看: ${stockCode}`;
            
            // 啟用聊天功能
            chatInput.disabled = false;
            sendBtn.disabled = false;
            
        } catch (error) {
            console.error('加載財務數據失敗:', error);
            stockInfo.textContent = `加載 ${stockCode} 數據失敗: ${error.message}`;
        }
    }
    
    // 從CSV文件加載數據
    async function loadCSVData(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`文件 ${filename} 不存在`);
            }
            
            const csvText = await response.text();
            return parseCSV(csvText);
        } catch (error) {
            console.error(`加載CSV文件 ${filename} 失敗:`, error);
            throw error;
        }
    }
    
    // 解析CSV數據
    function parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] ? values[i].trim() : '';
            });
            return row;
        });
    }
    
    // 處理原始數據
    function processData(rawData) {
        if (!rawData || rawData.length === 0) return [];
        
        // 提取所有年份
        const years = [...new Set(rawData.map(item => {
            const date = new Date(item.REPORT_DATE);
            return date.getFullYear();
        }))].sort();
        
        // 按項目名稱分組
        const items = {};
        rawData.forEach(row => {
            const year = new Date(row.REPORT_DATE).getFullYear();
            const amount = parseFloat(row.AMOUNT) || 0;
            
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
    
    // 更新顯示
    function updateDisplay(stockCode) {
        const stockData = financialData[stockCode];
        if (!stockData) return;
        
        updateTable('balance_sheet', stockData.balance_sheet);
        updateTable('income_statement', stockData.income_statement);
        updateTable('cash_flow', stockData.cash_flow);
    }
    
    // 更新表格顯示
    function updateTable(tableId, data) {
        const tableDiv = document.getElementById(tableId);
        
        if (!data || data.length === 0) {
            tableDiv.innerHTML = '<p>暫無數據</p>';
            return;
        }
        
        // 提取所有年份列
        const years = [];
        data.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key !== 'STD_ITEM_NAME' && !years.includes(key)) {
                    years.push(key);
                }
            });
        });
        years.sort();
        
        // 生成HTML表格
        let html = '<div class="data-table"><table><thead><tr><th>項目</th>';
        years.forEach(year => html += `<th>${year}</th>`);
        html += '</tr></thead><tbody>';
        
        data.forEach(row => {
            html += `<tr><td>${row.STD_ITEM_NAME}</td>`;
            years.forEach(year => {
                html += `<td class="amount">${row[year] || '-'}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        tableDiv.innerHTML = html;
    }
    
    // 聊天功能
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        addMessage(message, 'user');
        chatInput.value = '';
        
        // 顯示"正在思考"消息
        const thinkingMsg = addMessage('正在分析...', 'ai');
        
        // 模擬AI響應
        setTimeout(() => {
            // 替換為實際的AI分析結果
            const response = generateAnalysisResponse(message);
            
            // 移除"正在思考"消息，添加實際響應
            thinkingMsg.remove();
            addMessage(response, 'ai');
        }, 1500);
    }
    
    // 添加消息到聊天窗口
    function addMessage(text, sender) {
        const container = document.getElementById('chat-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        return messageDiv;
    }
    
    // 生成分析響應 (簡化版)
    function generateAnalysisResponse(question) {
        const stockCode = stockSelect.value;
        const stockData = financialData[stockCode];
        
        // 這裡應該是調用AI API的地方
        // 以下是模擬響應
        
        if (question.includes('營業額') || question.includes('收入')) {
            if (stockData && stockData.income_statement) {
                const revenueData = stockData.income_statement.find(item => 
                    item.STD_ITEM_NAME.includes('營業收入') || item.STD_ITEM_NAME.includes('營業額')
                );
                
                if (revenueData) {
                    const years = Object.keys(revenueData).filter(k => k !== 'STD_ITEM_NAME').sort();
                    if (years.length >= 2) {
                        const firstYear = years[0];
                        const lastYear = years[years.length - 1];
                        const growth = ((revenueData[lastYear] - revenueData[firstYear]) / revenueData[firstYear] * 100).toFixed(2);
                        return `從 ${firstYear} 年到 ${lastYear} 年，營業額增長了 ${growth}%。`;
                    }
                }
            }
            return "無法計算營業額增長，可能是數據不足。";
        }
        
        return `關於"${question}"的分析結果將顯示在這裡。在完整實現中，這裡會調用AI API進行實際分析。`;
    }
});
