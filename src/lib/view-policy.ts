const BOT_PATTERN = /bot|crawler|spider|preview|scanner|headless|uptime|monitor|facebookexternalhit|slackbot|discordbot|googleimageproxy|outlook|proofpoint|mimecast/i;

export function isLikelyHumanBrowser(userAgent: string) {
  return userAgent.includes("Mozilla") && !BOT_PATTERN.test(userAgent);
}
