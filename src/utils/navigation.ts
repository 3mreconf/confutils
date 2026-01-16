const SETTINGS_SECTION_KEY = 'confutils_settings_section';

export const navigateToSettingsSection = (sectionId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(SETTINGS_SECTION_KEY, sectionId);
  window.dispatchEvent(new CustomEvent('confutils:navigate', { detail: { page: 'settings', section: sectionId } }));
};

export const consumeSettingsSection = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const sectionId = sessionStorage.getItem(SETTINGS_SECTION_KEY);
  if (sectionId) {
    sessionStorage.removeItem(SETTINGS_SECTION_KEY);
  }
  return sectionId;
};
