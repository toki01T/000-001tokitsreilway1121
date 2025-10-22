// 自然なPWA復帰システム（シンプル版）
// 印刷→Web→自動的にアプリに戻る（PWAの場合のみ）

class PWAReturnManager {
    constructor() {
        this.PWA_STORAGE_KEY = 'toki01tm_pwa_state';
        this.RETURN_CHECK_INTERVAL = 500; // 0.5秒ごとにチェック
        this.isWaitingForReturn = false;
        this.returnTimer = null;
    }

    // シンプルで確実なPWA検出
    detectPWAMode() {
        // 最も確実な判定方法を使用
        const displayMode = window.matchMedia('(display-mode: standalone)').matches;
        const navigatorStandalone = window.navigator.standalone === true;
        const homescreenLaunch = window.location.search.includes('utm_source=homescreen');
        
        const isPWA = displayMode || navigatorStandalone || homescreenLaunch;

        console.log('🔍 PWA検出:', {
            displayMode,
            navigatorStandalone, 
            homescreenLaunch,
            結果: isPWA ? 'PWAアプリ' : 'Webブラウザ',
            URL: window.location.href
        });

        return isPWA;
    }

    // 印刷前の状態保存（シンプル化）
    savePWAState() {
        const state = {
            isPWA: this.detectPWAMode(),
            url: window.location.href,
            mode: this.getCurrentMode(),
            timestamp: Date.now()
        };

        localStorage.setItem(this.PWA_STORAGE_KEY, JSON.stringify(state));
        sessionStorage.setItem(this.PWA_STORAGE_KEY, JSON.stringify(state));
        
        console.log('💾 印刷前PWA状態保存:', state);
        return state;
    }
    
    // 現在のモードを取得
    getCurrentMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mode') || 'image'; // デフォルトは画像モード
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

    // 自然な復帰処理（新しいアプローチ）
    handlePWAReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const isPrintReturn = urlParams.get('pwa_callback') === 'true' || 
                            urlParams.get('utm_source') === 'pwa_return';

        if (isPrintReturn) {
            console.log('🎯 印刷コールバック検出 - 自動復帰処理開始');
            
            // URLを綺麗にする
            this.cleanupURL();
            
            // 保存された印刷前の状態を確認
            const savedState = this.loadPWAState();
            const currentPWA = this.detectPWAMode();
            
            console.log('📊 復帰状況分析:', {
                印刷前: savedState?.isPWA ? 'PWAアプリ' : 'Webブラウザ',
                現在: currentPWA ? 'PWAアプリ' : 'Webブラウザ'
            });
            
            if (savedState?.isPWA && !currentPWA) {
                // PWAから印刷 → Webに戻った場合：自動でPWAに戻す
                console.log('🔄 PWAアプリに自動復帰中...');
                this.autoReturnToPWA(savedState);
            } else if (savedState?.isPWA && currentPWA) {
                // PWAから印刷 → PWAに戻った場合：成功表示
                console.log('✅ PWAアプリに正常復帰');
                this.showReturnSuccess('PWAアプリに戻りました');
            } else if (!savedState?.isPWA && !currentPWA) {
                // Webから印刷 → Webに戻った場合：そのまま
                console.log('🌐 Webブラウザで継続中');
                this.showReturnSuccess('印刷が完了しました');
            } else {
                // その他の場合
                console.log('ℹ️ 印刷処理完了');
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

    // 確実な自動PWA復帰
    autoReturnToPWA(savedState) {
        const platform = this.getPlatform();
        const pwaUrl = this.buildPWAUrl(savedState);
        
        console.log('� 自動PWA復帰実行:', { platform, pwaUrl });
        
        // プラットフォーム別の最適化された復帰処理
        if (platform === 'Android') {
            this.androidAutoReturn(pwaUrl);
        } else if (platform === 'iOS') {
            this.iOSAutoReturn(pwaUrl);
        } else {
            this.desktopAutoReturn(pwaUrl);
        }
    }
    
    // Android用自動復帰
    androidAutoReturn(pwaUrl) {
        // Intent URLでPWAアプリを開く
        const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;category=android.intent.category.BROWSABLE;end`;
        
        console.log('🤖 Android PWA復帰:', intentUrl);
        
        try {
            window.location.href = intentUrl;
        } catch (e) {
            console.log('Intent失敗、通常のリダイレクトを試行');
            window.location.href = pwaUrl;
        }
    }
    
    // iOS用自動復帰
    iOSAutoReturn(pwaUrl) {
        console.log('🍎 iOS PWA復帰:', pwaUrl);
        
        // iOSでは直接リダイレクト
        window.location.href = pwaUrl;
    }
    
    // デスクトップ用自動復帰
    desktopAutoReturn(pwaUrl) {
        console.log('�️ Desktop PWA復帰:', pwaUrl);
        
        // デスクトップでは新しいウィンドウでPWAを開き、現在のタブを閉じる試行
        const pwaWindow = window.open(pwaUrl, '_blank');
        
        if (pwaWindow) {
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    // 自動で閉じられない場合は、ユーザーに通知
                    alert('PWAアプリが開きました。このタブを閉じてください。');
                }
            }, 1000);
        } else {
            // ポップアップがブロックされた場合は、現在のタブでリダイレクト
            window.location.href = pwaUrl;
        }
    }

    // PWA用URLの構築（保存された状態を基に）
    buildPWAUrl(savedState) {
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
        
        // 印刷前のモードを保持
        if (savedState?.mode) {
            params.set('mode', savedState.mode);
        }
        
        // PWA識別用パラメータ
        params.set('utm_source', 'homescreen');
        params.set('pwa_auto_return', 'true');
        
        return baseUrl + '?' + params.toString();
    }
    
    // プラットフォーム検出
    getPlatform() {
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) return 'Android';
        if (/iPad|iPhone|iPod/i.test(ua)) return 'iOS';
        return 'Desktop';
    }

    // 復帰成功の表示（メッセージ付き）
    showReturnSuccess(message = 'アプリに戻りました') {
        console.log('✅', message);
        
        // 控えめな成功通知
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;
        notification.textContent = `✅ ${message}`;
        
        document.body.appendChild(notification);
        
        // 3秒後にフェードアウト
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 印刷前の準備（シンプル化）
    preparePrintCallback() {
        console.log('🖨️ 印刷前準備 - PWA状態保存');
        
        // 現在のPWA状態を保存
        this.savePWAState();
        
        // 印刷待機フラグを設定
        this.isWaitingForReturn = true;
        sessionStorage.setItem('print_waiting', Date.now().toString());
        
        return this.loadPWAState(); // 保存された状態を返す
    }

    // 初期化（シンプル化）
    initialize() {
        console.log('🚀 自然なPWA復帰システム初期化');
        
        // ページ読み込み時の復帰処理
        this.handlePWAReturn();
        
        console.log('✅ PWA復帰システム準備完了');
        
        // 現在の状態をログ出力
        const currentState = this.detectPWAMode();
        console.log(`📱 現在のモード: ${currentState ? 'PWAアプリ' : 'Webブラウザ'}`);
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
