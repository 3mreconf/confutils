export type DebloaterCatalogItem = {
  id: string;
  packageName: string;
  category: 'entertainment' | 'productivity' | 'social' | 'system';
  risk: 'safe' | 'moderate' | 'caution';
  size: string;
  nameKey?: string;
  descriptionKey?: string;
  name?: string;
  description?: string;
};

export const debloaterCatalog: DebloaterCatalogItem[] = [
  // Entertainment
  { id: 'xboxgaming', name: 'Xbox Gaming Overlay', packageName: 'Microsoft.XboxGamingOverlay', descriptionKey: 'bloat_gamebar_desc', size: '35 MB', risk: 'safe', category: 'entertainment' },
  { id: 'gamebar', nameKey: 'bloat_gamebar', packageName: 'Microsoft.XboxGameOverlay', descriptionKey: 'bloat_gamebar_desc', size: '48 MB', risk: 'safe', category: 'entertainment' },
  { id: 'xboxidentity', name: 'Xbox Identity Provider', packageName: 'Microsoft.XboxIdentityProvider', description: 'Xbox account identity service', size: '12 MB', risk: 'moderate', category: 'entertainment' },
  { id: 'xboxspeech', name: 'Xbox Speech to Text', packageName: 'Microsoft.XboxSpeechToTextOverlay', description: 'Speech-to-text components for Xbox experiences', size: '8 MB', risk: 'safe', category: 'entertainment' },
  { id: 'groove', nameKey: 'bloat_groove', packageName: 'Microsoft.ZuneMusic', descriptionKey: 'bloat_groove_desc', size: '31 MB', risk: 'safe', category: 'entertainment' },
  { id: 'movies', nameKey: 'bloat_movies', packageName: 'Microsoft.ZuneVideo', descriptionKey: 'bloat_movies_desc', size: '28 MB', risk: 'safe', category: 'entertainment' },
  { id: 'solitaire', nameKey: 'bloat_solitaire', packageName: 'Microsoft.MicrosoftSolitaireCollection', descriptionKey: 'bloat_solitaire_desc', size: '185 MB', risk: 'safe', category: 'entertainment' },
  { id: 'mixedreality', name: 'Mixed Reality Portal', packageName: 'Microsoft.MixedReality.Portal', description: 'Windows Mixed Reality portal', size: '120 MB', risk: 'safe', category: 'entertainment' },
  { id: '3dviewer', name: '3D Viewer', packageName: 'Microsoft.Microsoft3DViewer', description: '3D model viewer', size: '45 MB', risk: 'safe', category: 'entertainment' },
  { id: 'paint3d', name: 'Paint 3D', packageName: 'Microsoft.MSPaint', description: '3D drawing app', size: '95 MB', risk: 'safe', category: 'entertainment' },
  { id: '3dbuilder', name: '3D Builder', packageName: 'Microsoft.3DBuilder', description: '3D model builder', size: '50 MB', risk: 'safe', category: 'entertainment' },

  // Productivity
  { id: 'onenote', nameKey: 'bloat_onenote', packageName: 'Microsoft.Office.OneNote', descriptionKey: 'bloat_onenote_desc', size: '156 MB', risk: 'moderate', category: 'productivity' },
  { id: 'mail', nameKey: 'bloat_mail', packageName: 'microsoft.windowscommunicationsapps', descriptionKey: 'bloat_mail_desc', size: '89 MB', risk: 'moderate', category: 'productivity' },
  { id: 'maps', nameKey: 'bloat_maps', packageName: 'Microsoft.WindowsMaps', descriptionKey: 'bloat_maps_desc', size: '45 MB', risk: 'safe', category: 'productivity' },
  { id: 'news', nameKey: 'bloat_news', packageName: 'Microsoft.BingNews', descriptionKey: 'bloat_news_desc', size: '38 MB', risk: 'safe', category: 'productivity' },
  { id: 'weather', nameKey: 'bloat_weather', packageName: 'Microsoft.BingWeather', descriptionKey: 'bloat_weather_desc', size: '24 MB', risk: 'safe', category: 'productivity' },
  { id: 'stickynotes', name: 'Sticky Notes', packageName: 'Microsoft.MicrosoftStickyNotes', description: 'Quick note app', size: '18 MB', risk: 'safe', category: 'productivity' },
  { id: 'todos', name: 'Microsoft To Do', packageName: 'Microsoft.Todos', description: 'Task management app', size: '32 MB', risk: 'safe', category: 'productivity' },
  { id: 'officehub', name: 'Office Hub', packageName: 'Microsoft.MicrosoftOfficeHub', description: 'Microsoft Office hub', size: '28 MB', risk: 'safe', category: 'productivity' },
  { id: 'powerautomate', name: 'Power Automate', packageName: 'Microsoft.PowerAutomateDesktop', description: 'Automation tool', size: '150 MB', risk: 'safe', category: 'productivity' },
  { id: 'clipchamp', name: 'Clipchamp', packageName: 'Clipchamp.Clipchamp', description: 'Video editor', size: '200 MB', risk: 'safe', category: 'productivity' },

  // Social
  { id: 'people', nameKey: 'bloat_people', packageName: 'Microsoft.People', descriptionKey: 'bloat_people_desc', size: '18 MB', risk: 'safe', category: 'social' },
  { id: 'skype', nameKey: 'bloat_skype', packageName: 'Microsoft.SkypeApp', descriptionKey: 'bloat_skype_desc', size: '128 MB', risk: 'safe', category: 'social' },
  { id: 'yourphone', nameKey: 'bloat_yourphone', packageName: 'Microsoft.YourPhone', descriptionKey: 'bloat_yourphone_desc', size: '42 MB', risk: 'moderate', category: 'social' },
  { id: 'phonelink', name: 'Phone Link', packageName: 'Microsoft.Windows.PhoneLink', description: 'Phone companion app', size: '42 MB', risk: 'moderate', category: 'social' },
  { id: 'teams', name: 'Microsoft Teams', packageName: 'MicrosoftTeams', description: 'Work communication app', size: '180 MB', risk: 'safe', category: 'social' },
  { id: 'teams2', name: 'Microsoft Teams (New)', packageName: 'MSTeams', description: 'New Teams experience', size: '180 MB', risk: 'safe', category: 'social' },

  // System
  { id: 'cortana', nameKey: 'bloat_cortana', packageName: 'Microsoft.549981C3F5F10', descriptionKey: 'bloat_cortana_desc', size: '245 MB', risk: 'moderate', category: 'system' },
  { id: 'camera', nameKey: 'bloat_camera', packageName: 'Microsoft.WindowsCamera', descriptionKey: 'bloat_camera_desc', size: '23 MB', risk: 'caution', category: 'system' },
  { id: 'feedback', nameKey: 'bloat_feedback', packageName: 'Microsoft.WindowsFeedbackHub', descriptionKey: 'bloat_feedback_desc', size: '56 MB', risk: 'safe', category: 'system' },
  { id: 'gethelp', nameKey: 'bloat_gethelp', packageName: 'Microsoft.GetHelp', descriptionKey: 'bloat_gethelp_desc', size: '12 MB', risk: 'safe', category: 'system' },
  { id: 'tips', nameKey: 'bloat_tips', packageName: 'Microsoft.Getstarted', descriptionKey: 'bloat_tips_desc', size: '15 MB', risk: 'safe', category: 'system' },
  { id: 'store', nameKey: 'bloat_store', packageName: 'Microsoft.WindowsStore', descriptionKey: 'bloat_store_desc', size: '78 MB', risk: 'caution', category: 'system' },
  { id: 'alarms', name: 'Alarms & Clock', packageName: 'Microsoft.WindowsAlarms', description: 'Alarm and clock app', size: '15 MB', risk: 'safe', category: 'system' },
  { id: 'calculator', name: 'Calculator', packageName: 'Microsoft.WindowsCalculator', description: 'Calculator app', size: '8 MB', risk: 'caution', category: 'system' },
  { id: 'soundrecorder', name: 'Sound Recorder', packageName: 'Microsoft.WindowsSoundRecorder', description: 'Audio recorder', size: '10 MB', risk: 'safe', category: 'system' },
  { id: 'widgets', name: 'Windows Widgets', packageName: 'MicrosoftWindows.Client.WebExperience', description: 'Widgets panel', size: '85 MB', risk: 'safe', category: 'system' },
  { id: 'copilot', name: 'Copilot', packageName: 'Microsoft.Copilot', description: 'AI assistant', size: '50 MB', risk: 'safe', category: 'system' },
  { id: 'quickassist', name: 'Quick Assist', packageName: 'MicrosoftCorporationII.QuickAssist', description: 'Remote assistance app', size: '25 MB', risk: 'safe', category: 'system' },
  { id: 'photos', name: 'Photos', packageName: 'Microsoft.Windows.Photos', description: 'Photo viewer', size: '150 MB', risk: 'caution', category: 'system' }
];
