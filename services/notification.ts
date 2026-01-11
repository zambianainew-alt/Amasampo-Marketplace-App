
export class NotificationService {
  private static instance: NotificationService;
  private hasPermission: boolean = false;

  private constructor() {
    this.requestPermission();
  }

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    this.hasPermission = permission === 'granted';
  }

  notify(title: string, body: string, icon?: string) {
    // 1. Native Push
    if (this.hasPermission) {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico'
      });
    }

    // 2. Haptic Feedback (Simulated for Mobile)
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
    }
    
    console.log(`[PUSH] ${title}: ${body}`);
  }
}

export const notifications = NotificationService.getInstance();
