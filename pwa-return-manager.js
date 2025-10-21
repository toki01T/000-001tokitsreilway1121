// PWA復帰支援システム
// SII Print Agentの制限を回避してPWAに戻るためのワークアラウンド

class PWAReturnManager {
    constructor() {
        this.PWA_STORAGE_KEY = 'toki01tm_pwa_state';
        this.PWA_CHECK_INTERVAL = 1000; // 1秒ごとにチェック
        this.PWA_CHECK_TIMEOUT = 30000; // 30秒でタイムアウト
        this.isWaitingForReturn = false;
    }

    // PWA状態を詳細に検出
    detectPWAMode() {
        const checks = {
            displayMode: window.matchMedia('(display-mode: standalone)').matches,
            navigatorStandalone: window.navigator.standalone === true,
            androidPWA: document.referrer.includes('android-app://'),
            homescreenLaunch: window.location.search.includes('utm_source=homescreen'),
            windowSize: this.checkWindowSize(),
            userAgent: this.checkUserAgent()
        };

        const isPWA = checks.displayMode || checks.navigatorStandalone || 
                     checks.androidPWA || checks.homescreenLaunch;

        console.log('🔍 PWA検出結果:', {
            ...checks,
            finalResult: isPWA,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        return isPWA;
    }

    checkWindowSize() {
        // PWAの場合、ウィンドウサイズがスクリーンサイズと一致することが多い
        const widthMatch = Math.abs(window.outerWidth - window.screen.width) < 50;
        const heightMatch = Math.abs(window.outerHeight - window.screen.height) < 150;
        return widthMatch && heightMatch;
    }

    checkUserAgent() {
        const ua = navigator.userAgent.toLowerCase();
        // PWAとして動作している可能性のあるUA文字列をチェック
        return ua.includes('wv') || // WebView
               ua.includes('version/') && ua.includes('mobile/') || // iOS PWA
               document.referrer === ''; // 直接起動
    }

    // PWA状態を保存
    savePWAState() {
        const state = {
            isPWA: this.detectPWAMode(),
            url: window.location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            },
            windowSize: {
                width: window.outerWidth,
                height: window.outerHeight
            }
        };

        localStorage.setItem(this.PWA_STORAGE_KEY, JSON.stringify(state));
        sessionStorage.setItem(this.PWA_STORAGE_KEY, JSON.stringify(state));
        
        console.log('💾 PWA状態保存:', state);
        return state;
    }

    // 保存されたPWA状態を読み込み
    loadPWAState() {
        try {
            const localState = localStorage.getItem(this.PWA_STORAGE_KEY);
            const sessionState = sessionStorage.getItem(this.PWA_STORAGE_KEY);
            
            // セッションストレージを優先、なければローカルストレージ
            const stateJson = sessionState || localState;
            
            if (stateJson) {
                const state = JSON.parse(stateJson);
                console.log('📖 PWA状態読み込み:', state);
                return state;
            }
        } catch (error) {
            console.error('❌ PWA状態読み込みエラー:', error);
        }
        return null;
    }

    // PWA復帰の処理
    handlePWAReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const isPrintReturn = urlParams.get('pwa_return') === 'true' || 
                            urlParams.get('utm_source') === 'print_callback';

        if (isPrintReturn) {
            console.log('🎯 印刷コールバック検出');
            
            // URLを綺麗にする
            this.cleanupURL();
            
            // PWA状態を確認
            const savedState = this.loadPWAState();
            const currentPWA = this.detectPWAMode();
            
            if (savedState && savedState.isPWA && !currentPWA) {
                // PWAだったのにブラウザに戻ってしまった場合
                this.attemptPWARedirect(savedState);
            } else if (currentPWA) {
                // 正常にPWAに戻った場合
                this.showReturnSuccess();
            }
        }
    }

    // URLパラメータのクリーンアップ
    cleanupURL() {
        const url = new URL(window.location);
        url.searchParams.delete('pwa_return');
        url.searchParams.delete('utm_source');
        
        // 履歴を汚さずにURLを更新
        history.replaceState({}, '', url);
        console.log('🧹 URL整理完了:', url.href);
    }

