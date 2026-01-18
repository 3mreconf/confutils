const SETTINGS_SECTION_KEY = 'confutils_settings_section';
const INSTALLER_SECTION_KEY = 'confutils_installer_section';

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

export const navigateToInstallerSection = (sectionId: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(INSTALLER_SECTION_KEY, sectionId);
  window.dispatchEvent(new CustomEvent('confutils:navigate', { detail: { page: 'installer', section: sectionId } }));
};

export const consumeInstallerSection = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const sectionId = sessionStorage.getItem(INSTALLER_SECTION_KEY);
  if (sectionId) {
    sessionStorage.removeItem(INSTALLER_SECTION_KEY);
  }
  return sectionId;
};
