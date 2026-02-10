export const handleOperationError = (
  error: unknown,
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void,
  t: (key: string) => string,
  defaultErrorMessage?: string
) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
    showNotification(
      'warning',
      t('feature_not_available_title') || 'Özellik Kullanılamıyor',
      t('feature_not_available_message') || 'Bu özellik şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
    );
  } else if (errorMsg.includes('timeout') || errorMsg.includes('bağlanılamıyor')) {
    showNotification('error', t('error'), errorMsg);
  } else {
    showNotification('error', t('error'), defaultErrorMessage || errorMsg);
  }
};
