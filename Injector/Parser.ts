import type { Query } from "./Query";

export class ParsingError extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

export function parseQuery(raw: string): Query {
  if (!raw.trim()) {
    return {};
  }

  let obj: any;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    throw new ParsingError("Invalid JSON format");
  }

  if (obj.date && typeof obj.date !== "string") {
    throw new ParsingError("'date' must be a string (YYYY-MM-DD format)");
  }

  if (obj.refreshInterval !== undefined && typeof obj.refreshInterval !== "number") {
    throw new ParsingError("'refreshInterval' must be a number (seconds)");
  }

  if (obj.showEvents !== undefined && typeof obj.showEvents !== "boolean") {
    throw new ParsingError("'showEvents' must be a boolean");
  }

  if (obj.showTasks !== undefined && typeof obj.showTasks !== "boolean") {
    throw new ParsingError("'showTasks' must be a boolean");
  }

  if (obj.title !== undefined && typeof obj.title !== "string") {
    throw new ParsingError("'title' must be a string");
  }

  return obj as Query;
}