export function getGoogleConfig() {
  return {
    apiKey: process.env.GOOGLE_API_KEY?.trim() || "",
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || ""
  };
}

export function isConfigured(): boolean {
  const config = getGoogleConfig();
  return Boolean(config.apiKey && config.folderId);
}
