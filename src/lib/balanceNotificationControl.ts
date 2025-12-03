// Simple singleton to suppress balance notifications during spin animations
let suppressBalanceNotifications = false;

export const setBalanceNotificationSuppression = (suppress: boolean) => {
  suppressBalanceNotifications = suppress;
  console.log('[Balance Notifications]', suppress ? 'SUPPRESSED' : 'ENABLED');
};

export const isBalanceNotificationSuppressed = () => suppressBalanceNotifications;
