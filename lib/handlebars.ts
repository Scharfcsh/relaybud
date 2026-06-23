import Handlebars from "handlebars";

export function renderTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  const compiled = Handlebars.compile(template, {
    noEscape: true,
    strict: false,
  });
  return compiled(data);
}
