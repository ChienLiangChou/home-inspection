// 簡化的藍牙服務，避免 TypeScript 錯誤
export class SimpleBluetoothService {
  private isSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  async checkSupport(): Promise<{ supported: boolean; message: string }> {
    if (!this.isSupported()) {
      return {
        supported: false,
        message: '您的設備不支援 Web Bluetooth API。請使用支援藍牙的現代瀏覽器。'
      };
    }

    return {
      supported: true,
      message: '藍牙功能可用'
    };
  }

  async requestDevice(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isSupported()) {
        throw new Error('Web Bluetooth API 不支援');
      }

      // 這裡只是檢查支援，不實際連接設備
      return {
        success: true,
        message: '藍牙 API 支援正常'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `藍牙測試失敗: ${error.message}`
      };
    }
  }
}

export default SimpleBluetoothService;