    // PWAリダイレクトの試行
    attemptPWARedirect(savedState) {
        console.log('🔄 PWAリダイレクト試行開始');
        
        // 方法1: window.open でPWAとして開く試行
        try {
            const pwaUrl = this.buildPWAUrl();
            console.log('📱 PWA URL生成:', pwaUrl);
            
            // 新しいウィンドウでPWAを開く
            const pwaWindow = window.open(pwaUrl, '_blank', 'width=400,height=800');
            
            if (pwaWindow) {
                // 成功した場合、現在のウィンドウを閉じる試行
                setTimeout(() => {
                    try {
                        window.close();
                    } catch (e) {
                        console.log('🔄 自動ウィンドウクローズは制限されています');
                        this.showManualInstructions();
                    }
                }, 1000);
            } else {
                this.showManualInstructions();
            }
        } catch (error) {
            console.error('❌ PWAリダイレクト失敗:', error);
            this.showManualInstructions();
        }
    }

    // PWA用URLの構築
    buildPWAUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
        
        // 元のモードパラメータがあれば保持
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('mode')) {
            params.set('mode', currentParams.get('mode'));
        }
        
        // PWA識別用パラメータ
        params.set('utm_source', 'homescreen');
        params.set('pwa_redirect', 'true');
        
        return baseUrl + '?' + params.toString();
    }

    // 手動指示の表示
    showManualInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        let message = '📱 アプリに戻るには:\n\n';
        
        if (isIOS) {
            message += 'ホーム画面の「toki01TM」アイコンをタップしてください';
        } else if (isAndroid) {
            message += '最近使ったアプリから「toki01TM」を選択するか、\nホーム画面のアイコンをタップしてください';
        } else {
            message += 'ホーム画面のアプリアイコンから起動してください';
        }
        
        const userConfirm = confirm(message + '\n\n今すぐホーム画面に移動しますか？');
        
        if (userConfirm && isIOS) {
            // iOSの場合、ホーム画面への移動を促す
            alert('ホームボタンを押すか画面下から上にスワイプして\nホーム画面に移動してください');
        }
    }

    // 復帰成功の表示
    showReturnSuccess() {
        console.log('✅ PWA復帰成功');
        
        // 成功通知（控えめに）
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            transition: opacity 0.3s;
        `;
        notification.textContent = '📱 アプリに戻りました';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    // 印刷前の準備
    preparePrintCallback() {
        console.log('🖨️ 印刷コールバック準備');
        this.savePWAState();
        
        // 印刷待機フラグを設定
        this.isWaitingForReturn = true;
        sessionStorage.setItem('print_waiting', Date.now().toString());
    }

    // 初期化
    initialize() {
        console.log('🚀 PWA復帰管理システム初期化');
        
        // ページ読み込み時の処理
        this.handlePWAReturn();
        
        // PWA状態の定期保存
        setInterval(() => {
            if (!this.isWaitingForReturn) {
                this.savePWAState();
            }
        }, 10000); // 10秒ごと
        
        console.log('✅ PWA復帰管理システム準備完了');
    }
}

// グローバルインスタンス
window.pwaReturnManager = new PWAReturnManager();

// 自動初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pwaReturnManager.initialize();
    });
} else {
    window.pwaReturnManager.initialize();
}

// 印刷関数で使用するためのヘルパー
window.preparePWAReturn = function() {
    return window.pwaReturnManager.preparePrintCallback();
};

// デバッグ用
window.debugPWA = function() {
    console.log('=== PWA状態デバッグ ===');
    console.log('現在のPWA検出:', window.pwaReturnManager.detectPWAMode());
    console.log('保存された状態:', window.pwaReturnManager.loadPWAState());
    console.log('現在のURL:', window.location.href);
    console.log('User Agent:', navigator.userAgent);
    console.log('ウィンドウサイズ:', window.outerWidth, 'x', window.outerHeight);
    console.log('スクリーンサイズ:', window.screen.width, 'x', window.screen.height);
    console.log('=======================');
};
