export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}
